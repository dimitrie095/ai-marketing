"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Key, Bot, Plus, Trash2, Edit, Check, AlertCircle, RefreshCw,
  Server, CreditCard, TestTube, ExternalLink, Power, Star, Megaphone,
} from "lucide-react";
import {
  getLLMProviders, getLLMConfigs, createLLMConfig, updateLLMConfig,
  deleteLLMConfig, activateLLMConfig, deactivateLLMConfig, setDefaultLLMConfig,
  testLLMConfig, getLLMGatewayStatus, initializeLLMDefaultProviders,
  getMetaAdsStatus, syncMetaAdsCampaigns, syncMetaAdsAdSets, syncMetaAdsAds,
  syncMetaAdsInsights, syncMetaAdsAll,
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LLMProvider {
  id: number;
  name: string;
  display_name: string;
  base_url: string;
  docs_url?: string;
  created_at: string;
}

interface LLMConfig {
  id: number;
  name: string;
  provider_id: number;
  model_name: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  is_active: boolean;
  is_default: boolean;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  created_at: string;
  updated_at?: string;
}

interface FormData {
  name: string;
  provider_id: string;
  model_name: string;
  api_key: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  is_default: boolean;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
}

const DEFAULT_MODELS: Record<string, string[]> = {
  openai:   ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
  kimi:     ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
};

const EMPTY_FORM: FormData = {
  name: "", provider_id: "", model_name: "", api_key: "",
  max_tokens: 4096, temperature: 0.7, top_p: 1.0,
  is_default: false, cost_per_1k_input_tokens: 0, cost_per_1k_output_tokens: 0,
};

// ── Helper: extract backend error detail ──────────────────────────────────────

function extractError(err: any, fallback: string): string {
  if (!err) return fallback;
  if (err?.apiMessage) {
    try { return JSON.parse(err.apiMessage)?.detail ?? err.apiMessage; }
    catch { return err.apiMessage; }
  }
  return err?.message ?? fallback;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [providers, setProviders]       = useState<LLMProvider[]>([]);
  const [configs, setConfigs]           = useState<LLMConfig[]>([]);
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [metaAdsStatus, setMetaAdsStatus] = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);
  const [isSyncing, setIsSyncing]       = useState(false);
  const [syncError, setSyncError]       = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess]   = useState<string | null>(null);

  // dialog states
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [testingId, setTestingId]       = useState<number | null>(null);

  // form
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const set = (patch: Partial<FormData>) => setForm(prev => ({ ...prev, ...patch }));

  // ── Data loading ─────────────────────────────────────────────────────────────

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, cRes, gRes, mRes] = await Promise.all([
        getLLMProviders().catch(() => null),
        getLLMConfigs().catch(() => null),
        getLLMGatewayStatus().catch(() => null),
        getMetaAdsStatus().catch(() => null),
      ]);

      // Auto-initialize default providers if DB is empty
      let providerList: LLMProvider[] = Array.isArray(pRes) ? pRes : [];
      if (providerList.length === 0) {
        await initializeLLMDefaultProviders().catch(() => null);
        const fresh = await getLLMProviders().catch(() => null);
        providerList = Array.isArray(fresh) ? fresh : [];
      }
      setProviders(providerList);

      if (cRes?.configs) setConfigs(cRes.configs);
      if (gRes)          setGatewayStatus(gRes);
      if (mRes)          setMetaAdsStatus(mRes);
    } catch (err) {
      setError("Fehler beim Laden der Einstellungen");
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // ── Config handlers ───────────────────────────────────────────────────────────

  const handleAddConfig = async () => {
    try {
      setError(null);
      const res = await createLLMConfig({ ...form, provider_id: parseInt(form.provider_id) });
      if (res.status === "success") {
        showSuccess("Konfiguration erfolgreich erstellt");
        setIsAddOpen(false);
        setForm(EMPTY_FORM);
        loadData();
      } else {
        setError("Fehler beim Erstellen der Konfiguration");
      }
    } catch (err: any) {
      setError(extractError(err, "Fehler beim Erstellen der Konfiguration"));
    }
  };

  const handleUpdateConfig = async () => {
    if (!editingConfig) return;
    try {
      setError(null);
      const payload: any = {
        name: form.name,
        model_name: form.model_name,
        max_tokens: form.max_tokens,
        temperature: form.temperature,
        top_p: form.top_p,
        is_default: form.is_default,
        cost_per_1k_input_tokens: form.cost_per_1k_input_tokens,
        cost_per_1k_output_tokens: form.cost_per_1k_output_tokens,
      };
      if (form.api_key) payload.api_key = form.api_key;

      const res = await updateLLMConfig(editingConfig.id, payload);
      if (res.status === "success") {
        showSuccess("Konfiguration erfolgreich aktualisiert");
        setIsEditOpen(false);
        setEditingConfig(null);
        setForm(EMPTY_FORM);
        loadData();
      } else {
        setError("Fehler beim Aktualisieren");
      }
    } catch (err: any) {
      setError(extractError(err, "Fehler beim Aktualisieren der Konfiguration"));
    }
  };

  const handleDeleteConfig = async (id: number) => {
    if (!confirm("Konfiguration wirklich löschen?")) return;
    try {
      await deleteLLMConfig(id);
      showSuccess("Konfiguration gelöscht");
      loadData();
    } catch (err: any) {
      setError(extractError(err, "Fehler beim Löschen"));
    }
  };

  const handleToggleActive = async (cfg: LLMConfig) => {
    try {
      const res = cfg.is_active
        ? await deactivateLLMConfig(cfg.id)
        : await activateLLMConfig(cfg.id);
      if (res.status === "success") {
        showSuccess(cfg.is_active ? "Konfiguration deaktiviert" : "Konfiguration aktiviert");
        loadData();
      }
    } catch (err: any) {
      setError(extractError(err, "Fehler beim Ändern des Status"));
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const res = await setDefaultLLMConfig(id);
      if (res.status === "success") { showSuccess("Als Standard gesetzt"); loadData(); }
    } catch (err: any) {
      setError(extractError(err, "Fehler beim Setzen als Standard"));
    }
  };

  const handleTestConfig = async (id: number) => {
    try {
      setTestingId(id);
      const res = await testLLMConfig(id);
      if (res.status === "success") {
        alert(`✅ Test erfolgreich!\nAntwort: ${res.response?.slice(0, 100)}...\nLatency: ${res.latency_ms}ms`);
      } else {
        alert(`❌ Test fehlgeschlagen: ${res.detail}`);
      }
    } catch (err: any) {
      alert(`❌ Test fehlgeschlagen: ${extractError(err, "Unbekannter Fehler")}`);
    } finally {
      setTestingId(null);
    }
  };

  const openEditDialog = (cfg: LLMConfig) => {
    setEditingConfig(cfg);
    setForm({
      name: cfg.name, provider_id: cfg.provider_id.toString(),
      model_name: cfg.model_name, api_key: "",
      max_tokens: cfg.max_tokens, temperature: cfg.temperature,
      top_p: cfg.top_p, is_default: cfg.is_default,
      cost_per_1k_input_tokens: cfg.cost_per_1k_input_tokens,
      cost_per_1k_output_tokens: cfg.cost_per_1k_output_tokens,
    });
    setIsEditOpen(true);
  };

  // ── Sync handler ──────────────────────────────────────────────────────────────

  const handleSync = async (type: string) => {
    try {
      setIsSyncing(true); setSyncError(null); setSyncSuccess(null);
      const today = new Date().toISOString().split("T")[0];
      let res: any;
      if (type === "campaigns") res = await syncMetaAdsCampaigns();
      else if (type === "adsets") res = await syncMetaAdsAdSets();
      else if (type === "ads") res = await syncMetaAdsAds();
      else if (type === "insights") res = await syncMetaAdsInsights("campaign", [], today, today);
      else res = await syncMetaAdsAll();

      if (res.status === "started" || res.status === "success") {
        setSyncSuccess(`Sync (${type}) erfolgreich gestartet`);
      } else {
        setSyncError(`Sync fehlgeschlagen: ${res.message ?? "Unbekannter Fehler"}`);
      }
    } catch (err: any) {
      setSyncError(extractError(err, "Sync fehlgeschlagen"));
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const getProviderName = (id: number) =>
    providers.find(p => p.id === id)?.display_name ?? "Unknown";

  const getAvailableModels = () => {
    const p = providers.find(p => p.id === parseInt(form.provider_id));
    return p ? (DEFAULT_MODELS[p.name] ?? []) : [];
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
          <p className="text-muted-foreground">Konfiguration des Systems und der LLM-Integration</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="llm" className="space-y-6">
          <TabsList>
            <TabsTrigger value="llm"><Bot className="h-4 w-4 mr-2" />LLM Konfiguration</TabsTrigger>
            <TabsTrigger value="ads"><Megaphone className="h-4 w-4 mr-2" />Ads Provider</TabsTrigger>
            <TabsTrigger value="system"><Server className="h-4 w-4 mr-2" />System Status</TabsTrigger>
          </TabsList>

          {/* ── LLM Tab ── */}
          <TabsContent value="llm" className="space-y-6">

            {/* Gateway Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Power className="h-5 w-5" />LLM Gateway Status</CardTitle>
                <CardDescription>Aktueller Status des LLM Gateways</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    { label: "Status", value: <Badge variant={gatewayStatus?.initialized ? "default" : "destructive"}>{gatewayStatus?.initialized ? "Aktiv" : "Inaktiv"}</Badge> },
                    { label: "Provider", value: gatewayStatus?.providers ?? 0 },
                    { label: "Anfragen", value: gatewayStatus?.total_requests ?? 0 },
                    { label: "Erfolgsrate", value: gatewayStatus?.success_rate ? `${(gatewayStatus.success_rate * 100).toFixed(1)}%` : "N/A" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-2xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configs list + Add button */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />LLM Konfigurationen</CardTitle>
                  <CardDescription>Verwalten Sie Ihre LLM-Provider und API-Keys</CardDescription>
                </div>

                {/* Add Dialog */}
                <Dialog open={isAddOpen} onOpenChange={o => { setIsAddOpen(o); if (!o) setForm(EMPTY_FORM); }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />Hinzufügen</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Neue LLM Konfiguration</DialogTitle>
                      <DialogDescription>Fügen Sie einen neuen LLM-Provider mit API-Key hinzu</DialogDescription>
                    </DialogHeader>
                    <ConfigForm form={form} set={set} providers={providers} models={getAvailableModels()} isEdit={false} />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setIsAddOpen(false); setForm(EMPTY_FORM); }}>Abbrechen</Button>
                      <Button onClick={handleAddConfig} disabled={!form.name || !form.provider_id || !form.model_name || !form.api_key}>
                        Speichern
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={o => { setIsEditOpen(o); if (!o) { setEditingConfig(null); setForm(EMPTY_FORM); } }}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Konfiguration bearbeiten</DialogTitle>
                      <DialogDescription>Aktualisieren Sie die Konfiguration</DialogDescription>
                    </DialogHeader>
                    <ConfigForm form={form} set={set} providers={providers} models={getAvailableModels()} isEdit />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditingConfig(null); setForm(EMPTY_FORM); }}>Abbrechen</Button>
                      <Button onClick={handleUpdateConfig}>Aktualisieren</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent>
                {configs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Noch keine Konfigurationen vorhanden</p>
                    <p className="text-sm">Fügen Sie Ihren ersten LLM-Provider hinzu</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Modell</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Kosten/1k</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map(cfg => (
                        <TableRow key={cfg.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {cfg.name}
                              {cfg.is_default && (
                                <Badge className="bg-yellow-500">
                                  <Star className="h-3 w-3 mr-1" />Standard
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getProviderName(cfg.provider_id)}</TableCell>
                          <TableCell>{cfg.model_name}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(cfg)}
                              className="px-2 h-7"
                              title={cfg.is_active ? "Deaktivieren" : "Aktivieren"}
                            >
                              <Badge variant={cfg.is_active ? "default" : "secondary"} className="cursor-pointer">
                                <Power className="h-3 w-3 mr-1" />
                                {cfg.is_active ? "Aktiv" : "Inaktiv"}
                              </Badge>
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div>In: ${cfg.cost_per_1k_input_tokens.toFixed(4)}</div>
                              <div>Out: ${cfg.cost_per_1k_output_tokens.toFixed(4)}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {!cfg.is_default && (
                                <Button variant="ghost" size="icon" onClick={() => handleSetDefault(cfg.id)} title="Als Standard setzen">
                                  <Star className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleTestConfig(cfg.id)} disabled={testingId === cfg.id} title="Testen">
                                {testingId === cfg.id
                                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                                  : <TestTube className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(cfg)} title="Bearbeiten">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteConfig(cfg.id)} className="text-destructive" title="Löschen">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Available Providers */}
            <Card>
              <CardHeader>
                <CardTitle>Verfügbare Provider</CardTitle>
                <CardDescription>Unterstützte LLM-Provider im System</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {providers.map(p => (
                    <div key={p.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold">{p.display_name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{p.name}</p>
                      <a href={p.docs_url ?? p.base_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline">
                        <ExternalLink className="h-3 w-3" />Dokumentation
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Ads Tab ── */}
          <TabsContent value="ads" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />Meta Ads Status</CardTitle>
                <CardDescription>Status der Meta Ads API Integration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    { label: "Status", value: <Badge variant={metaAdsStatus?.status === "configured" ? "default" : "destructive"}>{metaAdsStatus?.status === "configured" ? "Konfiguriert" : "Nicht konfiguriert"}</Badge> },
                    { label: "Modus", value: metaAdsStatus?.mode === "real" ? "Live" : "Mock" },
                    { label: "Account ID", value: metaAdsStatus?.account_id ?? "Nicht gesetzt" },
                    { label: "Access Token", value: metaAdsStatus?.has_access_token ? "Vorhanden" : "Fehlt" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-lg font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" />Meta Ads Sync</CardTitle>
                <CardDescription>Manuellen Sync von Meta Ads Daten starten</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { type: "campaigns", label: "Kampagnen" },
                    { type: "adsets",    label: "AdSets" },
                    { type: "ads",       label: "Ads" },
                    { type: "insights",  label: "Insights" },
                    { type: "all",       label: "Vollständig" },
                  ].map(({ type, label }) => (
                    <Button key={type} onClick={() => handleSync(type)} disabled={isSyncing}>
                      <RefreshCw className="h-4 w-4 mr-2" />{label} syncen
                    </Button>
                  ))}
                </div>
                {syncError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{syncError}</AlertDescription>
                  </Alert>
                )}
                {syncSuccess && (
                  <Alert className="bg-green-50 border-green-200">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{syncSuccess}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── System Tab ── */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />System Informationen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: "Frontend Version", value: "1.0.0" },
                    { label: "Backend API",       value: "/api/v1" },
                    { label: "Database",          value: "MongoDB" },
                    { label: "AI Layer",          value: "Multi-LLM Gateway" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-lg font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Kostenübersicht</CardTitle>
                <CardDescription>Kosten pro 1k Tokens nach Konfiguration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {configs.map(cfg => (
                    <div key={cfg.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{cfg.name}</p>
                        <p className="text-sm text-muted-foreground">{cfg.model_name}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>${cfg.cost_per_1k_input_tokens.toFixed(4)} / ${cfg.cost_per_1k_output_tokens.toFixed(4)}</p>
                        <p className="text-xs text-muted-foreground">In / Out pro 1k</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ── Shared form component ─────────────────────────────────────────────────────

function ConfigForm({
  form, set, providers, models, isEdit,
}: {
  form: FormData;
  set: (patch: Partial<FormData>) => void;
  providers: LLMProvider[];
  models: string[];
  isEdit: boolean;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label>Name</Label>
        <Input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="z.B. OpenAI Production" />
      </div>

      {!isEdit && (
        <div className="grid gap-2">
          <Label>Provider</Label>
          <Select value={form.provider_id} onValueChange={v => set({ provider_id: v, model_name: "" })}>
            <SelectTrigger><SelectValue placeholder="Provider wählen" /></SelectTrigger>
            <SelectContent>
              {providers.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-2">
        <Label>Modell</Label>
        <Select value={form.model_name} onValueChange={v => set({ model_name: v })} disabled={!form.provider_id}>
          <SelectTrigger><SelectValue placeholder={form.provider_id ? "Modell wählen" : "Zuerst Provider wählen"} /></SelectTrigger>
          <SelectContent>
            {models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>{isEdit ? "Neuer API Key (optional)" : "API Key"}</Label>
        <Input type="password" value={form.api_key} onChange={e => set({ api_key: e.target.value })}
          placeholder={isEdit ? "Nur eingeben wenn ändern" : "sk-..."} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Max Tokens ({form.max_tokens})</Label>
          <Input type="number" value={form.max_tokens} min={256} max={128000} step={256}
            onChange={e => set({ max_tokens: parseInt(e.target.value) || 4096 })} />
        </div>
        <div className="grid gap-2">
          <Label>Temperature ({form.temperature})</Label>
          <Input type="number" value={form.temperature} min={0} max={2} step={0.1}
            onChange={e => set({ temperature: parseFloat(e.target.value) || 0.7 })} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Kosten pro 1k Tokens</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Input</Label>
            <Input type="number" step="0.0001" value={form.cost_per_1k_input_tokens}
              onChange={e => set({ cost_per_1k_input_tokens: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Output</Label>
            <Input type="number" step="0.0001" value={form.cost_per_1k_output_tokens}
              onChange={e => set({ cost_per_1k_output_tokens: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_default" checked={form.is_default}
          onChange={e => set({ is_default: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300" />
        <Label htmlFor="is_default">Als Standard verwenden</Label>
      </div>
    </div>
  );
}