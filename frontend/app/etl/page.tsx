"use client";

import { useState } from "react";
import { withAuth } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, Download, Database, CheckCircle, AlertTriangle } from "lucide-react";
import {
  syncMetaAdsCampaigns,
  syncMetaAdsInsights,
  syncGoogleAdsCampaigns,
  syncGoogleAdsMetrics
} from "@/lib/api";

function ETLPage() {
  const [metaLoading, setMetaLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [metaStatus, setMetaStatus] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 9)]);
  };

  const syncMetaCampaigns = async () => {
    setMetaLoading(true);
    addLog("Starte Meta Ads Kampagnen-Sync...");
    try {
      const data = await syncMetaAdsCampaigns();
      setMetaStatus(data.message);
      addLog(`Meta Sync gestartet: ${data.message} (Mode: ${data.mode})`);
    } catch (error: any) {
      addLog(`Fehler beim Meta Sync: ${error.apiMessage || error.message}`);
    } finally {
      setMetaLoading(false);
    }
  };

  const syncGoogleCampaigns = async () => {
    setGoogleLoading(true);
    addLog("Starte Google Ads Kampagnen-Sync...");
    try {
      const data = await syncGoogleAdsCampaigns();
      setGoogleStatus(data.message);
      addLog(`Google Sync gestartet: ${data.message} (Mode: ${data.mode})`);
    } catch (error: any) {
      addLog(`Fehler beim Google Sync: ${error.apiMessage || error.message}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const syncMetaMetrics = async () => {
    setMetaLoading(true);
    addLog("Starte Meta Ads Metriken-Sync...");
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const data = await syncMetaAdsInsights('campaign', [], startDate, endDate);
      addLog(`Meta Metriken Sync gestartet: ${data.message}`);
    } catch (error: any) {
      addLog(`Fehler beim Meta Metriken Sync: ${error.apiMessage || error.message}`);
    } finally {
      setMetaLoading(false);
    }
  };

  const syncGoogleMetrics = async () => {
    setGoogleLoading(true);
    addLog("Starte Google Ads Metriken-Sync...");
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const data = await syncGoogleAdsMetrics('campaign', [], startDate, endDate);
      addLog(`Google Metriken Sync gestartet: ${data.message}`);
    } catch (error: any) {
      addLog(`Fehler beim Google Metriken Sync: ${error.apiMessage || error.message}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">ETL Operations</h1>
          <p className="text-muted-foreground">
            Extrahieren, Transformieren und Laden von Campaign-Daten aus Meta Ads und Google Ads APIs
          </p>
        </div>

        <Tabs defaultValue="meta" className="space-y-6">
          <TabsList>
            <TabsTrigger value="meta">Meta Ads</TabsTrigger>
            <TabsTrigger value="google">Google Ads</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="meta" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Meta Ads Synchronisation
                </CardTitle>
                <CardDescription>
                  Daten von der Meta Ads API extrahieren und in die Datenbank speichern
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Kampagnen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Synchronisiere Campaign-Stammdaten (Namen, Status, Objective)
                      </p>
                      <Button 
                        onClick={syncMetaCampaigns} 
                        disabled={metaLoading}
                        className="w-full"
                      >
                        {metaLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Synchronisiere...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Kampagnen synchronisieren
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance Metriken</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Synchronisiere Performance-Daten (Impressions, Clicks, Conversions)
                      </p>
                      <Button 
                        onClick={syncMetaMetrics} 
                        disabled={metaLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {metaLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Synchronisiere...
                          </>
                        ) : (
                          <>
                            <Database className="mr-2 h-4 w-4" />
                            Metriken synchronisieren
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {metaStatus && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{metaStatus}</AlertDescription>
                  </Alert>
                )}

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Hinweis:</strong> Die Synchronisation läuft im Hintergrund. 
                    Du kannst die Seite schließen, der Prozess wird fortgesetzt.
                  </p>
                  <p className="mt-2">
                    Um echte Daten von Meta Ads zu erhalten, müssen die Umgebungsvariablen 
                    <code className="ml-1 px-1 bg-muted rounded">META_ACCESS_TOKEN</code>, 
                    <code className="ml-1 px-1 bg-muted rounded">META_APP_ID</code> und 
                    <code className="ml-1 px-1 bg-muted rounded">META_AD_ACCOUNT_ID</code> gesetzt sein.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="google" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Google Ads Synchronisation
                </CardTitle>
                <CardDescription>
                  Daten von der Google Ads API extrahieren und in die Datenbank speichern
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Kampagnen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Synchronisiere Campaign-Stammdaten von Google Ads
                      </p>
                      <Button 
                        onClick={syncGoogleCampaigns} 
                        disabled={googleLoading}
                        className="w-full"
                      >
                        {googleLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Synchronisiere...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Kampagnen synchronisieren
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance Metriken</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Synchronisiere Performance-Daten von Google Ads
                      </p>
                      <Button 
                        onClick={syncGoogleMetrics} 
                        disabled={googleLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {googleLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Synchronisiere...
                          </>
                        ) : (
                          <>
                            <Database className="mr-2 h-4 w-4" />
                            Metriken synchronisieren
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {googleStatus && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{googleStatus}</AlertDescription>
                  </Alert>
                )}

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Hinweis:</strong> Die Synchronisation läuft im Hintergrund. 
                    Du kannst die Seite schließen, der Prozess wird fortgesetzt.
                  </p>
                  <p className="mt-2">
                    Um echte Daten von Google Ads zu erhalten, müssen die Umgebungsvariablen 
                    <code className="ml-1 px-1 bg-muted rounded">GOOGLE_ADS_CLIENT_ID</code>, 
                    <code className="ml-1 px-1 bg-muted rounded">GOOGLE_ADS_CLIENT_SECRET</code>, 
                    <code className="ml-1 px-1 bg-muted rounded">GOOGLE_ADS_REFRESH_TOKEN</code>, 
                    <code className="ml-1 px-1 bg-muted rounded">GOOGLE_ADS_DEVELOPER_TOKEN</code> und 
                    <code className="ml-1 px-1 bg-muted rounded">GOOGLE_ADS_LOGIN_CUSTOMER_ID</code> gesetzt sein.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Aktivitäts-Logs</span>
                  <Button variant="outline" size="sm" onClick={clearLogs}>
                    Logs löschen
                  </Button>
                </CardTitle>
                <CardDescription>
                  Letzte ETL-Operationen und Statusmeldungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Noch keine Logs vorhanden.</p>
                    <p className="text-sm">Starte eine Synchronisation, um Logs zu sehen.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {logs.map((log, index) => (
                      <div key={index} className="font-mono text-sm p-2 bg-muted rounded">
                        {log}
                      </div>
                    ))}
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

export default withAuth(ETLPage);