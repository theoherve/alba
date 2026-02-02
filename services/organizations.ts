import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Organization, OrganizationWithMemberships } from "@/types/database";

export const organizationsService = {
  async getByUserId(
    supabase: SupabaseClient<Database>,
    userId: string
  ): Promise<Organization[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("memberships")
      .select("organization:organizations(*)")
      .eq("user_id", userId)
      .is("organization.deleted_at", null);

    if (error) throw error;

    return (data || [])
      .map((m: { organization: Organization | null }) => m.organization)
      .filter((org: Organization | null): org is Organization => org !== null);
  },

  async getById(
    supabase: SupabaseClient<Database>,
    id: string
  ): Promise<Organization | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("organizations")
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

  async getWithMembers(
    supabase: SupabaseClient<Database>,
    id: string
  ): Promise<OrganizationWithMemberships | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("organizations")
      .select(`
        *,
        memberships(
          *,
          user:users(*)
        )
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as OrganizationWithMemberships;
  },

  async create(
    supabase: SupabaseClient<Database>,
    data: { name: string; slug: string },
    userId: string
  ): Promise<Organization> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // Create organization
    const { data: org, error: orgError } = await sb
      .from("organizations")
      .insert({
        name: data.name,
        slug: data.slug,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Create owner membership
    const { error: memberError } = await sb.from("memberships").insert({
      user_id: userId,
      organization_id: org.id,
      role: "owner",
    });

    if (memberError) {
      // Rollback org creation
      await sb.from("organizations").delete().eq("id", org.id);
      throw memberError;
    }

    return org;
  },

  async update(
    supabase: SupabaseClient<Database>,
    id: string,
    data: Partial<Pick<Organization, "name" | "ai_settings">>
  ): Promise<Organization> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org, error } = await (supabase as any)
      .from("organizations")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return org;
  },

  async checkSlugAvailable(
    supabase: SupabaseClient<Database>,
    slug: string
  ): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    return data === null;
  },

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
  },
};
