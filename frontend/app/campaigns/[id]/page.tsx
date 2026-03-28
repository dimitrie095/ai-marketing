"use client";

import { useEffect, useRef, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Copy,
  Download,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Plus,
  Brain,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import {
  getCampaign,
  getCampaigns,
  getCampaignAdSets,
  getCampaignAds,
  getEntityKPIs,
  getKPITrend,
  updateCampaign,
  deleteCampaign,
  getAIInsights,
  createAdSet,
  updateAdSet,
  deleteAdSet,
  getPeriodComparison,
  getMetricsBreakdown,
  getRootCauseAnalysis,
  exportAnalytics,
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

interface ComparisonData {
  spend: number;
  revenue: number;
  roas: number;
  ctr: number;
  cpc: number;
  cvr: number;
  impressions: number;
  clicks: number;
  conversions: number;
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
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [compPrevPeriod, setCompPrevPeriod] = useState<{ start: string; end: string } | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCompareCampaignId, setSelectedCompareCampaignId] = useState<string>('');
  const [compareCampaignKPIs, setCompareCampaignKPIs] = useState<CampaignKPIs | null>(null);
  const [loadingCompareCampaign, setLoadingCompareCampaign] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [breakdownData, setBreakdownData] = useState<any[]>([]);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [ads, setAds] = useState<any[]>([]);
  const [expandedAdSetIds, setExpandedAdSetIds] = useState<string[]>([]);
  const [rootCauseData, setRootCauseData] = useState<any>(null);
  const [loadingRootCause, setLoadingRootCause] = useState(false);
  const [rootCauseError, setRootCauseError] = useState<string | null>(null);
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<string>('spend');
  const trendMetricsOptions = [
    { value: 'spend', label: 'Spend' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'roas', label: 'ROAS' },
    { value: 'ctr', label: 'CTR' },
    { value: 'cpc', label: 'CPC' },
    { value: 'cvr', label: 'CVR' },
    { value: 'clicks', label: 'Clicks' },
    { value: 'impressions', label: 'Impressions' },
  ];
  
  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateAdSetDialogOpen, setIsCreateAdSetDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [newBudget, setNewBudget] = useState<number>(0);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<{ id: string; text: string; createdAt: string }[]>([]);
  const [adSetAction, setAdSetAction] = useState<{ id: string; name: string; type: 'pause' | 'delete' } | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  
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
  }, [campaignId, dateRange]);

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

      // Load all campaigns for comparison (excluding current)
      const campaignsRes = await getCampaigns();
      if (campaignsRes.status === "success" && campaignsRes.data) {
        const otherCampaigns = campaignsRes.data.filter((c: Campaign) => c.id !== campaignId);
        setCampaigns(otherCampaigns);
      }

      // Load KPIs for selected date range
      const startDate = dateRange.startDate;
      const endDate = dateRange.endDate;
      
      const kpiRes = await getEntityKPIs("campaign", campaignId, startDate, endDate);
      if (kpiRes.status === "success" && kpiRes.data) {
        // Ensure numeric fields are numbers
        const kpiData = kpiRes.data;
        const converted = {
          ctr: typeof kpiData.ctr === 'string' ? parseFloat(kpiData.ctr) : Number(kpiData.ctr) || 0,
          cpc: typeof kpiData.cpc === 'string' ? parseFloat(kpiData.cpc) : Number(kpiData.cpc) || 0,
          roas: typeof kpiData.roas === 'string' ? parseFloat(kpiData.roas) : Number(kpiData.roas) || 0,
          cvr: typeof kpiData.cvr === 'string' ? parseFloat(kpiData.cvr) : Number(kpiData.cvr) || 0,
          impressions: typeof kpiData.impressions === 'string' ? parseInt(kpiData.impressions, 10) : Number(kpiData.impressions) || 0,
          clicks: typeof kpiData.clicks === 'string' ? parseInt(kpiData.clicks, 10) : Number(kpiData.clicks) || 0,
          conversions: typeof kpiData.conversions === 'string' ? parseInt(kpiData.conversions, 10) : Number(kpiData.conversions) || 0,
          spend: typeof kpiData.spend === 'string' ? parseFloat(kpiData.spend) : Number(kpiData.spend) || 0,
          revenue: typeof kpiData.revenue === 'string' ? parseFloat(kpiData.revenue) : Number(kpiData.revenue) || 0,
        };
        setKpis(converted);
      }

      // Load trend data
      await loadTrendData();

      // Load comparison data for period delta
      await loadComparisonData();

      // Load breakdown data for ads drilldown
      await loadBreakdownData();
      // Load ads for drilldown
      await loadAds();
    } catch (err) {
      console.error("Campaign detail load error:", err);
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Kampagne");
    } finally {
      setLoading(false);
    }
  };

  const loadComparisonData = async (customPrevStart?: string, customPrevEnd?: string) => {
    try {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      const diffMs = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime() - 86400000);
      const prevStart = new Date(prevEnd.getTime() - diffMs);
      const prevStartStr = customPrevStart ?? format(prevStart, 'yyyy-MM-dd');
      const prevEndStr = customPrevEnd ?? format(prevEnd, 'yyyy-MM-dd');

      const response = await getEntityKPIs("campaign", campaignId, prevStartStr, prevEndStr);
      if (response.status === 'success' && response.data) {
        const d = response.data;
        setComparisonData({
          ctr: Number(d.ctr) || 0,
          cpc: Number(d.cpc) || 0,
          roas: Number(d.roas) || 0,
          cvr: Number(d.cvr) || 0,
          impressions: Number(d.impressions) || 0,
          clicks: Number(d.clicks) || 0,
          conversions: Number(d.conversions) || 0,
          spend: Number(d.spend) || 0,
          revenue: Number(d.revenue) || 0,
        });
        setCompPrevPeriod({ start: prevStartStr, end: prevEndStr });
      }
    } catch (err) {
      console.error('Comparison data load error:', err);
    }
  };

  const loadComparisonCampaignKPIs = async (compareCampaignId: string) => {
    if (!compareCampaignId) {
      setCompareCampaignKPIs(null);
      return;
    }
    try {
      setLoadingCompareCampaign(true);
      const response = await getEntityKPIs("campaign", compareCampaignId, dateRange.startDate, dateRange.endDate);
      if (response.status === 'success' && response.data) {
        const kpiData = response.data;
        const converted = {
          ctr: typeof kpiData.ctr === 'string' ? parseFloat(kpiData.ctr) : Number(kpiData.ctr) || 0,
          cpc: typeof kpiData.cpc === 'string' ? parseFloat(kpiData.cpc) : Number(kpiData.cpc) || 0,
          roas: typeof kpiData.roas === 'string' ? parseFloat(kpiData.roas) : Number(kpiData.roas) || 0,
          cvr: typeof kpiData.cvr === 'string' ? parseFloat(kpiData.cvr) : Number(kpiData.cvr) || 0,
          impressions: typeof kpiData.impressions === 'string' ? parseInt(kpiData.impressions, 10) : Number(kpiData.impressions) || 0,
          clicks: typeof kpiData.clicks === 'string' ? parseInt(kpiData.clicks, 10) : Number(kpiData.clicks) || 0,
          conversions: typeof kpiData.conversions === 'string' ? parseInt(kpiData.conversions, 10) : Number(kpiData.conversions) || 0,
          spend: typeof kpiData.spend === 'string' ? parseFloat(kpiData.spend) : Number(kpiData.spend) || 0,
          revenue: typeof kpiData.revenue === 'string' ? parseFloat(kpiData.revenue) : Number(kpiData.revenue) || 0,
        };
        setCompareCampaignKPIs(converted);
      }
    } catch (err) {
      console.error('Failed to load comparison campaign KPIs:', err);
    } finally {
      setLoadingCompareCampaign(false);
    }
  };

  const loadBreakdownData = async () => {
    try {
      setLoadingBreakdown(true);
      const response = await getMetricsBreakdown(
        dateRange.startDate,
        dateRange.endDate,
        'ad',
        [campaignId]
      );
      if (response.status === 'success' && response.breakdown) {
        const { categories, data } = response.breakdown as {
          categories: string[];
          data: Record<string, number[]>;
        };
        const rows = categories.map((name: string, i: number) => ({
          id: `ad_${i}`,
          name,
          spend: data.spend?.[i] ?? 0,
          revenue: data.revenue?.[i] ?? 0,
          roas: data.roas?.[i] ?? (data.spend?.[i] ? (data.revenue?.[i] ?? 0) / data.spend[i] : 0),
          ctr: data.ctr?.[i] ?? 0,
          cpc: data.cpc?.[i] ?? 0,
          clicks: data.clicks?.[i] ?? 0,
          impressions: data.impressions?.[i] ?? 0,
          conversions: data.conversions?.[i] ?? 0,
        }));
        setBreakdownData(rows);
      }
    } catch (err) {
      console.error('Breakdown data load error:', err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const loadAds = async () => {
    try {
      const response = await getCampaignAds(campaignId);
      if (response.status === 'success' && response.data) {
        setAds(response.data);
      }
    } catch (err) {
      console.error('Ads load error:', err);
    }
  };

  const handleExport = async () => {
    try {
      const response = await exportAnalytics(
        dateRange.startDate,
        dateRange.endDate,
        'campaign',
        [campaignId],
        'csv'
      );
      if (response.status === 'success' && response.data) {
        // Assuming response.data contains a URL or file content
        // Create a download link
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kampagne_${campaignId}_export_${dateRange.startDate}_${dateRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Export fehlgeschlagen: ' + (response.error || 'Unbekannter Fehler'));
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Export fehlgeschlagen: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    }
  };

  const toHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');

  const Md = ({ text }: { text: string }) => (
    <span dangerouslySetInnerHTML={{ __html: toHtml(text) }} />
  );

  const renderAIInsights = (insights: any) => {
    if (!insights) return null;

    if (insights.error) {
      return (
        <p className="text-sm text-red-600 dark:text-red-400">{insights.error}</p>
      );
    }

    if (typeof insights === 'string') {
      return <p className="text-sm"><Md text={insights} /></p>;
    }

    const { summary, key_insights, recommendations, strong_areas, weak_areas } = insights;
    const hasContent = summary || key_insights?.length || recommendations?.length || strong_areas?.length || weak_areas?.length;

    if (!hasContent) {
      return <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(insights, null, 2)}</pre>;
    }

    return (
      <div className="space-y-4">
        {summary && (
          <div>
            <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-1">Zusammenfassung</h4>
            <p className="text-sm"><Md text={summary} /></p>
          </div>
        )}
        {key_insights?.length > 0 && (
          <div>
            <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-1">Wichtigste Erkenntnisse</h4>
            <ul className="space-y-1">
              {key_insights.map((insight: string, idx: number) => (
                <li key={idx} className="text-sm flex gap-2">
                  <span className="text-purple-500 shrink-0">•</span>
                  <Md text={insight} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {strong_areas?.length > 0 && (
          <div>
            <h4 className="font-semibold text-green-700 dark:text-green-300 mb-1">Stärken</h4>
            <ul className="space-y-1">
              {strong_areas.map((area: string, idx: number) => (
                <li key={idx} className="text-sm flex gap-2">
                  <span className="text-green-500 shrink-0">✓</span>
                  <Md text={area} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {weak_areas?.length > 0 && (
          <div>
            <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-1">Verbesserungsbedarf</h4>
            <ul className="space-y-1">
              {weak_areas.map((area: string, idx: number) => (
                <li key={idx} className="text-sm flex gap-2">
                  <span className="text-amber-500 shrink-0">⚠</span>
                  <Md text={area} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {recommendations?.length > 0 && (
          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Empfehlungen</h4>
            <ul className="space-y-1">
              {recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="text-sm flex gap-2">
                  <span className="text-blue-500 shrink-0 font-bold">{idx + 1}.</span>
                  <Md text={rec} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const transformRootCauseData = (data: any) => {
    // If data already has a tree, return as is
    if (data.tree) return data;
    
    const { problem_summary, likely_causes, evidence, validation_steps, priority_action, confidence } = data;
    
    // Build tree structure
    const rootNode = {
      node: problem_summary || 'Performance Drop Analysis',
      metric: 'ROAS',
      impact: confidence ? `Confidence: ${(confidence * 100).toFixed(0)}%` : undefined,
      children: [] as any[]
    };
    
    // Add likely causes as children
    if (likely_causes && Array.isArray(likely_causes)) {
      likely_causes.forEach((cause: any, idx: number) => {
        const causeNode = {
          node: cause.cause || `Cause ${idx + 1}`,
          metric: cause.probability ? `Probability: ${cause.probability}` : undefined,
          impact: cause.impact || undefined,
          children: [] as any[]
        };
        
        // Add evidence as sub-children (first few)
        if (evidence && idx < evidence.length) {
          causeNode.children.push({
            node: evidence[idx],
            metric: 'Evidence',
            impact: undefined
          });
        }
        
        rootNode.children.push(causeNode);
      });
    }
    
    // Add validation steps as separate branch
    if (validation_steps && validation_steps.length > 0) {
      const validationNode = {
        node: 'Validation Steps',
        metric: 'Actions',
        impact: undefined,
        children: validation_steps.map((step: string, idx: number) => ({
          node: step,
          metric: `Step ${idx + 1}`,
          impact: undefined
        }))
      };
      rootNode.children.push(validationNode);
    }
    
    // Add priority action as separate branch
    if (priority_action) {
      rootNode.children.push({
        node: priority_action,
        metric: 'Priority Action',
        impact: 'High',
        children: []
      });
    }
    
    return {
      ...data,
      tree: rootNode
    };
  };

  const loadRootCauseAnalysis = async () => {
    try {
      setLoadingRootCause(true);
      setRootCauseError(null);
      // Use current date range as drop period, compare with previous period of 7 days
      const startDateDrop = dateRange.startDate;
      const endDateDrop = dateRange.endDate;
      const response = await getRootCauseAnalysis(
        campaignId,
        'ROAS',
        startDateDrop,
        endDateDrop,
        7
      );
      if (response.success && response.data) {
        const transformed = transformRootCauseData(response.data);
        setRootCauseData(transformed);
      } else {
        setRootCauseError(response.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Root cause analysis error:', err);
      setRootCauseError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingRootCause(false);
    }
  };

  const RootCauseTree = ({ data, depth = 0 }: { data: any, depth?: number }) => {
    if (!data) return null;
    const { node, children, impact, metric } = data;
    
    // Determine colors based on depth and content
    const borderColors = [
      'border-orange-300',
      'border-blue-300',
      'border-green-300',
      'border-purple-300',
      'border-yellow-300'
    ];
    const bgColors = [
      'bg-orange-100',
      'bg-blue-100',
      'bg-green-100',
      'bg-purple-100',
      'bg-yellow-100'
    ];
    const dotColors = [
      'bg-orange-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-yellow-500'
    ];
    
    const borderColor = borderColors[depth % borderColors.length];
    const bgColor = bgColors[depth % bgColors.length];
    const dotColor = dotColors[depth % dotColors.length];
    
    // Determine icon based on node content
    const getIcon = () => {
      const lower = node.toLowerCase();
      if (lower.includes('cause') || lower.includes('ursache')) return '🔍';
      if (lower.includes('evidence') || lower.includes('beweis')) return '📊';
      if (lower.includes('validation') || lower.includes('überprüfung')) return '✅';
      if (lower.includes('priority') || lower.includes('aktion')) return '🚀';
      if (lower.includes('step') || lower.includes('schritt')) return '📝';
      return depth === 0 ? '🎯' : '●';
    };
    
    return (
      <div className={`pl-4 border-l-2 ${borderColor} ml-2`}>
        <div className={`flex items-start gap-2 py-2 px-3 rounded-lg ${depth === 0 ? 'bg-white border shadow-sm' : bgColor}`}>
          <div className={`w-3 h-3 rounded-full ${dotColor} flex-shrink-0 mt-1`}></div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg mr-2">{getIcon()}</span>
              <span className="font-semibold text-gray-800">{node}</span>
              {metric && (
                <Badge variant="outline" className="text-xs font-medium">
                  {metric}
                </Badge>
              )}
              {impact && (
                <Badge 
                  variant={impact.includes('High') || impact.includes('Hoch') ? 'destructive' : 
                          impact.includes('Medium') || impact.includes('Mittel') ? 'default' : 
                          impact.includes('Low') || impact.includes('Niedrig') ? 'outline' : 'secondary'}
                  className="text-xs font-medium"
                >
                  {impact}
                </Badge>
              )}
            </div>
            {children && children.length > 0 && (
              <div className="mt-3 space-y-3">
                {children.map((child: any, idx: number) => (
                  <RootCauseTree key={idx} data={child} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoadingChat(true);
    try {
      const response = await getAIInsights(
        [campaignId],
        dateRange.startDate,
        dateRange.endDate,
        userMessage
      );
      if (response.success && response.data) {
        const analysis = response.data.analysis;
        if (!analysis) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: 'Keine Analysedaten erhalten.' }]);
          return;
        }
        const parts: string[] = [];
        if (analysis.summary) parts.push(analysis.summary);
        if (analysis.key_insights?.length) {
          parts.push('\n📊 Wichtige Erkenntnisse:\n' + analysis.key_insights.map((i: string) => `• ${i}`).join('\n'));
        }
        if (analysis.recommendations?.length) {
          parts.push('\n💡 Empfehlungen:\n' + analysis.recommendations.map((r: string) => `• ${r}`).join('\n'));
        }
        if (analysis.weak_areas?.length) {
          parts.push('\n⚠️ Schwachstellen:\n' + analysis.weak_areas.map((w: string) => `• ${w}`).join('\n'));
        }
        setChatMessages(prev => [...prev, { role: 'assistant', content: parts.join('\n') || 'Keine Antwort erhalten.' }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: response.error || 'Fehler beim Abrufen der Antwort.' }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Ein Fehler ist aufgetreten.' }]);
    } finally {
      setLoadingChat(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const trendMetricConfig: Record<string, { label: string; color: string; formatter: (v: any) => string }> = {
    spend:       { label: 'Ausgaben (€)',   color: '#ef4444', formatter: (v) => `€${Number(v).toFixed(2)}` },
    revenue:     { label: 'Umsatz (€)',     color: '#10b981', formatter: (v) => `€${Number(v).toFixed(2)}` },
    roas:        { label: 'ROAS',           color: '#3b82f6', formatter: (v) => `${Number(v).toFixed(2)}x` },
    ctr:         { label: 'CTR (%)',        color: '#f59e0b', formatter: (v) => `${Number(v).toFixed(2)}%` },
    cpc:         { label: 'CPC (€)',        color: '#8b5cf6', formatter: (v) => `€${Number(v).toFixed(2)}` },
    cvr:         { label: 'CVR (%)',        color: '#ec4899', formatter: (v) => `${Number(v).toFixed(2)}%` },
    clicks:      { label: 'Klicks',         color: '#3b82f6', formatter: (v) => Number(v).toLocaleString() },
    impressions: { label: 'Impressionen',   color: '#8b5cf6', formatter: (v) => Number(v).toLocaleString() },
  };

  const loadTrendData = async () => {
    try {
      const startDate = dateRange.startDate;
      const endDate = dateRange.endDate;
      const metric = selectedTrendMetric;

      const response = await getKPITrend("campaign", campaignId, metric, startDate, endDate);
      if (response.status === 'success' && response.data) {
        const data = response.data as Array<{ date: string; value: number; raw_metrics?: any }>;
        const converted = data.map((item) => ({
          date: item.date,
          [metric]: item.value ?? 0,
          clicks: item.raw_metrics?.clicks ?? 0,
          impressions: item.raw_metrics?.impressions ?? 0,
          conversions: item.raw_metrics?.conversions ?? 0,
          spend: item.raw_metrics?.spend ?? (metric === 'spend' ? item.value : 0),
          revenue: item.raw_metrics?.revenue ?? (metric === 'revenue' ? item.value : 0),
        }));
        setTrendData(converted);
      }
    } catch (err) {
      console.error('Trend data load error:', err);
    }
  };

  // Helper functions for delta calculation
  const getDelta = (current: number, previous: number) => {
    if (previous === 0) return null;
    const delta = ((current - previous) / previous) * 100;
    return delta;
  };

  const formatDelta = (delta: number | null) => {
    if (delta === null) return null;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}%`;
  };

  const getTrendFromDelta = (delta: number | null) => {
    if (delta === null) return 'neutral';
    return delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
  };

  const handleUpdate = async () => {
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const response = await updateCampaign(campaignId, formData);
      if (response.status === "success") {
        setIsEditDialogOpen(false);
        await loadCampaignData();
      } else {
        setEditError(response.detail || "Fehler beim Aktualisieren. Bitte erneut versuchen.");
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Fehler beim Aktualisieren.");
    } finally {
      setIsSavingEdit(false);
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

  const handleBudgetUpdate = async () => {
    alert("Budget-Änderung ist derzeit nur auf AdSet-Ebene möglich. Bitte passen Sie das Budget im AdSet-Tab an.");
    setIsBudgetDialogOpen(false);
    setNewBudget(0);
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
        setIsStatusConfirmOpen(false);
        loadCampaignData();
      }
    } catch (err) {
      setError("Fehler beim Status-Wechsel");
    }
  };

  const handleDuplicate = () => {
    setIsDuplicateConfirmOpen(false);
    // Placeholder – real implementation would call a duplicate API
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    setNotes(prev => [
      { id: crypto.randomUUID(), text: noteText.trim(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setIsNoteDialogOpen(false);
    setNoteText('');
  };

  const handleAdSetAction = async () => {
    if (!adSetAction) return;
    try {
      if (adSetAction.type === 'delete') {
        await deleteAdSet(campaignId, adSetAction.id);
      } else {
        const current = adSets.find(a => a.id === adSetAction.id);
        const newStatus = current?.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        await updateAdSet(campaignId, adSetAction.id, { status: newStatus });
      }
      setAdSetAction(null);
      await loadCampaignData();
    } catch (err) {
      setError('Fehler bei der AdSet-Aktion');
      setAdSetAction(null);
    }
  };

  const loadAiInsights = async () => {
    setIsAiDialogOpen(true);
    setAiInsights(null);
    setRootCauseData(null);
    setRootCauseError(null);
    try {
      setIsAiAnalyzing(true);
      const response = await getAIInsights(
        [campaignId],
        dateRange.startDate,
        dateRange.endDate,
        "Analysiere diese Kampagne und gib Optimierungsempfehlungen"
      );
      if (response.success) {
        setAiInsights(response.data?.analysis);
      } else {
        setAiInsights({ error: response.error || 'Analyse fehlgeschlagen.' });
      }
    } catch (err) {
      console.error("AI analysis error:", err);
      setAiInsights({ error: err instanceof Error ? err.message : 'Unbekannter Fehler' });
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

  // Reload trend data when selected metric changes
  useEffect(() => {
    if (campaignId && dateRange.startDate && dateRange.endDate && !loading) {
      loadTrendData();
    }
  }, [selectedTrendMetric]);

  // Load comparison campaign KPIs when selection changes
  useEffect(() => {
    if (selectedCompareCampaignId) {
      loadComparisonCampaignKPIs(selectedCompareCampaignId);
    } else {
      setCompareCampaignKPIs(null);
    }
  }, [selectedCompareCampaignId, dateRange.startDate, dateRange.endDate]);

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

  // Previous period data for comparison
  const previousSpend = comparisonData?.spend || 0;
  const previousRevenue = comparisonData?.revenue || 0;
  const previousRoas = previousSpend > 0 ? previousRevenue / previousSpend : 0;
  const previousProfit = previousRevenue - previousSpend;

  const spendDelta = getDelta(campaign.total_spend, previousSpend);
  const revenueDelta = getDelta(campaign.total_revenue, previousRevenue);
  const roasDelta = getDelta(roas, previousRoas);
  const profitDelta = getDelta(profit, previousProfit);

  // Additional metric deltas
  const ctrDelta = getDelta(kpis?.ctr || 0, comparisonData?.ctr || 0);
  const cpcDelta = getDelta(kpis?.cpc || 0, comparisonData?.cpc || 0);
  const cvrDelta = getDelta(kpis?.cvr || 0, comparisonData?.cvr || 0);
  const impressionsDelta = getDelta(kpis?.impressions || 0, comparisonData?.impressions || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col gap-2">
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
            {/* Date Range Picker */}
            <div className="flex items-center gap-2 ml-12">
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-sm">Von</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-date" className="text-sm">Bis</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-40"
                />
              </div>
              <Button onClick={loadCampaignData} disabled={loading} size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Anwenden
              </Button>
              <Button variant="outline" size="sm" onClick={async () => {
                try {
                  const response = await exportAnalytics(
                    dateRange.startDate,
                    dateRange.endDate,
                    'csv',
                    [campaignId]
                  );
                  if (response.status === 'success' && response.url) {
                    // Create a temporary link to download the file
                    const link = document.createElement('a');
                    link.href = response.url;
                    link.download = `kampagne_${campaignId}_${dateRange.startDate}_${dateRange.endDate}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } else {
                    alert('Export fehlgeschlagen.');
                  }
                } catch (err) {
                  console.error('Export error:', err);
                  alert('Export fehlgeschlagen.');
                }
              }}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={campaign.status === "ACTIVE" ? "outline" : "default"}
              className={campaign.status === "ACTIVE" ? "border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950" : "bg-green-600 hover:bg-green-700 text-white"}
              onClick={() => setIsStatusConfirmOpen(true)}
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
                <DropdownMenuItem onClick={() => { setEditError(null); setIsEditDialogOpen(true); }}>
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
                {renderAIInsights(aiInsights)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Root Cause Analysis Card */}
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              Ursachenanalyse (Root Cause)
            </CardTitle>
            <CardDescription>
              Identifizieren Sie die zugrunde liegenden Ursachen für Performance-Veränderungen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!rootCauseData ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                {rootCauseError && (
                  <Alert variant="destructive" className="w-full max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Ursachenanalyse fehlgeschlagen: {rootCauseError}
                    </AlertDescription>
                  </Alert>
                )}
                <Button onClick={loadRootCauseAnalysis} disabled={loadingRootCause}>
                  {loadingRootCause ? (
                    <>Analysiere...</>
                  ) : (
                    <>Ursachenanalyse starten</>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Analyse der Hauptfaktoren, die die Performance beeinflussen.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold">Ursachenbaum</h4>
                  <Button variant="outline" size="sm" onClick={() => setRootCauseData(null)}>
                    Neu starten
                  </Button>
                </div>
                {rootCauseData.tree ? (
                  <div className="border rounded-lg p-4 bg-white">
                    <RootCauseTree data={rootCauseData.tree} />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(rootCauseData, null, 2)}</pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations Card */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Handlungsempfehlungen
            </CardTitle>
            <CardDescription>
              Umsetzbare Vorschläge zur Optimierung Ihrer Kampagne.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const recommendations = [];
              if (roas < 1.5) {
                recommendations.push({
                  id: 'roas_low',
                  title: 'ROAS unter Schwelle',
                  description: 'ROAS liegt unter 1.5x. Erwägen Sie, das Budget zu reduzieren oder Ads mit niedriger Performance zu pausieren.',
                  action: 'Budget anpassen',
                  severity: 'high',
                });
              }
              if (kpis && kpis.ctr < 1.0) {
                recommendations.push({
                  id: 'ctr_low',
                  title: 'CTR zu niedrig',
                  description: 'Click-Through-Rate ist unterdurchschnittlich. Testen Sie neue Creatives oder Zielgruppen.',
                  action: 'Creative testen',
                  severity: 'medium',
                });
              }
              if (kpis && kpis.cpc > 2.0) {
                recommendations.push({
                  id: 'cpc_high',
                  title: 'CPC zu hoch',
                  description: 'Kosten pro Klick sind über dem Zielwert. Optimieren Sie Gebote oder Keyword-Auswahl.',
                  action: 'Gebote anpassen',
                  severity: 'medium',
                });
              }
              if (kpis && kpis.cvr < 2.0) {
                recommendations.push({
                  id: 'cvr_low',
                  title: 'Conversion Rate niedrig',
                  description: 'Conversion Rate könnte verbessert werden. Überprüfen Sie Landing Pages und Angebote.',
                  action: 'Landing Page optimieren',
                  severity: 'medium',
                });
              }
              if (recommendations.length === 0) {
                recommendations.push({
                  id: 'no_issues',
                  title: 'Kampagne performt gut',
                  description: 'Alle KPIs liegen im Zielbereich. Weiter so!',
                  action: null,
                  severity: 'low',
                });
              }
              return (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="flex items-start justify-between p-4 border rounded-lg bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{rec.title}</h4>
                          <Badge variant={rec.severity === 'high' ? 'destructive' : rec.severity === 'medium' ? 'default' : 'outline'}>
                            {rec.severity === 'high' ? 'Hoch' : rec.severity === 'medium' ? 'Mittel' : 'Niedrig'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                      </div>
                      {rec.action && !appliedRecommendations.has(rec.id) && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            if (rec.id === 'roas_low') {
                              setIsBudgetDialogOpen(true);
                            } else {
                              setAppliedRecommendations(prev => new Set(Array.from(prev).concat(rec.id)));
                              alert(`Aktion "${rec.action}" wird ausgeführt.`);
                            }
                          }}
                        >
                          {rec.action}
                        </Button>
                      )}
                      {appliedRecommendations.has(rec.id) && (
                        <Badge variant="outline" className="text-green-600 border-green-600">Angewendet</Badge>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {roas < 1.5 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ROAS liegt bei {Number(roas || 0).toFixed(2)}x, unterhalb der Schwelle von 1.5x. Überprüfen Sie die Kampagnenleistung.
            </AlertDescription>
          </Alert>
        )}
        <Separator />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="adsets">AdSets ({adSets.length})</TabsTrigger>
            <TabsTrigger value="comparison">Vergleich</TabsTrigger>
            <TabsTrigger value="chat">KI-Chat</TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="Gesamtausgaben"
                value={`€${Number(campaign.total_spend || 0).toFixed(2)}`}
                description={`${dateRange.startDate} - ${dateRange.endDate}`}
                trend={getTrendFromDelta(spendDelta)}
                trendValue={formatDelta(spendDelta)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <KPICard
                title="Umsatz"
                value={`€${Number(campaign.total_revenue || 0).toFixed(2)}`}
                description={`${dateRange.startDate} - ${dateRange.endDate}`}
                trend={getTrendFromDelta(revenueDelta)}
                trendValue={formatDelta(revenueDelta)}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <KPICard
                title="ROAS"
                value={`${Number(roas || 0).toFixed(2)}x`}
                description="Return on Ad Spend"
                trend={getTrendFromDelta(roasDelta)}
                trendValue={formatDelta(roasDelta)}
                icon={<Target className="h-4 w-4" />}
              />
              <KPICard
                title="Profit"
                value={`€${Number(profit || 0).toFixed(2)}`}
                description="Netto Gewinn"
                trend={getTrendFromDelta(profitDelta)}
                trendValue={formatDelta(profitDelta)}
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
                      <p className="text-2xl font-bold">{Number(kpis?.ctr || 0).toFixed(2)}%</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">CPC</p>
                      <p className="text-2xl font-bold">€{Number(kpis?.cpc || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">CVR</p>
                      <p className="text-2xl font-bold">{Number(kpis?.cvr || 0).toFixed(2)}%</p>
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
            {/* Metric Trend Chart */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Trend: {trendMetricConfig[selectedTrendMetric]?.label ?? selectedTrendMetric}</CardTitle>
                    <CardDescription>Tägliche Entwicklung über den gewählten Zeitraum</CardDescription>
                  </div>
                  <Select value={selectedTrendMetric} onValueChange={setSelectedTrendMetric}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Metrik wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {trendMetricsOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {trendData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mb-3 opacity-40" />
                    <p>Keine Trenddaten verfügbar.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => format(new Date(d), "dd.MM.", { locale: de })}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any) =>
                          trendMetricConfig[selectedTrendMetric]?.formatter(value) ?? value
                        }
                        labelFormatter={(label) => format(new Date(label), "dd. MMM yyyy", { locale: de })}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey={selectedTrendMetric}
                        name={trendMetricConfig[selectedTrendMetric]?.label ?? selectedTrendMetric}
                        stroke={trendMetricConfig[selectedTrendMetric]?.color ?? '#6366f1'}
                        fill={trendMetricConfig[selectedTrendMetric]?.color ?? '#6366f1'}
                        fillOpacity={0.25}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Klicks & Impressionen */}
            <Card>
              <CardHeader>
                <CardTitle>Klicks & Impressionen</CardTitle>
                <CardDescription>Tägliches Volumen</CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mb-3 opacity-40" />
                    <p>Keine Daten verfügbar.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => format(new Date(d), "dd.MM.", { locale: de })}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip labelFormatter={(label) => format(new Date(label), "dd. MMM yyyy", { locale: de })} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="clicks" name="Klicks" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      <Bar yAxisId="right" dataKey="impressions" name="Impressionen" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Performance Breakdown by Ad */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Breakdown (Ads)
                </CardTitle>
                <CardDescription>
                  Detaillierte Performance-Metriken auf Ad-Ebene. Klicken Sie auf einen AdSet, um die zugehörigen Ads anzuzeigen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBreakdown ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : breakdownData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Breakdown-Daten verfügbar.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ad Name</TableHead>
                          <TableHead className="text-right">Spend (€)</TableHead>
                          <TableHead className="text-right">Revenue (€)</TableHead>
                          <TableHead className="text-right">ROAS</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                          <TableHead className="text-right">CPC (€)</TableHead>
                          <TableHead className="text-right">Conversions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {breakdownData.map((item: any) => (
                          <TableRow key={item.id || item.ad_id}>
                            <TableCell className="font-medium">{item.name || item.ad_name || 'Unnamed Ad'}</TableCell>
                            <TableCell className="text-right">€{Number(item.spend || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{Number(item.revenue || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              {item.roas ? Number(item.roas).toFixed(2) + 'x' : item.spend ? (Number(item.revenue) / Number(item.spend)).toFixed(2) + 'x' : '0.00x'}
                            </TableCell>
                            <TableCell className="text-right">{Number(item.ctr || 0).toFixed(2)}%</TableCell>
                            <TableCell className="text-right">€{Number(item.cpc || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{item.conversions?.toLocaleString() || '0'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
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
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Budget (Täglich)</TableHead>
                      <TableHead>Optimierungsziel</TableHead>
                      <TableHead>Ads</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adSets.map((adSet) => {
                      const isExpanded = expandedAdSetIds.includes(adSet.id);
                      const adSetAds = ads.filter(ad => ad.ad_set_id === adSet.id);
                      return (
                        <>
                          <TableRow key={adSet.id}>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpandedAdSetIds(
                                  isExpanded
                                    ? expandedAdSetIds.filter(id => id !== adSet.id)
                                    : [...expandedAdSetIds, adSet.id]
                                )}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">{adSet.name}</TableCell>
                            <TableCell>{getStatusBadge(adSet.status)}</TableCell>
                            <TableCell>€{Number(adSet.daily_budget || 0).toFixed(2)}</TableCell>
                            <TableCell>{adSet.optimization_goal}</TableCell>
                            <TableCell>{adSetAds.length}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem disabled>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Bearbeiten
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setAdSetAction({ id: adSet.id, name: adSet.name, type: 'pause' })}>
                                    <Pause className="mr-2 h-4 w-4" />
                                    {adSet.status === 'ACTIVE' ? 'Pausieren' : 'Aktivieren'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => setAdSetAction({ id: adSet.id, name: adSet.name, type: 'delete' })}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Löschen
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          {isExpanded && adSetAds.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/50 p-0">
                                <div className="p-4 pl-12">
                                  <h5 className="font-semibold mb-2">Ads in diesem AdSet mit Performance-Metriken</h5>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Creative Type</TableHead>
                                        <TableHead>Spend</TableHead>
                                        <TableHead>Revenue</TableHead>
                                        <TableHead>ROAS</TableHead>
                                        <TableHead>CTR</TableHead>
                                        <TableHead>CPC</TableHead>
                                        <TableHead>Conversions</TableHead>
                                        <TableHead>Erstellt am</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {adSetAds.map((ad) => {
                                        const adKpi = breakdownData.find((item: any) => item.entity_id === ad.id);
                                        return (
                                          <TableRow key={ad.id}>
                                            <TableCell className="font-medium">{ad.name}</TableCell>
                                            <TableCell>{getStatusBadge(ad.status)}</TableCell>
                                            <TableCell>{ad.creative_type || '-'}</TableCell>
                                            <TableCell className="text-right">€{Number(adKpi?.spend || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">€{Number(adKpi?.revenue || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{adKpi?.roas ? Number(adKpi.roas).toFixed(2) + 'x' : '0.00x'}</TableCell>
                                            <TableCell className="text-right">{Number(adKpi?.ctr || 0).toFixed(2)}%</TableCell>
                                            <TableCell className="text-right">€{Number(adKpi?.cpc || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{Number(adKpi?.conversions || 0).toFixed(0)}</TableCell>
                                            <TableCell>{format(new Date(ad.created_at), "dd.MM.yyyy", { locale: de })}</TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">

            {/* ── Periodenvergleich ── */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Periodenvergleich</CardTitle>
                    <CardDescription>
                      Aktuell: {dateRange.startDate} – {dateRange.endDate}
                      {compPrevPeriod && (
                        <span className="ml-2 text-muted-foreground">
                          vs. {compPrevPeriod.start} – {compPrevPeriod.end}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: 'Vorwoche', days: 7 },
                      { label: 'Vormonat', days: 30 },
                      { label: 'Vorquartal', days: 90 },
                    ].map(({ label, days }) => (
                      <Button
                        key={days}
                        variant="outline"
                        size="sm"
                        disabled={loadingComparison}
                        onClick={async () => {
                          setLoadingComparison(true);
                          const end = new Date(dateRange.startDate);
                          end.setDate(end.getDate() - 1);
                          const start = new Date(end);
                          start.setDate(start.getDate() - days + 1);
                          await loadComparisonData(
                            format(start, 'yyyy-MM-dd'),
                            format(end, 'yyyy-MM-dd')
                          );
                          setLoadingComparison(false);
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingComparison}
                      onClick={async () => {
                        setLoadingComparison(true);
                        await loadComparisonData();
                        setLoadingComparison(false);
                      }}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${loadingComparison ? 'animate-spin' : ''}`} />
                      Vorperiode
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingComparison ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comparisonData && kpis ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KPI</TableHead>
                        <TableHead>Aktuelle Periode</TableHead>
                        <TableHead>Vergleichsperiode</TableHead>
                        <TableHead>Veränderung</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { label: 'Spend', cur: `€${kpis.spend.toFixed(2)}`, prev: `€${comparisonData.spend.toFixed(2)}`, delta: getDelta(kpis.spend, comparisonData.spend), invert: false },
                        { label: 'Revenue', cur: `€${kpis.revenue.toFixed(2)}`, prev: `€${comparisonData.revenue.toFixed(2)}`, delta: getDelta(kpis.revenue, comparisonData.revenue), invert: false },
                        { label: 'ROAS', cur: `${kpis.roas.toFixed(2)}x`, prev: `${comparisonData.roas.toFixed(2)}x`, delta: getDelta(kpis.roas, comparisonData.roas), invert: false },
                        { label: 'CTR', cur: `${kpis.ctr.toFixed(2)}%`, prev: `${comparisonData.ctr.toFixed(2)}%`, delta: getDelta(kpis.ctr, comparisonData.ctr), invert: false },
                        { label: 'CPC', cur: `€${kpis.cpc.toFixed(2)}`, prev: `€${comparisonData.cpc.toFixed(2)}`, delta: getDelta(kpis.cpc, comparisonData.cpc), invert: true },
                        { label: 'CVR', cur: `${kpis.cvr.toFixed(2)}%`, prev: `${comparisonData.cvr.toFixed(2)}%`, delta: getDelta(kpis.cvr, comparisonData.cvr), invert: false },
                        { label: 'Clicks', cur: kpis.clicks.toLocaleString(), prev: comparisonData.clicks.toLocaleString(), delta: getDelta(kpis.clicks, comparisonData.clicks), invert: false },
                        { label: 'Impressions', cur: kpis.impressions.toLocaleString(), prev: comparisonData.impressions.toLocaleString(), delta: getDelta(kpis.impressions, comparisonData.impressions), invert: false },
                        { label: 'Conversions', cur: kpis.conversions.toLocaleString(), prev: comparisonData.conversions.toLocaleString(), delta: getDelta(kpis.conversions, comparisonData.conversions), invert: false },
                      ].map(({ label, cur, prev, delta, invert }) => {
                        const isPositive = delta !== null && (invert ? delta < 0 : delta > 0);
                        const isNegative = delta !== null && (invert ? delta > 0 : delta < 0);
                        return (
                          <TableRow key={label}>
                            <TableCell className="font-medium">{label}</TableCell>
                            <TableCell>{cur}</TableCell>
                            <TableCell className="text-muted-foreground">{prev}</TableCell>
                            <TableCell className={isPositive ? 'text-green-600 font-medium' : isNegative ? 'text-red-500 font-medium' : ''}>
                              {formatDelta(delta)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-3">Keine Vergleichsdaten geladen.</p>
                    <Button variant="outline" onClick={async () => { setLoadingComparison(true); await loadComparisonData(); setLoadingComparison(false); }}>
                      <RefreshCw className="h-4 w-4 mr-2" />Vorperiode laden
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Kampagnenvergleich ── */}
            <Card>
              <CardHeader>
                <CardTitle>Kampagnenvergleich</CardTitle>
                <CardDescription>Vergleiche diese Kampagne mit einer anderen im gleichen Zeitraum</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-center">
                  <Select
                    value={selectedCompareCampaignId}
                    onValueChange={setSelectedCompareCampaignId}
                  >
                    <SelectTrigger className="w-72">
                      <SelectValue placeholder="Kampagne auswählen…" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCompareCampaignId && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCompareCampaignId('')}>
                      Zurücksetzen
                    </Button>
                  )}
                </div>

                {loadingCompareCampaign ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : compareCampaignKPIs && kpis ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KPI</TableHead>
                        <TableHead>{campaign?.name ?? 'Diese Kampagne'}</TableHead>
                        <TableHead>{campaigns.find(c => c.id === selectedCompareCampaignId)?.name ?? 'Vergleichskampagne'}</TableHead>
                        <TableHead>Differenz</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { label: 'Spend', a: kpis.spend, b: compareCampaignKPIs.spend, fmt: (v: number) => `€${v.toFixed(2)}`, invert: false },
                        { label: 'Revenue', a: kpis.revenue, b: compareCampaignKPIs.revenue, fmt: (v: number) => `€${v.toFixed(2)}`, invert: false },
                        { label: 'ROAS', a: kpis.roas, b: compareCampaignKPIs.roas, fmt: (v: number) => `${v.toFixed(2)}x`, invert: false },
                        { label: 'CTR', a: kpis.ctr, b: compareCampaignKPIs.ctr, fmt: (v: number) => `${v.toFixed(2)}%`, invert: false },
                        { label: 'CPC', a: kpis.cpc, b: compareCampaignKPIs.cpc, fmt: (v: number) => `€${v.toFixed(2)}`, invert: true },
                        { label: 'CVR', a: kpis.cvr, b: compareCampaignKPIs.cvr, fmt: (v: number) => `${v.toFixed(2)}%`, invert: false },
                        { label: 'Clicks', a: kpis.clicks, b: compareCampaignKPIs.clicks, fmt: (v: number) => v.toLocaleString(), invert: false },
                        { label: 'Conversions', a: kpis.conversions, b: compareCampaignKPIs.conversions, fmt: (v: number) => v.toLocaleString(), invert: false },
                      ].map(({ label, a, b, fmt, invert }) => {
                        const delta = getDelta(a, b);
                        const isPositive = delta !== null && (invert ? delta < 0 : delta > 0);
                        const isNegative = delta !== null && (invert ? delta > 0 : delta < 0);
                        return (
                          <TableRow key={label}>
                            <TableCell className="font-medium">{label}</TableCell>
                            <TableCell>{fmt(a)}</TableCell>
                            <TableCell>{fmt(b)}</TableCell>
                            <TableCell className={isPositive ? 'text-green-600 font-medium' : isNegative ? 'text-red-500 font-medium' : ''}>
                              {formatDelta(delta)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : !selectedCompareCampaignId ? (
                  <p className="text-muted-foreground text-sm">Wähle eine Kampagne aus um den Vergleich zu starten.</p>
                ) : null}
              </CardContent>
            </Card>

          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  KI-Chat
                </CardTitle>
                <CardDescription>
                  Stellen Sie Fragen zu dieser Kampagne und erhalten Sie KI-gestützte Antworten.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 h-96 flex flex-col">
                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        Stellen Sie eine Frage zur Kampagne.
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => {
                        const html = msg.content
                          .replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.+?)\*/g, '<em>$1</em>')
                          .replace(/\n/g, '<br/>');
                        return (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-lg px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                              dangerouslySetInnerHTML={{ __html: html }}
                            />
                          </div>
                        );
                      })
                    )}
                    {loadingChat && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ihre Frage..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                      disabled={loadingChat}
                    />
                    <Button onClick={sendChatMessage} disabled={loadingChat}>
                      Senden
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                <Button onClick={() => { setEditError(null); setIsEditDialogOpen(true); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schnellaktionen</CardTitle>
                <CardDescription>
                  Häufig genutzte Aktionen für diese Kampagne
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" onClick={() => setIsBudgetDialogOpen(true)}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Budget ändern
                  </Button>
                  <Button variant="outline" onClick={() => setIsNoteDialogOpen(true)}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Notiz hinzufügen
                  </Button>
                  <Button variant="outline" onClick={() => setIsDuplicateConfirmOpen(true)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplizieren
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportieren
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Notizen
                    </CardTitle>
                    <CardDescription>Interne Notizen zu dieser Kampagne</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsNoteDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Neue Notiz
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">Noch keine Notizen vorhanden.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map(note => (
                      <div key={note.id} className="flex gap-3 rounded-md border p-3">
                        <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm whitespace-pre-wrap break-words">{note.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(note.createdAt), "dd. MMM yyyy, HH:mm 'Uhr'", { locale: de })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
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
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!isSavingEdit) { setIsEditDialogOpen(open); setEditError(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kampagne bearbeiten</DialogTitle>
              <DialogDescription>
                Änderungen an Name, Status und Zielsetzung werden direkt gespeichert.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  disabled={isSavingEdit}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  disabled={isSavingEdit}
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
                  disabled={isSavingEdit}
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
              {editError && (
                <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {editError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={isSavingEdit} onClick={() => { setIsEditDialogOpen(false); setEditError(null); }}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdate} disabled={isSavingEdit || !formData.name.trim()}>
                {isSavingEdit ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Speichern…</>
                ) : (
                  <>Speichern</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <DialogTitle className="text-red-600 dark:text-red-400">Kampagne löschen</DialogTitle>
              </div>
              <DialogDescription className="pt-1">
                Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden. Die Kampagne{' '}
                <strong className="text-foreground">{campaign?.name}</strong> und alle zugehörigen Daten werden dauerhaft gelöscht.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              ⚠ AdSets, Ads und alle Metriken dieser Kampagne werden ebenfalls gelöscht.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Endgültig löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Budget Dialog */}
        <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Budget anpassen</DialogTitle>
              <DialogDescription>
                Passen Sie das tägliche Budget für diese Kampagne an.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="budget">Neues tägliches Budget (€)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  value={newBudget}
                  onChange={(e) => setNewBudget(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleBudgetUpdate}>
                Speichern
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

        {/* Status Confirm Dialog (Pausieren / Aktivieren) */}
        <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              {campaign?.status === "ACTIVE" ? (
                <>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                      <Pause className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <DialogTitle className="text-amber-600 dark:text-amber-400">Kampagne pausieren?</DialogTitle>
                  </div>
                  <DialogDescription>
                    Die Kampagne <strong className="text-foreground">{campaign?.name}</strong> wird pausiert.
                    Alle laufenden Ads werden gestoppt. Sie können die Kampagne jederzeit wieder aktivieren.
                  </DialogDescription>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                      <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <DialogTitle className="text-green-600 dark:text-green-400">Kampagne aktivieren?</DialogTitle>
                  </div>
                  <DialogDescription>
                    Die Kampagne <strong className="text-foreground">{campaign?.name}</strong> wird aktiviert.
                    Alle zugehörigen Ads werden gestartet und das Budget beginnt zu laufen.
                  </DialogDescription>
                </>
              )}
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusConfirmOpen(false)}>
                Abbrechen
              </Button>
              {campaign?.status === "ACTIVE" ? (
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={handleStatusToggle}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pausieren
                </Button>
              ) : (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleStatusToggle}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Aktivieren
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Duplicate Confirm Dialog */}
        <Dialog open={isDuplicateConfirmOpen} onOpenChange={setIsDuplicateConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <Copy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <DialogTitle>Kampagne duplizieren?</DialogTitle>
              </div>
              <DialogDescription>
                Eine Kopie der Kampagne <strong className="text-foreground">{campaign?.name}</strong> wird erstellt,
                inklusive aller AdSets und Einstellungen. Die neue Kampagne wird im Status <strong>Pausiert</strong> erstellt.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDuplicateConfirmOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplizieren
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Note Dialog */}
        <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <DialogTitle>Notiz hinzufügen</DialogTitle>
              </div>
              <DialogDescription>
                Fügen Sie eine Notiz zu dieser Kampagne hinzu.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                rows={4}
                placeholder="Notiz eingeben..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsNoteDialogOpen(false); setNoteText(''); }}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveNote} disabled={!noteText.trim()}>
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AdSet Action Dialogs (Pausieren / Aktivieren / Löschen) */}
        <Dialog open={adSetAction?.type === 'pause'} onOpenChange={(open) => !open && setAdSetAction(null)}>
          <DialogContent>
            {(() => {
              const currentAdSet = adSets.find(a => a.id === adSetAction?.id);
              const isActive = currentAdSet?.status === 'ACTIVE';
              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isActive ? 'bg-amber-100 dark:bg-amber-900' : 'bg-green-100 dark:bg-green-900'}`}>
                        {isActive
                          ? <Pause className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          : <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                        }
                      </div>
                      <DialogTitle className={isActive ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}>
                        AdSet {isActive ? 'pausieren' : 'aktivieren'}?
                      </DialogTitle>
                    </div>
                    <DialogDescription>
                      Das AdSet <strong className="text-foreground">{adSetAction?.name}</strong> wird{' '}
                      {isActive ? 'pausiert. Alle zugehörigen Ads werden gestoppt.' : 'aktiviert. Alle zugehörigen Ads werden gestartet.'}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAdSetAction(null)}>Abbrechen</Button>
                    <Button
                      className={isActive ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                      onClick={handleAdSetAction}
                    >
                      {isActive ? <><Pause className="mr-2 h-4 w-4" />Pausieren</> : <><Play className="mr-2 h-4 w-4" />Aktivieren</>}
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        <Dialog open={adSetAction?.type === 'delete'} onOpenChange={(open) => !open && setAdSetAction(null)}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <DialogTitle className="text-red-600 dark:text-red-400">AdSet löschen?</DialogTitle>
              </div>
              <DialogDescription>
                Das AdSet <strong className="text-foreground">{adSetAction?.name}</strong> und alle zugehörigen Ads
                werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              ⚠ Alle Ads und Metriken dieses AdSets werden ebenfalls gelöscht.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdSetAction(null)}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleAdSetAction}>
                <Trash2 className="mr-2 h-4 w-4" />
                Endgültig löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* KI-Analyse Dialog */}
        <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                  <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <DialogTitle>KI-Analyse</DialogTitle>
                  <DialogDescription>
                    {campaign?.name} · {dateRange.startDate} – {dateRange.endDate}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* KI Insights Section */}
              <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/30 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-purple-800 dark:text-purple-300 mb-3">
                  <Brain className="h-4 w-4" />
                  KI-Insights & Empfehlungen
                </h3>
                {isAiAnalyzing ? (
                  <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Analyse läuft…</span>
                  </div>
                ) : aiInsights ? (
                  <div className="text-sm">{renderAIInsights(aiInsights)}</div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">Keine Insights verfügbar.</p>
                )}
              </div>

              {/* Root Cause Section */}
              <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="flex items-center gap-2 font-semibold text-orange-800 dark:text-orange-300">
                    <AlertCircle className="h-4 w-4" />
                    Ursachenanalyse (Root Cause)
                  </h3>
                  {rootCauseData && (
                    <Button variant="ghost" size="sm" onClick={() => { setRootCauseData(null); setRootCauseError(null); }}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Neu
                    </Button>
                  )}
                </div>

                {loadingRootCause ? (
                  <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Ursachenanalyse läuft…</span>
                  </div>
                ) : rootCauseData ? (
                  <div className="text-sm">
                    {rootCauseData.tree ? (
                      <div className="border rounded-lg p-3 bg-white dark:bg-background">
                        <RootCauseTree data={rootCauseData.tree} />
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(rootCauseData, null, 2)}</pre>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    {rootCauseError && (
                      <p className="text-sm text-red-600 dark:text-red-400">{rootCauseError}</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadRootCauseAnalysis}
                      disabled={loadingRootCause}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Ursachenanalyse starten
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Identifiziert die Hauptfaktoren für Performance-Veränderungen
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAiDialogOpen(false)}>
                Schließen
              </Button>
              <Button onClick={loadAiInsights} disabled={isAiAnalyzing}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Neu analysieren
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
