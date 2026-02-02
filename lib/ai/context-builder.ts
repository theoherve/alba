import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AIPromptContext, PropertyContext } from "@/types/ai";

interface ConversationWithRelations {
  organization_id: string;
  property_id: string | null;
  language: string;
  messages: Array<{ source: string; content: string; created_at: string }>;
  property: {
    name: string;
    description: string | null;
    check_in_instructions: string | null;
    house_rules: string | null;
    amenities: string[];
  } | null;
  organization: {
    ai_settings: {
      tone: string;
      auto_send_threshold: number;
      signature: string;
    };
  } | null;
}

export const buildAIContext = async (
  supabase: SupabaseClient<Database>,
  conversationId: string
): Promise<AIPromptContext | null> => {
  // Get conversation with messages and property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conversationData, error: convError } = await (supabase as any)
    .from("conversations")
    .select(`
      *,
      property:properties(*),
      messages(source, content, created_at),
      organization:organizations(ai_settings)
    `)
    .eq("id", conversationId)
    .order("created_at", { referencedTable: "messages", ascending: true })
    .single();

  const conversation = conversationData as ConversationWithRelations | null;

  if (convError || !conversation) {
    console.error("Error fetching conversation:", convError);
    return null;
  }

  // Get the latest guest message
  const guestMessages = conversation.messages.filter(
    (m) => m.source === "guest"
  );
  const latestGuestMessage = guestMessages[guestMessages.length - 1];

  if (!latestGuestMessage) {
    return null;
  }

  // Get knowledge base entries for this organization/property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: knowledgeBase } = await (supabase as any)
    .from("ai_knowledge_base")
    .select("question_pattern, approved_response")
    .eq("organization_id", conversation.organization_id)
    .or(`property_id.is.null,property_id.eq.${conversation.property_id}`)
    .order("usage_count", { ascending: false })
    .limit(10);

  // Build property context
  const propertyContext: PropertyContext = conversation.property
    ? {
        name: conversation.property.name,
        description: conversation.property.description,
        check_in_instructions: conversation.property.check_in_instructions,
        house_rules: conversation.property.house_rules,
        amenities: conversation.property.amenities || [],
      }
    : {
        name: "Non spécifié",
        description: null,
        check_in_instructions: null,
        house_rules: null,
        amenities: [],
      };

  // Get organization AI settings
  const defaultSettings = {
    tone: "professional" as const,
    auto_send_threshold: 0.85,
    signature: "",
  };
  const orgSettings = conversation.organization?.ai_settings 
    ? {
        tone: conversation.organization.ai_settings.tone as "professional" | "friendly" | "casual",
        auto_send_threshold: conversation.organization.ai_settings.auto_send_threshold,
        signature: conversation.organization.ai_settings.signature,
      }
    : defaultSettings;

  return {
    guestMessage: latestGuestMessage.content,
    guestLanguage: conversation.language as "fr" | "en",
    conversationHistory: conversation.messages.map((m) => ({
      source: m.source as "guest" | "host" | "ai" | "system",
      content: m.content,
      created_at: m.created_at,
    })),
    propertyContext,
    orgSettings,
    knowledgeBase: knowledgeBase || [],
  };
};

export const detectLanguage = (text: string): "fr" | "en" => {
  const frenchIndicators = [
    "bonjour", "merci", "salut", "bienvenue", "appartement",
    "logement", "arrivée", "départ", "clé", "clef", "comment",
    "quand", "où", "pourquoi", "est-ce que", "s'il vous plaît",
  ];

  const lowerText = text.toLowerCase();
  const frenchCount = frenchIndicators.filter((w) =>
    lowerText.includes(w)
  ).length;

  // If 2 or more French indicators, it's likely French
  return frenchCount >= 2 ? "fr" : "en";
};
