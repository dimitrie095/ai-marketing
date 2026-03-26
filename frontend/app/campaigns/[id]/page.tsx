"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Users,
  Target,
  BarChart3,
  Calendar,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { getCampaign, getCampaignAdSets, getEntityKPIs } from "@/lib/api";
import { Campaign } from "@/types/campaign";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KPICard } from "@/components/dashboard/kpi-card";

interface CampaignDetail extends Campaign {
  total_spend: number;
  total_revenue: number;
  ad_sets_count: number;
}

interface AdSet {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  daily_budget?: number;
  optimization_goal?: string;
  ads_count: number;
}

interface CampaignKPIs {
  ctr: number;
  cpc: number;
  roas: number;
  cvr: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [kpis, setKpis] = useState<CampaignKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId) {
      loadCampaignData();
    }
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load campaign details
      const campaignRes = await getCampaign(campaignId);
      if (campaignRes.status === "success") {
        setCampaign(campaignRes.data);
      }

      // Load adsets
      const adSetsRes = await getCampaignAdSets(campaignId);
      if (adSetsRes.status === "success") {
        setAdSets(adSetsRes.data || []);
      }

      // Load KPIs for last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const kpiRes = await getEntityKPIs(
        "campaign",
        campaignId,
        thirtyDaysAgo.toISOString().split("T")[0],
        today.toISOString().split("T")[0]
      );
      if (kpiRes.status === "success") {
        setKpis(kpiRes.data);
      }
    } catch (err) {
      console.error("Campaign detail load error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      ACTIVE: "bg-green-500 hover:bg-green-600",
      PAUSED: "bg-yellow-500 hover:bg-yellow-600",
      DELETED: "bg-red-500 hover:bg-red-600",
      ARCHIVED: "bg-gray-500 hover:bg-gray-600",
    };
    return (
      <Badge className={variants[status] || variants.ACTIVE}>{status}</Badge>
    );
  };

  const getObjectiveBadge = (objective?: string) => {
    const colors: Record<string, string> = {
      CONVERSIONS:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      REACH:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      LINK_CLICKS:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    if (!objective) return null;
    return (
      <Badge
        variant="secondary"
        className={colors[objective] || "bg-gray-100 text-gray-800"}
      >
        {objective}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground mb-4">Kampagne nicht gefunden</p>
          <Link href="/campaigns">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zu Kampagnen
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const roas =
    campaign.total_spend > 0
      ? campaign.total_revenue / campaign.total_spend
      : 0;
  const profit = campaign.total_revenue - campaign.total_spend;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/campaigns">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {campaign.name}
              </h1>
              <p className="text-muted-foreground">ID: {campaign.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(campaign.status)}
            {getObjectiveBadge(campaign.objective)}
            <Button variant="outline" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Gesamtausgaben"
            value={`€${campaign.total_spend?.toFixed(2) || "0.00"}`}
            description="Letzte 30 Tage"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KPICard
            title="Gesamtumsatz"
            value={`€${campaign.total_revenue?.toFixed(2) || "0.00"}`}
            description="Letzte 30 Tage"
            trend={campaign.total_revenue > campaign.total_spend ? "up" : "down"}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KPICard
            title="ROAS"
            value={`${roas.toFixed(2)}x`}
            description="Return on Ad Spend"
            trend={roas >= 2 ? "up" : roas >= 1 ? "neutral" : "down"}
            icon={<Target className="h-4 w-4" />}
          />
          <KPICard
            title="Gewinn"
            value={`€${profit.toFixed(2)}`}
            description="Netto-Gewinn"
            trend={profit > 0 ? "up" : "down"}
            icon={<BarChart3 className="h-4 w-4" />}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="adsets">AdSets ({adSets.length})</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Kampagnen-Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium">{campaign.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ziel</p>
                      <p className="font-medium">
                        {campaign.objective || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        AdSets Anzahl
                      </p>
                      <p className="font-medium">{campaign.ad_sets_count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Erstellt am
                      </p>
                      <p className="font-medium">
                        {new Date(campaign.created_at).toLocaleDateString(
                          "de-DE"
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Metriken
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">CTR</p>
                      <p className="font-medium">
                        {kpis?.ctr?.toFixed(2) || "0.00"}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CPC</p>
                      <p className="font-medium">
                        €{kpis?.cpc?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Conversion Rate
                      </p>
                      <p className="font-medium">
                        {kpis?.cvr?.toFixed(2) || "0.00"}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Conversions
                      </p>
                      <p className="font-medium">
                        {kpis?.conversions || "0"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="adsets" className="space-y-4">
            <div className="grid gap-4">
              {adSets.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      Keine AdSets für diese Kampagne gefunden
                    </p>
                  </CardContent>
                </Card>
              ) : (
                adSets.map((adSet) => (
                  <Card key={adSet.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{adSet.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            ID: {adSet.id}
                          </p>
                        </div>
                        {getStatusBadge(adSet.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Tagesbudget
                          </p>
                          <p className="font-medium">
                            €{adSet.daily_budget?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Optimierungsziel
                          </p>
                          <p className="font-medium">
                            {adSet.optimization_goal || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Ads</p>
                          <p className="font-medium">{adSet.ads_count}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Übersicht</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Impressions</p>
                    <p className="text-2xl font-bold">
                      {kpis?.impressions?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Klicks</p>
                    <p className="text-2xl font-bold">
                      {kpis?.clicks?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Conversions
                    </p>
                    <p className="text-2xl font-bold">
                      {kpis?.conversions?.toLocaleString() || "0"}
                    </p>
                  </div>
                </div>
                <Separator className="my-6" />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">CTR</p>
                    <p className="text-2xl font-bold">
                      {kpis?.ctr?.toFixed(2) || "0.00"}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">CPC</p>
                    <p className="text-2xl font-bold">
                      €{kpis?.cpc?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">CVR</p>
                    <p className="text-2xl font-bold">
                      {kpis?.cvr?.toFixed(2) || "0.00"}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
