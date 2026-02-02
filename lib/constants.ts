export const APP_NAME = "Alba";
export const APP_DESCRIPTION = "Gestion et automatisation de conciergerie Airbnb";

export const SUPPORTED_LOCALES = ["fr", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "fr";

export const AI_CONFIG = {
  DEFAULT_MODEL: "gpt-4-turbo-preview",
  DEFAULT_CONFIDENCE_THRESHOLD: 0.85,
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7,
} as const;

export const PLAN_LIMITS = {
  free: {
    max_properties: 1,
    max_members: 1,
    ai_messages_per_month: 100,
  },
  starter: {
    max_properties: 5,
    max_members: 3,
    ai_messages_per_month: 500,
  },
  pro: {
    max_properties: 20,
    max_members: 10,
    ai_messages_per_month: 2000,
  },
  enterprise: {
    max_properties: -1, // unlimited
    max_members: -1,
    ai_messages_per_month: -1,
  },
} as const;

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
] as const;

export const AIRBNB_EMAIL_DOMAINS = [
  "@airbnb.com",
  "@guests.airbnb.com",
  "@host.airbnb.com",
] as const;

export const MESSAGE_SOURCES = {
  GUEST: "guest",
  HOST: "host",
  AI: "ai",
  SYSTEM: "system",
} as const;

export const CONVERSATION_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  RESOLVED: "resolved",
} as const;

export const AI_ACTIONS = {
  AUTO_SENT: "auto_sent",
  SUGGESTED: "suggested",
  ESCALATED: "escalated",
} as const;

export const NOTIFICATION_TYPES = {
  ESCALATION: "escalation",
  NEW_MESSAGE: "new_message",
  SYNC_ERROR: "sync_error",
  SYSTEM: "system",
} as const;
