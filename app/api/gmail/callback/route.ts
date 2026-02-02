import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gmailClient } from "@/lib/gmail/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("Gmail OAuth error:", error);
    return NextResponse.redirect(
      `${origin}/settings/gmail?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/settings/gmail?error=missing_params`
    );
  }

  try {
    // Decode state to get organization_id
    const stateData = JSON.parse(Buffer.from(state, "base64").toString());
    const { organization_id: organizationId } = stateData;

    if (!organizationId) {
      throw new Error("Missing organization_id in state");
    }

    // Exchange code for tokens
    const tokens = await gmailClient.exchangeCodeForTokens(code);

    // Get user email
    const email = await gmailClient.getUserEmail(tokens.access_token);

    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    // Verify user is member of the organization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membership } = await (supabase as any)
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if connection already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingConnection } = await (supabase as any)
      .from("gmail_connections")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .single();

    if (existingConnection) {
      // Update existing connection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("gmail_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id);
    } else {
      // Create new connection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("gmail_connections").insert({
        organization_id: organizationId,
        user_id: user.id,
        email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        is_active: true,
      });
    }

    return NextResponse.redirect(`${origin}/settings/gmail?success=true`);
  } catch (err) {
    console.error("Gmail callback error:", err);
    const message =
      err instanceof Error ? err.message : "Une erreur est survenue";
    return NextResponse.redirect(
      `${origin}/settings/gmail?error=${encodeURIComponent(message)}`
    );
  }
}
