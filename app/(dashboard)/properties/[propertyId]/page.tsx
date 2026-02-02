"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { PropertyForm } from "@/components/properties/property-form";
import { Loading } from "@/components/shared/loading";
import { useOrganizationStore } from "@/hooks/use-organization";
import { propertiesService } from "@/services/properties";
import { organizationsService } from "@/services/organizations";
import type { Property, User } from "@/types/database";

interface PropertyPageProps {
  params: Promise<{ propertyId: string }>;
}

const PropertyPage = ({ params }: PropertyPageProps) => {
  const { propertyId } = use(params);
  const router = useRouter();
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

      // Load property
      try {
        const prop = await propertiesService.getById(supabase, propertyId);
        if (!prop) {
          router.push("/properties");
          return;
        }
        setProperty(prop);
      } catch (error) {
        console.error("Error loading property:", error);
        router.push("/properties");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [propertyId, currentOrganization, router, setCurrentOrganization, setOrganizations]);

  if (isLoading || !currentOrganization) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading size="lg" text="Chargement..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header user={user} title={property?.name || "Logement"} />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Modifier le logement</h1>
            <p className="text-muted-foreground">
              Mettez à jour les informations de votre bien
            </p>
          </div>

          {property && (
            <PropertyForm
              property={property}
              organizationId={currentOrganization.id}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyPage;
