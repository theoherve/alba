"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationItem } from "./conversation-item";
import { EmptyState } from "@/components/shared/empty-state";
import { Loading } from "@/components/shared/loading";
import { Search, MessageSquare } from "lucide-react";
import type { ConversationWithProperty, ConversationStatus } from "@/types/database";

export type ConversationDisplayStatus = "needs_review" | "pending" | "ai_replied";

export interface EnrichedConversation extends ConversationWithProperty {
  lastMessageContent?: string;
  displayStatus: ConversationDisplayStatus;
}

interface ConversationListProps {
  conversations: EnrichedConversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  onFilterChange?: (filter: ConversationDisplayStatus | "all") => void;
}

export const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  onFilterChange,
}: ConversationListProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationDisplayStatus | "all">("all");

  const handleFilterChange = (value: string) => {
    const newFilter = value as ConversationDisplayStatus | "all";
    setFilter(newFilter);
    onFilterChange?.(newFilter);
  };

  const filteredConversations = conversations.filter((conv) => {
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        conv.guest_name?.toLowerCase().includes(searchLower) ||
        conv.guest_email?.toLowerCase().includes(searchLower) ||
        conv.property?.name?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    if (filter !== "all" && conv.displayStatus !== filter) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      {/* Search */}
      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Tabs */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => handleFilterChange("all")}
            className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-muted text-foreground"
                : "bg-transparent text-muted-foreground hover:bg-muted/50"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("needs_review")}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filter === "needs_review"
                ? "bg-muted text-foreground"
                : "bg-transparent text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Review
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange("pending")}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filter === "pending"
                ? "bg-muted text-foreground"
                : "bg-transparent text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Pending
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loading size="md" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-6 w-6" />}
            title="No conversations"
            description={
              search
                ? "No results for this search"
                : filter !== "all"
                  ? `No ${filter.replace("_", " ")} conversations`
                  : "New conversations will appear here"
            }
            className="m-4"
          />
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                lastMessageContent={conversation.lastMessageContent}
                displayStatus={conversation.displayStatus}
                isSelected={conversation.id === selectedId}
                onClick={() => onSelect(conversation.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
