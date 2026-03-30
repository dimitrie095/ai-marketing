"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, TrendingUp, TrendingDown, Filter, Calendar, Eye, CheckCircle, RefreshCw, Loader2, BarChart3, ChevronRight, XCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { fetchFromAPI } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Alert {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  alert_type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  kpi_name: string;
  change_percent: number | null;
  root_cause: string | null;
  recommendation: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface AlertStats {
  total: number;
  unread: number;
  by_severity: { HIGH: number; MEDIUM: number; LOW: number };
  by_entity_type: { campaign: number; adset: number; ad: number };
}

export default function MonitoringPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter !== "all") params.append("severity", severityFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (entityTypeFilter !== "all") params.append("entity_type", entityTypeFilter);
      
      const result = await fetchFromAPI(`/api/v1/alerts?${params.toString()}`);
      if (result.status === 'success') {
        setAlerts(result.data);
      } else {
        console.error('Failed to load alerts:', result.message);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await fetchFromAPI('/api/v1/alerts/stats/summary');
      if (result.status === 'success') {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleGenerateAlerts = async () => {
    setGenerating(true);
    try {
      const result = await fetchFromAPI('/api/v1/alerts/generate', {
        method: 'POST',
      });
      if (result.status === 'success') {
        alert(`Erfolgreich ${result.generated || 0} Alerts generiert.`);
        loadAlerts();
        loadStats();
      } else {
        alert('Fehler beim Generieren von Alerts: ' + result.message);
      }
    } catch (error) {
      console.error('Alert generation failed:', error);
      alert('Fehler beim Generieren von Alerts. Bitte versuchen Sie es später erneut.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      const result = await fetchFromAPI(`/api/v1/alerts/${alertId}/read`, {
        method: 'POST',
      });
      if (result.status === 'success') {
        // Update local state
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, is_read: true } : alert
        ));
        if (selectedAlert?.id === alertId) {
          setSelectedAlert(prev => prev ? { ...prev, is_read: true } : null);
        }
        loadStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleOpenDetail = (alert: Alert) => {
    setSelectedAlert(alert);
    setDetailOpen(true);
  };

  useEffect(() => {
    loadAlerts();
    loadStats();
  }, [severityFilter, statusFilter, entityTypeFilter]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'Hoch';
      case 'MEDIUM': return 'Mittel';
      case 'LOW': return 'Niedrig';
      default: return severity;
    }
  };

  const getAlertTypeIcon = (alertType: string) => {
    switch (alertType) {
      case 'KPI_DROP': return <TrendingDown className="h-4 w-4" />;
      case 'SPIKE': return <TrendingUp className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredAlerts = alerts; // Already filtered via API

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alerts & Monitoring</h1>
            <p className="text-muted-foreground">
              Automatische Erkennung und Priorisierung von Performance-Problemen.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadAlerts} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Aktualisieren
            </Button>
            <Button onClick={handleGenerateAlerts} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertCircle className="h-4 w-4 mr-2" />}
              Alerts generieren
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Alle Alerts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ungelesen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.unread}</div>
                <p className="text-xs text-muted-foreground">Benötigt Aufmerksamkeit</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.by_severity.HIGH}</div>
                <p className="text-xs text-muted-foreground">Kritische Probleme</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Kampagnen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.by_entity_type.campaign}</div>
                <p className="text-xs text-muted-foreground">Betroffene Kampagnen</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity-filter">Severity</Label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger id="severity-filter">
                    <SelectValue placeholder="Alle Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Severity</SelectItem>
                    <SelectItem value="HIGH">Hoch</SelectItem>
                    <SelectItem value="MEDIUM">Mittel</SelectItem>
                    <SelectItem value="LOW">Niedrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Alle Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="unread">Ungelesen</SelectItem>
                    <SelectItem value="read">Gelesen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity-filter">Entity Type</Label>
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger id="entity-filter">
                    <SelectValue placeholder="Alle Entity Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Entity Types</SelectItem>
                    <SelectItem value="campaign">Kampagne</SelectItem>
                    <SelectItem value="adset">Ad Set</SelectItem>
                    <SelectItem value="ad">Ad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts Liste</CardTitle>
            <CardDescription>
              {filteredAlerts.length} Alerts gefunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Lade Alerts...</span>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium">Keine Alerts gefunden</h3>
                <p className="text-sm">Ändern Sie die Filter oder generieren Sie neue Alerts.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <Card key={alert.id} className={`overflow-hidden ${!alert.is_read ? 'border-l-4 border-l-primary' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${alert.severity === 'HIGH' ? 'bg-destructive/10' : alert.severity === 'MEDIUM' ? 'bg-amber-100' : 'bg-green-100'}`}>
                            {getAlertTypeIcon(alert.alert_type)}
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {alert.title}
                              {!alert.is_read && <Badge variant="default" className="ml-2">Neu</Badge>}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(alert.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                              <span className="mx-1">•</span>
                              <Badge variant="outline">{alert.entity_type}</Badge>
                              <span className="mx-1">•</span>
                              <span>{alert.entity_name}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {getSeverityText(alert.severity)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm">{alert.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            <span className="font-medium">{alert.kpi_name}</span>
                            {alert.change_percent && (
                              <Badge variant={alert.change_percent < 0 ? "destructive" : "default"}>
                                {alert.change_percent > 0 ? '+' : ''}{alert.change_percent.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!alert.is_read && (
                            <Button size="sm" variant="ghost" onClick={() => handleMarkAsRead(alert.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Als gelesen markieren
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleOpenDetail(alert)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedAlert && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getAlertTypeIcon(selectedAlert.alert_type)}
                  {selectedAlert.title}
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedAlert.created_at), "dd.MM.yyyy HH:mm", { locale: de })} • {selectedAlert.entity_type} • {selectedAlert.entity_name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Summary */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Zusammenfassung</h3>
                  <p>{selectedAlert.description}</p>
                </div>

                <Separator />

                {/* KPI Changes */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">KPI Veränderung</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Betroffene KPI</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{selectedAlert.kpi_name}</span>
                          {selectedAlert.change_percent && (
                            <Badge variant={selectedAlert.change_percent < 0 ? "destructive" : "default"} className="text-lg">
                              {selectedAlert.change_percent > 0 ? '+' : ''}{selectedAlert.change_percent.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Severity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant={getSeverityColor(selectedAlert.severity)} className="text-lg">
                          {getSeverityText(selectedAlert.severity)}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Root Cause */}
                {selectedAlert.root_cause && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Wahrscheinliche Ursache
                      </h3>
                      <p className="text-sm">{selectedAlert.root_cause}</p>
                    </div>
                  </>
                )}

                {/* Recommendation */}
                {selectedAlert.recommendation && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Empfehlung
                      </h3>
                      <p className="text-sm">{selectedAlert.recommendation}</p>
                    </div>
                  </>
                )}

                {/* Affected Entity */}
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Betroffene Entity</h3>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Entity Typ</Label>
                          <p className="font-medium">{selectedAlert.entity_type}</p>
                        </div>
                        <div>
                          <Label>Entity Name</Label>
                          <p className="font-medium">{selectedAlert.entity_name}</p>
                        </div>
                        <div>
                          <Label>Alert Typ</Label>
                          <p className="font-medium">{selectedAlert.alert_type}</p>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Badge variant={selectedAlert.is_read ? "outline" : "default"}>
                            {selectedAlert.is_read ? "Gelesen" : "Ungelesen"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center">
                  {!selectedAlert.is_read && (
                    <Button onClick={() => handleMarkAsRead(selectedAlert.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Als gelesen markieren
                    </Button>
                  )}
                </div>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Schließen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}