"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Bot, User, UserCircle } from "lucide-react";
import type { Message } from "@/types/database";

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isGuest = message.source === "guest";
  const isAI = message.source === "ai";
  const isSystem = message.source === "system";

  const getIcon = () => {
    switch (message.source) {
      case "guest":
        return <UserCircle className="h-4 w-4" />;
      case "ai":
        return <Bot className="h-4 w-4" />;
      case "host":
        return <User className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (message.source) {
      case "guest":
        return "Voyageur";
      case "ai":
        return "Alba IA";
      case "host":
        return "Vous";
      case "system":
        return "Système";
      default:
        return "";
    }
  };

  const formatTime = (date: string) => {
    try {
      return format(new Date(date), "d MMM, HH:mm", { locale: fr });
    } catch {
      return "";
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isGuest ? "flex-row" : "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs",
            isGuest
              ? "bg-muted text-muted-foreground"
              : isAI
              ? "bg-primary/10 text-primary"
              : "bg-primary text-primary-foreground"
          )}
        >
          {getIcon()}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "flex max-w-[70%] flex-col",
          isGuest ? "items-start" : "items-end"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "mb-1 flex items-center gap-2 text-xs text-muted-foreground",
            isGuest ? "flex-row" : "flex-row-reverse"
          )}
        >
          <span className="font-medium">{getLabel()}</span>
          {isAI && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Auto
            </Badge>
          )}
          <span>{formatTime(message.created_at)}</span>
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isGuest
              ? "rounded-tl-sm bg-muted"
              : "rounded-tr-sm bg-primary text-primary-foreground"
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>

        {/* Status */}
        {!isGuest && message.status !== "delivered" && (
          <span className="mt-1 text-xs text-muted-foreground">
            {message.status === "pending" && "En attente..."}
            {message.status === "sent" && "Envoyé"}
            {message.status === "failed" && "Échec de l'envoi"}
          </span>
        )}
      </div>
    </div>
  );
};
