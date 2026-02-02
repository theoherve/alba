import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

const RESEND_API_URL = "https://api.resend.com/emails";

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
};

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { notification_id } = await req.json();

    if (!notification_id) {
      return new Response(
        JSON.stringify({ error: "notification_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createSupabaseClient();

    // Get notification with user info
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .select(`
        *,
        user:users(email, full_name, locale)
      `)
      .eq("id", notification_id)
      .single();

    if (notifError || !notification) {
      throw new Error("Notification not found");
    }

    // Skip if already sent or channel is in_app only
    if (notification.email_sent_at || notification.channel === "in_app") {
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build email content
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@alba.app";
    const appUrl = Deno.env.get("APP_URL") || "https://alba.app";
    const locale = notification.user?.locale || "fr";

    const subject =
      locale === "fr"
        ? `Alba - ${notification.title}`
        : `Alba - ${notification.title}`;

    const html = buildEmailHtml({
      title: notification.title,
      content: notification.content,
      link: notification.link ? `${appUrl}${notification.link}` : null,
      locale,
      userName: notification.user?.full_name,
    });

    // Send email
    const sent = await sendEmail({
      from: fromEmail,
      to: notification.user?.email,
      subject,
      html,
    });

    if (sent) {
      // Update notification
      await supabase
        .from("notifications")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", notification_id);
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send notification error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildEmailHtml({
  title,
  content,
  link,
  locale,
  userName,
}: {
  title: string;
  content: string | null;
  link: string | null;
  locale: string;
  userName: string | null;
}): string {
  const greeting = locale === "fr"
    ? `Bonjour${userName ? ` ${userName}` : ""}`
    : `Hello${userName ? ` ${userName}` : ""}`;

  const buttonText = locale === "fr" ? "Voir les détails" : "View Details";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 32px;">
    <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0; color: #111;">Alba</h1>
    <p style="color: #666; margin: 0 0 24px 0;">${greeting},</p>
    
    <div style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">${title}</h2>
      ${content ? `<p style="color: #555; margin: 0;">${content}</p>` : ""}
    </div>
    
    ${link ? `
    <a href="${link}" style="display: inline-block; background: #111; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
      ${buttonText}
    </a>
    ` : ""}
    
    <p style="color: #999; font-size: 12px; margin: 24px 0 0 0;">
      ${locale === "fr" 
        ? "Cet email a été envoyé par Alba. Vous recevez cet email car vous avez activé les notifications."
        : "This email was sent by Alba. You're receiving this because you have notifications enabled."}
    </p>
  </div>
</body>
</html>
  `.trim();
}
