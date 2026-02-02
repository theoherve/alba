-- Alba Initial Schema
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM Types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE plan_type AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE message_source AS ENUM ('guest', 'host', 'ai', 'system');
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE ai_action AS ENUM ('auto_sent', 'suggested', 'escalated');
CREATE TYPE notification_type AS ENUM ('escalation', 'new_message', 'sync_error', 'system');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'both');

-- 1. USERS (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    locale TEXT DEFAULT 'fr' CHECK (locale IN ('fr', 'en')),
    notification_preferences JSONB DEFAULT '{"escalation": "both", "new_message": "in_app", "sync_error": "email"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ORGANIZATIONS (conciergeries)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan plan_type DEFAULT 'free',
    plan_limits JSONB DEFAULT '{"max_properties": 1, "max_members": 1, "ai_messages_per_month": 100}'::jsonb,
    ai_settings JSONB DEFAULT '{"tone": "professional", "auto_send_threshold": 0.85, "signature": ""}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- soft delete
);

-- 3. MEMBERSHIPS (users <-> organizations)
CREATE TABLE public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role user_role DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 4. GMAIL_CONNECTIONS
CREATE TABLE public.gmail_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    email TEXT NOT NULL,
    access_token TEXT, -- encrypted
    refresh_token TEXT, -- encrypted
    token_expires_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    sync_cursor TEXT, -- Gmail history ID
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PROPERTIES (logements)
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    airbnb_listing_id TEXT, -- extracted from emails
    description TEXT, -- for AI context
    check_in_instructions TEXT,
    house_rules TEXT,
    amenities JSONB DEFAULT '[]'::jsonb,
    ai_settings JSONB DEFAULT '{"custom_instructions": "", "use_org_defaults": true}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 6. CONVERSATIONS
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    guest_name TEXT,
    guest_email TEXT,
    airbnb_thread_id TEXT, -- extracted from email headers
    check_in_date DATE,
    check_out_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'resolved')),
    language TEXT DEFAULT 'en' CHECK (language IN ('fr', 'en')),
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MESSAGES
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    source message_source NOT NULL,
    content TEXT NOT NULL,
    status message_status DEFAULT 'delivered',
    gmail_message_id TEXT,
    sent_by_user_id UUID REFERENCES public.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AI_RESPONSES (tracking IA)
CREATE TABLE public.ai_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    generated_content TEXT NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    action_taken ai_action NOT NULL,
    reasoning TEXT, -- why this confidence score
    model_used TEXT DEFAULT 'gpt-4',
    response_time_ms INTEGER,
    user_feedback TEXT CHECK (user_feedback IN ('approved', 'edited', 'rejected', NULL)),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AI_KNOWLEDGE_BASE (reponses validees)
CREATE TABLE public.ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    question_pattern TEXT NOT NULL, -- regex or keywords
    approved_response TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 1.0,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    link TEXT,
    channel notification_channel DEFAULT 'in_app',
    is_read BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. USAGE_METRICS (pour limites de plan)
CREATE TABLE public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    ai_messages_count INTEGER DEFAULT 0,
    emails_synced_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, period_start)
);

-- INDEXES
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_org ON public.memberships(organization_id);
CREATE INDEX idx_properties_org ON public.properties(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX idx_conversations_property ON public.conversations(property_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_ai_responses_conversation ON public.ai_responses(conversation_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_gmail_connections_org ON public.gmail_connections(organization_id);
CREATE INDEX idx_knowledge_base_org ON public.ai_knowledge_base(organization_id);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: can only see/update their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Organizations: members can view, owners can update
CREATE POLICY "Members can view organizations" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
        AND deleted_at IS NULL
    );

CREATE POLICY "Owners can update organizations" ON public.organizations
    FOR UPDATE USING (
        id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND role = 'owner')
    );

-- Memberships
CREATE POLICY "Users can view memberships in their orgs" ON public.memberships
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
    );

CREATE POLICY "Owners can manage memberships" ON public.memberships
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND role = 'owner')
    );

-- Gmail Connections
CREATE POLICY "Users can view gmail connections in their orgs" ON public.gmail_connections
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can manage their own gmail connections" ON public.gmail_connections
    FOR ALL USING (user_id = auth.uid());

-- Properties
CREATE POLICY "Members can view properties" ON public.properties
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
        AND deleted_at IS NULL
    );

CREATE POLICY "Admins can manage properties" ON public.properties
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Conversations
CREATE POLICY "Members can view conversations" ON public.conversations
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
    );

CREATE POLICY "Members can update conversations" ON public.conversations
    FOR UPDATE USING (
        organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
    );

-- Messages
CREATE POLICY "Members can view messages" ON public.messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Members can insert messages" ON public.messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
        )
    );

-- AI Responses
CREATE POLICY "Members can view ai responses" ON public.ai_responses
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Members can update ai response feedback" ON public.ai_responses
    FOR UPDATE USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
        )
    );

-- Knowledge Base
CREATE POLICY "Members can view knowledge base" ON public.ai_knowledge_base
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage knowledge base" ON public.ai_knowledge_base
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Usage Metrics
CREATE POLICY "Members can view usage metrics" ON public.usage_metrics
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid())
    );

-- Functions

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gmail_connections_updated_at BEFORE UPDATE ON public.gmail_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON public.ai_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET 
        last_message_at = NEW.created_at,
        unread_count = CASE 
            WHEN NEW.source = 'guest' THEN unread_count + 1
            ELSE unread_count
        END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Function to generate organization slug
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(REGEXP_REPLACE(
        REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
    ));
END;
$$ LANGUAGE plpgsql;
