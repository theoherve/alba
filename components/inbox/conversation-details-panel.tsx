"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Calendar, CalendarCheck } from "lucide-react";
import type { Property } from "@/types/database";

interface ConversationDetailsPanelProps {
  property: Property | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  lastAiConfidence: number | null;
  propertyId: string | null;
}

const formatDate = (date: string | null) => {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

export const ConversationDetailsPanel = ({
  property,
  checkInDate,
  checkOutDate,
  lastAiConfidence,
  propertyId,
}: ConversationDetailsPanelProps) => {
  if (!property) {
    return (
      <div className="flex h-full flex-col border-l border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Property</h3>
        <div className="mt-4 flex flex-1 flex-col items-center justify-center text-center">
          <Home className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No property assigned to this conversation
          </p>
        </div>
      </div>
    );
  }

  const confidencePercent = lastAiConfidence !== null
    ? Math.round(lastAiConfidence * 100)
    : null;

  const getConfidenceLabel = () => {
    if (confidencePercent === null) return "—";
    if (confidencePercent >= 85) return "High confidence — AI handled this automatically";
    if (confidencePercent >= 60) return "Medium confidence — Review recommended";
    return "Low confidence — Human review required";
  };

  return (
    <div className="flex h-full w-80 flex-col border-l border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground">Property</h3>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">{property.name}</p>
          <p className="text-xs text-muted-foreground">{property.address || "—"}</p>
        </div>

        {/* Stay Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Check-in</p>
              <p className="font-medium">{formatDate(checkInDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Check-out</p>
              <p className="font-medium">{formatDate(checkOutDate)}</p>
            </div>
          </div>
        </div>

        {/* AI Confidence */}
        {(confidencePercent !== null || lastAiConfidence === 0) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">AI Confidence</h4>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last response</span>
                {confidencePercent !== null && (
                  <span className="font-medium">{confidencePercent}%</span>
                )}
              </div>
              {confidencePercent !== null && (
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {getConfidenceLabel()}
              </p>
            </div>
          </div>
        )}
      </div>

      {propertyId && (
        <Link href={`/properties/${propertyId}`} className="mt-6">
          <Button variant="outline" className="w-full cursor-pointer">
            <Home className="mr-2 h-4 w-4" />
            View Property
          </Button>
        </Link>
      )}
    </div>
  );
};
