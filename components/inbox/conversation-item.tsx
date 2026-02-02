"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { ConversationWithProperty } from "@/types/database";

interface ConversationItemProps {
  conversation: ConversationWithProperty;
  isSelected?: boolean;
  onClick?: () => void;
}

export const ConversationItem = ({
  conversation,
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

  const getStatusBadge = () => {
    switch (conversation.status) {
      case "resolved":
        return (
          <Badge variant="secondary" className="text-xs">
            Résolu
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="text-xs">
            Archivé
          </Badge>
        );
      default:
        return null;
    }
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

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50",
        isSelected && "bg-muted"
      )}
      aria-selected={isSelected}
      role="option"
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {getInitials(conversation.guest_name)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">
            {conversation.guest_name || "Voyageur"}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDate(conversation.last_message_at)}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          {conversation.property && (
            <span className="truncate text-xs text-muted-foreground">
              {conversation.property.name}
            </span>
          )}
          {getStatusBadge()}
        </div>

        {/* Unread indicator */}
        {conversation.unread_count > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
            </span>
            <span className="truncate text-sm text-muted-foreground">
              nouveaux messages
            </span>
          </div>
        )}
      </div>
    </button>
  );
};
