"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, FileText, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Download, Eye, Clock, BarChart3, Loader2, RefreshCw } from "lucide-react";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { fetchFromAPI } from "@/lib/api";

interface InsightCard {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  metric: string;
  change: string;
  direction: "up" | "down";
  recommendations: string[];
  timestamp: string;
}

interface Report {
  id: string;
  title: string;
  type: "daily" | "weekly" | "monthly" | "benchmark";
  date: string;
  summary: string;
  insights: number;
  metrics: Array<{ name: string; value: string; change?: string }>;
}

const InsightCardComponent = ({ insight, onDetailsClick, onExportPDF }: { insight: InsightCard, onDetailsClick: (insight: InsightCard) => void, onExportPDF: (id: string) => void }) => {
  return (
    <Card key={insight.id} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {insight.severity === "high" ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : insight.severity === "medium" ? (
                <TrendingUp className="h-5 w-5 text-amber-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-green-500" />
              )}
              {insight.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3" />
              {format(new Date(insight.timestamp), "dd.MM.yyyy HH:mm", { locale: de })}
            </CardDescription>
          </div>
          <Badge
            variant={insight.severity === "high" ? "destructive" : insight.severity === "medium" ? "secondary" : "outline"}
          >
            {insight.severity === "high" ? "Hoch" : insight.severity === "medium" ? "Mittel" : "Niedrig"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{insight.description}</p>
        
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="font-medium">{insight.metric}</span>
          <Badge variant={insight.direction === "up" ? "default" : "destructive"}>
            {insight.change}
          </Badge>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Empfehlungen
          </h4>
          <ul className="space-y-1 text-sm">
            {insight.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Button variant="outline" size="sm" onClick={() => onDetailsClick(insight)}>
          <Eye className="h-4 w-4 mr-2" />
          Details
        </Button>
        <Button size="sm" onClick={() => onExportPDF(insight.id)}>
          <Download className="h-4 w-4 mr-2" />
          Export (PDF)
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const result = await fetchFromAPI('/api/v1/analytics/insights');
      if (result.status === 'success') {
        setInsights(result.data);
      } else {
        console.error('Failed to load insights:', result.message);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const [reports, setReports] = useState<Report[]>([
    {
      id: "daily-1",
      title: "Tagesreport",
      type: "daily",
      date: new Date().toISOString(),
      summary: "Übersicht der wichtigsten KPIs und Veränderungen des Tages.",
      insights: 3,
      metrics: [
        { name: "Conversions", value: "1,234", change: "+5%" },
        { name: "Revenue", value: "€12,567", change: "+8%" },
        { name: "ROAS", value: "4.2", change: "+0.3" },
        { name: "CTR", value: "2.3%", change: "-0.1%" },
      ],
    },
    {
      id: "weekly-1",
      title: "Wochenreport",
      type: "weekly",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      summary: "Wöchentliche Zusammenfassung der Marketing-Performance.",
      insights: 7,
      metrics: [
        { name: "Conversions", value: "8,543", change: "+12%" },
        { name: "Revenue", value: "€89,123", change: "+15%" },
        { name: "ROAS", value: "4.0", change: "+0.5" },
        { name: "CTR", value: "2.4%", change: "0%" },
      ],
    },
    {
      id: "monthly-1",
      title: "Monatsreport",
      type: "monthly",
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      summary: "Monatliche Performance-Analyse und Trends.",
      insights: 15,
      metrics: [
        { name: "Conversions", value: "32,456", change: "+18%" },
        { name: "Revenue", value: "€345,678", change: "+22%" },
        { name: "ROAS", value: "4.3", change: "+0.8" },
        { name: "CTR", value: "2.5%", change: "+0.2%" },
      ],
    },
  ]);

  const [generatingReport, setGeneratingReport] = useState<'daily' | 'weekly' | 'benchmark' | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<InsightCard | null>(null);

  const handleGenerateReport = async (type: 'daily' | 'weekly' | 'benchmark') => {
    // Set loading state
    setGeneratingReport(type);

    try {
        const result = await fetchFromAPI(`/api/v1/analytics/reports/generate`, {
            method: 'POST',
            body: JSON.stringify({ report_type: type }),
        });
        if (result.status === 'success') {
            const newReport = result.data;
            // Add to reports list
            setReports(prev => [newReport, ...prev]);
            // Open details dialog automatically
            setSelectedReport(newReport);
        } else {
            alert('Fehler beim Generieren des Reports: ' + result.message);
        }
    } catch (error) {
        console.error('Report generation failed:', error);
        alert('Fehler beim Generieren des Reports. Bitte versuchen Sie es später erneut.');
    } finally {
        // Reset loading state
        setGeneratingReport(null);
    }
  };

  const handleExportPDF = (reportId: string) => {
    // Mock PDF export
    alert(`PDF-Export für Report ${reportId} gestartet.`);
    // In production: call API to generate PDF
  };

  const handleSaveReport = (reportId: string) => {
    // Mock save
    alert(`Report ${reportId} gespeichert.`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Insights & Reports</h1>
            <p className="text-muted-foreground">
              Automatisierte Analysen und generierte Berichte Ihrer Marketing-Daten.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Datumsbereich
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Alle exportieren
            </Button>
          </div>
        </div>

        <Tabs defaultValue="insights" className="space-y-6">
          <TabsList>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Auto-Generated Reports
            </TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
                <CardDescription>
                  Automatisch generierte Erkenntnisse aus Ihren Marketing-Daten.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {insights.length} Insights verfügbar
                    </p>
                  </div>
                  <Button 
                    onClick={loadInsights} 
                    disabled={loadingInsights}
                    variant="outline"
                    size="sm"
                  >
                    {loadingInsights ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Lädt...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Insights aktualisieren
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {loadingInsights ? (
                <div className="col-span-2 flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2">Lade Insights...</span>
                </div>
              ) : insights.length > 0 ? (
                insights.map((insight) => (
                  <InsightCardComponent
                    key={insight.id}
                    insight={insight}
                    onDetailsClick={setSelectedInsight}
                    onExportPDF={handleExportPDF}
                  />
                ))
              ) : (
                <div className="col-span-2 text-center py-12 border rounded-lg">
                  <p className="text-muted-foreground">Keine Insights verfügbar.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <Card key={report.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <CardDescription>
                          {format(new Date(report.date), "dd.MM.yyyy", { locale: de })}
                        </CardDescription>
                      </div>
                      <Badge variant={
                        report.type === "daily" ? "default" : report.type === "weekly" ? "secondary" : "outline"
                      }>
                        {report.type === "daily" ? "Täglich" : report.type === "weekly" ? "Wöchentlich" : report.type === "benchmark" ? "Benchmark" : "Monatlich"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <p className="text-sm text-muted-foreground">{report.summary}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Insights:</span>
                        <span className="font-medium">{report.insights}</span>
                      </div>
                      <Separator />
                      <h4 className="font-medium text-sm">Wichtige KPIs</h4>
                      <div className="space-y-1">
                        {report.metrics.map((metric, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span>{metric.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{metric.value}</span>
                              {metric.change && (
                                <Badge
                                  variant={metric.change.startsWith("+") ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {metric.change}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-4">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedReport(report)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleSaveReport(report.id)}>
                        Speichern
                      </Button>
                    </div>
                    <Button size="sm" onClick={() => handleExportPDF(report.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Additional Report Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Report-Generierung</CardTitle>
                <CardDescription>
                  Erstellen Sie neue Berichte basierend auf Ihren Daten.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                     variant="outline" 
                     className="h-auto py-4 flex flex-col items-center gap-2"
                     onClick={() => handleGenerateReport('daily')}
                     disabled={generatingReport !== null}
                   >
                     {generatingReport === 'daily' ? <Loader2 className="h-8 w-8 animate-spin" /> : <FileText className="h-8 w-8" />}
                     <span>Tagesreport generieren</span>
                     <span className="text-xs text-muted-foreground">Automatisch</span>
                   </Button>
                  <Button 
                     variant="outline" 
                     className="h-auto py-4 flex flex-col items-center gap-2"
                     onClick={() => handleGenerateReport('weekly')}
                     disabled={generatingReport !== null}
                   >
                     {generatingReport === 'weekly' ? <Loader2 className="h-8 w-8 animate-spin" /> : <BarChart3 className="h-8 w-8" />}
                     <span>Wochenreport generieren</span>
                     <span className="text-xs text-muted-foreground">Benutzerdefiniert</span>
                   </Button>
                  <Button 
                     variant="outline" 
                     className="h-auto py-4 flex flex-col items-center gap-2"
                     onClick={() => handleGenerateReport('benchmark')}
                     disabled={generatingReport !== null}
                   >
                     {generatingReport === 'benchmark' ? <Loader2 className="h-8 w-8 animate-spin" /> : <TrendingUp className="h-8 w-8" />}
                     <span>Benchmark-Report</span>
                     <span className="text-xs text-muted-foreground">Vergleich</span>
                   </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recently Generated Reports */}
            {reports.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Zuletzt generierte Reports</CardTitle>
                  <CardDescription>
                    Die neuesten automatisch generierten Berichte.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reports.slice(0, 2).map((report) => (
                      <div key={report.id} className="border rounded-lg p-4 bg-card text-card-foreground shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium">{report.title}</h3>
                          <Badge variant={report.type === 'daily' ? 'default' : report.type === 'weekly' ? 'secondary' : 'outline'}>
                            {report.type === 'daily' ? 'Täglich' : report.type === 'weekly' ? 'Wöchentlich' : 'Benchmark'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{report.summary}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(report.date), 'dd.MM.yyyy', { locale: de })}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => setSelectedReport(report)}>
                            <Eye className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Report Details Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedReport && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedReport.title}
                    <Badge variant={
                      selectedReport.type === "daily" ? "default" : selectedReport.type === "weekly" ? "secondary" : "outline"
                    }>
                      {selectedReport.type === "daily" ? "Täglich" : selectedReport.type === "weekly" ? "Wöchentlich" : selectedReport.type === "benchmark" ? "Benchmark" : "Monatlich"}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Erstellt am {format(new Date(selectedReport.date), "dd.MM.yyyy", { locale: de })}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm">{selectedReport.summary}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Insights:</span>
                      <span className="font-medium">{selectedReport.insights}</span>
                    </div>
                    <Separator />
                    <h4 className="font-medium text-sm">Wichtige KPIs</h4>
                    <div className="space-y-1">
                      {selectedReport.metrics.map((metric, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span>{metric.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{metric.value}</span>
                            {metric.change && (
                              <Badge
                                variant={metric.change.startsWith("+") ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {metric.change}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Insight Details Dialog */}
        <Dialog open={!!selectedInsight} onOpenChange={(open) => !open && setSelectedInsight(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedInsight && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedInsight.title}
                    <Badge variant={
                      selectedInsight.severity === "high" ? "destructive" : selectedInsight.severity === "medium" ? "secondary" : "outline"
                    }>
                      {selectedInsight.severity === "high" ? "Hoch" : selectedInsight.severity === "medium" ? "Mittel" : "Niedrig"}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Erstellt am {format(new Date(selectedInsight.timestamp), "dd.MM.yyyy HH:mm", { locale: de })}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm">{selectedInsight.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="font-medium">{selectedInsight.metric}</span>
                      <Badge variant={selectedInsight.direction === "up" ? "default" : "destructive"}>
                        {selectedInsight.change}
                      </Badge>
                    </div>
                    <Separator />
                    <h4 className="font-medium text-sm">Empfehlungen</h4>
                    <ul className="space-y-1 text-sm">
                      {selectedInsight.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}