"use client";

import Link from "next/link";
import { Home, MessageSquare, Bot, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PropertyCardProps {
  id: string;
  name: string;
  address: string;
  activeConversations: number;
  pendingCount: number;
  aiActive: boolean;
  imageUrl?: string;
}

export const PropertyCard = ({
  id,
  name,
  address,
  activeConversations,
  pendingCount,
  aiActive,
}: PropertyCardProps) => {
  return (
    <Link
      href={`/properties/${id}`}
      className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      {/* Property thumbnail */}
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Home className="h-7 w-7 text-muted-foreground" />
      </div>

      {/* Property info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground truncate">
          {name}
        </h4>
        <p className="text-xs text-muted-foreground truncate">{address}</p>

        {/* Stats */}
        <div className="mt-2 flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{activeConversations} active</span>
          </div>

          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {pendingCount}
              </span>
              pending
            </span>
          )}

          {aiActive && (
            <div className="flex items-center gap-1 text-xs font-medium text-green-600">
              <Bot className="h-3.5 w-3.5" />
              <span>AI active</span>
            </div>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
};
