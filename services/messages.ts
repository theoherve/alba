import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Message, MessageSource } from "@/types/database";

export const messagesService = {
  async getByConversation(
    supabase: SupabaseClient<Database>,
    conversationId: string,
  ): Promise<Message[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(
    supabase: SupabaseClient<Database>,
    data: {
      conversation_id: string;
      content: string;
      source: MessageSource;
      sent_by_user_id?: string;
      gmail_message_id?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<Message> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: message, error } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: data.conversation_id,
        content: data.content,
        source: data.source,
        sent_by_user_id: data.sent_by_user_id,
        gmail_message_id: data.gmail_message_id,
        metadata: data.metadata || {},
        status: data.source === "guest" ? "delivered" : "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return message;
  },

  async updateStatus(
    supabase: SupabaseClient<Database>,
    id: string,
    status: "pending" | "sent" | "delivered" | "failed",
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("messages")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
  },

  async getLatestByConversation(
    supabase: SupabaseClient<Database>,
    conversationId: string,
    limit = 10,
  ): Promise<Message[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).reverse(); // Return in chronological order
  },

  async getLastMessageByConversations(
    supabase: SupabaseClient<Database>,
    conversationIds: string[],
  ): Promise<Map<string, Message>> {
    if (conversationIds.length === 0) return new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const map = new Map<string, Message>();
    for (const msg of data || []) {
      if (!map.has(msg.conversation_id)) {
        map.set(msg.conversation_id, msg);
      }
    }
    return map;
  },
};
