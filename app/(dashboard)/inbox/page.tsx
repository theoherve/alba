"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ConversationList } from "@/components/inbox";
import { EmptyState } from "@/components/shared/empty-state";
import { Header } from "@/components/layout/header";
import { useOrganizationStore } from "@/hooks/use-organization";
import { useRealtimeConversations } from "@/hooks/use-realtime";
import { conversationsService, type ConversationFilters } from "@/services/conversations";
import { organizationsService } from "@/services/organizations";
import { MessageSquare } from "lucide-react";
import type { ConversationWithProperty, User, ConversationStatus } from "@/types/database";

const InboxPage = () => {
  const router = useRouter();
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<ConversationWithProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ConversationFilters>({});

  // Enable realtime updates
  useRealtimeConversations();

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

      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [currentOrganization, filters]);

  const handleSelectConversation = (id: string) => {
    router.push(`/inbox/${id}`);
  };

  const handleFilterChange = (status: ConversationStatus | "all") => {
    setFilters((prev) => ({
      ...prev,
      status: status === "all" ? undefined : status,
    }));
  };

  return (
    <div className="flex h-screen flex-col">
      <Header user={user} title="Messages" />

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <div className="w-96">
          <ConversationList
            conversations={conversations}
            onSelect={handleSelectConversation}
            isLoading={isLoading}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Empty State */}
        <div className="flex flex-1 items-center justify-center bg-muted/30">
          <EmptyState
            icon={<MessageSquare className="h-8 w-8" />}
            title="Sélectionnez une conversation"
            description="Choisissez une conversation dans la liste pour afficher les messages"
          />
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
