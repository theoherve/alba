"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useOrganizationStore } from "@/hooks/use-organization";
import { organizationsService } from "@/services/organizations";
import { toast } from "sonner";
import { Loader2, Bot, Info } from "lucide-react";
import type { User, OrganizationAISettings } from "@/types/database";

const AISettingsPage = () => {
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // AI Settings
  const [tone, setTone] = useState<"professional" | "friendly" | "casual">("professional");
  const [threshold, setThreshold] = useState(85);
  const [signature, setSignature] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setUser(profile);

      if (!currentOrganization) {
        const orgs = await organizationsService.getByUserId(supabase, authUser.id);
        if (orgs.length > 0) {
          setOrganizations(orgs);
          setCurrentOrganization(orgs[0]);
          
          // Load AI settings
          const settings = orgs[0].ai_settings as OrganizationAISettings;
          if (settings) {
            setTone(settings.tone || "professional");
            setThreshold(Math.round((settings.auto_send_threshold || 0.85) * 100));
            setSignature(settings.signature || "");
          }
        }
      } else {
        const settings = currentOrganization.ai_settings as OrganizationAISettings;
        if (settings) {
          setTone(settings.tone || "professional");
          setThreshold(Math.round((settings.auto_send_threshold || 0.85) * 100));
          setSignature(settings.signature || "");
        }
      }
    };

    loadData();
  }, [currentOrganization, setCurrentOrganization, setOrganizations]);

  const handleSave = async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      const aiSettings: OrganizationAISettings = {
        tone,
        auto_send_threshold: threshold / 100,
        signature,
      };

      const updated = await organizationsService.update(
        supabase,
        currentOrganization.id,
        { ai_settings: aiSettings }
      );

      setCurrentOrganization(updated);
      toast.success("Paramètres IA mis à jour");
    } catch (error) {
      console.error("Error updating AI settings:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <Header user={user} title="Configuration IA" />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Tone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Ton des réponses
              </CardTitle>
              <CardDescription>
                Définissez le style de communication de l&apos;IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">
                    <div>
                      <div className="font-medium">Professionnel</div>
                      <div className="text-sm text-muted-foreground">
                        Courtois et efficace
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="friendly">
                    <div>
                      <div className="font-medium">Amical</div>
                      <div className="text-sm text-muted-foreground">
                        Chaleureux et accueillant
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="casual">
                    <div>
                      <div className="font-medium">Décontracté</div>
                      <div className="text-sm text-muted-foreground">
                        Informel et sympathique
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Confidence Threshold */}
          <Card>
            <CardHeader>
              <CardTitle>Seuil de confiance</CardTitle>
              <CardDescription>
                L&apos;IA envoie automatiquement les réponses au-dessus de ce seuil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Seuil: {threshold}%</Label>
                  <span className="text-sm text-muted-foreground">
                    {threshold >= 90
                      ? "Très strict"
                      : threshold >= 80
                      ? "Recommandé"
                      : threshold >= 70
                      ? "Modéré"
                      : "Permissif"}
                  </span>
                </div>
                <Slider
                  value={[threshold]}
                  onValueChange={(v) => setThreshold(v[0])}
                  min={50}
                  max={100}
                  step={5}
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex gap-2">
                  <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Comment ça marche :</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      <li>
                        <strong>≥ {threshold}%</strong> : Envoi automatique
                      </li>
                      <li>
                        <strong>50-{threshold - 1}%</strong> : Suggestion à valider
                      </li>
                      <li>
                        <strong>&lt; 50%</strong> : Escalade vers vous
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signature */}
          <Card>
            <CardHeader>
              <CardTitle>Signature</CardTitle>
              <CardDescription>
                Ajoutée automatiquement à la fin de chaque réponse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Cordialement,&#10;L'équipe de Ma Conciergerie"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer les paramètres
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettingsPage;
