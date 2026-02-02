"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { ConversationWithProperty } from "@/types/database";
import type { ConversationDisplayStatus } from "./conversation-list";

interface ConversationItemProps {
  conversation: ConversationWithProperty;
  lastMessageContent?: string;
  displayStatus: ConversationDisplayStatus;
  isSelected?: boolean;
  onClick?: () => void;
}

const statusConfig: Record<
  ConversationDisplayStatus,
  { label: string; className: string }
> = {
  needs_review: {
    label: "Needs Review",
    className: "bg-red-50 text-red-600 border-red-100",
  },
  pending: {
    label: "Pending",
    className: "bg-orange-50 text-orange-600 border-orange-100",
  },
  ai_replied: {
    label: "AI Replied",
    className: "bg-green-50 text-green-600 border-green-100",
  },
};

const avatarColors = [
  "bg-blue-100 text-blue-600",
  "bg-purple-100 text-purple-600",
  "bg-green-100 text-green-600",
  "bg-orange-100 text-orange-600",
  "bg-pink-100 text-pink-600",
  "bg-teal-100 text-teal-600",
];

const getAvatarColor = (name: string) => {
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

export const ConversationItem = ({
  conversation,
  lastMessageContent,
  displayStatus,
  isSelected,
  onClick,
}: ConversationItemProps) => {
  const getInitials = (name: string | null): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: fr,
      });
    } catch {
      return "";
    }
  };

  const statusInfo = statusConfig[displayStatus];
  const guestName = conversation.guest_name || "Guest";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 border-l-4 border-transparent p-4 text-left transition-colors hover:bg-muted/50",
        isSelected && "border-l-primary bg-primary/5"
      )}
      aria-selected={isSelected}
      role="option"
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback
          className={cn("text-sm font-medium", getAvatarColor(guestName))}
        >
          {getInitials(conversation.guest_name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{guestName}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDate(conversation.last_message_at)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          {conversation.property && (
            <>
              <Home className="h-3 w-3" />
              <span className="truncate">@{conversation.property.name}</span>
            </>
          )}
        </div>

        {lastMessageContent && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {lastMessageContent}
          </p>
        )}

        {statusInfo && (
          <span
            className={cn(
              "mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              statusInfo.className
            )}
          >
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
            {statusInfo.label}
          </span>
        )}
      </div>
    </button>
  );
};
