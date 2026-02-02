"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, MoreVertical, Edit, Trash2, MessageSquare } from "lucide-react";
import type { Property } from "@/types/database";

interface PropertyCardProps {
  property: Property;
  conversationCount?: number;
  onDelete?: (id: string) => void;
}

export const PropertyCard = ({
  property,
  conversationCount = 0,
  onDelete,
}: PropertyCardProps) => {
  return (
    <Card className="group relative">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{property.name}</CardTitle>
            {property.address && (
              <p className="text-sm text-muted-foreground">{property.address}</p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/properties/${property.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete?.(property.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {conversationCount} conversation{conversationCount !== 1 ? "s" : ""}
            </span>
          </div>

          <Badge variant={property.is_active ? "default" : "secondary"}>
            {property.is_active ? "Actif" : "Inactif"}
          </Badge>
        </div>

        {property.description && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {property.description}
          </p>
        )}

        <div className="mt-4">
          <Link href={`/properties/${property.id}`}>
            <Button variant="outline" size="sm" className="w-full">
              Voir les détails
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
