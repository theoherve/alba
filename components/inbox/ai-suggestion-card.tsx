"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Check, Edit2, X, AlertTriangle } from "lucide-react";
import type { AIResponse } from "@/types/database";

interface AiSuggestionCardProps {
  suggestion: AIResponse;
  onApprove: () => void;
  onEdit: (content: string) => void;
  onReject: () => void;
}

export const AiSuggestionCard = ({
  suggestion,
  onApprove,
  onEdit,
  onReject,
}: AiSuggestionCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(suggestion.generated_content);

  const confidence = suggestion.confidence_score || 0;
  const isHighConfidence = confidence >= 0.85;
  const isMediumConfidence = confidence >= 0.6 && confidence < 0.85;

  const handleSendEdited = () => {
    onEdit(editedContent);
    setIsEditing(false);
  };

  const getConfidenceBadge = () => {
    if (isHighConfidence) {
      return (
        <Badge variant="default" className="bg-green-600">
          Confiance élevée ({Math.round(confidence * 100)}%)
        </Badge>
      );
    }
    if (isMediumConfidence) {
      return (
        <Badge variant="secondary" className="bg-yellow-500 text-white">
          Confiance moyenne ({Math.round(confidence * 100)}%)
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertTriangle className="mr-1 h-3 w-3" />
        Vérification requise ({Math.round(confidence * 100)}%)
      </Badge>
    );
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-primary" />
            Suggestion Alba IA
          </CardTitle>
          {getConfidenceBadge()}
        </div>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            rows={4}
            className="resize-none"
            autoFocus
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm">{suggestion.generated_content}</p>
        )}

        {suggestion.reasoning && !isEditing && (
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="font-medium">Raisonnement :</span> {suggestion.reasoning}
          </p>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        {isEditing ? (
          <>
            <Button onClick={handleSendEdited} className="flex-1">
              <Check className="mr-2 h-4 w-4" />
              Envoyer
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditedContent(suggestion.generated_content);
              }}
            >
              Annuler
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onApprove} className="flex-1">
              <Check className="mr-2 h-4 w-4" />
              Approuver
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Modifier
            </Button>
            <Button variant="ghost" size="icon" onClick={onReject}>
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};
