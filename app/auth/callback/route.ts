import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const onboarding = searchParams.get("onboarding") === "true";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`);
  }

  // Collect cookies set by exchangeCodeForSession so we can attach them to our redirect response
  const cookiesToSet: {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach((cookie) =>
            cookiesToSet.push({
              name: cookie.name,
              value: cookie.value,
              options: cookie.options,
            }),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`);
  }

  // Determine final redirect URL
  let destination = redirectTo;
  if (onboarding) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: memberships } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!memberships || memberships.length === 0) {
        destination = "/onboarding";
      }
    }
  }

  const response = NextResponse.redirect(`${origin}${destination}`);
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options ?? {}),
  );

  return response;
}
