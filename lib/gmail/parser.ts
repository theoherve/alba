import { AIRBNB_EMAIL_DOMAINS } from "@/lib/constants";
import type { GmailMessage } from "./client";

export interface ParsedAirbnbEmail {
  isAirbnbEmail: boolean;
  threadId: string;
  messageId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  body: string;
  guestName: string | null;
  guestEmail: string | null;
  listingName: string | null;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  messageType: "guest_message" | "booking_confirmation" | "other";
}

const getHeader = (
  headers: Array<{ name: string; value: string }>,
  name: string
): string | null => {
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value || null;
};

const decodeBase64 = (data: string): string => {
  try {
    // Gmail uses URL-safe base64
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
};

const extractBody = (message: GmailMessage): string => {
  // Try to get body from parts
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    // Fall back to HTML if no plain text
    for (const part of message.payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = decodeBase64(part.body.data);
        // Basic HTML to text conversion
        return html
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim();
      }
    }
  }

  // Try direct body
  if (message.payload.body?.data) {
    return decodeBase64(message.payload.body.data);
  }

  return "";
};

const isAirbnbEmail = (from: string): boolean => {
  return AIRBNB_EMAIL_DOMAINS.some((domain) =>
    from.toLowerCase().includes(domain)
  );
};

const extractGuestInfo = (
  body: string,
  subject: string
): { guestName: string | null; guestEmail: string | null } => {
  let guestName: string | null = null;
  let guestEmail: string | null = null;

  // Try to extract guest name from common patterns
  const namePatterns = [
    /Message de ([A-Za-zÀ-ÿ\s]+)/i,
    /([A-Za-zÀ-ÿ\s]+) vous a envoyé un message/i,
    /Nouveau message de ([A-Za-zÀ-ÿ\s]+)/i,
    /Message from ([A-Za-z\s]+)/i,
    /([A-Za-z\s]+) sent you a message/i,
  ];

  for (const pattern of namePatterns) {
    const match = body.match(pattern) || subject.match(pattern);
    if (match) {
      guestName = match[1].trim();
      break;
    }
  }

  // Try to extract email
  const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const emailMatch = body.match(emailPattern);
  if (emailMatch && !emailMatch[1].includes("airbnb")) {
    guestEmail = emailMatch[1];
  }

  return { guestName, guestEmail };
};

const extractDates = (
  body: string
): { checkIn: Date | null; checkOut: Date | null } => {
  let checkIn: Date | null = null;
  let checkOut: Date | null = null;

  // Common date patterns
  const datePatterns = [
    // French format: 15 janvier 2024 - 20 janvier 2024
    /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})\s*[-–]\s*(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i,
    // English format: Jan 15, 2024 - Jan 20, 2024
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\s*[-–]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i,
    // ISO format: 2024-01-15 - 2024-01-20
    /(\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})/,
  ];

  for (const pattern of datePatterns) {
    const match = body.match(pattern);
    if (match) {
      try {
        // Simplified date parsing - in production, use a proper date library
        if (pattern.source.includes("janvier")) {
          // French format
          const frenchMonths: Record<string, number> = {
            janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
            juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
          };
          checkIn = new Date(
            parseInt(match[3]),
            frenchMonths[match[2].toLowerCase()],
            parseInt(match[1])
          );
          checkOut = new Date(
            parseInt(match[6]),
            frenchMonths[match[5].toLowerCase()],
            parseInt(match[4])
          );
        } else if (pattern.source.includes("Jan")) {
          // English format
          const englishMonths: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
          };
          checkIn = new Date(
            parseInt(match[3]),
            englishMonths[match[1].toLowerCase()],
            parseInt(match[2])
          );
          checkOut = new Date(
            parseInt(match[6]),
            englishMonths[match[4].toLowerCase()],
            parseInt(match[5])
          );
        } else {
          // ISO format
          checkIn = new Date(match[1]);
          checkOut = new Date(match[2]);
        }
        break;
      } catch {
        // Date parsing failed, continue to next pattern
      }
    }
  }

  return { checkIn, checkOut };
};

const extractListingName = (body: string, subject: string): string | null => {
  const patterns = [
    /pour\s+["']?([^"'\n]+)["']?\s*(?:le|du|:)/i,
    /at\s+["']?([^"'\n]+)["']?\s*(?:on|from|:)/i,
    /votre logement\s+["']?([^"'\n]+)["']?/i,
    /your listing\s+["']?([^"'\n]+)["']?/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern) || subject.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
};

const determineMessageType = (
  body: string,
  subject: string
): "guest_message" | "booking_confirmation" | "other" => {
  const lowerBody = body.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  if (
    lowerSubject.includes("nouveau message") ||
    lowerSubject.includes("new message") ||
    lowerBody.includes("vous a envoyé un message") ||
    lowerBody.includes("sent you a message")
  ) {
    return "guest_message";
  }

  if (
    lowerSubject.includes("confirmation") ||
    lowerSubject.includes("réservation") ||
    lowerSubject.includes("booking") ||
    lowerBody.includes("réservation confirmée") ||
    lowerBody.includes("booking confirmed")
  ) {
    return "booking_confirmation";
  }

  return "other";
};

export const parseAirbnbEmail = (message: GmailMessage): ParsedAirbnbEmail => {
  const headers = message.payload.headers;
  const from = getHeader(headers, "From") || "";
  const to = getHeader(headers, "To") || "";
  const subject = getHeader(headers, "Subject") || "";
  const dateStr = getHeader(headers, "Date") || "";
  const body = extractBody(message);

  const isAirbnb = isAirbnbEmail(from);
  const { guestName, guestEmail } = extractGuestInfo(body, subject);
  const { checkIn, checkOut } = extractDates(body);
  const listingName = extractListingName(body, subject);
  const messageType = determineMessageType(body, subject);

  return {
    isAirbnbEmail: isAirbnb,
    threadId: message.threadId,
    messageId: message.id,
    from,
    to,
    subject,
    date: new Date(dateStr),
    body,
    guestName,
    guestEmail,
    listingName,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    messageType,
  };
};

export const extractGuestMessage = (body: string): string => {
  // Try to extract just the guest's message from the email body
  // Airbnb emails often have a lot of boilerplate
  
  const markers = [
    // French
    /Message\s*:\s*\n([\s\S]*?)(?:\n\n|Répondre|Voir la conversation)/i,
    // English
    /Message\s*:\s*\n([\s\S]*?)(?:\n\n|Reply|View conversation)/i,
    // Generic quote block
    /"([^"]+)"/,
  ];

  for (const pattern of markers) {
    const match = body.match(pattern);
    if (match && match[1].trim().length > 10) {
      return match[1].trim();
    }
  }

  // If no pattern matches, try to get the first meaningful paragraph
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 20);
  if (paragraphs.length > 0) {
    // Skip the first paragraph if it looks like a header
    const firstPara = paragraphs[0].trim();
    if (
      firstPara.toLowerCase().includes("vous a envoyé") ||
      firstPara.toLowerCase().includes("sent you")
    ) {
      return paragraphs[1]?.trim() || firstPara;
    }
    return firstPara;
  }

  return body.trim();
};
