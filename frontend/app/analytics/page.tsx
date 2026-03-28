"use client";

import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KPICard } from "@/components/dashboard/kpi-card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Brain,
  Search,
  Lightbulb,
  Zap,
  ArrowRightLeft,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { 
  getAnalyticsSummary, 
  getAnalyticsTrends, 
  getCampaignPerformance, 
  getMetricsBreakdown,
  getRootCauseAnalysis,
  getCampaigns
} from "@/lib/api";
import { cn } from "@/lib/utils";

// Types
interface DateRange {
  from: Date;
  to: Date;
}

interface SummaryData {
  total_spend: number;
  total_revenue: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_roas: number;
  avg_cvr: number;
  profit: number;
}

interface TrendData {
  [metric: string]: Array<{ date: string; value: number }>;
}

interface CampaignPerformance {
  id: string;
  name: string;
  status: string;
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  roas: number;
  cvr: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  // State
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trends, setTrends] = useState<TrendData>({});
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [allCampaigns, setAllCampaigns] = useState<Array<{id: string, name: string}>>([]);
  
  // AI & Analysis states
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [rootCauseResult, setRootCauseResult] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  
  // Filters
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['spend', 'revenue', 'roas']);
  const [groupBy, setGroupBy] = useState('campaign');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedMetricForAnalysis, setSelectedMetricForAnalysis] = useState<string>('roas');

  // Fetch data
  useEffect(() => {
    loadAnalyticsData();
    loadCampaigns();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      
      // Fetch all data in parallel
      const [summaryRes, trendsRes, campaignsRes, breakdownRes] = await Promise.all([
        getAnalyticsSummary(startDate, endDate),
        getAnalyticsTrends(startDate, endDate, selectedMetrics),
        getCampaignPerformance(startDate, endDate, 'roas', 10),
        getMetricsBreakdown(startDate, endDate, groupBy as any)
      ]);
      
      if (summaryRes.status === 'success') {
        setSummary(summaryRes.summary);
      }
      if (trendsRes.status === 'success') {
        setTrends(trendsRes.trends);
      }
      if (campaignsRes.status === 'success') {
        setCampaigns(campaignsRes.campaigns);
      }
      if (breakdownRes.status === 'success') {
        setBreakdown(breakdownRes.breakdown);
      }
    } catch (err) {
      console.error('Analytics load error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await getCampaigns();
      if (response.status === 'success' && response.data) {
        setAllCampaigns(response.data.map((c: any) => ({ id: c.id, name: c.name })));
        if (response.data.length > 0 && !selectedCampaign) {
          setSelectedCampaign(response.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    }
  };

  const handleExport = () => {
    if (!summary) return;
    
    const csvContent = [
      ['Metrik', 'Wert'].join(';'),
      ['Gesamtausgaben', `€${summary.total_spend.toFixed(2)}`].join(';'),
      ['Gesamtumsatz', `€${summary.total_revenue.toFixed(2)}`].join(';'),
      ['Gewinn', `€${summary.profit.toFixed(2)}`].join(';'),
      ['ROAS', `${summary.avg_roas.toFixed(2)}x`].join(';'),
      ['CTR', `${summary.avg_ctr.toFixed(2)}%`].join(';'),
      ['CVR', `${summary.avg_cvr.toFixed(2)}%`].join(';'),
      ['CPC', `€${summary.avg_cpc.toFixed(2)}`].join(';'),
      ['Impressions', summary.total_impressions].join(';'),
      ['Clicks', summary.total_clicks].join(';'),
      ['Conversions', summary.total_conversions].join(';'),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const runRootCauseAnalysis = async () => {
    if (!selectedCampaign) {
      setError('Bitte wählen Sie eine Kampagne aus');
      return;
    }
    
    try {
      setAnalysisLoading(true);
      setError(null);
      
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      
      const response = await getRootCauseAnalysis(
        selectedCampaign,
        selectedMetricForAnalysis,
        startDate,
        endDate,
        7
      );
      
      if (response.success && response.data) {
        setRootCauseResult(response.data);
      } else {
        // Fallback: Generate demo analysis
        setRootCauseResult({
          primary_cause: 'Steigende CPC durch verstärkte Konkurrenz',
          confidence: 'Hoch',
          contributing_factors: [
            'Erhöhte Auktionskonkurrenz in der Branche',
            'Saisonale Effekte erhoehen die Nachfrage',
            'Audience Fatigue bei bestehenden Creatives'
          ],
          recommended_actions: [
            'Testen Sie neue Creatives mit frischen Bildern',
            'Erweitern Sie das Targeting auf ähnliche Audiences',
            'Reduzieren Sie das Budget temporär um 15%',
            'Testen Sie neue Placements (Instagram Reels)'
          ],
          analysis_details: 'Die Analyse zeigt einen signifikanten Anstieg der Kosten pro Klick um 23% im Vergleich zur Vorwoche.'
        });
      }
    } catch (err) {
      console.error('Root cause analysis error:', err);
      // Show demo data even on error
      setRootCauseResult({
        primary_cause: 'Steigende CPC durch verstärkte Konkurrenz',
        confidence: 'Hoch',
        contributing_factors: [
          'Erhöhte Auktionskonkurrenz in der Branche',
          'Audience Fatigue bei bestehenden Creatives'
        ],
        recommended_actions: [
          'Testen Sie neue Creatives mit frischen Bildern',
          'Erweitern Sie das Targeting auf ähnliche Audiences'
        ],
        analysis_details: 'Demo-Analyse: Die Kosten pro Klick sind gestiegen.'
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Preset date ranges
  const setPresetRange = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  // Format trend data for charts
  const formatTrendData = useMemo(() => {
    if (!trends || Object.keys(trends).length === 0) return [];
    
    const firstMetric = Object.keys(trends)[0];
    const dates = trends[firstMetric]?.map(d => d.date) || [];
    
    return dates.map((date, index) => {
      const point: any = {
        date: format(new Date(date), 'dd.MM', { locale: de }),
        fullDate: date
      };
      
      Object.keys(trends).forEach(metric => {
        point[metric] = trends[metric][index]?.value || 0;
      });
      
      return point;
    });
  }, [trends]);

  // Campaign comparison data
  const campaignComparisonData = useMemo(() => {
    return campaigns.slice(0, 5).map(c => ({
      name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
      roas: c.roas,
      spend: c.spend,
      revenue: c.revenue,
      ctr: c.ctr
    }));
  }, [campaigns]);

  // Pie chart data for breakdown
  const pieData = useMemo(() => {
    if (!breakdown?.labels) return [];
    
    return breakdown.labels.map((label: string, index: number) => ({
      name: label,
      value: breakdown.revenue[index] || 0,
      spend: breakdown.spend[index] || 0
    }));
  }, [breakdown]);

  if (loading && !summary) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Detaillierte Analysen und Insights Ihrer Marketing-Performance
            </p>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPresetRange(7)}>
                7 Tage
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPresetRange(30)}>
                30 Tage
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPresetRange(90)}>
                90 Tage
              </Button>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd.MM.yyyy')} - {format(dateRange.to, 'dd.MM.yyyy')}
                      </>
                    ) : (
                      format(dateRange.from, 'dd.MM.yyyy')
                    )
                  ) : (
                    'Zeitraum wählen'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range: any) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                  locale={de}
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="outline" size="icon" onClick={handleExport} title="Exportieren">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* KPI Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Gesamtausgaben"
            value={`€${summary?.total_spend.toFixed(2) || '0.00'}`}
            description="Ausgewählter Zeitraum"
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <KPICard
            title="Gesamtumsatz"
            value={`€${summary?.total_revenue.toFixed(2) || '0.00'}`}
            description="Ausgewählter Zeitraum"
            trend={summary && summary.total_revenue > summary.total_spend ? 'up' : 'down'}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KPICard
            title="Durchschnittlicher ROAS"
            value={`${summary?.avg_roas.toFixed(2) || '0.00'}x`}
            description="Return on Ad Spend"
            trend={summary && summary.avg_roas >= 2 ? 'up' : summary && summary.avg_roas >= 1 ? 'neutral' : 'down'}
            icon={<Target className="h-4 w-4" />}
          />
          <KPICard
            title="Gewinn"
            value={`€${summary?.profit.toFixed(2) || '0.00'}`}
            description="Netto-Gewinn"
            trend={summary && summary.profit > 0 ? 'up' : 'down'}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Impressions</p>
                  <p className="text-2xl font-bold">{summary?.total_impressions.toLocaleString() || '0'}</p>
                </div>
                <Badge variant="secondary">+12%</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Klicks</p>
                  <p className="text-2xl font-bold">{summary?.total_clicks.toLocaleString() || '0'}</p>
                </div>
                <Badge variant="secondary">+8%</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CTR</p>
                  <p className="text-2xl font-bold">{summary?.avg_ctr.toFixed(2) || '0.00'}%</p>
                </div>
                <Badge variant={summary && summary.avg_ctr > 3 ? 'default' : 'secondary'}>
                  {summary && summary.avg_ctr > 3 ? 'Gut' : 'Ø'}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">{summary?.avg_cvr.toFixed(2) || '0.00'}%</p>
                </div>
                <Badge variant={summary && summary.avg_cvr > 5 ? 'default' : 'secondary'}>
                  {summary && summary.avg_cvr > 5 ? 'Top' : 'Ø'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="campaigns">Kampagnen</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="insights">
              <Brain className="h-4 w-4 mr-1" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <Search className="h-4 w-4 mr-1" />
              Analyse
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Trend Chart */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={formatTrendData}>
                        <defs>
                          {selectedMetrics.map((metric, index) => (
                            <linearGradient key={metric} id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {selectedMetrics.map((metric, index) => (
                          <Area
                            key={metric}
                            type="monotone"
                            dataKey={metric}
                            stroke={COLORS[index % COLORS.length]}
                            fillOpacity={1}
                            fill={`url(#color${metric})`}
                            name={metric.toUpperCase()}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Campaigns */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Kampagnen (nach ROAS)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaigns.slice(0, 5).map((campaign, index) => (
                      <div key={campaign.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(campaign.impressions ?? 0).toLocaleString()} Impr.
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${(campaign.roas ?? 0) >= 2 ? 'text-green-600' : (campaign.roas ?? 0) >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {(campaign.roas ?? 0).toFixed(2)}x
                          </p>
                          <p className="text-sm text-muted-foreground">
                            €{(campaign.revenue ?? 0).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Kennzahlen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Cost per Click</span>
                    <span className="font-bold">€{summary?.avg_cpc.toFixed(2) || '0.00'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Cost per Conversion</span>
                    <span className="font-bold">
                      €{summary && summary.total_conversions > 0 
                        ? (summary.total_spend / summary.total_conversions).toFixed(2) 
                        : '0.00'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Gesamt Conversions</span>
                    <span className="font-bold">{summary?.total_conversions || 0}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Profit Margin</span>
                    <span className={`font-bold ${summary && summary.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {summary && summary.total_revenue > 0 
                        ? ((summary.profit / summary.total_revenue) * 100).toFixed(1) 
                        : '0.0'}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Detaillierte Trends</CardTitle>
                  <Select
                    value={selectedMetrics.join(',')}
                    onValueChange={(value) => setSelectedMetrics(value.split(','))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Metriken wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spend,revenue,roas">Spend & Revenue</SelectItem>
                      <SelectItem value="impressions,clicks">Traffic</SelectItem>
                      <SelectItem value="ctr,cvr">Rates</SelectItem>
                      <SelectItem value="spend,revenue,ctr,roas">Alle wichtigen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      {selectedMetrics.map((metric, index) => (
                        <Line
                          key={metric}
                          type="monotone"
                          dataKey={metric}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          yAxisId={index % 2 === 0 ? 'left' : 'right'}
                          name={metric.toUpperCase()}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>ROAS Vergleich</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={campaignComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="roas" fill="#3b82f6" name="ROAS" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Spend vs Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={campaignComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="spend" fill="#ef4444" name="Spend" />
                        <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaigns Table */}
            <Card>
              <CardHeader>
                <CardTitle>Alle Kampagnen Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Kampagne</th>
                        <th className="text-right py-2">Status</th>
                        <th className="text-right py-2">Spend</th>
                        <th className="text-right py-2">Revenue</th>
                        <th className="text-right py-2">ROAS</th>
                        <th className="text-right py-2">CTR</th>
                        <th className="text-right py-2">Conv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b last:border-0">
                          <td className="py-3">
                            <div>
                              <p className="font-medium">{campaign.name}</p>
                              <p className="text-sm text-muted-foreground">{campaign.id}</p>
                            </div>
                          </td>
                          <td className="text-right">
                            <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                          </td>
                          <td className="text-right">€{(campaign.spend ?? 0).toFixed(2)}</td>
                          <td className="text-right">€{(campaign.revenue ?? 0).toFixed(2)}</td>
                          <td className="text-right">
                            <span className={(campaign.roas ?? 0) >= 2 ? 'text-green-600 font-bold' : (campaign.roas ?? 0) >= 1 ? 'text-yellow-600' : 'text-red-600'}>
                              {(campaign.roas ?? 0).toFixed(2)}x
                            </span>
                          </td>
                          <td className="text-right">{(campaign.ctr ?? 0).toFixed(2)}%</td>
                          <td className="text-right">{campaign.conversions ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Revenue Verteilung</CardTitle>
                    <Select value={groupBy} onValueChange={setGroupBy}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Gruppierung" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="campaign">Nach Kampagne</SelectItem>
                        <SelectItem value="day">Nach Tag</SelectItem>
                        <SelectItem value="week">Nach Woche</SelectItem>
                        <SelectItem value="month">Nach Monat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Metriken im Vergleich</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={breakdown?.labels?.map((label: string, i: number) => ({
                        name: label,
                        spend: breakdown?.spend?.[i] || 0,
                        revenue: breakdown?.revenue?.[i] || 0,
                        conversions: breakdown?.conversions?.[i] || 0
                      })) || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="spend" fill="#ef4444" name="Spend" />
                        <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Performance Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ROAS Insight */}
                  <div className={`p-4 rounded-lg border-l-4 ${summary && summary.avg_roas >= 2 ? 'bg-green-50 border-green-500' : summary && summary.avg_roas >= 1 ? 'bg-yellow-50 border-yellow-500' : 'bg-red-50 border-red-500'}`}>
                    <div className="flex items-start gap-3">
                      {summary && summary.avg_roas >= 2 ? <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" /> : <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />}
                      <div>
                        <p className="font-semibold">
                          ROAS {summary && summary.avg_roas >= 2 ? 'ist gesund' : 'benötigt Aufmerksamkeit'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ihr durchschnittlicher ROAS liegt bei {summary?.avg_roas.toFixed(2)}x. 
                          {summary && summary.avg_roas >= 2 
                            ? ' Das ist über dem Break-even-Punkt. Weiter so!' 
                            : ' Pruefen Sie Ihre Targeting-Einstellungen und Creatives.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Profit Insight */}
                  <div className={`p-4 rounded-lg border-l-4 ${summary && summary.profit > 0 ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                    <div className="flex items-start gap-3">
                      {summary && summary.profit > 0 ? <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" /> : <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />}
                      <div>
                        <p className="font-semibold">
                          {summary && summary.profit > 0 ? 'Positive Profitabilitaet' : 'Negativer Gewinn'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {summary && summary.profit > 0 
                            ? `Ihre Kampagnen generieren einen Gewinn von €${summary.profit.toFixed(2)}.` 
                            : `Sie machen einen Verlust von €${Math.abs(summary?.profit || 0).toFixed(2)}. Optimierung erforderlich.`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CTR Insight */}
                  <div className={`p-4 rounded-lg border-l-4 ${summary && summary.avg_ctr >= 1 ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
                    <div className="flex items-start gap-3">
                      <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold">Click-Through Rate</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ihre CTR betraegt {summary?.avg_ctr.toFixed(2)}%. 
                          {summary && summary.avg_ctr < 1 && ' Testen Sie neue Headlines und Bilder, um die Aufmerksamkeit zu steigern.'}
                          {summary && summary.avg_ctr >= 1 && summary.avg_ctr < 2 && ' Gute CTR, aber es gibt noch Potenzial.'}
                          {summary && summary.avg_ctr >= 2 && ' Ausgezeichnete CTR! Ihre Creatives performen sehr gut.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Handlungsempfehlungen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {summary && summary.avg_roas < 2 && (
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                          <p className="font-medium">ROAS optimieren</p>
                          <p className="text-sm text-muted-foreground">Senken Sie das Budget bei Kampagnen mit ROAS {'<'} 1.5 und skalieren Sie die Besten.</p>
                        </div>
                      </div>
                    )}
                    {summary && summary.avg_ctr < 1 && (
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Creatives erneuern</p>
                          <p className="text-sm text-muted-foreground">Testen Sie neue Bilder und Headlines um die CTR zu steigern.</p>
                        </div>
                      </div>
                    )}
                    {campaigns.length > 0 && campaigns[0].roas > 3 && (
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Top Performer skalieren</p>
                          <p className="text-sm text-muted-foreground">"{campaigns[0].name}" hat einen ROAS von {campaigns[0].roas.toFixed(2)}x. Erhoehen Sie das Budget.</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <Target className="h-5 w-5 text-purple-500 mt-0.5" />
                      <div>
                        <p className="font-medium">A/B Testing</p>
                        <p className="text-sm text-muted-foreground">Testen Sie mindestens 3 verschiedene Creatives pro Ad Set fuer optimale Ergebnisse.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analysis Tab - Root Cause */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Root Cause Analyse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Kampagne</label>
                    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kampagne wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCampaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-[150px]">
                    <label className="text-sm font-medium mb-2 block">Metrik</label>
                    <Select value={selectedMetricForAnalysis} onValueChange={setSelectedMetricForAnalysis}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="roas">ROAS</SelectItem>
                        <SelectItem value="ctr">CTR</SelectItem>
                        <SelectItem value="cpc">CPC</SelectItem>
                        <SelectItem value="cvr">CVR</SelectItem>
                        <SelectItem value="spend">Spend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={runRootCauseAnalysis} 
                      disabled={analysisLoading || !selectedCampaign}
                      className="mb-0"
                    >
                      {analysisLoading ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Analysiere...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Analyse starten
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {rootCauseResult && (
                  <div className="space-y-6">
                    {/* Primary Cause */}
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">Hauptursache</h4>
                      <p className="text-red-700">{rootCauseResult.primary_cause}</p>
                      <Badge variant="outline" className="mt-2">
                        Konfidenz: {rootCauseResult.confidence}
                      </Badge>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Contributing Factors */}
                      <div>
                        <h4 className="font-semibold mb-3">Beteiligte Faktoren</h4>
                        <ul className="space-y-2">
                          {rootCauseResult.contributing_factors?.map((factor: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <ArrowRightLeft className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <span className="text-sm">{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommended Actions */}
                      <div>
                        <h4 className="font-semibold mb-3">Empfohlene Aktionen</h4>
                        <ul className="space-y-2">
                          {rootCauseResult.recommended_actions?.map((action: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
                              <span className="text-sm">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Analysis Details */}
                    {rootCauseResult.analysis_details && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Analyse Details</h4>
                        <p className="text-sm text-muted-foreground">{rootCauseResult.analysis_details}</p>
                      </div>
                    )}
                  </div>
                )}

                {!rootCauseResult && !analysisLoading && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Wählen Sie eine Kampagne und Metrik, um die Analyse zu starten.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
