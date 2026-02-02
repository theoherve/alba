import { gmailClient } from "./client";

export interface SendReplyParams {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
  threadId: string;
  inReplyToMessageId?: string;
}

export const gmailSender = {
  /**
   * Send a reply to a conversation thread
   */
  async sendReply({
    accessToken,
    to,
    subject,
    body,
    threadId,
    inReplyToMessageId,
  }: SendReplyParams): Promise<{ messageId: string; threadId: string }> {
    // Ensure subject starts with "Re:" if not already
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

    const result = await gmailClient.sendMessage(
      accessToken,
      to,
      replySubject,
      body,
      threadId,
      inReplyToMessageId
    );

    return {
      messageId: result.id,
      threadId: result.threadId,
    };
  },

  /**
   * Format a message for sending via Airbnb relay
   * The message will be sent to Airbnb's relay email and forwarded to the guest
   */
  formatMessageForAirbnb(
    message: string,
    hostName?: string,
    signature?: string
  ): string {
    let formattedMessage = message.trim();

    // Add signature if provided
    if (signature) {
      formattedMessage += `\n\n${signature}`;
    } else if (hostName) {
      formattedMessage += `\n\n${hostName}`;
    }

    return formattedMessage;
  },
};
