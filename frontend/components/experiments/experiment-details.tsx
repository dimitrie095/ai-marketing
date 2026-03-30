"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, BarChart3, Target, TrendingUp, Award, Save, FlaskConical,
  Trophy, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import { fetchFromAPI } from "@/lib/api";

interface ExperimentDetailsProps {
  experimentId: string;
  experimentName?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Variant {
  id: string;
  name: string;
  config: Record<string, any>;
}

interface VariantMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  ctr?: number;
  cvr?: number;
  roas?: number;
}

interface SummaryVariant extends VariantMetrics {
  variant_id: string;
  variant_name: string;
  ctr: number;
  cvr: number;
  roas: number;
}

interface ExperimentSummary {
  experiment_id: string;
  experiment_name: string;
  status: string;
  variants: SummaryVariant[];
  winner: string | null;
  winner_roas: number | null;
  note?: string;
}

function computeKPIs(m: VariantMetrics) {
  const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
  const cvr = m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0;
  const roas = m.spend > 0 ? m.revenue / m.spend : 0;
  return { ctr, cvr, roas };
}

function fmt(n: number, decimals = 2) { return n.toFixed(decimals); }
function fmtEur(n: number) { return `€${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export function ExperimentDetails({ experimentId, experimentName, trigger, open: controlledOpen, onOpenChange }: ExperimentDetailsProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };
  const [loading, setLoading] = useState(false);
  const [savingVariant, setSavingVariant] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [summary, setSummary] = useState<ExperimentSummary | null>(null);
  const [metrics, setMetrics] = useState<Record<string, VariantMetrics>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [varRes, sumRes] = await Promise.all([
        fetchFromAPI(`/api/v1/experiments/${experimentId}/variants`),
        fetchFromAPI(`/api/v1/experiments/${experimentId}/summary`),
      ]);

      const varList: Variant[] = varRes.status === "success" ? (varRes.data || []) : [];
      setVariants(varList);

      if (sumRes.status === "success" && sumRes.data) {
        setSummary(sumRes.data);
        // Pre-fill metrics inputs from existing summary data
        const m: Record<string, VariantMetrics> = {};
        for (const sv of (sumRes.data.variants || [])) {
          m[sv.variant_name] = {
            impressions: sv.impressions ?? 0,
            clicks: sv.clicks ?? 0,
            conversions: sv.conversions ?? 0,
            revenue: sv.revenue ?? 0,
            spend: sv.spend ?? 0,
          };
        }
        // Ensure all variants have an entry
        for (const v of varList) {
          if (!m[v.name]) m[v.name] = { impressions: 0, clicks: 0, conversions: 0, revenue: 0, spend: 0 };
        }
        setMetrics(m);
      } else {
        const m: Record<string, VariantMetrics> = {};
        for (const v of varList) {
          m[v.name] = { impressions: 0, clicks: 0, conversions: 0, revenue: 0, spend: 0 };
        }
        setMetrics(m);
      }
    } catch (err) {
      toast({ title: "Fehler", description: "Daten konnten nicht geladen werden.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveMetrics = async (variantName: string) => {
    const m = metrics[variantName];
    if (!m) return;
    setSavingVariant(variantName);
    try {
      const params = new URLSearchParams({
        variant_name: variantName,
        impressions: String(m.impressions),
        clicks: String(m.clicks),
        conversions: String(m.conversions),
        revenue: String(m.revenue),
        spend: String(m.spend),
      });
      const res = await fetchFromAPI(`/api/v1/experiments/${experimentId}/results/manual?${params}`, { method: "POST" });
      if (res.status === "success") {
        toast({ title: "Gespeichert", description: `Metriken für ${variantName} aktualisiert.` });
        // Refresh summary
        const sumRes = await fetchFromAPI(`/api/v1/experiments/${experimentId}/summary`);
        if (sumRes.status === "success") setSummary(sumRes.data);
      }
    } catch {
      toast({ title: "Fehler", description: "Speichern fehlgeschlagen.", variant: "destructive" });
    } finally {
      setSavingVariant(null);
    }
  };

  const updateMetricField = (variantName: string, field: keyof VariantMetrics, value: string) => {
    setMetrics((prev) => ({
      ...prev,
      [variantName]: { ...prev[variantName], [field]: parseFloat(value) || 0 },
    }));
  };

  // Compute live KPIs from current input
  const liveKPIs = Object.entries(metrics).map(([name, m]) => ({
    name,
    ...m,
    ...computeKPIs(m),
  }));

  const liveWinner = liveKPIs.length >= 2
    ? liveKPIs.reduce((a, b) => (a.roas >= b.roas ? a : b))
    : null;

  const getTypeIcon = (type?: string) => {
    if (type === "audience") return <Target className="h-4 w-4" />;
    if (type === "budget") return <TrendingUp className="h-4 w-4" />;
    return <BarChart3 className="h-4 w-4" />;
  };

  const DeltaIcon = ({ a, b }: { a: number; b: number }) => {
    if (a > b) return <ArrowUp className="h-3 w-3 text-green-600" />;
    if (a < b) return <ArrowDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Details & Ergebnisse</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            {experimentName || "Experiment Details"}
          </DialogTitle>
          <DialogDescription>
            Varianten verwalten, Metriken eingeben und Ergebnisse auswerten
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="metrics" className="mt-2">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="metrics">Metriken eingeben</TabsTrigger>
              <TabsTrigger value="results">Ergebnisse & Gewinner</TabsTrigger>
            </TabsList>

            {/* Metriken Tab */}
            <TabsContent value="metrics" className="space-y-4 mt-4">
              {variants.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Keine Varianten gefunden. Bitte erstellen Sie das Experiment neu.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {variants.map((v, idx) => {
                    const m = metrics[v.name] ?? { impressions: 0, clicks: 0, conversions: 0, revenue: 0, spend: 0 };
                    const kpis = computeKPIs(m);
                    const isSaving = savingVariant === v.name;
                    return (
                      <Card key={v.id} className={idx === 0 ? "" : "border-primary/30 bg-primary/5"}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Badge variant={idx === 0 ? "default" : "secondary"}>{idx === 0 ? "A" : "B"}</Badge>
                              {v.name}
                            </CardTitle>
                            {v.config?.description && (
                              <span className="text-xs text-muted-foreground max-w-[160px] truncate">{v.config.description}</span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            {(["impressions", "clicks", "conversions"] as const).map((field) => (
                              <div key={field} className="grid gap-1">
                                <Label className="text-xs capitalize">{field === "impressions" ? "Impressionen" : field === "clicks" ? "Klicks" : "Conversions"}</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={m[field]}
                                  onChange={(e) => updateMetricField(v.name, field, e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            ))}
                            {(["spend", "revenue"] as const).map((field) => (
                              <div key={field} className="grid gap-1">
                                <Label className="text-xs">{field === "spend" ? "Ausgaben (€)" : "Umsatz (€)"}</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={m[field]}
                                  onChange={(e) => updateMetricField(v.name, field, e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            ))}
                          </div>
                          <Separator />
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-muted rounded p-2">
                              <div className="text-muted-foreground">CTR</div>
                              <div className="font-semibold">{fmt(kpis.ctr)}%</div>
                            </div>
                            <div className="bg-muted rounded p-2">
                              <div className="text-muted-foreground">CVR</div>
                              <div className="font-semibold">{fmt(kpis.cvr)}%</div>
                            </div>
                            <div className="bg-muted rounded p-2">
                              <div className="text-muted-foreground">ROAS</div>
                              <div className="font-semibold">{fmt(kpis.roas)}x</div>
                            </div>
                          </div>
                          <Button
                            className="w-full"
                            size="sm"
                            onClick={() => saveMetrics(v.name)}
                            disabled={isSaving}
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Metriken speichern
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Ergebnisse Tab */}
            <TabsContent value="results" className="space-y-4 mt-4">
              {liveKPIs.length < 2 || (liveKPIs[0].impressions === 0 && liveKPIs[1]?.impressions === 0) ? (
                <div className="text-center py-12 space-y-2">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground">Noch keine Daten. Geben Sie zuerst Metriken ein.</p>
                </div>
              ) : (
                <>
                  {liveWinner && (
                    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                      <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-yellow-500" />
                        <div>
                          <p className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            Gewinner: {liveWinner.name}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-400">
                            ROAS {fmt(liveWinner.roas)}x · CTR {fmt(liveWinner.ctr)}% · CVR {fmt(liveWinner.cvr)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-2 px-3 font-medium">Metrik</th>
                          {liveKPIs.map((v, i) => (
                            <th key={v.name} className="text-right py-2 px-3 font-medium">
                              <span className="flex items-center justify-end gap-1">
                                <Badge variant={i === 0 ? "default" : "secondary"} className="text-xs">{i === 0 ? "A" : "B"}</Badge>
                                {v.name}
                                {liveWinner?.name === v.name && <Trophy className="h-3 w-3 text-yellow-500" />}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Impressionen", key: "impressions" as const, fmt: (n: number) => n.toLocaleString("de-DE") },
                          { label: "Klicks", key: "clicks" as const, fmt: (n: number) => n.toLocaleString("de-DE") },
                          { label: "Conversions", key: "conversions" as const, fmt: (n: number) => n.toLocaleString("de-DE") },
                          { label: "Ausgaben", key: "spend" as const, fmt: fmtEur },
                          { label: "Umsatz", key: "revenue" as const, fmt: fmtEur },
                          { label: "CTR", key: "ctr" as const, fmt: (n: number) => `${fmt(n)}%` },
                          { label: "CVR", key: "cvr" as const, fmt: (n: number) => `${fmt(n)}%` },
                          { label: "ROAS", key: "roas" as const, fmt: (n: number) => `${fmt(n)}x` },
                        ].map((row) => (
                          <tr key={row.key} className="border-b hover:bg-muted/30">
                            <td className="py-2 px-3 text-muted-foreground">{row.label}</td>
                            {liveKPIs.map((v, i) => (
                              <td key={v.name} className="py-2 px-3 text-right font-medium">
                                <span className="flex items-center justify-end gap-1">
                                  {i === 1 && liveKPIs[0] && (
                                    <DeltaIcon a={v[row.key] as number} b={liveKPIs[0][row.key] as number} />
                                  )}
                                  {row.fmt(v[row.key] as number)}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {summary?.note && (
                    <p className="text-xs text-muted-foreground text-center">{summary.note}</p>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
