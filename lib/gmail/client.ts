import { GMAIL_SCOPES } from "@/lib/constants";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
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

export interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export const gmailClient = {
  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: "code",
      scope: GMAIL_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  },

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GmailTokens> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || "Failed to exchange code");
    }

    return response.json();
  },

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<GmailTokens> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || "Failed to refresh token");
    }

    return response.json();
  },

  /**
   * Get user's email address
   */
  async getUserEmail(accessToken: string): Promise<string> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get user info");
    }

    const data = await response.json();
    return data.email;
  },

  /**
   * List messages matching a query
   */
  async listMessages(
    accessToken: string,
    query: string,
    maxResults = 50,
    pageToken?: string
  ): Promise<GmailListResponse> {
    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString(),
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to list messages");
    }

    return response.json();
  },

  /**
   * Get a single message by ID
   */
  async getMessage(
    accessToken: string,
    messageId: string
  ): Promise<GmailMessage> {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get message");
    }

    return response.json();
  },

  /**
   * Send a message (reply to a thread)
   */
  async sendMessage(
    accessToken: string,
    to: string,
    subject: string,
    body: string,
    threadId?: string,
    inReplyTo?: string
  ): Promise<{ id: string; threadId: string }> {
    // Build RFC 2822 formatted message
    const headers = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
    ];

    if (inReplyTo) {
      headers.push(`In-Reply-To: ${inReplyTo}`);
      headers.push(`References: ${inReplyTo}`);
    }

    const message = `${headers.join("\r\n")}\r\n\r\n${body}`;
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const payload: Record<string, string> = {
      raw: encodedMessage,
    };

    if (threadId) {
      payload.threadId = threadId;
    }

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to send message");
    }

    return response.json();
  },

  /**
   * Get history changes since a historyId
   */
  async getHistory(
    accessToken: string,
    startHistoryId: string,
    labelId = "INBOX"
  ): Promise<{
    history?: Array<{
      id: string;
      messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
    }>;
    historyId: string;
  }> {
    const params = new URLSearchParams({
      startHistoryId,
      labelId,
      historyTypes: "messageAdded",
    });

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      // 404 means history is too old
      if (response.status === 404) {
        return { historyId: startHistoryId };
      }
      throw new Error("Failed to get history");
    }

    return response.json();
  },
};
