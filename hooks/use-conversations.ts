"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { conversationsService, type ConversationFilters } from "@/services/conversations";
import { useOrganizationStore } from "./use-organization";

export const useConversations = (filters?: ConversationFilters) => {
  const { currentOrganization } = useOrganizationStore();
  const supabase = createClient();

  return useQuery({
    queryKey: ["conversations", currentOrganization?.id, filters],
    queryFn: () =>
      conversationsService.getByOrganization(
        supabase,
        currentOrganization!.id,
        filters
      ),
    enabled: !!currentOrganization?.id,
  });
};

export const useConversation = (id: string) => {
  const supabase = createClient();

  return useQuery({
    queryKey: ["conversation", id],
    queryFn: () => conversationsService.getWithMessages(supabase, id),
    enabled: !!id,
  });
};

export const useMarkConversationAsRead = () => {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: (id: string) => conversationsService.markAsRead(supabase, id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useUpdateConversationStatus = () => {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "active" | "archived" | "resolved";
    }) => conversationsService.updateStatus(supabase, id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useUnreadCount = () => {
  const { currentOrganization } = useOrganizationStore();
  const supabase = createClient();

  return useQuery({
    queryKey: ["unread-count", currentOrganization?.id],
    queryFn: () =>
      conversationsService.getUnreadCount(supabase, currentOrganization!.id),
    enabled: !!currentOrganization?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
