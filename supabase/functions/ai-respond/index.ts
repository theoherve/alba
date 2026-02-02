import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import { generateCompletion, SYSTEM_PROMPT } from "../_shared/openai.ts";

interface AIResponse {
  response: string;
  confidence: number;
  reasoning: string;
  detected_intent: string;
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return new Response(
        JSON.stringify({ error: "conversation_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createSupabaseClient();

    // Get conversation with context
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        *,
        property:properties(name, description, check_in_instructions, house_rules),
        messages(source, content, created_at),
        organization:organizations(ai_settings)
      `)
      .eq("id", conversation_id)
      .order("created_at", { referencedTable: "messages", ascending: true })
      .single();

    if (convError || !conversation) {
      throw new Error("Conversation not found");
    }

    // Get latest guest message
    const guestMessages = conversation.messages.filter(
      (m: { source: string }) => m.source === "guest"
    );
    const latestMessage = guestMessages[guestMessages.length - 1];

    if (!latestMessage) {
      return new Response(
        JSON.stringify({ error: "No guest message to respond to" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get knowledge base
    const { data: knowledgeBase } = await supabase
      .from("ai_knowledge_base")
      .select("question_pattern, approved_response")
      .eq("organization_id", conversation.organization_id)
      .limit(5);

    // Build prompt
    const language = conversation.language === "fr" ? "français" : "English";
    const propertyInfo = conversation.property
      ? `Logement: ${conversation.property.name}
Description: ${conversation.property.description || "N/A"}
Check-in: ${conversation.property.check_in_instructions || "N/A"}
Règles: ${conversation.property.house_rules || "N/A"}`
      : "Aucune information sur le logement";

    const history = conversation.messages
      .slice(-10)
      .map((m: { source: string; content: string }) => 
        `${m.source === "guest" ? "VOYAGEUR" : "HÔTE"}: ${m.content}`
      )
      .join("\n\n");

    const kbText = knowledgeBase?.length
      ? knowledgeBase
          .map((k: { question_pattern: string; approved_response: string }) => 
            `Q: ${k.question_pattern}\nR: ${k.approved_response}`
          )
          .join("\n\n")
      : "Aucune réponse approuvée";

    const userPrompt = `Réponds en ${language}.

## LOGEMENT
${propertyInfo}

## BASE DE CONNAISSANCES
${kbText}

## HISTORIQUE
${history}

## MESSAGE ACTUEL
${latestMessage.content}

Génère une réponse JSON.`;

    // Call OpenAI
    const startTime = Date.now();
    const completion = await generateCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);
    const responseTimeMs = Date.now() - startTime;

    // Parse response
    let aiResponse: AIResponse;
    try {
      aiResponse = JSON.parse(completion.choices[0].message.content);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    // Get threshold from org settings
    const threshold = conversation.organization?.ai_settings?.auto_send_threshold || 0.85;

    // Determine action
    const action =
      aiResponse.confidence >= threshold
        ? "auto_sent"
        : aiResponse.confidence >= 0.5
        ? "suggested"
        : "escalated";

    // Store AI response
    const { data: storedResponse } = await supabase
      .from("ai_responses")
      .insert({
        conversation_id,
        generated_content: aiResponse.response,
        confidence_score: aiResponse.confidence,
        action_taken: action,
        reasoning: aiResponse.reasoning,
        model_used: completion.model,
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        response_time_ms: responseTimeMs,
      })
      .select()
      .single();

    // If auto_sent, create message
    if (action === "auto_sent") {
      const { data: message } = await supabase
        .from("messages")
        .insert({
          conversation_id,
          source: "ai",
          content: aiResponse.response,
          status: "sent",
        })
        .select()
        .single();

      if (message && storedResponse) {
        await supabase
          .from("ai_responses")
          .update({ message_id: message.id })
          .eq("id", storedResponse.id);
      }
    }

    // If escalated, create notifications
    if (action === "escalated") {
      const { data: members } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("organization_id", conversation.organization_id)
        .in("role", ["owner", "admin"]);

      if (members) {
        for (const member of members) {
          await supabase.from("notifications").insert({
            user_id: member.user_id,
            organization_id: conversation.organization_id,
            type: "escalation",
            title: "Réponse IA nécessite vérification",
            content: `Confiance: ${Math.round(aiResponse.confidence * 100)}%`,
            link: `/inbox/${conversation_id}`,
            channel: "both",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        action,
        response_id: storedResponse?.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI respond error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
