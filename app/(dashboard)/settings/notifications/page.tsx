"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useOrganizationStore } from "@/hooks/use-organization";
import { organizationsService } from "@/services/organizations";
import { toast } from "sonner";
import { Loader2, Bell, AlertTriangle, MessageSquare, RefreshCw } from "lucide-react";
import type { User, NotificationPreferences, NotificationChannel } from "@/types/database";

const NotificationSettingsPage = () => {
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Notification preferences
  const [escalation, setEscalation] = useState<NotificationChannel>("both");
  const [newMessage, setNewMessage] = useState<NotificationChannel>("in_app");
  const [syncError, setSyncError] = useState<NotificationChannel>("email");

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      const profile = profileData as User | null;
      if (profile) {
        setUser(profile);
        const prefs = profile.notification_preferences as NotificationPreferences;
        if (prefs) {
          setEscalation(prefs.escalation || "both");
          setNewMessage(prefs.new_message || "in_app");
          setSyncError(prefs.sync_error || "email");
        }
      }

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

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      const preferences: NotificationPreferences = {
        escalation,
        new_message: newMessage,
        sync_error: syncError,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("users")
        .update({ notification_preferences: preferences })
        .eq("id", user.id);

      if (error) throw error;

      setUser((prev) =>
        prev ? { ...prev, notification_preferences: preferences } : null
      );
      toast.success("Préférences mises à jour");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsLoading(false);
    }
  };

  const channelOptions = [
    { value: "in_app", label: "Application uniquement" },
    { value: "email", label: "Email uniquement" },
    { value: "both", label: "Application + Email" },
  ];

  return (
    <div className="flex h-screen flex-col">
      <Header user={user} title="Notifications" />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Préférences de notification
              </CardTitle>
              <CardDescription>
                Choisissez comment vous souhaitez être notifié
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Escalation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/20">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <Label className="text-base">Escalades IA</Label>
                    <p className="text-sm text-muted-foreground">
                      Quand l&apos;IA n&apos;est pas sûre d&apos;une réponse
                    </p>
                  </div>
                </div>
                <Select value={escalation} onValueChange={(v) => setEscalation(v as NotificationChannel)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* New Message */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <Label className="text-base">Nouveaux messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Quand un voyageur envoie un message
                    </p>
                  </div>
                </div>
                <Select value={newMessage} onValueChange={(v) => setNewMessage(v as NotificationChannel)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sync Error */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20">
                    <RefreshCw className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <Label className="text-base">Erreurs de synchronisation</Label>
                    <p className="text-sm text-muted-foreground">
                      Problèmes avec la connexion Gmail
                    </p>
                  </div>
                </div>
                <Select value={syncError} onValueChange={(v) => setSyncError(v as NotificationChannel)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
