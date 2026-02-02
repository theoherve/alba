"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ConversationList,
  MessageThread,
  ComposeReply,
  ConversationDetailsPanel,
} from "@/components/inbox";
import {
  type EnrichedConversation,
  type ConversationDisplayStatus,
} from "@/components/inbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganizationStore } from "@/hooks/use-organization";
import { useRealtimeConversations, useRealtimeMessages } from "@/hooks/use-realtime";
import { conversationsService } from "@/services/conversations";
import { messagesService } from "@/services/messages";
import { aiResponsesService } from "@/services/ai-responses";
import { organizationsService } from "@/services/organizations";
import { toast } from "sonner";
import {
  MoreVertical,
  Archive,
  CheckCircle,
  Home,
  Bot,
  Hand,
  MessageSquare,
} from "lucide-react";
import type {
  ConversationWithProperty,
  ConversationWithMessages,
  User,
  AIResponse,
  ConversationStatus,
} from "@/types/database";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

const getDisplayStatus = (
  conversation: ConversationWithProperty,
  lastMessageSource: string | undefined,
  latestAiResponse: AIResponse | null
): ConversationDisplayStatus => {
  // Needs Review: AI couldn't respond, visitor asks for human (escalated)
  if (latestAiResponse?.action_taken === "escalated") {
    return "needs_review";
  }
  // Pending: AI is generating/suggesting, waiting for human approval
  if (
    latestAiResponse?.action_taken === "suggested" &&
    !latestAiResponse.user_feedback
  ) {
    return "pending";
  }
  // AI Replied: Last message was from AI (auto_sent)
  if (lastMessageSource === "ai") {
    return "ai_replied";
  }
  return "ai_replied";
};

const ConversationPage = ({ params }: ConversationPageProps) => {
  const { conversationId } = use(params);
  const router = useRouter();
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();

  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<ConversationWithMessages | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AIResponse | null>(null);
  const [lastAiResponse, setLastAiResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<ConversationDisplayStatus | "all">("all");

  useRealtimeConversations();
  useRealtimeMessages(conversationId);

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

      const supabase = createClient();

      try {
        const convs = await conversationsService.getByOrganization(
          supabase,
          currentOrganization.id
        );

        if (convs.length === 0) {
          setConversations([]);
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
      }
    };

    loadConversations();
  }, [currentOrganization, filter]);

  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId) return;

      setIsLoading(true);
      const supabase = createClient();

      try {
        const conv = await conversationsService.getWithMessages(
          supabase,
          conversationId
        );
        setCurrentConversation(conv);

        if (conv && conv.unread_count > 0) {
          await conversationsService.markAsRead(supabase, conversationId);
        }

        const [suggestion, latestAi] = await Promise.all([
          aiResponsesService.getLatestSuggestion(supabase, conversationId),
          aiResponsesService.getLatestByConversation(supabase, conversationId),
        ]);

        setAiSuggestion(suggestion);
        setLastAiResponse(latestAi);
      } catch (error) {
        console.error("Error loading conversation:", error);
        toast.error("Error loading conversation");
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  const handleSelectConversation = (id: string) => {
    router.push(`/inbox/${id}`);
  };

  const handleFilterChange = (newFilter: ConversationDisplayStatus | "all") => {
    setFilter(newFilter);
  };

  const handleSendMessage = async (content: string) => {
    if (!currentConversation || !user) return;

    setIsSending(true);
    const supabase = createClient();

    try {
      await messagesService.create(supabase, {
        conversation_id: currentConversation.id,
        content,
        source: "host",
        sent_by_user_id: user.id,
      });

      const conv = await conversationsService.getWithMessages(
        supabase,
        conversationId
      );
      setCurrentConversation(conv);
      setAiSuggestion(null);

      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error sending message");
    } finally {
      setIsSending(false);
    }
  };

  const handleApproveSuggestion = async (suggestion: AIResponse) => {
    await handleSendMessage(suggestion.generated_content);

    const supabase = createClient();
    await aiResponsesService.updateFeedback(supabase, suggestion.id, "approved");
  };

  const handleEditSuggestion = async (suggestion: AIResponse, content: string) => {
    await handleSendMessage(content);

    const supabase = createClient();
    await aiResponsesService.updateFeedback(supabase, suggestion.id, "edited");
  };

  const handleRejectSuggestion = async (suggestion: AIResponse) => {
    const supabase = createClient();
    await aiResponsesService.updateFeedback(supabase, suggestion.id, "rejected");
    setAiSuggestion(null);
  };

  const handleUpdateStatus = async (status: ConversationStatus) => {
    if (!currentConversation) return;

    const supabase = createClient();

    try {
      await conversationsService.updateStatus(
        supabase,
        currentConversation.id,
        status
      );
      setCurrentConversation((prev) => (prev ? { ...prev, status } : null));
      toast.success(
        status === "resolved"
          ? "Conversation marked as resolved"
          : "Conversation archived"
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error updating status");
    }
  };

  const handleToggleAiDisabled = async () => {
    if (!currentConversation) return;

    const supabase = createClient();
    const newValue = !currentConversation.ai_disabled;

    try {
      await conversationsService.updateAiDisabled(
        supabase,
        currentConversation.id,
        newValue
      );
      setCurrentConversation((prev) =>
        prev ? { ...prev, ai_disabled: newValue } : null
      );
      toast.success(
        newValue
          ? "Automatic AI replies disabled for this conversation"
          : "Automatic AI replies enabled for this conversation"
      );
    } catch (error) {
      console.error("Error toggling AI:", error);
      toast.error("Error updating AI settings");
    }
  };

  const getConversationDisplayStatus = (): ConversationDisplayStatus => {
    if (!currentConversation) return "ai_replied";

    const lastMsg =
      currentConversation.messages[currentConversation.messages.length - 1];
    return getDisplayStatus(
      currentConversation,
      lastMsg?.source,
      lastAiResponse || aiSuggestion
    );
  };

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

  const displayStatus = getConversationDisplayStatus();
  const statusInfo = statusConfig[displayStatus];
  const aiDisabled = currentConversation?.ai_disabled ?? false;

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <div className="w-[380px] shrink-0">
          <ConversationList
            conversations={conversations}
            selectedId={conversationId}
            onSelect={handleSelectConversation}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Conversation View */}
        <div className="flex flex-1 flex-col">
          {currentConversation ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {currentConversation.guest_name || "Guest"}
                    </h2>
                    {currentConversation.property && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Home className="h-3 w-3" />
                        @ {currentConversation.property.name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}
                  >
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleAiDisabled}
                    className="cursor-pointer"
                  >
                    <Hand className="mr-2 h-4 w-4" />
                    {aiDisabled
                      ? "Réactiver les réponses automatiques"
                      : "Désactiver les réponses automatiques"}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus("resolved")}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as resolved
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus("archived")}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* AI Banner */}
              {!aiDisabled && currentConversation.property && (
                <div className="flex items-center gap-2 border-b border-border bg-emerald-50 px-6 py-3">
                  <Bot className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-emerald-800">
                    AI is active and will auto-reply to this conversation
                  </span>
                </div>
              )}

              {/* Messages */}
              <MessageThread
                messages={currentConversation.messages}
                aiSuggestion={aiSuggestion}
                isLoading={isLoading}
                onApproveSuggestion={handleApproveSuggestion}
                onEditSuggestion={handleEditSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
              />

              {/* Compose */}
              <ComposeReply
                onSend={handleSendMessage}
                isLoading={isSending}
                disabled={currentConversation.status !== "active"}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-muted/30">
              <EmptyState
                icon={<MessageSquare className="h-8 w-8" />}
                title="Select a conversation"
                description="Choose a conversation from the list to view messages"
              />
            </div>
          )}
        </div>

        {/* Property Details Panel */}
        {currentConversation && (
          <ConversationDetailsPanel
            property={currentConversation.property ?? null}
            checkInDate={currentConversation.check_in_date}
            checkOutDate={currentConversation.check_out_date}
            lastAiConfidence={
              lastAiResponse?.confidence_score ?? aiSuggestion?.confidence_score ?? null
            }
            propertyId={currentConversation.property_id}
          />
        )}
      </div>
    </div>
  );
};

export default ConversationPage;
