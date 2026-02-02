"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizationStore } from "@/hooks/use-organization";
import { organizationsService } from "@/services/organizations";
import { toast } from "sonner";
import { Loader2, User as UserIcon, Building2, Bot, Mail, Bell } from "lucide-react";
import Link from "next/link";
import type { User } from "@/types/database";

const SettingsPage = () => {
  const router = useRouter();
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // User form state
  const [fullName, setFullName] = useState("");
  const [locale, setLocale] = useState<"fr" | "en">("fr");

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      const profile = profileData as User | null;
      if (profile) {
        setUser(profile);
        setFullName(profile.full_name || "");
        setLocale(profile.locale as "fr" | "en");
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
  }, [currentOrganization, router, setCurrentOrganization, setOrganizations]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("users")
        .update({
          full_name: fullName,
          locale,
        })
        .eq("id", user.id);

      if (error) throw error;

      setUser((prev) => (prev ? { ...prev, full_name: fullName, locale } : null));
      toast.success("Profil mis à jour");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsLoading(false);
    }
  };

  const settingsLinks = [
    {
      href: "/settings/organization",
      icon: <Building2 className="h-5 w-5" />,
      title: "Organisation",
      description: "Nom, membres et paramètres généraux",
    },
    {
      href: "/settings/ai",
      icon: <Bot className="h-5 w-5" />,
      title: "Configuration IA",
      description: "Ton, seuil de confiance et signature",
    },
    {
      href: "/settings/gmail",
      icon: <Mail className="h-5 w-5" />,
      title: "Connexion Gmail",
      description: "Gérer la synchronisation des emails",
    },
    {
      href: "/settings/notifications",
      icon: <Bell className="h-5 w-5" />,
      title: "Notifications",
      description: "Préférences d'alertes et emails",
    },
  ];

  return (
    <div className="flex h-screen flex-col">
      <Header user={user} title="Paramètres" />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Profil</CardTitle>
                  <CardDescription>
                    Vos informations personnelles
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locale">Langue</Label>
                <Select value={locale} onValueChange={(v) => setLocale(v as "fr" | "en")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings Links */}
          <div className="grid gap-4 sm:grid-cols-2">
            {settingsLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        {link.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{link.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {link.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
