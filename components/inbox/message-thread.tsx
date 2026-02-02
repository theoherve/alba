"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { AiSuggestionCard } from "./ai-suggestion-card";
import { Loading } from "@/components/shared/loading";
import type { Message, AIResponse } from "@/types/database";

interface MessageThreadProps {
  messages: Message[];
  aiSuggestion?: AIResponse | null;
  isLoading?: boolean;
  onApproveSuggestion?: (suggestion: AIResponse) => void;
  onEditSuggestion?: (suggestion: AIResponse, editedContent: string) => void;
  onRejectSuggestion?: (suggestion: AIResponse) => void;
}

export const MessageThread = ({
  messages,
  aiSuggestion,
  isLoading,
  onApproveSuggestion,
  onEditSuggestion,
  onRejectSuggestion,
}: MessageThreadProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loading size="lg" text="Chargement des messages..." />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* AI Suggestion Card */}
        {aiSuggestion && (
          <AiSuggestionCard
            suggestion={aiSuggestion}
            onApprove={() => onApproveSuggestion?.(aiSuggestion)}
            onEdit={(content) => onEditSuggestion?.(aiSuggestion, content)}
            onReject={() => onRejectSuggestion?.(aiSuggestion)}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
};
