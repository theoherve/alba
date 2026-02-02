import type { Message, Property, AIKnowledgeBase, OrganizationAISettings } from "./database";

export interface AIPromptContext {
  guestMessage: string;
  guestLanguage: "fr" | "en";
  conversationHistory: Pick<Message, "source" | "content" | "created_at">[];
  propertyContext: PropertyContext;
  orgSettings: OrganizationAISettings;
  knowledgeBase: Pick<AIKnowledgeBase, "question_pattern" | "approved_response">[];
}

export interface PropertyContext {
  name: string;
  description: string | null;
  check_in_instructions: string | null;
  house_rules: string | null;
  amenities: string[];
}

export interface AIGeneratedResponse {
  response: string;
  confidence: number;
  reasoning: string;
  detected_intent: string;
}

export interface AIResponseMetadata {
  prompt_tokens: number;
  completion_tokens: number;
  model_used: string;
  response_time_ms: number;
}

export interface AIProcessingResult {
  generated: AIGeneratedResponse;
  metadata: AIResponseMetadata;
  action: "auto_sent" | "suggested" | "escalated";
  message_id?: string;
}

export interface LanguageDetectionResult {
  language: "fr" | "en";
  confidence: number;
}
