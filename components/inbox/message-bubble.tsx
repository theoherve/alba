"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Bot, UserCircle } from "lucide-react";
import type { Message } from "@/types/database";

interface MessageBubbleProps {
  message: Message;
  guestName?: string;
}

export const MessageBubble = ({ message, guestName }: MessageBubbleProps) => {
  const isGuest = message.source === "guest";
  const isAI = message.source === "ai";

  const formatTime = (date: string) => {
    try {
      return format(new Date(date), "HH:mm", { locale: fr });
    } catch {
      return "";
    }
  };

  if (message.source === "system") {
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
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs",
            isGuest
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-100 text-emerald-600"
          )}
        >
          {isGuest ? (
            <UserCircle className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex max-w-[70%] flex-col",
          isGuest ? "items-start" : "items-end"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isGuest
              ? "rounded-tl-sm bg-muted"
              : "rounded-tr-sm bg-emerald-500 text-white"
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
        <div
          className={cn(
            "mt-1 flex items-center gap-2 text-xs text-muted-foreground",
            isGuest ? "flex-row" : "flex-row-reverse"
          )}
        >
          <span>{formatTime(message.created_at)}</span>
          {isAI && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              AI
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
