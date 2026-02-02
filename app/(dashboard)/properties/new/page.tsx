"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { PropertyForm } from "@/components/properties/property-form";
import { useOrganizationStore } from "@/hooks/use-organization";
import { organizationsService } from "@/services/organizations";
import type { User } from "@/types/database";

const NewPropertyPage = () => {
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);

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

  if (!currentOrganization) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      <Header user={user} title="Nouveau logement" />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Ajouter un logement</h1>
            <p className="text-muted-foreground">
              Configurez les informations de votre nouveau bien
            </p>
          </div>

          <PropertyForm organizationId={currentOrganization.id} />
        </div>
      </div>
    </div>
  );
};

export default NewPropertyPage;
