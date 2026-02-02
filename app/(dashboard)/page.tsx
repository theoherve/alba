"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganizationStore } from "@/hooks/use-organization";
import { organizationsService } from "@/services/organizations";
import { propertiesService } from "@/services/properties";
import { conversationsService } from "@/services/conversations";
import {
  MessageSquare,
  Bot,
  Send,
  AlertTriangle,
  Home,
  Plus,
  Mail,
  ArrowRight,
} from "lucide-react";
import type { User } from "@/types/database";

const DashboardPage = () => {
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    conversations: 0,
    aiResponses: 0,
    autoSent: 0,
    escalations: 0,
    properties: 0,
    unreadMessages: 0,
  });

  // Activity
  const [activities, setActivities] = useState<ActivityItem[]>([]);

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
    const loadStats = async () => {
      if (!currentOrganization) return;

      setIsLoading(true);
      const supabase = createClient();

      try {
        // Get conversations count
        const conversations = await conversationsService.getByOrganization(
          supabase,
          currentOrganization.id
        );

        // Get unread count
        const unreadCount = await conversationsService.getUnreadCount(
          supabase,
          currentOrganization.id
        );

        // Get properties count
        const propertiesCount = await propertiesService.countByOrganization(
          supabase,
          currentOrganization.id
        );

        // Get AI stats (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: aiResponses } = await supabase
          .from("ai_responses")
          .select("action_taken")
          .gte("created_at", thirtyDaysAgo.toISOString());

        const responses = aiResponses as { action_taken: string }[] | null;
        const aiStats = {
          total: responses?.length || 0,
          autoSent: responses?.filter((r) => r.action_taken === "auto_sent").length || 0,
          escalations: responses?.filter((r) => r.action_taken === "escalated").length || 0,
        };

        setStats({
          conversations: conversations.length,
          aiResponses: aiStats.total,
          autoSent: aiStats.autoSent,
          escalations: aiStats.escalations,
          properties: propertiesCount,
          unreadMessages: unreadCount,
        });

        // Build activity feed from recent conversations and messages
        const recentActivities: ActivityItem[] = [];

        // Get recent messages
        const { data: recentMessagesData } = await supabase
          .from("messages")
          .select(`
            id,
            content,
            source,
            created_at,
            conversation:conversations(guest_name, property:properties(name))
          `)
          .order("created_at", { ascending: false })
          .limit(10);

        type MessageWithConv = {
          id: string;
          content: string;
          source: string;
          created_at: string;
          conversation: { guest_name: string | null; property: { name: string } | null } | null;
        };
        const recentMessages = recentMessagesData as MessageWithConv[] | null;

        if (recentMessages) {
          for (const msg of recentMessages) {
            const conv = msg.conversation;
            
            if (msg.source === "guest") {
              recentActivities.push({
                id: msg.id,
                type: "message",
                title: `Message de ${conv?.guest_name || "un voyageur"}`,
                description: conv?.property?.name || undefined,
                timestamp: msg.created_at,
              });
            } else if (msg.source === "ai") {
              recentActivities.push({
                id: msg.id,
                type: "ai_response",
                title: "Réponse IA envoyée",
                description: conv?.guest_name || undefined,
                timestamp: msg.created_at,
              });
            }
          }
        }

        // Get recent escalations
        const { data: recentEscalationsData } = await supabase
          .from("ai_responses")
          .select(`
            id,
            created_at,
            conversation:conversations(guest_name)
          `)
          .eq("action_taken", "escalated")
          .order("created_at", { ascending: false })
          .limit(5);

        type EscalationWithConv = {
          id: string;
          created_at: string;
          conversation: { guest_name: string | null } | null;
        };
        const recentEscalations = recentEscalationsData as EscalationWithConv[] | null;

        if (recentEscalations) {
          for (const esc of recentEscalations) {
            const conv = esc.conversation;
            recentActivities.push({
              id: esc.id,
              type: "escalation",
              title: "Escalade IA",
              description: conv?.guest_name || undefined,
              timestamp: esc.created_at,
            });
          }
        }

        // Sort by timestamp
        recentActivities.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(recentActivities.slice(0, 10));
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [currentOrganization]);

  const quickActions = [
    {
      href: "/inbox",
      icon: <MessageSquare className="h-5 w-5" />,
      label: "Voir les messages",
      badge: stats.unreadMessages > 0 ? stats.unreadMessages : undefined,
    },
    {
      href: "/properties/new",
      icon: <Plus className="h-5 w-5" />,
      label: "Ajouter un logement",
    },
    {
      href: "/settings/gmail",
      icon: <Mail className="h-5 w-5" />,
      label: "Connecter Gmail",
    },
  ];

  return (
    <div className="flex h-screen flex-col">
      <Header user={user} title="Tableau de bord" />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Welcome */}
          <div>
            <h1 className="text-2xl font-semibold">
              Bienvenue{user?.full_name ? `, ${user.full_name}` : ""} !
            </h1>
            <p className="text-muted-foreground">
              Voici un aperçu de votre activité sur Alba
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Conversations"
              value={stats.conversations}
              icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
              description="Total"
            />
            <StatsCard
              title="Réponses IA"
              value={stats.aiResponses}
              icon={<Bot className="h-4 w-4 text-muted-foreground" />}
              description="30 derniers jours"
            />
            <StatsCard
              title="Envois automatiques"
              value={stats.autoSent}
              icon={<Send className="h-4 w-4 text-muted-foreground" />}
              description="30 derniers jours"
            />
            <StatsCard
              title="Escalades"
              value={stats.escalations}
              icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
              description="30 derniers jours"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href}>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        {action.icon}
                        {action.label}
                      </span>
                      <span className="flex items-center gap-2">
                        {action.badge && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                            {action.badge}
                          </span>
                        )}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <div className="lg:col-span-2">
              <ActivityFeed activities={activities} isLoading={isLoading} />
            </div>
          </div>

          {/* Properties Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Mes logements ({stats.properties})
              </CardTitle>
              <Link href="/properties">
                <Button variant="outline" size="sm">
                  Voir tous
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            {stats.properties === 0 && (
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Home className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucun logement configuré
                  </p>
                  <Link href="/properties/new" className="mt-4">
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un logement
                    </Button>
                  </Link>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
