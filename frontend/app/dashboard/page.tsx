"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { 
  KPICard, 
  CTRCard, 
  ROASCard, 
  CPCCard, 
  CPRCard, 
  SpendCard, 
  RevenueCard 
} from "@/components/dashboard/kpi-card";
import { getDashboardSummary } from "@/lib/api";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  MousePointerClick,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface DashboardData {
  total_campaigns: number;
  total_spend: number;
  total_revenue: number;
  total_profit: number;
  kpis: {
    ctr: number;
    cvr: number;
    roas: number;
    roi: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const response = await getDashboardSummary(
        thirtyDaysAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
      
      if (response.status === "success") {
        setData(response.data);
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive">Error</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Übersicht über Ihre Marketing-Kampagnen
            </p>
          </div>
        </div>

        <Separator />

        {/* Metrics Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Gesamtausgaben"
            value={`€${data?.total_spend.toFixed(2) || "0.00"}`}
            description="Letzte 30 Tage"
            trend={data && data.total_spend > 1000 ? "up" : "down"}
            trendValue={data && data.total_spend > 1000 ? "+22%" : "-8%"}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KPICard
            title="Gesamtumsatz"
            value={`€${data?.total_revenue.toFixed(2) || "0.00"}`}
            description="Letzte 30 Tage"
            trend={data && data.total_revenue > 2000 ? "up" : "neutral"}
            trendValue={data && data.total_revenue > 2000 ? "+28%" : "0%"}
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <KPICard
            title="ROI"
            value={`${data?.kpis.roi.toFixed(2) || "0.00"}%`}
            description="Return on Investment"
            trend={data && data.kpis.roi > 50 ? "up" : "down"}
            trendValue={data && data.kpis.roi > 50 ? "+15%" : "-12%"}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KPICard
            title="Kampagnen"
            value={data?.total_campaigns || 0}
            description="Aktive Kampagnen"
            trend="neutral"
            icon={<BarChart3 className="h-4 w-4" />}
          />
        </div>

        {/* KPI Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CTRCard 
            value={`${data?.kpis.ctr.toFixed(2) || "0.00"}%`}
            trend={data && data.kpis.ctr > 3 ? "up" : data && data.kpis.ctr < 2 ? "down" : "neutral"}
          />
          <ROASCard 
            value={data?.kpis.roas.toFixed(2) || "0.00"}
            trend={data && data.kpis.roas > 2.5 ? "up" : data && data.kpis.roas < 1.5 ? "down" : "neutral"}
          />
          <CPCCard 
            value={`€${(data?.total_spend / (data ? data.total_spend / 10 : 1) || 0).toFixed(2)}`}
            trend="down"
          />
          <CPRCard 
            value={`${data?.kpis.cvr.toFixed(2) || "0.00"}%`}
            trend={data && data.kpis.cvr > 5 ? "up" : "down"}
          />
          <SpendCard 
            value={`€${data?.total_spend.toFixed(2) || "0.00"}`}
            trend="neutral"
          />
          <RevenueCard 
            value={`€${data?.total_revenue.toFixed(2) || "0.00"}`}
            trend={data && data.total_revenue > 2000 ? "up" : "neutral"}
          />
        </div>

        {/* Performance Overview */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Kampagnen Performance Überblick</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gesamt-Impressions</p>
                <p className="text-2xl font-bold">
                  {data?.total_spend && data.kpis.ctr > 0 
                    ? Math.floor((data.total_spend * 1000) / (data.kpis.ctr > 0 ? data.kpis.ctr : 1)).toLocaleString()
                    : "0"
                  }
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gesamt-Klicks</p>
                <p className="text-2xl font-bold">
                  {data?.total_spend && data.kpis.ctr > 0
                    ? Math.floor((data.total_spend * 1000) / (data.kpis.ctr > 0 ? data.kpis.ctr : 1) * (data.kpis.ctr / 100)).toLocaleString()
                    : "0"
                  }
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gesamt-Conversions</p>
                <p className="text-2xl font-bold">
                  {data?.total_spend && data.kpis.cvr > 0
                    ? Math.floor((data.total_spend * 1000) / (data.kpis.ctr > 0 ? data.kpis.ctr : 1) * (data.kpis.ctr / 100) * (data.kpis.cvr / 100)).toLocaleString()
                    : "0"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Schnellzugriff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <div className="rounded-full bg-primary/10 p-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Kampagnen verwalten</p>
                  <p className="text-xs text-muted-foreground">
                    Kampagnen, AdSets und Ads bearbeiten
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <div className="rounded-full bg-green-500/10 p-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">KPI Analyse</p>
                  <p className="text-xs text-muted-foreground">
                    Detaillierte Performance-Analyse
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <div className="rounded-full bg-blue-500/10 p-2">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Audience Insights</p>
                  <p className="text-xs text-muted-foreground">
                    Zielgruppen-Analyse
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}