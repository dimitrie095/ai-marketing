"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Campaign } from "@/types/campaign";
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
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Plus,
  Brain,
  AlertCircle,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  getCampaign,
  getCampaignAdSets,
  getEntityKPIs,
  getKPITrend,
  updateCampaign,
  deleteCampaign,
  getAIInsights,
  createAdSet,
} from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  spend: number;
  revenue: number;
}

interface TrendData {
  date: string;
  spend: number;
  revenue: number;
  clicks: number;
  impressions: number;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [kpis, setKpis] = useState<CampaignKPIs | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateAdSetDialogOpen, setIsCreateAdSetDialogOpen] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    status: "ACTIVE",
    objective: "CONVERSIONS",
  });

  // AdSet form state
  const [adSetFormData, setAdSetFormData] = useState({
    name: "",
    status: "ACTIVE",
    daily_budget: undefined as number | undefined,
    lifetime_budget: undefined as number | undefined,
    optimization_goal: "CONVERSIONS",
    billing_event: "IMPRESSIONS",
  });

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
      if (campaignRes.status === "success" && campaignRes.data) {
        setCampaign(campaignRes.data);
        setFormData({
          name: campaignRes.data.name,
          status: campaignRes.data.status,
          objective: campaignRes.data.objective || "CONVERSIONS",
        });
      } else {
        setError("Kampagne nicht gefunden");
        setLoading(false);
        return;
      }

      // Load adsets
      const adSetsRes = await getCampaignAdSets(campaignId);
      if (adSetsRes.status === "success") {
        setAdSets(adSetsRes.data || []);
      }

      // Load KPIs for last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startDate = thirtyDaysAgo.toISOString().split("T")[0];
      const endDate = today.toISOString().split("T")[0];
      
      const kpiRes = await getEntityKPIs("campaign", campaignId, startDate, endDate);
      if (kpiRes.status === "success" && kpiRes.data) {
        setKpis(kpiRes.data);
      }

      // Load trend data
      try {
        const spendTrend = await getKPITrend("campaign", campaignId, "spend", startDate, endDate);
        const revenueTrend = await getKPITrend("campaign", campaignId, "revenue", startDate, endDate);
        
        if (spendTrend.status === "success" && spendTrend.data?.trend) {
          const combined = spendTrend.data.trend.map((item: any, idx: number) => ({
            date: item.date,
            spend: item.value || 0,
            revenue: revenueTrend.data?.trend?.[idx]?.value || 0,
            clicks: Math.floor(Math.random() * 100) + 50, // Demo data
            impressions: Math.floor(Math.random() * 5000) + 1000, // Demo data
          }));
          setTrendData(combined);
        }
      } catch (err) {
        console.error("Trend load error:", err);
      }
    } catch (err) {
      console.error("Campaign detail load error:", err);
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Kampagne");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await updateCampaign(campaignId, formData);
      if (response.status === "success") {
        setIsEditDialogOpen(false);
        loadCampaignData();
      } else {
        setError("Fehler beim Aktualisieren");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Aktualisieren");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await deleteCampaign(campaignId);
      if (response.status === "success") {
        router.push("/campaigns");
      } else {
        setError("Fehler beim Löschen");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  };

  const handleCreateAdSet = async () => {
    try {
      // Validate required fields
      if (!adSetFormData.name.trim()) {
        setError("Name ist erforderlich");
        return;
      }
      const response = await createAdSet(campaignId, {
        name: adSetFormData.name,
        status: adSetFormData.status,
        daily_budget: adSetFormData.daily_budget,
        lifetime_budget: adSetFormData.lifetime_budget,
        optimization_goal: adSetFormData.optimization_goal,
        billing_event: adSetFormData.billing_event,
      });
      if (response.status === "success") {
        setIsCreateAdSetDialogOpen(false);
        // Reset form
        setAdSetFormData({
          name: "",
          status: "ACTIVE",
          daily_budget: undefined,
          lifetime_budget: undefined,
          optimization_goal: "CONVERSIONS",
          billing_event: "IMPRESSIONS",
        });
        // Refresh adSets list
        const adSetsRes = await getCampaignAdSets(campaignId);
        if (adSetsRes.status === "success") {
          setAdSets(adSetsRes.data || []);
        }
      } else {
        setError("Fehler beim Erstellen des AdSets");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen des AdSets");
    }
  };

  const handleStatusToggle = async () => {
    const newStatus = campaign?.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const response = await updateCampaign(campaignId, { status: newStatus });
      if (response.status === "success") {
        loadCampaignData();
      }
    } catch (err) {
      setError("Fehler beim Status-Wechsel");
    }
  };

  const loadAiInsights = async () => {
    try {
      setIsAiAnalyzing(true);
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const response = await getAIInsights(
        [campaignId],
        thirtyDaysAgo.toISOString().split("T")[0],
        today.toISOString().split("T")[0],
        "Analysiere diese Kampagne und gib Optimierungsempfehlungen"
      );
      
      if (response.status === "success") {
        setAiInsights(response.insights || response.analysis);
      }
    } catch (err) {
      console.error("AI analysis error:", err);
    } finally {
      setIsAiAnalyzing(false);
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
      CONVERSIONS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      REACH: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      LINK_CLICKS: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      BRAND_AWARENESS: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    };
    if (!objective) return null;
    return (
      <Badge variant="secondary" className={colors[objective] || "bg-gray-100 text-gray-800"}>
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

  if (error || !campaign) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-muted-foreground mb-4">{error || "Kampagne nicht gefunden"}</p>
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

  const roas = campaign.total_spend > 0 ? campaign.total_revenue / campaign.total_spend : 0;
  const profit = campaign.total_revenue - campaign.total_spend;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/campaigns">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
                {getStatusBadge(campaign.status)}
                {getObjectiveBadge(campaign.objective)}
              </div>
              <p className="text-muted-foreground mt-1">
                ID: {campaign.id} • Erstellt: {format(new Date(campaign.created_at), "dd.MM.yyyy", { locale: de })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={campaign.status === "ACTIVE" ? "destructive" : "default"}
              onClick={handleStatusToggle}
            >
              {campaign.status === "ACTIVE" ? (
                <><Pause className="mr-2 h-4 w-4" /> Pausieren</>
              ) : (
                <><Play className="mr-2 h-4 w-4" /> Aktivieren</>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Bearbeiten
                </DropdownMenuItem>
                <DropdownMenuItem onClick={loadAiInsights} disabled={isAiAnalyzing}>
                  <Brain className="mr-2 h-4 w-4" />
                  {isAiAnalyzing ? "Analysiere..." : "KI-Analyse"}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* AI Insights Card */}
        {aiInsights && (
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Brain className="h-5 w-5" />
                KI-Analyse & Empfehlungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {typeof aiInsights === 'string' ? (
                  <p>{aiInsights}</p>
                ) : (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(aiInsights, null, 2)}</pre>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="adsets">AdSets ({adSets.length})</TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="Gesamtausgaben"
                value={`€${campaign.total_spend.toFixed(2)}`}
                description="Letzte 30 Tage"
                trend={campaign.total_spend > 1000 ? "up" : "down"}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <KPICard
                title="Umsatz"
                value={`€${campaign.total_revenue.toFixed(2)}`}
                description="Letzte 30 Tage"
                trend={campaign.total_revenue > 2000 ? "up" : "neutral"}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <KPICard
                title="ROAS"
                value={`${roas.toFixed(2)}x`}
                description="Return on Ad Spend"
                trend={roas > 2 ? "up" : roas < 1 ? "down" : "neutral"}
                trendValue={roas > 2 ? "Gut" : roas < 1 ? "Schlecht" : "OK"}
                icon={<Target className="h-4 w-4" />}
              />
              <KPICard
                title="Profit"
                value={`€${profit.toFixed(2)}`}
                description="Netto Gewinn"
                trend={profit > 0 ? "up" : "down"}
                trendValue={profit > 0 ? "Positiv" : "Negativ"}
                icon={<BarChart3 className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Metriken
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">CTR</p>
                      <p className="text-2xl font-bold">{kpis?.ctr?.toFixed(2) || "0.00"}%</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">CPC</p>
                      <p className="text-2xl font-bold">€{kpis?.cpc?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">CVR</p>
                      <p className="text-2xl font-bold">{kpis?.cvr?.toFixed(2) || "0.00"}%</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Impressionen</p>
                      <p className="text-2xl font-bold">{kpis?.impressions?.toLocaleString() || "0"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Kampagnen-Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ziel</span>
                    {getObjectiveBadge(campaign.objective)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AdSets</span>
                    <span className="font-medium">{adSets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Erstellt am</span>
                    <span>{format(new Date(campaign.created_at), "dd.MM.yyyy", { locale: de })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Letzte Aktualisierung</span>
                    <span>{campaign.updated_at ? format(new Date(campaign.updated_at), "dd.MM.yyyy", { locale: de }) : "-"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Spend & Revenue Trend</CardTitle>
                <CardDescription>Entwicklung über die letzten 30 Tage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), "dd.MM.", { locale: de })}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `€${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      name="Ausgaben"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Umsatz"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Klicks & Impressionen</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), "dd.MM.", { locale: de })}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="clicks" name="Klicks" fill="#3b82f6" />
                    <Bar yAxisId="right" dataKey="impressions" name="Impressionen" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AdSets Tab */}
          <TabsContent value="adsets" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">AdSets ({adSets.length})</h3>
              <Button onClick={() => setIsCreateAdSetDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                AdSet erstellen
              </Button>
            </div>

            {adSets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Keine AdSets vorhanden</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {adSets.map((adSet) => (
                  <Card key={adSet.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{adSet.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Budget: €{adSet.daily_budget?.toFixed(2) || "0.00"}/Tag • 
                            Ziel: {adSet.optimization_goal}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          {getStatusBadge(adSet.status)}
                          <Badge variant="secondary">{adSet.ads_count} Ads</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kampagnen-Einstellungen</CardTitle>
                <CardDescription>
                  Bearbeiten Sie die Details Ihrer Kampagne
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Kampagnen-ID</Label>
                  <Input value={campaign.id} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={campaign.name} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Input value={campaign.status} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Zielsetzung</Label>
                  <Input value={campaign.objective || "-"} disabled />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Gefahrenzone</CardTitle>
                <CardDescription>
                  Aktionen, die nicht rückgängig gemacht werden können
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Kampagne löschen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kampagne bearbeiten</DialogTitle>
              <DialogDescription>
                Ändern Sie die Details Ihrer Kampagne
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktiv</SelectItem>
                    <SelectItem value="PAUSED">Pausiert</SelectItem>
                    <SelectItem value="ARCHIVED">Archiviert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="objective">Zielsetzung</Label>
                <Select
                  value={formData.objective}
                  onValueChange={(value) => setFormData({ ...formData, objective: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONVERSIONS">Conversions</SelectItem>
                    <SelectItem value="REACH">Reach</SelectItem>
                    <SelectItem value="LINK_CLICKS">Link Clicks</SelectItem>
                    <SelectItem value="BRAND_AWARENESS">Brand Awareness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdate}>
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kampagne löschen</DialogTitle>
              <DialogDescription>
                Sind Sie sicher, dass Sie diese Kampagne löschen möchten? 
                Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create AdSet Dialog */}
        <Dialog open={isCreateAdSetDialogOpen} onOpenChange={setIsCreateAdSetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AdSet erstellen</DialogTitle>
              <DialogDescription>
                Erstellen Sie ein neues AdSet für diese Kampagne
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">

              <div className="grid gap-2">
                <Label htmlFor="adset-name">Name</Label>
                <Input
                  id="adset-name"
                  placeholder="AdSet DE"
                  value={adSetFormData.name}
                  onChange={(e) => setAdSetFormData({ ...adSetFormData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adset-status">Status</Label>
                <Select
                  value={adSetFormData.status}
                  onValueChange={(value) => setAdSetFormData({ ...adSetFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktiv</SelectItem>
                    <SelectItem value="PAUSED">Pausiert</SelectItem>
                    <SelectItem value="ARCHIVED">Archiviert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adset-daily-budget">Tagesbudget (€)</Label>
                <Input
                  id="adset-daily-budget"
                  type="number"
                  step="0.01"
                  placeholder="50.00"
                  value={adSetFormData.daily_budget || ''}
                  onChange={(e) => setAdSetFormData({ ...adSetFormData, daily_budget: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adset-lifetime-budget">Lebenszeitbudget (€)</Label>
                <Input
                  id="adset-lifetime-budget"
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={adSetFormData.lifetime_budget || ''}
                  onChange={(e) => setAdSetFormData({ ...adSetFormData, lifetime_budget: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adset-optimization-goal">Optimierungsziel</Label>
                <Select
                  value={adSetFormData.optimization_goal}
                  onValueChange={(value) => setAdSetFormData({ ...adSetFormData, optimization_goal: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONVERSIONS">Conversions</SelectItem>
                    <SelectItem value="REACH">Reach</SelectItem>
                    <SelectItem value="LINK_CLICKS">Link Clicks</SelectItem>
                    <SelectItem value="IMPRESSIONS">Impressions</SelectItem>
                    <SelectItem value="VIDEO_VIEWS">Video Views</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adset-billing-event">Abrechnungsereignis</Label>
                <Select
                  value={adSetFormData.billing_event}
                  onValueChange={(value) => setAdSetFormData({ ...adSetFormData, billing_event: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMPRESSIONS">Impressions</SelectItem>
                    <SelectItem value="LINK_CLICKS">Link Clicks</SelectItem>
                    <SelectItem value="THRUPLAY">ThruPlay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateAdSetDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreateAdSet}>
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
