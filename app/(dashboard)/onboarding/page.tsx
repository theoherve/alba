"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { organizationsService } from "@/services/organizations";
import { propertiesService } from "@/services/properties";
import { useOrganizationStore } from "@/hooks/use-organization";
import { ArrowRight, Building2, Home, CheckCircle2 } from "lucide-react";

type Step = "organization" | "property" | "complete";

const OnboardingPage = () => {
  const router = useRouter();
  const { setCurrentOrganization, setOrganizations } = useOrganizationStore();
  const [step, setStep] = useState<Step>("organization");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Organization form
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Property form
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertyDescription, setPropertyDescription] = useState("");

  const handleOrgNameChange = (name: string) => {
    setOrgName(name);
    setOrgSlug(organizationsService.generateSlug(name));
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Vous devez être connecté");
      }

      // Check slug availability
      const isAvailable = await organizationsService.checkSlugAvailable(
        supabase,
        orgSlug
      );

      if (!isAvailable) {
        setError("Cet identifiant est déjà utilisé. Veuillez en choisir un autre.");
        setIsLoading(false);
        return;
      }

      const org = await organizationsService.create(
        supabase,
        { name: orgName, slug: orgSlug },
        user.id
      );

      setOrganizationId(org.id);
      setCurrentOrganization(org);
      setOrganizations([org]);
      setStep("property");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!organizationId) {
      setError("Organisation non trouvée");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      await propertiesService.create(supabase, {
        organization_id: organizationId,
        name: propertyName,
        address: propertyAddress || undefined,
        description: propertyDescription || undefined,
      });

      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipProperty = () => {
    setStep("complete");
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8">
        <Logo size="lg" />
      </div>

      {/* Progress indicator */}
      <div className="mb-8 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === "organization"
              ? "bg-primary text-primary-foreground"
              : "bg-primary/20 text-primary"
          }`}
        >
          {step !== "organization" ? <CheckCircle2 className="h-5 w-5" /> : "1"}
        </div>
        <div className="h-0.5 w-8 bg-border" />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === "property"
              ? "bg-primary text-primary-foreground"
              : step === "complete"
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {step === "complete" ? <CheckCircle2 className="h-5 w-5" /> : "2"}
        </div>
        <div className="h-0.5 w-8 bg-border" />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === "complete"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          3
        </div>
      </div>

      {/* Step: Organization */}
      {step === "organization" && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Créez votre conciergerie</CardTitle>
            <CardDescription>
              Donnez un nom à votre conciergerie pour commencer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Nom de la conciergerie</Label>
                <Input
                  id="orgName"
                  placeholder="Ma Conciergerie"
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgSlug">Identifiant unique</Label>
                <Input
                  id="orgSlug"
                  placeholder="ma-conciergerie"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  required
                  disabled={isLoading}
                  pattern="[a-z0-9-]+"
                />
                <p className="text-xs text-muted-foreground">
                  Lettres minuscules, chiffres et tirets uniquement
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Création..." : "Continuer"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step: Property */}
      {step === "property" && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Home className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Ajoutez votre premier logement</CardTitle>
            <CardDescription>
              Configurez votre premier bien immobilier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="propertyName">Nom du logement</Label>
                <Input
                  id="propertyName"
                  placeholder="Appartement Paris 11"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyAddress">Adresse (optionnel)</Label>
                <Input
                  id="propertyAddress"
                  placeholder="123 Rue Example, 75011 Paris"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyDescription">Description (optionnel)</Label>
                <Textarea
                  id="propertyDescription"
                  placeholder="Décrivez votre logement pour aider l'IA à répondre aux questions des voyageurs..."
                  value={propertyDescription}
                  onChange={(e) => setPropertyDescription(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkipProperty}
                  disabled={isLoading}
                >
                  Passer
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? "Création..." : "Continuer"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step: Complete */}
      {step === "complete" && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Configuration terminée !</CardTitle>
            <CardDescription>
              Votre conciergerie est prête. Connectez votre compte Gmail pour
              commencer à automatiser vos réponses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGoToDashboard} className="w-full">
              Accéder au tableau de bord
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OnboardingPage;
