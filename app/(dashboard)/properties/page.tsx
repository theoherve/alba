"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { PropertyCard } from "@/components/properties/property-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Loading } from "@/components/shared/loading";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrganizationStore } from "@/hooks/use-organization";
import { propertiesService } from "@/services/properties";
import { organizationsService } from "@/services/organizations";
import { toast } from "sonner";
import { Plus, Home } from "lucide-react";
import type { Property, User } from "@/types/database";

const PropertiesPage = () => {
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      // Get current user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

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
  }, [currentOrganization, setCurrentOrganization, setOrganizations]);

  useEffect(() => {
    const loadProperties = async () => {
      if (!currentOrganization) return;

      setIsLoading(true);
      const supabase = createClient();

      try {
        const props = await propertiesService.getByOrganization(
          supabase,
          currentOrganization.id
        );
        setProperties(props);
      } catch (error) {
        console.error("Error loading properties:", error);
        toast.error("Erreur lors du chargement des logements");
      } finally {
        setIsLoading(false);
      }
    };

    loadProperties();
  }, [currentOrganization]);

  const handleDelete = async () => {
    if (!deleteId) return;

    const supabase = createClient();

    try {
      await propertiesService.softDelete(supabase, deleteId);
      setProperties((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success("Logement supprimé");
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <Header user={user} title="Logements" />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Mes logements</h1>
              <p className="text-muted-foreground">
                Gérez vos biens immobiliers et leur configuration IA
              </p>
            </div>
            <Link href="/properties/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un logement
              </Button>
            </Link>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loading size="lg" text="Chargement des logements..." />
            </div>
          ) : properties.length === 0 ? (
            <EmptyState
              icon={<Home className="h-8 w-8" />}
              title="Aucun logement"
              description="Ajoutez votre premier logement pour commencer à automatiser vos réponses"
              action={{
                label: "Ajouter un logement",
                onClick: () => (window.location.href = "/properties/new"),
              }}
              className="h-64"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onDelete={setDeleteId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce logement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les conversations associées seront
              conservées mais ne seront plus liées à ce logement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PropertiesPage;
