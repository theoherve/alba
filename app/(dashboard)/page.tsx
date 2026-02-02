"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ConversationCard, type ConversationStatus } from "@/components/dashboard/conversation-card";
import { PropertyCard } from "@/components/dashboard/property-card";
import { Button } from "@/components/ui/button";
import { useOrganizationStore } from "@/hooks/use-organization";
import { organizationsService } from "@/services/organizations";
import { propertiesService } from "@/services/properties";
import { conversationsService } from "@/services/conversations";
import {
  MessageSquare,
  AlertCircle,
  Home,
  Bot,
  Plus,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import type { User, Property, Conversation, ConversationWithProperty } from "@/types/database";

const DashboardPage = () => {
  const { currentOrganization, setCurrentOrganization, setOrganizations } =
    useOrganizationStore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [conversations, setConversations] = useState<ConversationWithProperty[]>([]);

  // Stats
  const [stats, setStats] = useState({
    messagesToday: 0,
    needsReview: 0,
    activeProperties: 0,
    aiResponseRate: 0,
    autoRepliedToday: 0,
  });

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
        // Get properties
        const propertiesList = await propertiesService.getByOrganization(
          supabase,
          currentOrganization.id
        );
        setProperties(propertiesList);

        // Get conversations with property data
        const conversationsList = await conversationsService.getByOrganization(
          supabase,
          currentOrganization.id
        );

        // Fetch property data for each conversation
        const conversationsWithProperty: ConversationWithProperty[] = [];
        for (const conv of conversationsList) {
          const property = propertiesList.find((p) => p.id === conv.property_id) || null;
          conversationsWithProperty.push({
            ...conv,
            property,
          });
        }
        setConversations(conversationsWithProperty);

        // Get today's date bounds
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get messages count today
        const { count: messagesToday } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today.toISOString())
          .lt("created_at", tomorrow.toISOString());

        // Get conversations needing review (active with unread messages)
        const needsReviewCount = conversationsList.filter(
          (c) => c.status === "active" && c.unread_count > 0
        ).length;

        // Get AI response stats
        const { data: aiResponsesData } = await supabase
          .from("ai_responses")
          .select("action_taken, created_at")
          .gte("created_at", today.toISOString());

        const aiResponses = aiResponsesData || [];
        const autoRepliedToday = aiResponses.filter(
          (r) => r.action_taken === "auto_sent"
        ).length;

        // Calculate AI response rate
        const totalAiResponses = aiResponses.length;
        const aiResponseRate =
          totalAiResponses > 0
            ? Math.round((autoRepliedToday / totalAiResponses) * 100)
            : 0;

        setStats({
          messagesToday: messagesToday || 0,
          needsReview: needsReviewCount,
          activeProperties: propertiesList.filter((p) => p.ai_enabled).length,
          aiResponseRate: aiResponseRate,
          autoRepliedToday: autoRepliedToday,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [currentOrganization]);

  const getConversationStatus = (conversation: Conversation): ConversationStatus => {
    if (conversation.status === "resolved") return "resolved";
    if (conversation.status === "archived") return "resolved";
    // For active conversations, check if there are unread messages
    if (conversation.unread_count > 0) return "needs_review";
    return "ai_replied";
  };

  // Get conversations needing attention (active with unread or recent)
  const attentionConversations = conversations
    .filter((c) => c.status === "active")
    .slice(0, 5);

  // Get top properties with their stats
  const topProperties = properties.slice(0, 3);

  const firstName = user?.full_name?.split(" ")[0] || "User";

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-card px-8 py-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {firstName}. Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <Link href="/properties/new">
          <Button className="cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Stats Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Messages Today"
              value={stats.messagesToday}
              icon={<MessageSquare className="h-6 w-6" />}
              iconClassName="bg-gray-100 text-gray-600"
            />
            <StatsCard
              title="Needs Review"
              value={stats.needsReview}
              icon={<AlertCircle className="h-6 w-6" />}
              iconClassName="bg-red-100 text-red-600"
            />
            <StatsCard
              title="Active Properties"
              value={stats.activeProperties}
              icon={<Home className="h-6 w-6" />}
              iconClassName="bg-gray-100 text-gray-600"
            />
            <StatsCard
              title="AI Response Rate"
              value={stats.aiResponseRate > 0 ? `${stats.aiResponseRate}%` : "—"}
              description={stats.autoRepliedToday > 0 ? `${stats.autoRepliedToday} auto-replied today` : undefined}
              icon={<Bot className="h-6 w-6" />}
              iconClassName="bg-emerald-100 text-emerald-600"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Needs Your Attention - Takes 3 columns */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Needs Your Attention
                </h2>
                <Link
                  href="/inbox"
                  className="flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  View all
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>

              <div className="space-y-3">
                {attentionConversations.length > 0 ? (
                  attentionConversations.map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      id={conversation.id}
                      guestName={conversation.guest_name || "Guest"}
                      propertyName={conversation.property?.name || "Property"}
                      message="Click to view conversation"
                      timestamp={conversation.last_message_at || conversation.updated_at}
                      status={getConversationStatus(conversation)}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border bg-card p-8 text-center">
                    <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No conversations need your attention
                    </p>
                  </div>
                )}
              </div>

              {/* AI Status Card */}
              <div className="mt-6 flex items-center gap-3 rounded-xl border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <Bot className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">AI Status</h4>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    All systems operational
                  </div>
                </div>
              </div>
            </div>

            {/* Properties - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Properties</h2>
                <Link
                  href="/properties"
                  className="flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  View all
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>

              <div className="space-y-3">
                {topProperties.length > 0 ? (
                  topProperties.map((property) => {
                    const propertyConversations = conversations.filter(
                      (c) => c.property_id === property.id
                    );
                    const activeConversations = propertyConversations.filter(
                      (c) => c.status === "active"
                    ).length;
                    const pendingCount = propertyConversations.filter(
                      (c) => c.status === "active" && c.unread_count > 0
                    ).length;

                    return (
                      <PropertyCard
                        key={property.id}
                        id={property.id}
                        name={property.name}
                        address={property.address || "No address"}
                        activeConversations={activeConversations}
                        pendingCount={pendingCount}
                        aiActive={property.ai_enabled}
                      />
                    );
                  })
                ) : (
                  <div className="rounded-xl border bg-card p-8 text-center">
                    <Home className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      No properties yet
                    </p>
                  </div>
                )}

                {/* Add Property Button */}
                <Link href="/properties/new" className="block">
                  <button className="w-full cursor-pointer rounded-xl border-2 border-dashed border-gray-200 bg-white p-4 text-sm font-medium text-muted-foreground transition-colors hover:border-gray-300 hover:bg-muted/50">
                    <Plus className="mr-2 inline h-4 w-4" />
                    Add Property
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
