import type { SupportedLanguage, UserRole, PlanType, ConversationStatus } from "./database";

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Auth
export interface SignUpRequest {
  email: string;
  full_name?: string;
  locale?: SupportedLanguage;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
}

// Properties
export interface CreatePropertyRequest {
  name: string;
  address?: string;
  description?: string;
  check_in_instructions?: string;
  house_rules?: string;
  amenities?: string[];
}

export interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {
  ai_settings?: {
    custom_instructions?: string;
    use_org_defaults?: boolean;
  };
  is_active?: boolean;
}

// Conversations
export interface ConversationFilters {
  status?: ConversationStatus;
  property_id?: string;
  search?: string;
  has_unread?: boolean;
}

// Messages
export interface SendMessageRequest {
  conversation_id: string;
  content: string;
  source?: "host" | "ai";
}

// Gmail
export interface GmailOAuthCallbackParams {
  code: string;
  state: string;
}

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Team
export interface InviteMemberRequest {
  email: string;
  role: UserRole;
}

// Settings
export interface UpdateOrganizationSettingsRequest {
  name?: string;
  ai_settings?: {
    tone?: "professional" | "friendly" | "casual";
    auto_send_threshold?: number;
    signature?: string;
  };
}

export interface UpdateUserSettingsRequest {
  full_name?: string;
  locale?: SupportedLanguage;
  notification_preferences?: {
    escalation?: "in_app" | "email" | "both";
    new_message?: "in_app" | "email" | "both";
    sync_error?: "in_app" | "email" | "both";
  };
}
