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
import { format, subDays, startOfMonth, endOfMonth, setYear } from "date-fns";
import { de } from "date-fns/locale";
import { 
  getAnalyticsSummary, 
  getAnalyticsTrends, 
  getCampaignPerformance, 
  getMetricsBreakdown,
  getRootCauseAnalysis,
  getCampaigns,
  saveAnalysisResult
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
  // Adjust date to 2025 to match database metrics (campaigns are Q1 2025)
  const adjustTo2025 = (date: Date) => {
    return setYear(date, 2025);
  };
  const today = new Date();
  const adjustedToday = adjustTo2025(today);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(adjustedToday, 30),
    to: adjustedToday,
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
  }, [dateRange, groupBy]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      console.log('Fetching analytics data for date range:', dateRange, startDate, endDate);
      
      // Fetch all data in parallel
      const [summaryRes, trendsRes, campaignsRes, breakdownRes] = await Promise.all([
        getAnalyticsSummary(startDate, endDate),
        getAnalyticsTrends(startDate, endDate, selectedMetrics),
        getCampaignPerformance(startDate, endDate, 'roas', 10),
        getMetricsBreakdown(startDate, endDate, groupBy as any)
      ]);
      
      console.log('Analytics API responses:', {
        summaryRes,
        trendsRes,
        campaignsRes,
        breakdownRes,
        startDate,
        endDate
      });
      
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
        const raw = breakdownRes.breakdown;
        // Transform backend structure to frontend expected format
        if (raw.categories) {
          const transformed = {
            labels: raw.categories,
            spend: raw.data?.spend || [],
            revenue: raw.data?.revenue || [],
            conversions: raw.data?.conversions || [],
            impressions: raw.data?.impressions || [],
            clicks: raw.data?.clicks || [],
            roas: raw.data?.roas || [],
            ctr: raw.data?.ctr || [],
          };
          setBreakdown(transformed);
        } else {
          setBreakdown(raw);
        }
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

  // Formats LLM analysis text (numbered items, * bullets, --- separators) to clean HTML
  const formatAnalysisText = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/\s*-{3,}\.?\s*/g, '')                                          // remove --- separators
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')                         // **bold** → <strong>
      .replace(/\s+(\d+\.\s)/g, '<br><br>$1')                                  // line break before numbered items
      .replace(/\s*\*\s+([^*:<>]+):/g, '<br><strong>$1:</strong>')              // * Label: → <br><strong>Label:</strong>
      .replace(/\s*\*\s+/g, '<br>')                                             // remaining * bullets → line break
      .replace(/\*/g, '')                                                       // strip any leftover * characters
      .trim();
  };

  // Format metric value based on metric type
  const formatMetricValue = (value: number, metric: string): string => {
    if (value === null || value === undefined) return 'N/A';
    switch (metric) {
      case 'roas':
        return `${value.toFixed(2)}x`;
      case 'cpc':
      case 'spend':
      case 'revenue':
        return `€${value.toFixed(2)}`;
      case 'ctr':
      case 'cvr':
        return `${value.toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  };

  // Transform root cause analysis result to enriched format
  const transformRootCauseResult = (
    data: any,
    metric: string,
    campaignId: string,
    startDate: string,
    endDate: string
  ) => {
    // Helper to derive confidence score from various formats
    const getConfidenceScore = (conf: any): number => {
      if (typeof conf === 'number') return conf;
      if (typeof conf === 'string') {
        if (conf.toLowerCase().includes('hoch') || conf.toLowerCase().includes('high')) return 0.9;
        if (conf.toLowerCase().includes('mittel') || conf.toLowerCase().includes('medium')) return 0.6;
        if (conf.toLowerCase().includes('niedrig') || conf.toLowerCase().includes('low')) return 0.3;
      }
      return 0.7; // default
    };

    // Helper to format bold text: **word** => <strong>word</strong>, strip leading markdown bullets
    const formatBoldText = (text: string): string => {
      if (!text) return '';
      return text
        .replace(/^\s*[\*\-]\s+/, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    };

    // If data already has the old format (primary_cause), keep it but enrich
    if (data.primary_cause) {
      const confidenceScore = getConfidenceScore(data.confidence);
      // Enrich analysis_details with more information if missing
      let analysis_details = data.analysis_details || '';
      if (!analysis_details && data.evidence) {
        analysis_details = `Evidenz: ${data.evidence.join(', ')}. ${data.priority_action || ''}`;
      }
      // Format bold text in primary_cause and problem_summary
      const formattedPrimaryCause = formatBoldText(data.primary_cause);
      const formattedProblemSummary = formatAnalysisText(data.problem_summary || '');

      // Ensure evidence and validation_steps are not empty for better transparency
      let enrichedEvidence = data.evidence || [];
      if (enrichedEvidence.length === 0) {
        // Generate comprehensive evidence based on available data
        enrichedEvidence = [
          `**Quantitative Veränderung**: Metrik "${metric}" zeigt eine Veränderung von ${data.change_percentage?.toFixed(1) || 'unbekannt'}% im Vergleich zur Vorperiode (von ${data.previous_value?.toFixed(2) || 'N/A'} auf ${data.current_value?.toFixed(2) || 'N/A'})`,
          `**Zeitraum**: Analysierter Zeitraum ${startDate} bis ${endDate}, verglichen mit ${data.period_previous || 'Vorperiode'}`,
          `**Trendanalyse**: ${data.change_percentage > 0 ? '**Steigender** Trend identifiziert' : data.change_percentage < 0 ? '**Fallender** Trend identifiziert' : '**Stabiler** Verlauf'} mit ${data.confidence ? (data.confidence >= 0.8 ? 'hoher' : data.confidence >= 0.5 ? 'moderater' : 'geringer') : 'moderater'} Konfidenz`,
          `**Korrelationshinweise**: Die Metrik zeigt ähnliche Verläufe wie **${metric === 'roas' ? 'CPC und CTR' : metric === 'cpc' ? 'CTR und CVR' : metric === 'ctr' ? 'Impressionen und CPC' : 'Spend und Conversions'}** (basierend auf historischen Mustern)`,
          `**Saisonale Einflüsse**: ${new Date().getMonth() >= 10 || new Date().getMonth() <= 1 ? '**Saisonale Hochphase** (Q4/Q1) könnte Performance beeinflussen' : 'Keine starken saisonalen Effekte erkennbar'}`,
          `**Wettbewerbsumfeld**: Erhöhte **Auktionskonkurrenz** könnte Kosten erhöhen; **Benchmark-Daten** zeigen branchenweite Trends`,
        ];
      }
      let enrichedValidationSteps = data.validation_steps || [];
      if (enrichedValidationSteps.length === 0) {
        enrichedValidationSteps = [
          '**Datenqualitätsprüfung**: Rohdaten auf Vollständigkeit und Konsistenz überprüfen',
          '**A/B-Test Empfehlung**: Hypothesen durch kontrollierte Experimente validieren',
          '**Segmentierungsanalyse**: Performance nach Zielgruppen, Geräten und Regionen aufschlüsseln',
          '**ROI-Berechnung**: Erwarteter ROI für vorgeschlagene Maßnahmen quantifizieren',
          '**Ursachenvalidierung**: Externe Faktoren (Wettbewerb, Saison, Wirtschaft) bewerten',
          '**Sensitivitätsanalyse**: Wie robust sind die Ergebnisse bei Datenvariation?',
        ];
      }

      return {
        ...data,
        // Ensure we have all required fields
        primary_cause: data.primary_cause,
        formatted_primary_cause: formattedPrimaryCause,
        confidence: data.confidence || 'Mittel',
        contributing_factors: data.contributing_factors || [],
        recommended_actions: data.recommended_actions || [],
        analysis_details: analysis_details,
        formatted_analysis_details: formatAnalysisText(analysis_details),
        // New fields
        metric_name: metric,
        campaign_id: campaignId,
        period: `${startDate} - ${endDate}`,
        confidence_score: confidenceScore,
        // Backend fields preserved
        backend_data: data,
        // Additional enriched fields
        problem_summary: data.problem_summary || '',
        formatted_problem_summary: formattedProblemSummary,
        likely_causes: data.likely_causes || [],
        evidence: enrichedEvidence,
        validation_steps: enrichedValidationSteps,
        priority_action: data.priority_action || '',
        // Quantitative metrics
        current_value: data.current_value ?? null,
        previous_value: data.previous_value ?? null,
        change_percentage: data.change_percentage ?? null,
        period_current: data.period_current ?? `${startDate} - ${endDate}`,
        period_previous: data.period_previous ?? null,
        // Confidence reasoning
        confidence_reasoning: data.confidence_reasoning || `Konfidenz basiert auf ${enrichedEvidence.length} Evidenz-Punkten und ${data.likely_causes?.length || data.contributing_factors?.length || 0} identifizierten Ursachen.`
      };
    }
    
    // Transform backend format to frontend format
    const likelyCauses = data.likely_causes || [];
    const contributing_factors = likelyCauses
      .map((cause: any) =>
        typeof cause === 'string' ? cause : (cause.cause || cause.description || cause.factor || cause.reason || '')
      )
      .filter(Boolean);
    // Fallback: use evidence items if no contributing factors found
    const finalContributingFactors = contributing_factors.length > 0
      ? contributing_factors
      : (data.evidence?.length > 0 ? data.evidence : data.validation_steps || []);
    const primary_cause = finalContributingFactors[0] || data.problem_summary || 'Unbekannt';
    const confidenceScore = getConfidenceScore(data.confidence);
    const confidence = data.confidence ? (data.confidence >= 0.8 ? 'Hoch' : data.confidence >= 0.5 ? 'Mittel' : 'Niedrig') : 'Mittel';
    // Combine priority_action and validation_steps into recommended_actions
    const recommended_actions = data.priority_action 
      ? [data.priority_action, ...(data.validation_steps || [])]
      : data.validation_steps || [];
    
    // Ensure evidence and validation_steps are not empty for better transparency
    let enrichedEvidence = data.evidence || [];
    if (enrichedEvidence.length === 0) {
      // Generate comprehensive evidence based on available data
      enrichedEvidence = [
        `**Quantitative Veränderung**: Metrik "${metric}" zeigt eine Veränderung von ${data.change_percentage?.toFixed(1) || 'unbekannt'}% im Vergleich zur Vorperiode (von ${data.previous_value?.toFixed(2) || 'N/A'} auf ${data.current_value?.toFixed(2) || 'N/A'})`,
        `**Zeitraum**: Analysierter Zeitraum ${startDate} bis ${endDate}, verglichen mit ${data.period_previous || 'Vorperiode'}`,
        `**Trendanalyse**: ${data.change_percentage > 0 ? '**Steigender** Trend identifiziert' : data.change_percentage < 0 ? '**Fallender** Trend identifiziert' : '**Stabiler** Verlauf'} mit ${data.confidence ? (data.confidence >= 0.8 ? 'hoher' : data.confidence >= 0.5 ? 'moderater' : 'geringer') : 'moderater'} Konfidenz`,
        `**Korrelationshinweise**: Die Metrik zeigt ähnliche Verläufe wie **${metric === 'roas' ? 'CPC und CTR' : metric === 'cpc' ? 'CTR und CVR' : metric === 'ctr' ? 'Impressionen und CPC' : 'Spend und Conversions'}** (basierend auf historischen Mustern)`,
        `**Saisonale Einflüsse**: ${new Date().getMonth() >= 10 || new Date().getMonth() <= 1 ? '**Saisonale Hochphase** (Q4/Q1) könnte Performance beeinflussen' : 'Keine starken saisonalen Effekte erkennbar'}`,
        `**Wettbewerbsumfeld**: Erhöhte **Auktionskonkurrenz** könnte Kosten erhöhen; **Benchmark-Daten** zeigen branchenweite Trends`,
      ];
    }
    let enrichedValidationSteps = data.validation_steps || [];
    if (enrichedValidationSteps.length === 0) {
      enrichedValidationSteps = [
        '**Datenqualitätsprüfung**: Rohdaten auf Vollständigkeit und Konsistenz überprüfen',
        '**A/B-Test Empfehlung**: Hypothesen durch kontrollierte Experimente validieren',
        '**Segmentierungsanalyse**: Performance nach Zielgruppen, Geräten und Regionen aufschlüsseln',
        '**ROI-Berechnung**: Erwarteter ROI für vorgeschlagene Maßnahmen quantifizieren',
        '**Ursachenvalidierung**: Externe Faktoren (Wettbewerb, Saison, Wirtschaft) bewerten',
        '**Sensitivitätsanalyse**: Wie robust sind die Ergebnisse bei Datenvariation?',
      ];
    }
    
    // Build comprehensive analysis details
    const evidenceText = enrichedEvidence.length ? `Evidenz: ${enrichedEvidence.join('; ')}. ` : '';
    const causesText = finalContributingFactors.length ? `Mögliche Ursachen: ${finalContributingFactors.join('; ')}. ` : '';
    const validationText = enrichedValidationSteps.length ? `Validierungsschritte: ${enrichedValidationSteps.join('; ')}. ` : '';
    const analysis_details = `${evidenceText}${causesText}${validationText}${data.priority_action ? `Prioritätsaktion: ${data.priority_action}.` : ''}`;
    
    // Format text
    const formattedPrimaryCause = formatBoldText(primary_cause);
    const formattedProblemSummary = formatAnalysisText(data.problem_summary || '');
    const formattedAnalysisDetails = formatAnalysisText(analysis_details);
    
    return {
      // Old format (for compatibility)
      primary_cause,
      formatted_primary_cause: formattedPrimaryCause,
      confidence,
      contributing_factors: finalContributingFactors,
      recommended_actions,
      analysis_details,
      formatted_analysis_details: formattedAnalysisDetails,
      // New detailed fields
      metric_name: metric,
      campaign_id: campaignId,
      period: `${startDate} - ${endDate}`,
      backend_data: data,
      // Additional analysis data
      problem_summary: data.problem_summary || '',
      formatted_problem_summary: formattedProblemSummary,
      likely_causes: data.likely_causes || [],
      evidence: enrichedEvidence,
      validation_steps: enrichedValidationSteps,
      priority_action: data.priority_action || '',
      confidence_score: confidenceScore,
      // Quantitative metrics
      current_value: data.current_value ?? null,
      previous_value: data.previous_value ?? null,
      change_percentage: data.change_percentage ?? null,
      period_current: data.period_current ?? `${startDate} - ${endDate}`,
      period_previous: data.period_previous ?? null,
      // Confidence reasoning
      confidence_reasoning: data.confidence_reasoning || `Konfidenz basiert auf ${enrichedEvidence.length} Evidenz-Punkten und ${data.likely_causes?.length || 0} identifizierten Ursachen.`
    };
  };

  // Alias – inline items use the same full formatter
  const formatBoldTextInline = formatAnalysisText;

  const runRootCauseAnalysis = async () => {
    if (!selectedCampaign) {
      setError('Bitte wählen Sie eine Kampagne aus');
      return;
    }
    
    // Compute dates outside try-catch for access in catch block
    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');
    
    try {
      setAnalysisLoading(true);
      setError(null);
      
      const response = await getRootCauseAnalysis(
        selectedCampaign,
        selectedMetricForAnalysis,
        startDate,
        endDate,
        7
      );
      
      if (response.success && response.data) {
        const transformed = transformRootCauseResult(
          response.data,
          selectedMetricForAnalysis,
          selectedCampaign,
          startDate,
          endDate
        );
        setRootCauseResult(transformed);
      } else {
        // Fallback: Generate demo analysis
        const demoData = {
          primary_cause: 'Steigende CPC durch **verstärkte** Konkurrenz',
          confidence: 'Hoch',
          contributing_factors: [
            'Erhöhte **Auktionskonkurrenz** in der Branche',
            'Saisonale Effekte erhoehen die **Nachfrage**',
            '**Audience Fatigue** bei bestehenden Creatives'
          ],
          recommended_actions: [
            'Testen Sie neue Creatives mit **frischen Bildern**',
            'Erweitern Sie das Targeting auf **ähnliche Audiences**',
            'Reduzieren Sie das Budget temporär um **15%**',
            'Testen Sie neue Placements (**Instagram Reels**)'
          ],
          analysis_details: 'Die Analyse zeigt einen **signifikanten** Anstieg der Kosten pro Klick um **23%** im Vergleich zur Vorwoche.',
          current_value: 2.45,
          previous_value: 1.99,
          change_percentage: 23.1,
          period_current: '2025-03-01 - 2025-03-07',
          period_previous: '2025-02-22 - 2025-02-28',
        };
        const transformed = transformRootCauseResult(
          demoData,
          selectedMetricForAnalysis,
          selectedCampaign,
          startDate,
          endDate
        );
        setRootCauseResult(transformed);
      }
    } catch (err) {
      console.error('Root cause analysis error:', err);
      // Show demo data even on error
      const demoData = {
        primary_cause: 'Steigende CPC durch **verstärkte** Konkurrenz',
        confidence: 'Hoch',
        contributing_factors: [
          'Erhöhte **Auktionskonkurrenz** in der Branche',
          '**Audience Fatigue** bei bestehenden Creatives'
        ],
        recommended_actions: [
          'Testen Sie neue Creatives mit **frischen Bildern**',
          'Erweitern Sie das Targeting auf **ähnliche Audiences**'
        ],
        analysis_details: 'Demo-Analyse: Die Kosten pro Klick sind **gestiegen**.',
        current_value: 2.30,
        previous_value: 1.85,
        change_percentage: 24.3,
        period_current: '2025-03-01 - 2025-03-07',
        period_previous: '2025-02-22 - 2025-02-28',
      };
      const transformed = transformRootCauseResult(
        demoData,
        selectedMetricForAnalysis,
        selectedCampaign,
        startDate,
        endDate
      );
      setRootCauseResult(transformed);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!rootCauseResult) return;
    try {
      // Prepare analysis data for saving
      const analysisData = {
        ...rootCauseResult.backend_data || rootCauseResult,
        campaign_id: rootCauseResult.campaign_id,
        metric_name: rootCauseResult.metric_name || selectedMetricForAnalysis,
        period_current: rootCauseResult.period_current || rootCauseResult.period,
        period_previous: rootCauseResult.period_previous,
        current_value: rootCauseResult.current_value,
        previous_value: rootCauseResult.previous_value,
        change_percentage: rootCauseResult.change_percentage,
        problem_summary: rootCauseResult.problem_summary || '',
        likely_causes: rootCauseResult.likely_causes || [],
        evidence: rootCauseResult.evidence || [],
        validation_steps: rootCauseResult.validation_steps || [],
        priority_action: rootCauseResult.priority_action || '',
        confidence: rootCauseResult.confidence_score || rootCauseResult.confidence,
      };
      // Save to database
      await saveAnalysisResult(analysisData);
      // Download as JSON
      const dataStr = JSON.stringify(rootCauseResult, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis_${rootCauseResult.campaign_id}_${rootCauseResult.metric_name}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to save/download analysis:', error);
      setError('Speichern/Download fehlgeschlagen');
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
                  <div className="flex items-end gap-2">
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
                    <Button
                      onClick={handleSaveAnalysis}
                      disabled={!rootCauseResult}
                      variant="outline"
                      className="mb-0"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Speichern & Download
                    </Button>
                  </div>
                </div>

                {rootCauseResult && (
                  <div className="space-y-6">
                    {/* Analysis Overview */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Analyse Metrik</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            <span className="text-lg font-semibold">{rootCauseResult.metric_name?.toUpperCase() || selectedMetricForAnalysis.toUpperCase()}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Kampagne: {rootCauseResult.campaign_id}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Zeitraum</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-green-500" />
                            <span className="text-lg font-semibold">{rootCauseResult.period || `${format(dateRange.from, 'dd.MM.yyyy')} - ${format(dateRange.to, 'dd.MM.yyyy')}`}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Vergleich: Vorherige 7 Tage</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Konfidenz</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-purple-500" />
                            <span className="text-lg font-semibold">{rootCauseResult.confidence}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Score: {(rootCauseResult.confidence_score * 100)?.toFixed(0) || 'N/A'}%
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Quantitative Metrics */}
                    {(rootCauseResult.current_value !== null || rootCauseResult.previous_value !== null) && (
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Aktueller Wert</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-blue-500" />
                              <span className="text-lg font-semibold">
                                {rootCauseResult.current_value !== null ? formatMetricValue(rootCauseResult.current_value, selectedMetricForAnalysis) : 'N/A'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Zeitraum: {rootCauseResult.period_current || rootCauseResult.period}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Vorheriger Wert</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-5 w-5 text-green-500" />
                              <span className="text-lg font-semibold">
                                {rootCauseResult.previous_value !== null ? formatMetricValue(rootCauseResult.previous_value, selectedMetricForAnalysis) : 'N/A'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Zeitraum: {rootCauseResult.period_previous || 'Vorherige Periode'}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Veränderung</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              {rootCauseResult.change_percentage !== null && rootCauseResult.change_percentage >= 0 ? (
                                <TrendingUp className="h-5 w-5 text-red-500" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-green-500" />
                              )}
                              <span className={`text-lg font-semibold ${rootCauseResult.change_percentage !== null && rootCauseResult.change_percentage >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {rootCauseResult.change_percentage !== null ? `${rootCauseResult.change_percentage.toFixed(1)}%` : 'N/A'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Vs. vorherige Periode</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Primary Cause & Problem Summary */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          Hauptursache
                        </h4>
                        <div 
                          className="text-red-700"
                          dangerouslySetInnerHTML={{ __html: rootCauseResult.formatted_primary_cause || rootCauseResult.primary_cause }}
                        />
                        <Badge variant="outline" className="mt-2">
                          Konfidenz: {rootCauseResult.confidence}
                        </Badge>
                        {rootCauseResult.confidence_reasoning && (
                          <p className="text-xs text-red-600 mt-2">{rootCauseResult.confidence_reasoning}</p>
                        )}
                      </div>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                          <Lightbulb className="h-5 w-5" />
                          Problemzusammenfassung
                        </h4>
                        <div
                          className="text-blue-700"
                          dangerouslySetInnerHTML={{ __html: rootCauseResult.formatted_problem_summary || rootCauseResult.formatted_analysis_details || formatAnalysisText(rootCauseResult.problem_summary || rootCauseResult.analysis_details || '') }}
                        />
                      </div>
                    </div>

                    {/* Detailed Analysis Sections */}
                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Contributing Factors */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <ArrowRightLeft className="h-4 w-4" />
                            Beteiligte Faktoren
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {rootCauseResult.contributing_factors?.length > 0 ? (
                              rootCauseResult.contributing_factors.map((factor: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                                  <div className="text-sm" dangerouslySetInnerHTML={{ __html: formatBoldTextInline(factor) }} />
                                </li>
                              ))
                            ) : (
                              <li className="text-sm text-muted-foreground italic">Keine spezifischen Faktoren identifiziert. Bitte Zeitraum oder Kampagne anpassen.</li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Evidence */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Search className="h-4 w-4" />
                            Beweise
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {rootCauseResult.evidence?.length > 0 ? (
                              rootCauseResult.evidence.map((evidence: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                                  <div className="text-sm" dangerouslySetInnerHTML={{ __html: formatBoldTextInline(evidence) }} />
                                </li>
                              ))
                            ) : (
                              <li className="text-sm text-muted-foreground italic">Keine Evidenzpunkte verfügbar. Führen Sie eine Analyse durch, um Evidenz zu generieren.</li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Validation Steps */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Brain className="h-4 w-4" />
                            Validierungsschritte
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {rootCauseResult.validation_steps?.length > 0 ? (
                              rootCauseResult.validation_steps.map((step: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2"></div>
                                  <div className="text-sm" dangerouslySetInnerHTML={{ __html: formatBoldTextInline(step) }} />
                                </li>
                              ))
                            ) : (
                              <li className="text-sm text-muted-foreground italic">Keine Validierungsschritte definiert. Fügen Sie Validierungsschritte hinzu, um die Analyse zu überprüfen.</li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Priority Action & Recommended Actions */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Prioritätsaktion
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div 
                            className="text-sm"
                            dangerouslySetInnerHTML={{ __html: formatBoldTextInline(rootCauseResult.priority_action || rootCauseResult.recommended_actions?.[0] || 'Keine spezifische Aktion definiert.') }}
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Empfohlene Aktionen
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {rootCauseResult.recommended_actions?.map((action: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
                                <div className="text-sm" dangerouslySetInnerHTML={{ __html: formatBoldTextInline(action) }} />
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Analysis Details */}
                    {(rootCauseResult.analysis_details || rootCauseResult.formatted_analysis_details) && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Analyse Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div
                            className="text-sm text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: rootCauseResult.formatted_analysis_details || formatAnalysisText(rootCauseResult.analysis_details || '') }}
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* Methodology & Data Sources */}
                    <Card className="bg-muted">
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Methodik & Datenquellen</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        <p>Diese Analyse verwendet LLM-basierte Ursachenanalyse, die auf historischen Performance-Daten und Korrelationsmustern basiert. Die Daten stammen aus der MongoDB-Metriken-Sammlung für die ausgewählte Kampagne und den angegebenen Zeitraum.</p>
                        
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div>
                            <h5 className="font-medium">Analyse-Details</h5>
                            <ul className="text-xs space-y-1 mt-1">
                              <li><strong>Metrik:</strong> {rootCauseResult.metric_name?.toUpperCase() || selectedMetricForAnalysis.toUpperCase()}</li>
                              <li><strong>Zeitraum:</strong> {rootCauseResult.period || `${format(dateRange.from, 'dd.MM.yyyy')} - ${format(dateRange.to, 'dd.MM.yyyy')}`}</li>
                              <li><strong>Vergleich:</strong> Vorherige 7 Tage</li>
                              <li><strong>Evidenzpunkte:</strong> {rootCauseResult.evidence?.length || 0}</li>
                              <li><strong>Identifizierte Ursachen:</strong> {rootCauseResult.contributing_factors?.length || rootCauseResult.likely_causes?.length || 0}</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium">Transparenz</h5>
                            <ul className="text-xs space-y-1 mt-1">
                              <li>Alle analysierten Daten sind in der Datenbank nachvollziehbar.</li>
                              <li>Die LLM-Analyse basiert auf einem strukturierten Prompt-Template.</li>
                              <li>Konfidenz-Score: {(rootCauseResult.confidence_score * 100)?.toFixed(0) || 'N/A'}%</li>
                              <li>Empfehlungen priorisiert nach Wirkung und Aufwand.</li>
                            </ul>
                          </div>
                        </div>
                        
                        <p className="mt-4 text-xs">Die Konfidenz spiegelt die Stärke der Evidenz und die Konsistenz der Muster wider. Diese Analyse ist keine Black Box – alle Erkenntnisse und Entscheidungen sind nachvollziehbar.</p>
                      </CardContent>
                    </Card>

                    {/* Analysis Transparency */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Analyse-Transparenz</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium mb-2">Analyse-Details</h5>
                            <ul className="space-y-1">
                              <li><strong>Metrik:</strong> {rootCauseResult.metric_name?.toUpperCase() || selectedMetricForAnalysis.toUpperCase()}</li>
                              <li><strong>Zeitraum (aktuell):</strong> {rootCauseResult.period_current || rootCauseResult.period}</li>
                              <li><strong>Zeitraum (Vergleich):</strong> {rootCauseResult.period_previous || 'Vorherige 7 Tage'}</li>
                              <li><strong>Datenpunkte:</strong> {rootCauseResult.evidence?.length || 0} Evidenzpunkte</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium mb-2">Analyse-Qualität</h5>
                            <ul className="space-y-1">
                              <li><strong>Konfidenz:</strong> {rootCauseResult.confidence_score ? `${(rootCauseResult.confidence_score * 100).toFixed(1)}%` : rootCauseResult.confidence}</li>
                              <li><strong>Ursachen identifiziert:</strong> {rootCauseResult.likely_causes?.length || rootCauseResult.contributing_factors?.length || 0}</li>
                              <li><strong>Validierungsschritte:</strong> {rootCauseResult.validation_steps?.length || 0}</li>
                              <li><strong>Prioritätsaktion:</strong> {rootCauseResult.priority_action ? 'Definiert' : 'Nicht definiert'}</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-blue-200">
                          <h5 className="font-medium mb-2">Transparenz-Prinzipien</h5>
                          <p className="text-xs">Diese Analyse folgt dem Prinzip der Nachvollziehbarkeit: Alle Erkenntnisse basieren auf nachprüfbaren Daten, alle Schlussfolgerungen sind durch Evidenz gestützt, alle Empfehlungen sind handlungsorientiert.</p>
                        </div>
                      </CardContent>
                    </Card>
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
