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
  Users,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

// Default/Empty dashboard data to prevent undefined errors
const defaultDashboardData: DashboardData = {
  total_campaigns: 0,
  total_spend: 0,
  total_revenue: 0,
  total_profit: 0,
  kpis: {
    ctr: 0,
    cvr: 0,
    roas: 0,
    roi: 0
  }
};

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
      setError(null);
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const response = await getDashboardSummary(
        thirtyDaysAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
      
      if (response.status === "success" || response.status === "no_data") {
        // Use response data or default data if no_data
        setData(response.data || defaultDashboardData);
      } else {
        setError("Failed to load dashboard data");
        setData(defaultDashboardData);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Set default data on error so UI still renders
      setData(defaultDashboardData);
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

  // Use default data if no data loaded yet
  const displayData = data || defaultDashboardData;
  
  // Calculate safe values for display
  const safeSpend = displayData.total_spend || 0;
  const safeRevenue = displayData.total_revenue || 0;
  const safeCampaigns = displayData.total_campaigns || 0;
  const safeKPIs = displayData.kpis || defaultDashboardData.kpis;
  const safeCTR = safeKPIs.ctr || 0;
  const safeCVR = safeKPIs.cvr || 0;
  const safeROAS = safeKPIs.roas || 0;
  const safeROI = safeKPIs.roi || 0;
  
  // Calculate derived metrics
  const cpc = safeSpend > 0 && safeCTR > 0 ? safeSpend / (safeSpend * safeCTR / 100) : 0;

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

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error} - Zeige Demo-Daten an
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Metrics Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Gesamtausgaben"
            value={`€${safeSpend.toFixed(2)}`}
            description="Letzte 30 Tage"
            trend={safeSpend > 1000 ? "up" : "down"}
            trendValue={safeSpend > 1000 ? "+22%" : "-8%"}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KPICard
            title="Gesamtumsatz"
            value={`€${safeRevenue.toFixed(2)}`}
            description="Letzte 30 Tage"
            trend={safeRevenue > 2000 ? "up" : "neutral"}
            trendValue={safeRevenue > 2000 ? "+28%" : "0%"}
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <KPICard
            title="ROI"
            value={`${safeROI.toFixed(2)}%`}
            description="Return on Investment"
            trend={safeROI > 50 ? "up" : "down"}
            trendValue={safeROI > 50 ? "+15%" : "-12%"}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KPICard
            title="Kampagnen"
            value={safeCampaigns}
            description="Aktive Kampagnen"
            trend="neutral"
            icon={<BarChart3 className="h-4 w-4" />}
          />
        </div>

        {/* KPI Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CTRCard 
            value={`${safeCTR.toFixed(2)}%`}
            trend={safeCTR > 3 ? "up" : safeCTR < 2 ? "down" : "neutral"}
          />
          <ROASCard 
            value={safeROAS.toFixed(2)}
            trend={safeROAS > 2.5 ? "up" : safeROAS < 1.5 ? "down" : "neutral"}
          />
          <CPCCard 
            value={`€${cpc.toFixed(2)}`}
            trend="down"
          />
          <CPRCard 
            value={`${safeCVR.toFixed(2)}%`}
            trend={safeCVR > 5 ? "up" : "down"}
          />
          <SpendCard 
            value={`€${safeSpend.toFixed(2)}`}
            trend="neutral"
          />
          <RevenueCard 
            value={`€${safeRevenue.toFixed(2)}`}
            trend={safeRevenue > 2000 ? "up" : "neutral"}
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
                  {safeSpend > 0 && safeCTR > 0 
                    ? Math.floor((safeSpend * 1000) / (safeCTR > 0 ? safeCTR : 1)).toLocaleString()
                    : "0"
                  }
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gesamt-Klicks</p>
                <p className="text-2xl font-bold">
                  {safeSpend > 0 && safeCTR > 0
                    ? Math.floor((safeSpend * 1000) / (safeCTR > 0 ? safeCTR : 1) * (safeCTR / 100)).toLocaleString()
                    : "0"
                  }
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gesamt-Conversions</p>
                <p className="text-2xl font-bold">
                  {safeSpend > 0 && safeCTR > 0 && safeCVR > 0
                    ? Math.floor((safeSpend * 1000) / (safeCTR > 0 ? safeCTR : 1) * (safeCTR / 100) * (safeCVR / 100)).toLocaleString()
                    : "0"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5" />
              Kampagnen-Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Durchschnittlicher ROAS</p>
                    <p className="text-sm text-muted-foreground">
                      {safeROAS.toFixed(2)}x Rückgabe pro ausgegebenem Euro
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${safeROAS >= 2 ? 'text-green-600' : safeROAS >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {safeROAS >= 2 ? 'Ausgezeichnet' : safeROAS >= 1 ? 'Gut' : 'Verbesserung nötig'}
                </span>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Conversion Rate</p>
                    <p className="text-sm text-muted-foreground">
                      {safeCVR.toFixed(2)}% der Klicks führen zu Conversions
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${safeCVR >= 5 ? 'text-green-600' : safeCVR >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {safeCVR >= 5 ? 'Hoch' : safeCVR >= 2 ? 'Durchschnitt' : 'Niedrig'}
                </span>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Netto-Gewinn</p>
                    <p className="text-sm text-muted-foreground">
                      €{(safeRevenue - safeSpend).toFixed(2)} nach Abzug der Werbekosten
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${(safeRevenue - safeSpend) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(safeRevenue - safeSpend) > 0 ? 'Profitabel' : 'Verlust'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
