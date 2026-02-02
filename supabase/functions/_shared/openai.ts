const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export const generateCompletion = async (
  messages: ChatMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<ChatCompletionResponse> => {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model || "gpt-4-turbo-preview",
      messages,
      max_tokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenAI API error");
  }

  return response.json();
};

export const SYSTEM_PROMPT = `Tu es un assistant professionnel pour un hôte Airbnb. Tu aides à répondre aux messages des voyageurs de manière chaleureuse mais professionnelle.

RÈGLES:
1. Réponds TOUJOURS dans la langue du voyageur
2. Sois chaleureux mais professionnel
3. Ne fais JAMAIS de promesses impossibles
4. Si incertain, dis que tu vas vérifier

FORMAT DE RÉPONSE (JSON):
{
  "response": "ta réponse",
  "confidence": 0.85,
  "reasoning": "explication",
  "detected_intent": "type de question"
}`;
