"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingBag, 
  Plus, 
  Edit, 
  Trash2,
  TrendingUp,
  DollarSign,
  Eye
} from "lucide-react";
import { CampaignResponse } from "../../types/campaign";
import { getDashboardSummary } from "@/lib/api";

interface CampaignWithMetrics extends CampaignResponse {
  total_spend: number;
  total_revenue: number;
  ad_sets_count: number;
  ctr: number;
  roas: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      // Zuerst laden wir das Dashboard Summary, um die Kampagnen zu bekommen
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const response = await getDashboardSummary(
        thirtyDaysAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
      
      if (response.status === "success") {
        // Hier würden wir normalerweise die Kampagnen von der Campaigns API laden
        // Für jetzt mocken wir einige Daten
        const mockCampaigns: CampaignWithMetrics[] = [
          {
            id: "camp_1",
            name: "Q1 2025 Konversionskampagne",
            status: "ACTIVE",
            objective: "CONVERSIONS",
            created_at: new Date("2025-01-01"),
            updated_at: new Date(),
            total_spend: 2540.50,
            total_revenue: 6780.00,
            ad_sets_count: 3,
            ctr: 3.2,
            roas: 2.67
          },
          {
            id: "camp_2",
            name: "Brand Awareness Kampagne",
            status: "PAUSED",
            objective: "REACH",
            created_at: new Date("2025-01-15"),
            updated_at: new Date(),
            total_spend: 1200.00,
            total_revenue: 2340.00,
            ad_sets_count: 2,
            ctr: 1.8,
            roas: 1.95
          }
        ];
        
        setCampaigns(mockCampaigns);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ACTIVE: "bg-green-500 hover:bg-green-600",
      PAUSED: "bg-yellow-500 hover:bg-yellow-600",
      DELETED: "bg-red-500 hover:bg-red-600",
      ARCHIVED: "bg-gray-500 hover:bg-gray-600",
    } as const;
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.ACTIVE}>
        {status}
      </Badge>
    );
  };

  const getObjectiveBadge = (objective: string) => {
    const colors = {
      CONVERSIONS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      REACH: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      LINK_CLICKS: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    } as const;
    
    return (
      <Badge 
        variant="secondary" 
        className={colors[objective as keyof typeof colors] || "bg-gray-100 text-gray-800"}
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
            <h1 className="text-3xl font-bold tracking-tight">Kampagnen</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Marketing-Kampagnen
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neue Kampagne
          </Button>
        </div>

        <Separator />

        {/* Campaigns Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(campaign.status)}
                      {getObjectiveBadge(campaign.objective)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Separator className="my-4" />
                
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Ausgaben</p>
                    <p className="text-xl font-bold">€{campaign.total_spend.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Umsatz</p>
                    <p className="text-xl font-bold">€{campaign.total_revenue.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">ROAS</p>
                    <p className="text-lg font-semibold">{campaign.roas.toFixed(2)}x</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">CTR</p>
                    <p className="text-lg font-semibold">{campaign.ctr.toFixed(2)}%</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">AdSets</span>
                    <span className="font-medium">{campaign.ad_sets_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Erstellt</span>
                    <span className="font-medium">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Analyse
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-2 h-4 w-4" />
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {campaigns.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Noch keine Kampagnen</h3>
              <p className="text-muted-foreground text-center mb-6">
                Erstellen Sie Ihre erste Marketing-Kampagne, um loszulegen.
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Erste Kampagne erstellen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}