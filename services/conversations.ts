import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Conversation,
  ConversationWithProperty,
  ConversationWithMessages,
  ConversationStatus,
} from "@/types/database";

export interface ConversationFilters {
  status?: ConversationStatus;
  property_id?: string;
  search?: string;
  has_unread?: boolean;
}

export const conversationsService = {
  async getByOrganization(
    supabase: SupabaseClient<Database>,
    organizationId: string,
    filters?: ConversationFilters,
  ): Promise<ConversationWithProperty[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("conversations")
      .select(
        `
        *,
        property:properties(id, name)
      `,
      )
      .eq("organization_id", organizationId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.property_id) {
      query = query.eq("property_id", filters.property_id);
    }

    if (filters?.has_unread) {
      query = query.gt("unread_count", 0);
    }

    if (filters?.search) {
      query = query.or(
        `guest_name.ilike.%${filters.search}%,guest_email.ilike.%${filters.search}%`,
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as ConversationWithProperty[];
  },

  async getById(
    supabase: SupabaseClient<Database>,
    id: string,
  ): Promise<Conversation | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data;
  },

  async getWithMessages(
    supabase: SupabaseClient<Database>,
    id: string,
  ): Promise<ConversationWithMessages | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("conversations")
      .select(
        `
        *,
        property:properties(*),
        messages(*)
      `,
      )
      .eq("id", id)
      .order("created_at", { referencedTable: "messages", ascending: true })
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as ConversationWithMessages;
  },

  async updateStatus(
    supabase: SupabaseClient<Database>,
    id: string,
    status: ConversationStatus,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("conversations")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
  },

  async markAsRead(
    supabase: SupabaseClient<Database>,
    id: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("conversations")
      .update({ unread_count: 0 })
      .eq("id", id);

    if (error) throw error;
  },

  async getUnreadCount(
    supabase: SupabaseClient<Database>,
    organizationId: string,
  ): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("conversations")
      .select("unread_count")
      .eq("organization_id", organizationId)
      .gt("unread_count", 0);

    if (error) throw error;

    return (data || []).reduce(
      (sum: number, conv: { unread_count: number }) => sum + conv.unread_count,
      0,
    );
  },

  async assignProperty(
    supabase: SupabaseClient<Database>,
    conversationId: string,
    propertyId: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("conversations")
      .update({ property_id: propertyId })
      .eq("id", conversationId);

    if (error) throw error;
  },

  async updateAiDisabled(
    supabase: SupabaseClient<Database>,
    conversationId: string,
    aiDisabled: boolean,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("conversations")
      .update({ ai_disabled: aiDisabled })
      .eq("id", conversationId);

    if (error) throw error;
  },
};
