"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BarChart3, Target, TrendingUp, Award } from "lucide-react";
import { getExperiment, getExperimentSummary } from "@/lib/api";

interface ExperimentDetailsProps {
  experimentId: string;
  trigger?: React.ReactNode;
}

interface VariantSummary {
  variant_id: string;
  variant_name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  ctr: number;
  cvr: number;
  roas: number;
}

interface ExperimentSummary {
  experiment_id: string;
  experiment_name: string;
  status: string;
  variants: VariantSummary[];
  winner: string | null;
  winner_roas: number | null;
  calculated_at: string;
}

export function ExperimentDetails({ experimentId, trigger }: ExperimentDetailsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ExperimentSummary | null>(null);
  const [experiment, setExperiment] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && experimentId) {
      loadData();
    }
  }, [open, experimentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expRes, sumRes] = await Promise.all([
        getExperiment(experimentId),
        getExperimentSummary(experimentId),
      ]);
      if (expRes.status === "success") {
        setExperiment(expRes.data);
      } else {
        throw new Error(expRes.message || "Failed to load experiment");
      }
      if (sumRes.status === "success") {
        setSummary(sumRes.data);
      } else {
        throw new Error(sumRes.message || "Failed to load summary");
      }
    } catch (error) {
      console.error("Failed to load experiment details:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge variant="default">Running</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "paused":
        return <Badge variant="outline">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "creative":
        return <BarChart3 className="h-4 w-4" />;
      case "audience":
        return <Target className="h-4 w-4" />;
      case "budget":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(num);
  };

  const formatPercent = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Details</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {experiment && getTypeIcon(experiment.type)}
                {experiment?.name || "Experiment Details"}
              </DialogTitle>
              <DialogDescription>
                {experiment && (
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(experiment.status)}
                    <Badge variant="outline">{experiment.type}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Created {new Date(experiment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            {summary && (
              <>
                <div className="space-y-6">
                  {summary.winner && (
                    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-green-600" />
                          Winner: Variant {summary.winner}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          ROAS: {summary.winner_roas?.toFixed(2)}x
                        </p>
                      </CardHeader>
                    </Card>
                  )}

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {summary.variants.map((variant) => (
                      <Card key={variant.variant_id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Variant {variant.variant_name}
                            </CardTitle>
                            {variant.variant_name === summary.winner && (
                              <Badge variant="default">Winner</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground">Impressions</p>
                              <p className="text-lg font-semibold">{formatNumber(variant.impressions)}</p>
                            </div>
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground">Clicks</p>
                              <p className="text-lg font-semibold">{formatNumber(variant.clicks)}</p>
                            </div>
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground">CTR</p>
                              <p className="text-lg font-semibold">{formatPercent(variant.ctr)}</p>
                            </div>
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground">CVR</p>
                              <p className="text-lg font-semibold">{formatPercent(variant.cvr)}</p>
                            </div>
                            <div className="bg-muted p-3 rounded-lg col-span-2">
                              <p className="text-xs text-muted-foreground">ROAS</p>
                              <p className="text-lg font-semibold">{variant.roas.toFixed(2)}x</p>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Revenue: {formatCurrency(variant.revenue)}</p>
                            <p>Spend: {formatCurrency(variant.spend)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Separator />

                  <Card>
                    <CardHeader>
                      <CardTitle>KPIs Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Variant</th>
                            <th className="text-left py-2">Impressions</th>
                            <th className="text-left py-2">Clicks</th>
                            <th className="text-left py-2">CTR</th>
                            <th className="text-left py-2">CVR</th>
                            <th className="text-left py-2">ROAS</th>
                            <th className="text-left py-2">Revenue</th>
                            <th className="text-left py-2">Spend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.variants.map((variant) => (
                            <tr key={variant.variant_id} className="border-b hover:bg-muted/50">
                              <td className="py-2 font-medium">{variant.variant_name}</td>
                              <td className="py-2">{formatNumber(variant.impressions)}</td>
                              <td className="py-2">{formatNumber(variant.clicks)}</td>
                              <td className="py-2">{formatPercent(variant.ctr)}</td>
                              <td className="py-2">{formatPercent(variant.cvr)}</td>
                              <td className="py-2">{variant.roas.toFixed(2)}x</td>
                              <td className="py-2">{formatCurrency(variant.revenue)}</td>
                              <td className="py-2">{formatCurrency(variant.spend)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}