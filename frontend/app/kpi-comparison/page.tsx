"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ComparisonCard,
  ComparisonTable,
  ComparisonCharts,
} from "@/components/kpi-comparison";
import {
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  Filter,
  BarChart3,
  ArrowRightLeft,
  Eye,
  Euro,
  MousePointer,
  ShoppingCart,
  Target,
  Percent,
  RefreshCw,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, parseISO, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { getPeriodComparison, getCampaigns } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PeriodComparisonResponse, CampaignInfo, DateRange, TimeRange, CompareMode } from "@/types/analytics";

// KPI Definitionen
interface KPIDefinition {
  key: string;
  label: string;
  format: 'currency' | 'percentage' | 'number' | 'decimal';
  icon: React.ReactNode;
  inverse?: boolean;
}

const KPI_DEFINITIONS: KPIDefinition[] = [
  { key: 'total_spend', label: 'Gesamtausgaben', format: 'currency', icon: <Euro className="h-4 w-4" /> },
  { key: 'total_revenue', label: 'Umsatz', format: 'currency', icon: <ShoppingCart className="h-4 w-4" /> },
  { key: 'total_impressions', label: 'Impressionen', format: 'number', icon: <Eye className="h-4 w-4" /> },
  { key: 'total_clicks', label: 'Klicks', format: 'number', icon: <MousePointer className="h-4 w-4" /> },
  { key: 'total_conversions', label: 'Conversions', format: 'number', icon: <Target className="h-4 w-4" /> },
  { key: 'avg_ctr', label: 'CTR', format: 'percentage', icon: <Percent className="h-4 w-4" /> },
  { key: 'avg_cpc', label: 'CPC', format: 'currency', icon: <Euro className="h-4 w-4" />, inverse: true },
  { key: 'avg_roas', label: 'ROAS', format: 'decimal', icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'avg_cvr', label: 'Conversion Rate', format: 'percentage', icon: <Target className="h-4 w-4" /> },
  { key: 'profit', label: 'Profit', format: 'currency', icon: <BarChart3 className="h-4 w-4" /> },
];

// Hilfsfunktionen
const formatValue = (value: number, format: string): string => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    case 'percentage':
      return `${value.toFixed(2)}%`;
    case 'number':
      return new Intl.NumberFormat('de-DE').format(Math.round(value));
    case 'decimal':
      return value.toFixed(2);
    default:
      return value.toString();
  }
};

const getDateRangeFromPreset = (preset: TimeRange): DateRange => {
  const today = new Date();
  switch (preset) {
    case '7d':
      return { from: subDays(today, 7), to: today };
    case '14d':
      return { from: subDays(today, 14), to: today };
    case '30d':
      return { from: subDays(today, 30), to: today };
    case '90d':
      return { from: subDays(today, 90), to: today };
    default:
      return { from: subDays(today, 30), to: today };
  }
};

const getComparisonDateRange = (
  currentRange: DateRange,
  mode: CompareMode
): DateRange => {
  const days = differenceInDays(currentRange.to, currentRange.from) + 1;
  
  switch (mode) {
    case 'previous_period':
      return {
        from: subDays(currentRange.from, days),
        to: subDays(currentRange.to, days),
      };
    case 'previous_year':
      return {
        from: new Date(currentRange.from.getFullYear() - 1, currentRange.from.getMonth(), currentRange.from.getDate()),
        to: new Date(currentRange.to.getFullYear() - 1, currentRange.to.getMonth(), currentRange.to.getDate()),
      };
    default:
      return {
        from: subDays(currentRange.from, days),
        to: subDays(currentRange.to, days),
      };
  }
};

export default function KPIComparisonPage() {
  // State
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPreset('30d'));
  const [compareDateRange, setCompareDateRange] = useState<DateRange>(() => 
    getComparisonDateRange(getDateRangeFromPreset('30d'), 'previous_period')
  );
  const [compareMode, setCompareMode] = useState<CompareMode>('previous_period');
  const [selectedKPI, setSelectedKPI] = useState('spend');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignInfo[]>([]);
  const [data, setData] = useState<PeriodComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Kampagnen laden
  const loadCampaigns = useCallback(async () => {
    try {
      const response = await getCampaigns();
      if (response?.campaigns) {
        setCampaigns(response.campaigns);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kampagnen:', err);
    }
  }, []);

  // Vergleichsdaten laden
  const loadComparisonData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      
      const response = await getPeriodComparison(
        startDate,
        endDate,
        compareMode,
        'campaign',
        selectedCampaigns.length > 0 ? selectedCampaigns : undefined,
        compareMode === 'custom' && compareDateRange?.from ? format(compareDateRange.from, 'yyyy-MM-dd') : undefined,
        compareMode === 'custom' && compareDateRange?.to ? format(compareDateRange.to, 'yyyy-MM-dd') : undefined
      );
      
      if (response?.status === 'success') {
        setData(response);
      } else {
        setError(response?.message || 'Fehler beim Laden der Daten');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [dateRange, compareMode, compareDateRange, selectedCampaigns]);

  // Initial laden
  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    loadComparisonData();
  }, [loadComparisonData]);

  // Handler
  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value);
    if (value !== 'custom') {
      const newRange = getDateRangeFromPreset(value);
      setDateRange(newRange);
      setCompareDateRange(getComparisonDateRange(newRange, compareMode));
    }
  };

  const handleCompareModeChange = (value: CompareMode) => {
    setCompareMode(value);
    if (dateRange?.from && dateRange?.to) {
      setCompareDateRange(getComparisonDateRange(dateRange, value));
    }
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setTimeRange('custom');
      const newRange = { from: range.from, to: range.to };
      setDateRange(newRange);
      setCompareDateRange(getComparisonDateRange(newRange, compareMode));
      setCalendarOpen(false);
    }
  };

  // KPI-Daten aufbereiten
  const kpiData = useMemo(() => {
    if (!data?.current_period?.summary || !data?.comparison_period?.summary) return [];
    
    const current = data.current_period.summary;
    const previous = data.comparison_period.summary;
    const changes = data.changes;
    
    return KPI_DEFINITIONS.map(kpi => {
      const currentValue = current[kpi.key as keyof typeof current] as number || 0;
      const previousValue = previous[kpi.key as keyof typeof previous] as number || 0;
      const change = changes?.[kpi.key as keyof typeof changes] || { percentage: 0, direction: 'neutral' as const };
      
      return {
        key: kpi.key,
        label: kpi.label,
        current: currentValue,
        previous: previousValue,
        change: change.percentage,
        direction: change.direction,
        format: kpi.format,
        icon: kpi.icon,
        inverse: kpi.inverse,
      };
    });
  }, [data]);

  // Chart-Daten aufbereiten
  const chartData = useMemo(() => {
    if (!data?.current_period || !data?.comparison_period) return { trendData: [], ratioData: [] };
    
    // Trend-Daten (Mock - in echter Implementierung aus Backend)
    const days = differenceInDays(dateRange.to, dateRange.from) + 1;
    const trendData = Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = new Date(dateRange.from);
      date.setDate(date.getDate() + i);
      const currentValue = data.current_period.summary[selectedKPI as keyof typeof data.current_period.summary] as number || 0;
      const previousValue = data.comparison_period.summary[selectedKPI as keyof typeof data.comparison_period.summary] as number || 0;
      
      return {
        date: date.toISOString(),
        current: currentValue / days * (0.8 + Math.random() * 0.4),
        previous: previousValue / days * (0.8 + Math.random() * 0.4),
      };
    });

    // Ratio-Daten
    const ratioData = [
      {
        name: getKPILabel(selectedKPI),
        current: data.current_period.summary[selectedKPI as keyof typeof data.current_period.summary] as number || 0,
        previous: data.comparison_period.summary[selectedKPI as keyof typeof data.comparison_period.summary] as number || 0,
      },
    ];

    return { trendData, ratioData };
  }, [data, selectedKPI, dateRange]);

  // Export
  const handleExport = () => {
    if (!data) return;
    
    const exportData = {
      current_period: data.current_period,
      comparison_period: data.comparison_period,
      changes: data.changes,
      exported_at: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-vergleich-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Labels
  const currentPeriodLabel = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'dd.MM.')} - ${format(dateRange.to, 'dd.MM.yyyy')}`
    : 'Aktueller Zeitraum';
  
  const comparisonPeriodLabel = compareDateRange?.from && compareDateRange?.to
    ? `${format(compareDateRange.from, 'dd.MM.')} - ${format(compareDateRange.to, 'dd.MM.yyyy')}`
    : 'Vergleichszeitraum';

  // Lade-Zustand
  if (loading && !data) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">KPI Vergleich</h1>
              <p className="text-muted-foreground">Vergleichen Sie Ihre KPIs über verschiedene Zeiträume</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px]" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">KPI Vergleich</h1>
            <p className="text-muted-foreground">
              Vergleichen Sie Ihre Marketing-KPIs über verschiedene Zeiträume
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!data}>
              <Download className="mr-2 h-4 w-4" />
              Exportieren
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {/* Zeitraum */}
                <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                  <SelectTrigger className="w-[140px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Letzte 7 Tage</SelectItem>
                    <SelectItem value="14d">Letzte 14 Tage</SelectItem>
                    <SelectItem value="30d">Letzte 30 Tage</SelectItem>
                    <SelectItem value="90d">Letzte 90 Tage</SelectItem>
                    <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                  </SelectContent>
                </Select>

                {/* Custom Date Picker */}
                {timeRange === 'custom' && (
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[240px]">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {currentPeriodLabel}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        required={false}
                        defaultMonth={dateRange?.from}
                        selected={{
                          from: dateRange?.from,
                          to: dateRange?.to,
                        }}
                        onSelect={handleCalendarSelect}
                        numberOfMonths={2}
                        locale={de}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {/* Vergleichsmodus */}
                <Select value={compareMode} onValueChange={handleCompareModeChange}>
                  <SelectTrigger className="w-[180px]">
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previous_period">Vorheriger Zeitraum</SelectItem>
                    <SelectItem value="previous_year">Vorjahr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                {/* Kampagnen-Filter */}
                {campaigns.length > 0 && (
                  <Select 
                    value={selectedCampaigns[0] || 'all'} 
                    onValueChange={(value) => setSelectedCampaigns(value === 'all' ? [] : [value])}
                  >
                    <SelectTrigger className="w-[200px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Alle Kampagnen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Kampagnen</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button variant="ghost" size="icon" onClick={loadComparisonData} disabled={loading}>
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>

            {/* Zeitraum-Anzeige */}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <Badge variant="default" className="font-normal">
                Aktuell: {currentPeriodLabel}
              </Badge>
              <span className="text-muted-foreground">vs.</span>
              <Badge variant="secondary" className="font-normal">
                Vergleich: {comparisonPeriodLabel}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {kpiData.slice(0, 10).map((kpi) => (
            <ComparisonCard
              key={kpi.key}
              title={kpi.label}
              currentValue={kpi.current}
              previousValue={kpi.previous}
              change={kpi.change}
              direction={kpi.direction}
              format={kpi.format}
              icon={kpi.icon}
              inverse={kpi.inverse}
            />
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="charts">Diagramme</TabsTrigger>
            <TabsTrigger value="table">Tabelle</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Zusammenfassung */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Performance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.changes?.avg_roas?.direction === 'up' ? '↑' : data?.changes?.avg_roas?.direction === 'down' ? '↓' : '→'}
                    {' '}{Math.abs(data?.changes?.avg_roas?.percentage || 0).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">ROAS Veränderung</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profit</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-2xl font-bold",
                    (data?.changes?.profit?.percentage || 0) >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatValue(data?.current_period?.summary?.profit || 0, 'currency')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data?.changes?.profit?.percentage && data.changes.profit.percentage >= 0 ? '+' : ''}
                    {data?.changes?.profit?.percentage?.toFixed(1) || 0}% vs. Vorher
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Effizienz</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatValue(data?.current_period?.summary?.avg_cpc || 0, 'currency')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    CPC ({data?.changes?.avg_cpc?.percentage && data.changes.avg_cpc.percentage <= 0 ? '↓' : '↑'}
                    {Math.abs(data?.changes?.avg_cpc?.percentage || 0).toFixed(1)}%)
                  </p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Top Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Wichtigste Erkenntnisse</CardTitle>
                <CardDescription>
                  Basierend auf dem Vergleich der Zeiträume
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {kpiData
                  .filter(kpi => Math.abs(kpi.change) > 5)
                  .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
                  .slice(0, 5)
                  .map((kpi, index) => (
                    <div key={kpi.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {kpi.icon}
                        </div>
                        <div>
                          <p className="font-medium">{kpi.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatValue(kpi.current, kpi.format)} vs. {formatValue(kpi.previous, kpi.format)}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={kpi.inverse 
                          ? (kpi.direction === 'down' ? 'default' : 'destructive')
                          : (kpi.direction === 'up' ? 'default' : 'destructive')
                        }
                      >
                        {kpi.direction === 'up' ? '+' : ''}{kpi.change.toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                {kpiData.filter(kpi => Math.abs(kpi.change) > 5).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Keine signifikanten Veränderungen in diesem Zeitraum
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            {/* KPI Auswahl */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">KPI:</span>
              <Select value={selectedKPI} onValueChange={setSelectedKPI}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spend">Ausgaben</SelectItem>
                  <SelectItem value="revenue">Umsatz</SelectItem>
                  <SelectItem value="ctr">CTR</SelectItem>
                  <SelectItem value="cpc">CPC</SelectItem>
                  <SelectItem value="roas">ROAS</SelectItem>
                  <SelectItem value="cvr">CVR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ComparisonCharts
              trendData={chartData.trendData}
              ratioData={chartData.ratioData}
              selectedKPI={selectedKPI}
            />
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <CardHeader>
                <CardTitle>Detaillierte Übersicht</CardTitle>
                <CardDescription>
                  Alle KPIs im direkten Vergleich
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComparisonTable
                  data={kpiData}
                  currentPeriodLabel={currentPeriodLabel}
                  previousPeriodLabel={comparisonPeriodLabel}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Hilfsfunktion
function getKPILabel(key: string): string {
  const labels: Record<string, string> = {
    'spend': 'Ausgaben',
    'revenue': 'Umsatz',
    'ctr': 'CTR',
    'cpc': 'CPC',
    'roas': 'ROAS',
    'cvr': 'CVR',
  };
  return labels[key] || key;
}
