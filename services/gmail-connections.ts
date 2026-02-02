import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, GmailConnection } from "@/types/database";
import { gmailClient } from "@/lib/gmail/client";

export const gmailConnectionsService = {
  async getByOrganization(
    supabase: SupabaseClient<Database>,
    organizationId: string
  ): Promise<GmailConnection[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("gmail_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getActiveConnection(
    supabase: SupabaseClient<Database>,
    organizationId: string
  ): Promise<GmailConnection | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("gmail_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getValidAccessToken(
    supabase: SupabaseClient<Database>,
    connection: GmailConnection
  ): Promise<string> {
    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = new Date(connection.token_expires_at!);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow && connection.access_token) {
      return connection.access_token;
    }

    // Token expired, need to refresh
    if (!connection.refresh_token) {
      throw new Error("No refresh token available");
    }

    const tokens = await gmailClient.refreshAccessToken(connection.refresh_token);
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Update tokens in database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("gmail_connections")
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return tokens.access_token;
  },

  async updateSyncCursor(
    supabase: SupabaseClient<Database>,
    connectionId: string,
    cursor: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("gmail_connections")
      .update({
        sync_cursor: cursor,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (error) throw error;
  },

  async deactivate(
    supabase: SupabaseClient<Database>,
    connectionId: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("gmail_connections")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (error) throw error;
  },

  async activate(
    supabase: SupabaseClient<Database>,
    connectionId: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("gmail_connections")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (error) throw error;
  },

  async delete(
    supabase: SupabaseClient<Database>,
    connectionId: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("gmail_connections")
      .delete()
      .eq("id", connectionId);

    if (error) throw error;
  },

  generateAuthUrl(organizationId: string): string {
    const state = Buffer.from(
      JSON.stringify({ organization_id: organizationId })
    ).toString("base64");

    return gmailClient.getAuthUrl(state);
  },
};
