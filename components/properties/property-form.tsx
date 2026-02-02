"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { propertiesService } from "@/services/properties";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Property } from "@/types/database";

interface PropertyFormProps {
  property?: Property;
  organizationId: string;
  onSuccess?: () => void;
}

export const PropertyForm = ({
  property,
  organizationId,
  onSuccess,
}: PropertyFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState(property?.name || "");
  const [address, setAddress] = useState(property?.address || "");
  const [description, setDescription] = useState(property?.description || "");
  const [checkInInstructions, setCheckInInstructions] = useState(
    property?.check_in_instructions || ""
  );
  const [houseRules, setHouseRules] = useState(property?.house_rules || "");
  const [amenities, setAmenities] = useState(
    (property?.amenities as string[])?.join(", ") || ""
  );
  const [isActive, setIsActive] = useState(property?.is_active ?? true);
  const [customInstructions, setCustomInstructions] = useState(
    property?.ai_settings?.custom_instructions || ""
  );
  const [useOrgDefaults, setUseOrgDefaults] = useState(
    property?.ai_settings?.use_org_defaults ?? true
  );

  const isEditing = !!property;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    try {
      const data = {
        name,
        address: address || undefined,
        description: description || undefined,
        check_in_instructions: checkInInstructions || undefined,
        house_rules: houseRules || undefined,
        amenities: amenities
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        is_active: isActive,
        ai_settings: {
          custom_instructions: customInstructions,
          use_org_defaults: useOrgDefaults,
        },
      };

      if (isEditing) {
        await propertiesService.update(supabase, property.id, data);
        toast.success("Logement mis à jour");
      } else {
        await propertiesService.create(supabase, {
          ...data,
          organization_id: organizationId,
        });
        toast.success("Logement créé");
      }

      onSuccess?.();
      router.push("/properties");
      router.refresh();
    } catch (error) {
      console.error("Error saving property:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="ai">Configuration IA</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>
                Les informations de base de votre logement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du logement *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Appartement Paris 11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Rue Example, 75011 Paris"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre logement..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Cette description aide l&apos;IA à mieux répondre aux questions des
                  voyageurs.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Logement actif</Label>
                  <p className="text-sm text-muted-foreground">
                    Les logements inactifs ne reçoivent pas de réponses automatiques
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Détails du séjour</CardTitle>
              <CardDescription>
                Ces informations seront utilisées par l&apos;IA pour répondre aux
                questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checkIn">Instructions d&apos;arrivée</Label>
                <Textarea
                  id="checkIn"
                  value={checkInInstructions}
                  onChange={(e) => setCheckInInstructions(e.target.value)}
                  placeholder="Comment accéder au logement, où trouver les clés..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rules">Règlement intérieur</Label>
                <Textarea
                  id="rules"
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                  placeholder="Les règles à respecter dans le logement..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amenities">Équipements</Label>
                <Input
                  id="amenities"
                  value={amenities}
                  onChange={(e) => setAmenities(e.target.value)}
                  placeholder="WiFi, Parking, Climatisation, Machine à laver..."
                />
                <p className="text-xs text-muted-foreground">
                  Séparez les équipements par des virgules
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration IA</CardTitle>
              <CardDescription>
                Personnalisez le comportement de l&apos;IA pour ce logement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useDefaults">
                    Utiliser les paramètres par défaut
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Hérite des paramètres IA de l&apos;organisation
                  </p>
                </div>
                <Switch
                  id="useDefaults"
                  checked={useOrgDefaults}
                  onCheckedChange={setUseOrgDefaults}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customInstructions">
                  Instructions personnalisées
                </Label>
                <Textarea
                  id="customInstructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Instructions spécifiques pour ce logement..."
                  rows={4}
                  disabled={useOrgDefaults}
                />
                <p className="text-xs text-muted-foreground">
                  Ces instructions seront ajoutées au contexte de l&apos;IA pour ce
                  logement spécifique.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/properties")}
          disabled={isLoading}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading || !name}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Enregistrer" : "Créer le logement"}
        </Button>
      </div>
    </form>
  );
};
