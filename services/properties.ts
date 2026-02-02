import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Property } from "@/types/database";

export const propertiesService = {
  async getByOrganization(
    supabase: SupabaseClient<Database>,
    organizationId: string
  ): Promise<Property[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("properties")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(
    supabase: SupabaseClient<Database>,
    id: string
  ): Promise<Property | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("properties")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data;
  },

  async create(
    supabase: SupabaseClient<Database>,
    data: {
      organization_id: string;
      name: string;
      address?: string;
      description?: string;
      airbnb_listing_url?: string;
      airbnb_listing_id?: string;
      check_in_time?: string;
      check_out_time?: string;
      check_in_instructions?: string;
      house_rules?: string;
      wifi_password?: string;
      access_instructions?: string;
      amenities?: string[];
      ai_settings?: Record<string, unknown>;
    }
  ): Promise<Property> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: property, error } = await (supabase as any)
      .from("properties")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return property;
  },

  async update(
    supabase: SupabaseClient<Database>,
    id: string,
    data: Partial<{
      name: string;
      address: string;
      description: string;
      airbnb_listing_url: string;
      airbnb_listing_id: string;
      check_in_time: string;
      check_out_time: string;
      check_in_instructions: string;
      house_rules: string;
      wifi_password: string;
      access_instructions: string;
      amenities: string[];
      ai_settings: Record<string, unknown>;
      is_active: boolean;
    }>
  ): Promise<Property> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: property, error } = await (supabase as any)
      .from("properties")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return property;
  },

  async softDelete(
    supabase: SupabaseClient<Database>,
    id: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("properties")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", id);

    if (error) throw error;
  },

  async countByOrganization(
    supabase: SupabaseClient<Database>,
    organizationId: string
  ): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (error) throw error;
    return count || 0;
  },
};
