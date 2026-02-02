"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConversationStatus = "needs_review" | "pending" | "ai_replied" | "resolved";

export interface ConversationCardProps {
  id: string;
  guestName: string;
  propertyName: string;
  message: string;
  timestamp: string;
  status: ConversationStatus;
}

const statusConfig: Record<ConversationStatus, { label: string; className: string }> = {
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
  resolved: {
    label: "Resolved",
    className: "bg-gray-50 text-gray-600 border-gray-100",
  },
};

const avatarColors = [
  "bg-blue-100 text-blue-600",
  "bg-purple-100 text-purple-600",
  "bg-green-100 text-green-600",
  "bg-orange-100 text-orange-600",
  "bg-pink-100 text-pink-600",
  "bg-teal-100 text-teal-600",
];

const getAvatarColor = (name: string) => {
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins} min`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  return `${diffDays}d`;
};

export const ConversationCard = ({
  id,
  guestName,
  propertyName,
  message,
  timestamp,
  status,
}: ConversationCardProps) => {
  const statusInfo = statusConfig[status];

  return (
    <Link
      href={`/inbox/${id}`}
      className="block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className={cn("text-sm font-medium", getAvatarColor(guestName))}>
            {getInitials(guestName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {guestName}
              </h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Home className="h-3 w-3" />
                <span className="truncate">{propertyName}</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTimestamp(timestamp)}
            </span>
          </div>
          
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {message}
          </p>
          
          <div className="mt-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                statusInfo.className
              )}
            >
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
