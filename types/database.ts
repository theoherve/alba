export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "owner" | "admin" | "member";
export type PlanType = "free" | "starter" | "pro" | "enterprise";
export type MessageSource = "guest" | "host" | "ai" | "system";
export type MessageStatus = "pending" | "sent" | "delivered" | "failed";
export type AIAction = "auto_sent" | "suggested" | "escalated";
export type NotificationType = "escalation" | "new_message" | "sync_error" | "system";
export type NotificationChannel = "in_app" | "email" | "both";
export type ConversationStatus = "active" | "archived" | "resolved";
export type SupportedLanguage = "fr" | "en";

// JSON Types
export interface NotificationPreferences {
  escalation: NotificationChannel;
  new_message: NotificationChannel;
  sync_error: NotificationChannel;
}

export interface PlanLimits {
  max_properties: number;
  max_members: number;
  ai_messages_per_month: number;
}

export interface OrganizationAISettings {
  tone: "professional" | "friendly" | "casual";
  auto_send_threshold: number;
  signature: string;
}

export interface PropertyAISettings {
  custom_instructions: string;
  use_org_defaults: boolean;
}

// Row types
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: SupportedLanguage;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  plan_limits: PlanLimits;
  ai_settings: OrganizationAISettings;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  created_at: string;
}

export interface GmailConnection {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  last_sync_at: string | null;
  sync_cursor: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  airbnb_listing_id: string | null;
  description: string | null;
  check_in_instructions: string | null;
  house_rules: string | null;
  amenities: string[];
  ai_settings: PropertyAISettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Conversation {
  id: string;
  organization_id: string;
  property_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  airbnb_thread_id: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  status: ConversationStatus;
  language: SupportedLanguage;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  source: MessageSource;
  content: string;
  status: MessageStatus;
  gmail_message_id: string | null;
  sent_by_user_id: string | null;
  metadata: Json;
  created_at: string;
}

export interface AIResponse {
  id: string;
  message_id: string | null;
  conversation_id: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  generated_content: string;
  confidence_score: number | null;
  action_taken: AIAction;
  reasoning: string | null;
  model_used: string;
  response_time_ms: number | null;
  user_feedback: "approved" | "edited" | "rejected" | null;
  created_at: string;
}

export interface AIKnowledgeBase {
  id: string;
  organization_id: string;
  property_id: string | null;
  question_pattern: string;
  approved_response: string;
  usage_count: number;
  success_rate: number;
  language: SupportedLanguage;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: NotificationType;
  title: string;
  content: string | null;
  link: string | null;
  channel: NotificationChannel;
  is_read: boolean;
  email_sent_at: string | null;
  created_at: string;
}

export interface UsageMetrics {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  ai_messages_count: number;
  emails_synced_count: number;
  created_at: string;
}

// Database type for Supabase (simplified for MVP)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<User> & { id: string; email: string };
        Update: Partial<User>;
      };
      organizations: {
        Row: Organization;
        Insert: Partial<Organization> & { name: string; slug: string };
        Update: Partial<Organization>;
      };
      memberships: {
        Row: Membership;
        Insert: Partial<Membership> & { user_id: string; organization_id: string };
        Update: Partial<Membership>;
      };
      gmail_connections: {
        Row: GmailConnection;
        Insert: Partial<GmailConnection> & { organization_id: string; user_id: string; email: string };
        Update: Partial<GmailConnection>;
      };
      properties: {
        Row: Property;
        Insert: Partial<Property> & { organization_id: string; name: string };
        Update: Partial<Property>;
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation> & { organization_id: string };
        Update: Partial<Conversation>;
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & { conversation_id: string; source: MessageSource; content: string };
        Update: Partial<Message>;
      };
      ai_responses: {
        Row: AIResponse;
        Insert: Partial<AIResponse> & { conversation_id: string; generated_content: string; action_taken: AIAction };
        Update: Partial<AIResponse>;
      };
      ai_knowledge_base: {
        Row: AIKnowledgeBase;
        Insert: Partial<AIKnowledgeBase> & { organization_id: string; question_pattern: string; approved_response: string };
        Update: Partial<AIKnowledgeBase>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { user_id: string; type: NotificationType; title: string };
        Update: Partial<Notification>;
      };
      usage_metrics: {
        Row: UsageMetrics;
        Insert: Partial<UsageMetrics> & { organization_id: string; period_start: string; period_end: string };
        Update: Partial<UsageMetrics>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Extended types with relations
export interface ConversationWithMessages extends Conversation {
  messages: Message[];
  property: Property | null;
}

export interface ConversationWithProperty extends Conversation {
  property: Property | null;
}

export interface MembershipWithUser extends Membership {
  user: User;
}

export interface OrganizationWithMemberships extends Organization {
  memberships: MembershipWithUser[];
}
