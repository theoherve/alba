-- Add ai_disabled column to conversations for "Take Over" feature
-- When true, AI will not auto-reply to this conversation
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS ai_disabled BOOLEAN DEFAULT false;