"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrganizationStore } from "@/hooks/use-organization";
import { gmailConnectionsService } from "@/services/gmail-connections";
import { organizationsService } from "@/services/organizations";
import { toast } from "sonner";
import { Mail, Check, X, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { GmailConnection, User } from "@/types/database";

const GmailSettingsPage = () => {
  const searchParams = useSearchParams();
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<GmailConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for success/error from OAuth callback
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      toast.success("Compte Gmail connecté avec succès");
    } else if (error) {
      toast.error(`Erreur: ${decodeURIComponent(error)}`);
    }
  }, [searchParams]);

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
        }
      }
    };

    loadData();
  }, [currentOrganization, setCurrentOrganization, setOrganizations]);

  useEffect(() => {
    const loadConnections = async () => {
      if (!currentOrganization) return;

      setIsLoading(true);
      const supabase = createClient();

      try {
        const conns = await gmailConnectionsService.getByOrganization(
          supabase,
          currentOrganization.id
        );
        setConnections(conns);
      } catch (error) {
        console.error("Error loading connections:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConnections();
  }, [currentOrganization]);

  const handleConnect = () => {
    if (!currentOrganization) return;

    const authUrl = gmailConnectionsService.generateAuthUrl(currentOrganization.id);
    window.location.href = authUrl;
  };

  const handleDisconnect = async (connectionId: string) => {
    const supabase = createClient();

    try {
      await gmailConnectionsService.delete(supabase, connectionId);
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      toast.success("Connexion supprimée");
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleToggleActive = async (connection: GmailConnection) => {
    const supabase = createClient();

    try {
      if (connection.is_active) {
        await gmailConnectionsService.deactivate(supabase, connection.id);
      } else {
        await gmailConnectionsService.activate(supabase, connection.id);
      }

      setConnections((prev) =>
        prev.map((c) =>
          c.id === connection.id ? { ...c, is_active: !c.is_active } : c
        )
      );

      toast.success(
        connection.is_active ? "Synchronisation désactivée" : "Synchronisation activée"
      );
    } catch (error) {
      console.error("Error toggling connection:", error);
      toast.error("Erreur");
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <Header user={user} title="Connexion Gmail" />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Comment ça fonctionne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Alba se connecte à votre compte Gmail pour lire les emails
                d&apos;Airbnb et envoyer des réponses automatiquement.
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>Seuls les emails d&apos;Airbnb sont lus</li>
                <li>Les réponses sont envoyées via Gmail (Airbnb les relaie)</li>
                <li>Vous pouvez déconnecter à tout moment</li>
              </ul>
            </CardContent>
          </Card>

          {/* Connections */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Comptes connectés</CardTitle>
                <CardDescription>
                  Gérez vos connexions Gmail
                </CardDescription>
              </div>
              <Button onClick={handleConnect}>
                <Mail className="mr-2 h-4 w-4" />
                Connecter Gmail
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : connections.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-center">
                  <Mail className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucun compte Gmail connecté
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{connection.email}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {connection.last_sync_at && (
                              <span>
                                Dernière sync:{" "}
                                {format(
                                  new Date(connection.last_sync_at),
                                  "d MMM HH:mm",
                                  { locale: fr }
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={connection.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleToggleActive(connection)}
                        >
                          {connection.is_active ? (
                            <>
                              <Check className="mr-1 h-3 w-3" />
                              Actif
                            </>
                          ) : (
                            <>
                              <X className="mr-1 h-3 w-3" />
                              Inactif
                            </>
                          )}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDisconnect(connection.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle>Besoin d&apos;aide ?</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href="https://support.google.com/accounts/answer/3466521"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Comment autoriser les applications tierces sur Gmail
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GmailSettingsPage;
