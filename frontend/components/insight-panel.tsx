"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, TrendingUp, TrendingDown, Lightbulb, BarChart3, Target } from "lucide-react";

export interface InsightData {
  summary?: string;
  keyChanges?: Array<{ metric: string; change: string; direction: "up" | "down" }>;
  rootCauses?: Array<{ cause: string; confidence: number }>;
  recommendations?: Array<{ action: string; priority: "high" | "medium" | "low" }>;
  dataPreview?: Array<{ metric: string; value: string; change?: string }>;
  overallScore?: number;
  confidence?: number;
}

interface InsightPanelProps {
  insights?: InsightData;
  loading?: boolean;
  visible?: boolean;
}

export function InsightPanel({ insights, loading = false, visible = true }: InsightPanelProps) {
  if (!visible) return null;

  if (loading) {
    return (
      <Card className="w-96 flex-shrink-0 h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="w-96 flex-shrink-0 h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Keine Insights verfügbar</h3>
          <p className="text-sm text-muted-foreground">
            Stellen Sie eine Frage zu Ihren Marketing-Daten, um strukturierte Analysen zu erhalten.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary, keyChanges, rootCauses, recommendations, dataPreview, overallScore, confidence } = insights;

  return (
    <Card className="w-96 flex-shrink-0 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Insights
          </CardTitle>
          {overallScore !== undefined && (
            <Badge variant={overallScore >= 70 ? "default" : overallScore >= 40 ? "secondary" : "destructive"}>
              Score: {overallScore}%
            </Badge>
          )}
        </div>
        {confidence !== undefined && (
          <p className="text-xs text-muted-foreground">Confidence: {(confidence * 100).toFixed(1)}%</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-6">
        {/* Summary */}
        {summary && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Zusammenfassung
            </h4>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </div>
        )}

        {/* Key Changes */}
        {keyChanges && keyChanges.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Wichtige Veränderungen
            </h4>
            <div className="space-y-2">
              {keyChanges.map((change, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span>{change.metric}</span>
                  <Badge
                    variant={change.direction === "up" ? "default" : "destructive"}
                    className="ml-2"
                  >
                    {change.change}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Root Causes */}
        {rootCauses && rootCauses.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Ursachen
            </h4>
            <div className="space-y-3">
              {rootCauses.map((cause, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{cause.cause}</span>
                    <Badge variant="outline" className="text-xs">
                      {cause.confidence >= 0.7 ? "Hoch" : cause.confidence >= 0.4 ? "Mittel" : "Niedrig"}
                    </Badge>
                  </div>
                  <div className="w-full bg-secondary h-1 mt-1 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${cause.confidence * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Handlungsempfehlungen
            </h4>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`text-sm p-2 rounded border-l-4 ${
                    rec.priority === "high"
                      ? "border-destructive bg-destructive/5"
                      : rec.priority === "medium"
                      ? "border-warning bg-warning/5"
                      : "border-muted bg-muted/5"
                  }`}
                >
                  <div className="flex justify-between">
                    <span>{rec.action}</span>
                    <Badge
                      variant={
                        rec.priority === "high"
                          ? "destructive"
                          : rec.priority === "medium"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {rec.priority === "high" ? "Hoch" : rec.priority === "medium" ? "Mittel" : "Niedrig"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Preview */}
        {dataPreview && dataPreview.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Daten-Vorschau
            </h4>
            <div className="space-y-1 text-sm">
              {dataPreview.map((row, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span>{row.metric}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{row.value}</span>
                    {row.change && (
                      <Badge
                        variant={row.change.startsWith("+") ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {row.change}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}