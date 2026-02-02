const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
    }>;
  };
  internalDate: string;
}

export const refreshAccessToken = async (
  refreshToken: string
): Promise<GmailTokens> => {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  return response.json();
};

export const listMessages = async (
  accessToken: string,
  query: string,
  maxResults = 50
): Promise<{ messages?: Array<{ id: string; threadId: string }> }> => {
  const params = new URLSearchParams({
    q: query,
    maxResults: maxResults.toString(),
  });

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to list messages");
  }

  return response.json();
};

export const getMessage = async (
  accessToken: string,
  messageId: string
): Promise<GmailMessage> => {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get message");
  }

  return response.json();
};

export const getHeader = (
  headers: Array<{ name: string; value: string }>,
  name: string
): string | null => {
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value || null;
};

export const decodeBase64 = (data: string): string => {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return atob(base64);
  } catch {
    return "";
  }
};

export const extractBody = (message: GmailMessage): string => {
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
  }

  if (message.payload.body?.data) {
    return decodeBase64(message.payload.body.data);
  }

  return "";
};

export const isAirbnbEmail = (from: string): boolean => {
  const domains = ["@airbnb.com", "@guests.airbnb.com", "@host.airbnb.com"];
  return domains.some((domain) => from.toLowerCase().includes(domain));
};

export const detectLanguage = (text: string): "fr" | "en" => {
  const frenchWords = [
    "bonjour", "merci", "salut", "bienvenue", "appartement",
    "logement", "arrivée", "départ", "clé", "clef",
  ];
  const lowerText = text.toLowerCase();
  const frenchCount = frenchWords.filter((w) => lowerText.includes(w)).length;
  return frenchCount >= 2 ? "fr" : "en";
};
