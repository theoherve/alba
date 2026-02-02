import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import {
  refreshAccessToken,
  listMessages,
  getMessage,
  getHeader,
  extractBody,
  isAirbnbEmail,
  detectLanguage,
} from "../_shared/gmail.ts";

interface SyncResult {
  connection_id: string;
  messages_processed: number;
  conversations_created: number;
  errors: string[];
}

serve(async (req) => {
  try {
    // Verify the request is authenticated (cron job or admin)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseClient();

    // Get all active Gmail connections
    const { data: connections, error: connError } = await supabase
      .from("gmail_connections")
      .select("*, organization:organizations(id, name)")
      .eq("is_active", true);

    if (connError) {
      throw connError;
    }

    const results: SyncResult[] = [];

    for (const connection of connections || []) {
      const result: SyncResult = {
        connection_id: connection.id,
        messages_processed: 0,
        conversations_created: 0,
        errors: [],
      };

      try {
        // Refresh access token if needed
        let accessToken = connection.access_token;
        const expiresAt = new Date(connection.token_expires_at);
        const now = new Date();

        if (expiresAt <= now && connection.refresh_token) {
          const tokens = await refreshAccessToken(connection.refresh_token);
          accessToken = tokens.access_token;

          // Update tokens in database
          await supabase
            .from("gmail_connections")
            .update({
              access_token: tokens.access_token,
              token_expires_at: new Date(
                Date.now() + tokens.expires_in * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);
        }

        // Build query for Airbnb emails
        // Only fetch emails from the last 24 hours or since last sync
        const lastSync = connection.last_sync_at
          ? new Date(connection.last_sync_at)
          : new Date(Date.now() - 24 * 60 * 60 * 1000);

        const afterDate = Math.floor(lastSync.getTime() / 1000);
        const query = `from:airbnb.com after:${afterDate}`;

        // List messages
        const { messages } = await listMessages(accessToken, query, 50);

        if (!messages || messages.length === 0) {
          // Update last sync time
          await supabase
            .from("gmail_connections")
            .update({
              last_sync_at: new Date().toISOString(),
            })
            .eq("id", connection.id);

          results.push(result);
          continue;
        }

        // Process each message
        for (const msgRef of messages) {
          try {
            const message = await getMessage(accessToken, msgRef.id);

            if (!isAirbnbEmail(getHeader(message.payload.headers, "From") || "")) {
              continue;
            }

            const from = getHeader(message.payload.headers, "From") || "";
            const subject = getHeader(message.payload.headers, "Subject") || "";
            const body = extractBody(message);
            const date = new Date(parseInt(message.internalDate));

            // Check if this is a guest message
            const isGuestMessage =
              subject.toLowerCase().includes("message") ||
              subject.toLowerCase().includes("nouveau message") ||
              subject.toLowerCase().includes("new message");

            if (!isGuestMessage) {
              continue;
            }

            // Extract guest name from subject or body
            let guestName: string | null = null;
            const nameMatch =
              body.match(/Message de ([A-Za-zÀ-ÿ\s]+)/i) ||
              body.match(/([A-Za-zÀ-ÿ\s]+) vous a envoyé/i) ||
              body.match(/Message from ([A-Za-z\s]+)/i);

            if (nameMatch) {
              guestName = nameMatch[1].trim();
            }

            // Check if conversation already exists
            const { data: existingConv } = await supabase
              .from("conversations")
              .select("id")
              .eq("organization_id", connection.organization_id)
              .eq("airbnb_thread_id", message.threadId)
              .single();

            let conversationId: string;

            if (existingConv) {
              conversationId = existingConv.id;
            } else {
              // Create new conversation
              const language = detectLanguage(body);

              const { data: newConv, error: convError } = await supabase
                .from("conversations")
                .insert({
                  organization_id: connection.organization_id,
                  guest_name: guestName,
                  airbnb_thread_id: message.threadId,
                  language,
                  status: "active",
                  last_message_at: date.toISOString(),
                  unread_count: 1,
                })
                .select()
                .single();

              if (convError) {
                result.errors.push(
                  `Failed to create conversation: ${convError.message}`
                );
                continue;
              }

              conversationId = newConv.id;
              result.conversations_created++;
            }

            // Check if message already exists
            const { data: existingMsg } = await supabase
              .from("messages")
              .select("id")
              .eq("gmail_message_id", message.id)
              .single();

            if (existingMsg) {
              continue;
            }

            // Extract the actual guest message from the email body
            let guestMessage = body;
            const msgMatch =
              body.match(/Message\s*:\s*\n([\s\S]*?)(?:\n\n|Répondre|Reply)/i) ||
              body.match(/"([^"]+)"/);

            if (msgMatch) {
              guestMessage = msgMatch[1].trim();
            }

            // Create message
            const { error: msgError } = await supabase.from("messages").insert({
              conversation_id: conversationId,
              source: "guest",
              content: guestMessage,
              status: "delivered",
              gmail_message_id: message.id,
              metadata: {
                subject,
                from,
                raw_body_length: body.length,
              },
              created_at: date.toISOString(),
            });

            if (msgError) {
              result.errors.push(
                `Failed to create message: ${msgError.message}`
              );
              continue;
            }

            // Update conversation
            await supabase
              .from("conversations")
              .update({
                last_message_at: date.toISOString(),
                unread_count: supabase.rpc("increment_unread", {
                  conv_id: conversationId,
                }),
              })
              .eq("id", conversationId);

            result.messages_processed++;

            // TODO: Trigger AI response generation
            // This would call the ai-respond function

          } catch (msgError) {
            result.errors.push(
              `Error processing message ${msgRef.id}: ${msgError}`
            );
          }
        }

        // Update last sync time
        await supabase
          .from("gmail_connections")
          .update({
            last_sync_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

      } catch (connError) {
        result.errors.push(`Connection error: ${connError}`);

        // If token refresh failed, deactivate the connection
        if (String(connError).includes("refresh")) {
          await supabase
            .from("gmail_connections")
            .update({ is_active: false })
            .eq("id", connection.id);
        }
      }

      results.push(result);
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        processed_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Gmail sync error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
