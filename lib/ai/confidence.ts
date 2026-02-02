import type { AIGeneratedResponse } from "@/types/ai";
import type { AIKnowledgeBase } from "@/types/database";
import { INTENT_CATEGORIES, type IntentCategory } from "./prompts";

export interface ConfidenceFactors {
  knowledgeBaseMatch: number;
  intentClarity: number;
  contextCompleteness: number;
  responseQuality: number;
}

/**
 * Validate and potentially adjust the confidence score from the AI
 */
export const validateConfidence = (
  aiResponse: AIGeneratedResponse,
  context: {
    knowledgeBase: AIKnowledgeBase[];
    hasPropertyInfo: boolean;
    conversationLength: number;
  }
): number => {
  const factors = calculateConfidenceFactors(aiResponse, context);
  
  // Calculate weighted average
  const weights = {
    knowledgeBaseMatch: 0.3,
    intentClarity: 0.25,
    contextCompleteness: 0.25,
    responseQuality: 0.2,
  };

  const weightedScore =
    factors.knowledgeBaseMatch * weights.knowledgeBaseMatch +
    factors.intentClarity * weights.intentClarity +
    factors.contextCompleteness * weights.contextCompleteness +
    factors.responseQuality * weights.responseQuality;

  // Average with AI's reported confidence
  const finalConfidence = (aiResponse.confidence + weightedScore) / 2;

  // Clamp to valid range
  return Math.max(0, Math.min(1, finalConfidence));
};

const calculateConfidenceFactors = (
  aiResponse: AIGeneratedResponse,
  context: {
    knowledgeBase: AIKnowledgeBase[];
    hasPropertyInfo: boolean;
    conversationLength: number;
  }
): ConfidenceFactors => {
  return {
    knowledgeBaseMatch: calculateKnowledgeBaseMatch(
      aiResponse.detected_intent,
      context.knowledgeBase
    ),
    intentClarity: calculateIntentClarity(aiResponse.detected_intent),
    contextCompleteness: calculateContextCompleteness(context),
    responseQuality: calculateResponseQuality(aiResponse.response),
  };
};

const calculateKnowledgeBaseMatch = (
  intent: string,
  knowledgeBase: AIKnowledgeBase[]
): number => {
  if (knowledgeBase.length === 0) return 0.5;

  // Check if there are knowledge base entries that might match this intent
  const potentialMatches = knowledgeBase.filter((kb) =>
    kb.question_pattern.toLowerCase().includes(intent.toLowerCase())
  );

  if (potentialMatches.length === 0) return 0.5;

  // Higher confidence if we have successful responses
  const avgSuccessRate =
    potentialMatches.reduce((sum, kb) => sum + (kb.success_rate || 0), 0) /
    potentialMatches.length;

  return Math.min(1, 0.5 + avgSuccessRate * 0.5);
};

const calculateIntentClarity = (intent: string): number => {
  const intentLower = intent.toLowerCase();

  // Check if intent matches a known category
  for (const [category, keywords] of Object.entries(INTENT_CATEGORIES)) {
    if (category === intent || keywords.some((k) => intentLower.includes(k))) {
      return category === "other" ? 0.6 : 0.9;
    }
  }

  return 0.5;
};

const calculateContextCompleteness = (context: {
  hasPropertyInfo: boolean;
  conversationLength: number;
}): number => {
  let score = 0.5;

  if (context.hasPropertyInfo) score += 0.3;
  if (context.conversationLength > 0) score += 0.1;
  if (context.conversationLength > 3) score += 0.1;

  return Math.min(1, score);
};

const calculateResponseQuality = (response: string): number => {
  const length = response.length;

  // Too short or too long responses are suspicious
  if (length < 20) return 0.3;
  if (length > 1000) return 0.6;

  // Check for problematic patterns
  const problematicPatterns = [
    /je ne sais pas/i,
    /i don't know/i,
    /vérifier/i,
    /check with/i,
    /peut-être/i,
    /maybe/i,
    /je pense/i,
    /i think/i,
  ];

  const hasUncertainty = problematicPatterns.some((p) => p.test(response));
  if (hasUncertainty) return 0.6;

  return 0.85;
};

/**
 * Determine the action based on confidence score and threshold
 */
export const determineAction = (
  confidence: number,
  threshold: number
): "auto_sent" | "suggested" | "escalated" => {
  if (confidence >= threshold) {
    return "auto_sent";
  }

  if (confidence >= 0.5) {
    return "suggested";
  }

  return "escalated";
};
