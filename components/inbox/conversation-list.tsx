"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationItem } from "./conversation-item";
import { EmptyState } from "@/components/shared/empty-state";
import { Loading } from "@/components/shared/loading";
import { Search, MessageSquare, Filter } from "lucide-react";
import type { ConversationWithProperty, ConversationStatus } from "@/types/database";

interface ConversationListProps {
  conversations: ConversationWithProperty[];
  selectedId?: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  onFilterChange?: (status: ConversationStatus | "all") => void;
}

export const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  onFilterChange,
}: ConversationListProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationStatus | "all">("all");

  const handleFilterChange = (value: string) => {
    const newFilter = value as ConversationStatus | "all";
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
    if (filter !== "all" && conv.status !== filter) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col border-r bg-card">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="mb-4 text-lg font-semibold">Messages</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={handleFilterChange} className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              Tous
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1">
              Actifs
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex-1">
              Résolus
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
            title="Aucune conversation"
            description={
              search
                ? "Aucun résultat pour cette recherche"
                : "Les nouvelles conversations apparaîtront ici"
            }
            className="m-4"
          />
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
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
