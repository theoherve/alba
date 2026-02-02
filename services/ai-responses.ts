import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AIResponse, AIAction } from "@/types/database";

export const aiResponsesService = {
  async getByConversation(
    supabase: SupabaseClient<Database>,
    conversationId: string,
  ): Promise<AIResponse[]> {
    const { data, error } = await supabase
      .from("ai_responses")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getLatestSuggestion(
    supabase: SupabaseClient<Database>,
    conversationId: string,
  ): Promise<AIResponse | null> {
    const { data, error } = await supabase
      .from("ai_responses")
      .select("*")
      .eq("conversation_id", conversationId)
      .in("action_taken", ["suggested", "escalated"])
      .is("user_feedback", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getLatestByConversation(
    supabase: SupabaseClient<Database>,
    conversationId: string,
  ): Promise<AIResponse | null> {
    const { data, error } = await supabase
      .from("ai_responses")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getLatestByConversations(
    supabase: SupabaseClient<Database>,
    conversationIds: string[],
  ): Promise<Map<string, AIResponse>> {
    if (conversationIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from("ai_responses")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const map = new Map<string, AIResponse>();
    for (const resp of data || []) {
      if (!map.has(resp.conversation_id)) {
        map.set(resp.conversation_id, resp);
      }
    }
    return map;
  },

  async create(
    supabase: SupabaseClient<Database>,
    data: {
      conversation_id: string;
      message_id?: string;
      generated_content: string;
      confidence_score: number;
      action_taken: AIAction;
      reasoning?: string;
      model_used?: string;
      prompt_tokens?: number;
      completion_tokens?: number;
      response_time_ms?: number;
    },
  ): Promise<AIResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: response, error } = await (supabase as any)
      .from("ai_responses")
      .insert({
        conversation_id: data.conversation_id,
        message_id: data.message_id,
        generated_content: data.generated_content,
        confidence_score: data.confidence_score,
        action_taken: data.action_taken,
        reasoning: data.reasoning,
        model_used: data.model_used || "gpt-4",
        prompt_tokens: data.prompt_tokens,
        completion_tokens: data.completion_tokens,
        response_time_ms: data.response_time_ms,
      })
      .select()
      .single();

    if (error) throw error;
    return response;
  },

  async updateFeedback(
    supabase: SupabaseClient<Database>,
    id: string,
    feedback: "approved" | "edited" | "rejected",
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("ai_responses")
      .update({ user_feedback: feedback })
      .eq("id", id);

    if (error) throw error;
  },

  async getStatsByOrganization(
    supabase: SupabaseClient<Database>,
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    total: number;
    auto_sent: number;
    suggested: number;
    escalated: number;
    avg_confidence: number;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawData, error } = await (supabase as any)
      .from("ai_responses")
      .select(
        `
        action_taken,
        confidence_score,
        conversation:conversations!inner(organization_id)
      `,
      )
      .eq("conversation.organization_id", organizationId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (error) throw error;

    type ResponseData = {
      action_taken: string;
      confidence_score: number | null;
    };
    const data = (rawData || []) as ResponseData[];

    const stats = {
      total: data.length,
      auto_sent: data.filter((r) => r.action_taken === "auto_sent").length,
      suggested: data.filter((r) => r.action_taken === "suggested").length,
      escalated: data.filter((r) => r.action_taken === "escalated").length,
      avg_confidence:
        data.length > 0
          ? data.reduce((sum, r) => sum + (r.confidence_score || 0), 0) /
            data.length
          : 0,
    };

    return stats;
  },
};
