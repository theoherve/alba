import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Notification, NotificationType, NotificationChannel } from "@/types/database";

export const notificationsService = {
  async getByUser(
    supabase: SupabaseClient<Database>,
    userId: string,
    options?: { limit?: number; unreadOnly?: boolean }
  ): Promise<Notification[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async create(
    supabase: SupabaseClient<Database>,
    data: {
      user_id: string;
      organization_id?: string;
      type: NotificationType;
      title: string;
      content?: string;
      link?: string;
      channel?: NotificationChannel;
    }
  ): Promise<Notification> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: notification, error } = await (supabase as any)
      .from("notifications")
      .insert({
        user_id: data.user_id,
        organization_id: data.organization_id,
        type: data.type,
        title: data.title,
        content: data.content,
        link: data.link,
        channel: data.channel || "in_app",
      })
      .select()
      .single();

    if (error) throw error;
    return notification;
  },

  async markAsRead(
    supabase: SupabaseClient<Database>,
    id: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) throw error;
  },

  async markAllAsRead(
    supabase: SupabaseClient<Database>,
    userId: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
  },

  async getUnreadCount(
    supabase: SupabaseClient<Database>,
    userId: string
  ): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
    return count || 0;
  },
};
