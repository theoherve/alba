"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Loader2 } from "lucide-react";

interface ComposeReplyProps {
  onSend: (content: string) => void;
  onGenerateAI?: () => void;
  isLoading?: boolean;
  isGeneratingAI?: boolean;
  disabled?: boolean;
}

export const ComposeReply = ({
  onSend,
  onGenerateAI,
  isLoading,
  isGeneratingAI,
  disabled,
}: ComposeReplyProps) => {
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && !isLoading) {
      onSend(content.trim());
      setContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t bg-card p-4">
      <div className="space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre réponse..."
          rows={3}
          disabled={disabled || isLoading}
          className="resize-none"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onGenerateAI && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onGenerateAI}
                disabled={disabled || isGeneratingAI}
              >
                {isGeneratingAI ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Générer avec IA
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              ⌘ + Entrée pour envoyer
            </span>
            <Button
              type="submit"
              disabled={!content.trim() || isLoading || disabled}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Envoyer
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
