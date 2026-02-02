"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ConversationList, MessageThread, ComposeReply } from "@/components/inbox";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrganizationStore } from "@/hooks/use-organization";
import { useRealtimeConversations, useRealtimeMessages } from "@/hooks/use-realtime";
import { conversationsService, type ConversationFilters } from "@/services/conversations";
import { messagesService } from "@/services/messages";
import { aiResponsesService } from "@/services/ai-responses";
import { organizationsService } from "@/services/organizations";
import { toast } from "sonner";
import { MoreVertical, Archive, CheckCircle, Home } from "lucide-react";
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

const ConversationPage = ({ params }: ConversationPageProps) => {
  const { conversationId } = use(params);
  const router = useRouter();
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();

  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<ConversationWithProperty[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<ConversationWithMessages | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [filters, setFilters] = useState<ConversationFilters>({});

  // Enable realtime updates
  useRealtimeConversations();
  useRealtimeMessages(conversationId);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      // Get current user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setUser(profile);

      // Get organizations if not set
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
          currentOrganization.id,
          filters
        );
        setConversations(convs);
      } catch (error) {
        console.error("Error loading conversations:", error);
      }
    };

    loadConversations();
  }, [currentOrganization, filters]);

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

        // Mark as read
        if (conv && conv.unread_count > 0) {
          await conversationsService.markAsRead(supabase, conversationId);
        }

        // Get latest AI suggestion
        const suggestion = await aiResponsesService.getLatestSuggestion(
          supabase,
          conversationId
        );
        setAiSuggestion(suggestion);
      } catch (error) {
        console.error("Error loading conversation:", error);
        toast.error("Erreur lors du chargement de la conversation");
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  const handleSelectConversation = (id: string) => {
    router.push(`/inbox/${id}`);
  };

  const handleFilterChange = (status: ConversationStatus | "all") => {
    setFilters((prev) => ({
      ...prev,
      status: status === "all" ? undefined : status,
    }));
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

      // Reload conversation
      const conv = await conversationsService.getWithMessages(
        supabase,
        conversationId
      );
      setCurrentConversation(conv);
      setAiSuggestion(null);

      toast.success("Message envoyé");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setIsSending(false);
    }
  };

  const handleApproveSuggestion = async (suggestion: AIResponse) => {
    await handleSendMessage(suggestion.generated_content);

    // Update feedback
    const supabase = createClient();
    await aiResponsesService.updateFeedback(supabase, suggestion.id, "approved");
  };

  const handleEditSuggestion = async (suggestion: AIResponse, content: string) => {
    await handleSendMessage(content);

    // Update feedback
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

      setCurrentConversation((prev) =>
        prev ? { ...prev, status } : null
      );

      toast.success(
        status === "resolved"
          ? "Conversation marquée comme résolue"
          : "Conversation archivée"
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <Header user={user} title="Messages" />

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <div className="w-96">
          <ConversationList
            conversations={conversations}
            selectedId={conversationId}
            onSelect={handleSelectConversation}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Conversation View */}
        <div className="flex flex-1 flex-col">
          {currentConversation && (
            <>
              {/* Conversation Header */}
              <div className="flex items-center justify-between border-b bg-card px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">
                      {currentConversation.guest_name || "Voyageur"}
                    </h2>
                    {currentConversation.status === "resolved" && (
                      <Badge variant="secondary">Résolu</Badge>
                    )}
                  </div>
                  {currentConversation.property && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Home className="h-3 w-3" />
                      {currentConversation.property.name}
                    </p>
                  )}
                </div>

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
                      Marquer comme résolu
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUpdateStatus("archived")}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archiver
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

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
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationPage;
