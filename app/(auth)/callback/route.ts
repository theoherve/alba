import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";
  const onboarding = searchParams.get("onboarding") === "true";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user needs onboarding (no organization)
      if (onboarding) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: memberships } = await supabase
            .from("memberships")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (!memberships || memberships.length === 0) {
            return NextResponse.redirect(`${origin}/onboarding`);
          }
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // Auth error, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
