import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateChatCompletion,
  buildGuestResponsePrompt,
  SYSTEM_PROMPT,
  validateConfidence,
  determineAction,
  buildAIContext,
} from "@/lib/ai";
import type { AIGeneratedResponse } from "@/types/ai";

export async function POST(request: Request) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversation_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build AI context
    const context = await buildAIContext(supabase, conversationId);

    if (!context) {
      return NextResponse.json(
        { error: "Could not build context for this conversation" },
        { status: 400 }
      );
    }

    // Generate the prompt
    const userPrompt = buildGuestResponsePrompt(context);

    // Call OpenAI
    const startTime = Date.now();
    const result = await generateChatCompletion(SYSTEM_PROMPT, userPrompt);
    const responseTimeMs = Date.now() - startTime;

    // Parse the response
    let aiResponse: AIGeneratedResponse;
    try {
      aiResponse = JSON.parse(result.content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Validate and adjust confidence
    const { data: knowledgeBase } = await supabase
      .from("ai_knowledge_base")
      .select("*")
      .eq("organization_id", conversationId);

    const validatedConfidence = validateConfidence(aiResponse, {
      knowledgeBase: knowledgeBase || [],
      hasPropertyInfo: !!context.propertyContext.description,
      conversationLength: context.conversationHistory.length,
    });

    // Determine action
    const action = determineAction(
      validatedConfidence,
      context.orgSettings.auto_send_threshold
    );

    // Store the AI response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: storedResponse, error: storeError } = await (supabase as any)
      .from("ai_responses")
      .insert({
        conversation_id: conversationId,
        generated_content: aiResponse.response,
        confidence_score: validatedConfidence,
        action_taken: action,
        reasoning: aiResponse.reasoning,
        model_used: result.model,
        prompt_tokens: result.usage.prompt_tokens,
        completion_tokens: result.usage.completion_tokens,
        response_time_ms: responseTimeMs,
      })
      .select()
      .single();

    if (storeError) {
      console.error("Error storing AI response:", storeError);
    }

    // If action is auto_sent, create and send the message
    if (action === "auto_sent") {
      // Create message
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: message, error: msgError } = await (supabase as any)
        .from("messages")
        .insert({
          conversation_id: conversationId,
          source: "ai",
          content: aiResponse.response,
          status: "pending",
        })
        .select()
        .single();

      if (!msgError && message && storedResponse) {
        // Update AI response with message_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("ai_responses")
          .update({ message_id: message.id })
          .eq("id", storedResponse.id);

        // TODO: Send via Gmail
        // For now, just mark as sent
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("messages")
          .update({ status: "sent" })
          .eq("id", message.id);
      }
    }

    // If escalated, create notification
    if (action === "escalated") {
      // Get organization members
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: conversation } = await (supabase as any)
        .from("conversations")
        .select("organization_id")
        .eq("id", conversationId)
        .single();

      if (conversation) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: members } = await (supabase as any)
          .from("memberships")
          .select("user_id")
          .eq("organization_id", conversation.organization_id)
          .in("role", ["owner", "admin"]);

        // Create notifications for admins
        if (members) {
          for (const member of members) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from("notifications").insert({
              user_id: member.user_id,
              organization_id: conversation.organization_id,
              type: "escalation",
              title: "Réponse IA nécessite vérification",
              content: `Confiance: ${Math.round(validatedConfidence * 100)}%`,
              link: `/inbox/${conversationId}`,
              channel: "both",
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      response: {
        id: storedResponse?.id,
        content: aiResponse.response,
        confidence: validatedConfidence,
        reasoning: aiResponse.reasoning,
        intent: aiResponse.detected_intent,
        action,
      },
      usage: result.usage,
      responseTimeMs,
    });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate AI response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
