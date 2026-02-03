"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ConversationList,
  type EnrichedConversation,
  type ConversationDisplayStatus,
} from "@/components/inbox";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganizationStore } from "@/hooks/use-organization";
import { useRealtimeConversations } from "@/hooks/use-realtime";
import { conversationsService } from "@/services/conversations";
import { messagesService } from "@/services/messages";
import { aiResponsesService } from "@/services/ai-responses";
import { organizationsService } from "@/services/organizations";
import { MessageSquare } from "lucide-react";
import type { ConversationWithProperty, User, AIResponse } from "@/types/database";

const getDisplayStatus = (
  conversation: ConversationWithProperty,
  lastMessageSource: string | undefined,
  latestAiResponse: AIResponse | null
): ConversationDisplayStatus => {
  if (latestAiResponse?.action_taken === "escalated") {
    return "needs_review";
  }
  if (
    latestAiResponse?.action_taken === "suggested" &&
    !latestAiResponse.user_feedback
  ) {
    return "pending";
  }
  if (lastMessageSource === "ai") {
    return "ai_replied";
  }
  return "ai_replied";
};

const InboxPage = () => {
  const router = useRouter();
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useRealtimeConversations();

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setUser(profile);

      if (!currentOrganization) {
        const orgs = await organizationsService.getByUserId(supabase, authUser.id);
        if (orgs.length > 0) {
          setOrganizations(orgs);
          setCurrentOrganization(orgs[0]);
        }
      }
    };

    loadData();
  }, [currentOrganization, router, setCurrentOrganization, setOrganizations]);

  useEffect(() => {
    const loadConversations = async () => {
      if (!currentOrganization) return;

      setIsLoading(true);
      const supabase = createClient();

      try {
        const convs = await conversationsService.getByOrganization(
          supabase,
          currentOrganization.id
        );

        if (convs.length === 0) {
          setConversations([]);
          setIsLoading(false);
          return;
        }

        const ids = convs.map((c) => c.id);

        const [lastMessagesMap, latestAiResponsesMap] = await Promise.all([
          messagesService.getLastMessageByConversations(supabase, ids),
          aiResponsesService.getLatestByConversations(supabase, ids),
        ]);

        const enriched: EnrichedConversation[] = convs.map((conv) => {
          const lastMsg = lastMessagesMap.get(conv.id);
          const latestAi = latestAiResponsesMap.get(conv.id);
          const displayStatus = getDisplayStatus(
            conv,
            lastMsg?.source,
            latestAi || null
          );

          return {
            ...conv,
            lastMessageContent: lastMsg?.content,
            displayStatus,
          };
        });

        setConversations(enriched);
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [currentOrganization]);

  const handleSelectConversation = (id: string) => {
    router.push(`/inbox/${id}`);
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <div className="w-[380px] shrink-0">
          <ConversationList
            conversations={conversations}
            onSelect={handleSelectConversation}
            isLoading={isLoading}
          />
        </div>

        {/* Empty State */}
        <div className="flex flex-1 items-center justify-center bg-muted/30">
          <EmptyState
            icon={<MessageSquare className="h-8 w-8" />}
            title="Select a conversation"
            description="Choose a conversation from the list to view messages"
          />
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
