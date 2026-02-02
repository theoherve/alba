"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { messagesService } from "@/services/messages";
import type { MessageSource } from "@/types/database";

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: (data: {
      conversation_id: string;
      content: string;
      source: MessageSource;
      sent_by_user_id?: string;
    }) => messagesService.create(supabase, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", variables.conversation_id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
