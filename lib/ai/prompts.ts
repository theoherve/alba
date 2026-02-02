import type { AIPromptContext, PropertyContext } from "@/types/ai";
import type { Message, AIKnowledgeBase, OrganizationAISettings } from "@/types/database";

export const SYSTEM_PROMPT = `Tu es un assistant professionnel pour un hôte Airbnb. Tu aides à répondre aux messages des voyageurs de manière chaleureuse mais professionnelle.

RÈGLES IMPORTANTES:
1. Réponds TOUJOURS dans la langue du voyageur (français ou anglais)
2. Sois chaleureux mais professionnel
3. Ne fais JAMAIS de promesses que tu ne peux pas tenir
4. Si tu n'es pas sûr d'une information, dis que tu vas vérifier
5. Utilise les informations du logement quand c'est pertinent
6. Base-toi sur les réponses précédemment approuvées quand c'est possible

FORMAT DE RÉPONSE (JSON):
{
  "response": "ta réponse au voyageur",
  "confidence": 0.85,
  "reasoning": "explication de ton niveau de confiance",
  "detected_intent": "type de question (check_in, amenities, location, booking, other)"
}

CALCUL DE LA CONFIANCE:
- 0.9-1.0: Question simple, réponse dans la base de connaissances
- 0.7-0.9: Question standard, réponse basée sur les infos du logement
- 0.5-0.7: Question complexe, nécessite peut-être vérification
- 0.0-0.5: Question hors périmètre ou information manquante`;

export const buildGuestResponsePrompt = ({
  guestMessage,
  guestLanguage,
  conversationHistory,
  propertyContext,
  orgSettings,
  knowledgeBase,
}: AIPromptContext): string => {
  const languageInstruction = guestLanguage === "fr" 
    ? "Réponds en FRANÇAIS."
    : "Respond in ENGLISH.";

  const toneInstruction = getToneInstruction(orgSettings.tone);

  const propertyInfo = formatPropertyContext(propertyContext);
  const historyText = formatConversationHistory(conversationHistory);
  const knowledgeText = formatKnowledgeBase(knowledgeBase);

  return `${languageInstruction}

${toneInstruction}

## INFORMATIONS SUR LE LOGEMENT
${propertyInfo}

## BASE DE CONNAISSANCES (réponses approuvées)
${knowledgeText}

## HISTORIQUE DE LA CONVERSATION
${historyText}

## MESSAGE ACTUEL DU VOYAGEUR
${guestMessage}

---

Analyse le message du voyageur et génère une réponse appropriée.
Rappel: Réponds au format JSON avec response, confidence, reasoning, et detected_intent.`;
};

const getToneInstruction = (tone: string): string => {
  switch (tone) {
    case "friendly":
      return "Ton: Amical et décontracté, utilise des formulations chaleureuses.";
    case "casual":
      return "Ton: Décontracté et informel, comme un ami qui aide.";
    case "professional":
    default:
      return "Ton: Professionnel mais chaleureux, courtois et efficace.";
  }
};

const formatPropertyContext = (property: PropertyContext): string => {
  const parts: string[] = [];

  parts.push(`Nom: ${property.name}`);

  if (property.description) {
    parts.push(`Description: ${property.description}`);
  }

  if (property.check_in_instructions) {
    parts.push(`Instructions d'arrivée: ${property.check_in_instructions}`);
  }

  if (property.house_rules) {
    parts.push(`Règlement: ${property.house_rules}`);
  }

  if (property.amenities && property.amenities.length > 0) {
    parts.push(`Équipements: ${property.amenities.join(", ")}`);
  }

  return parts.join("\n");
};

const formatConversationHistory = (
  history: Pick<Message, "source" | "content" | "created_at">[]
): string => {
  if (history.length === 0) {
    return "Aucun historique (première conversation)";
  }

  return history
    .slice(-10) // Last 10 messages for context
    .map((msg) => {
      const role = msg.source === "guest" ? "VOYAGEUR" : "HÔTE";
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");
};

const formatKnowledgeBase = (
  knowledge: Pick<AIKnowledgeBase, "question_pattern" | "approved_response">[]
): string => {
  if (knowledge.length === 0) {
    return "Aucune réponse approuvée disponible.";
  }

  return knowledge
    .slice(0, 5) // Top 5 most relevant
    .map((k, i) => `${i + 1}. Question type: ${k.question_pattern}\n   Réponse: ${k.approved_response}`)
    .join("\n\n");
};

export const INTENT_CATEGORIES = {
  check_in: ["arrivée", "check-in", "clé", "clef", "heure", "entrée", "arrival", "key", "time"],
  check_out: ["départ", "check-out", "sortie", "checkout", "departure", "leave"],
  amenities: ["wifi", "parking", "équipement", "piscine", "climatisation", "chauffage", "amenities", "facilities"],
  location: ["adresse", "comment venir", "transport", "métro", "bus", "address", "directions", "getting there"],
  booking: ["réservation", "dates", "modification", "annulation", "booking", "cancel", "change"],
  issue: ["problème", "ne fonctionne pas", "cassé", "urgent", "problem", "broken", "not working"],
  other: [],
} as const;

export type IntentCategory = keyof typeof INTENT_CATEGORIES;
