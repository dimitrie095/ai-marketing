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
import { AlertDialog } from "@/components/ui/alert-dialog";
import { useAlertDialog } from "@/hooks/use-alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Key, Bot, Plus, Trash2, Edit, Check, AlertCircle, RefreshCw,
  Server, CreditCard, TestTube, ExternalLink, Power, PowerOff, Star, Megaphone,
} from "lucide-react";
import {
  getLLMProviders, getLLMConfigs, createLLMConfig, updateLLMConfig,
  deleteLLMConfig, activateLLMConfig, deactivateLLMConfig, setDefaultLLMConfig,
  testLLMConfig, getLLMGatewayStatus, initializeLLMDefaultProviders,
  getMetaAdsStatus, syncMetaAdsCampaigns, syncMetaAdsAdSets, syncMetaAdsAds,
  syncMetaAdsInsights, syncMetaAdsAll,
  getAdsConfigs, createAdsConfig, updateAdsConfig, deleteAdsConfig, activateAdsConfig, deactivateAdsConfig, getAdsConfigsByPlatform, getActiveAdsConfigsStatus, getGoogleAdsStatus,
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

interface AdPlatformConfig {
  id: string;
  platform: string; // "google_ads", "meta_ads"
  name: string;
  is_active: boolean;
  google_client_id?: string;
  google_client_secret?: string;
  google_refresh_token?: string;
  google_developer_token?: string;
  google_login_customer_id?: string;
  meta_access_token?: string;
  meta_app_id?: string;
  meta_ad_account_id?: string;
  created_at: string;
  updated_at?: string;
}

interface AdsFormData {
  platform: string;
  name: string;
  is_active: boolean;
  google_client_id?: string;
  google_client_secret?: string;
  google_refresh_token?: string;
  google_developer_token?: string;
  google_login_customer_id?: string;
  meta_access_token?: string;
  meta_app_id?: string;
  meta_ad_account_id?: string;
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

const EMPTY_ADS_FORM: AdsFormData = {
  platform: "",
  name: "",
  is_active: false,
  google_client_id: "",
  google_client_secret: "",
  google_refresh_token: "",
  google_developer_token: "",
  google_login_customer_id: "",
  meta_access_token: "",
  meta_app_id: "",
  meta_ad_account_id: "",
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
  const [googleAdsStatus, setGoogleAdsStatus] = useState<any>(null);
  const [adsConfigs, setAdsConfigs] = useState<AdPlatformConfig[]>([]);
  const [editingAdsConfig, setEditingAdsConfig] = useState<AdPlatformConfig | null>(null);
  const [isAdsDialogOpen, setIsAdsDialogOpen] = useState(false);
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
  const { alertDialogProps, showAlert, showConfirm } = useAlertDialog();

  // form
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const set = (patch: Partial<FormData>) => setForm(prev => ({ ...prev, ...patch }));

  // ads form
  const [adsForm, setAdsForm] = useState<AdsFormData>(EMPTY_ADS_FORM);
  const setAds = (patch: Partial<AdsFormData>) => setAdsForm(prev => ({ ...prev, ...patch }));

  // ── Data loading ─────────────────────────────────────────────────────────────

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, cRes, gRes, mRes, aRes, googleRes] = await Promise.all([
        getLLMProviders().catch(() => null),
        getLLMConfigs().catch(() => null),
        getLLMGatewayStatus().catch(() => null),
        getMetaAdsStatus().catch(() => null),
        getAdsConfigs().catch(() => null),
        getGoogleAdsStatus().catch(() => null),
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
      if (aRes?.data)    setAdsConfigs(aRes.data);
      if (googleRes)     setGoogleAdsStatus(googleRes);
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
    const confirmed = await showConfirm({
      title: "Konfiguration löschen",
      description: "Konfiguration wirklich löschen?",
      variant: "warning",
      confirmText: "Löschen",
      cancelText: "Abbrechen",
    });
    if (!confirmed) return;
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
        showAlert({
          title: "Test erfolgreich",
          description: `Antwort: ${res.response?.slice(0, 100)}...\nLatency: ${res.latency_ms}ms`,
          variant: "success",
        });
      } else {
        showAlert({
          title: "Test fehlgeschlagen",
          description: res.detail || "Unbekannter Fehler",
          variant: "error",
        });
      }
    } catch (err: any) {
      showAlert({
        title: "Test fehlgeschlagen",
        description: extractError(err, "Unbekannter Fehler"),
        variant: "error",
      });
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

  // ── Ads Config handlers ───────────────────────────────────────────────────────

  const handleAddAdsConfig = async () => {
    try {
      setError(null);
      const res = await createAdsConfig(adsForm);
      if (res.status === "success") {
        showSuccess("Ads Konfiguration erfolgreich erstellt");
        setIsAdsDialogOpen(false);
        setAdsForm(EMPTY_ADS_FORM);
        loadData();
      } else {
        setError("Fehler beim Erstellen der Ads Konfiguration");
      }
    } catch (err: any) {
      setError(extractError(err, "Fehler beim Erstellen der Ads Konfiguration"));
    }
  };

  const handleUpdateAdsConfig = async () => {
    if (!editingAdsConfig) return;
    try {
      setError(null);
      const res = await updateAdsConfig(editingAdsConfig.id, adsForm);
      if (res.status === "success") {
        showSuccess("Ads Konfiguration erfolgreich aktualisiert");
        setIsAdsDialogOpen(false);
        setEditingAdsConfig(null);
        setAdsForm(EMPTY_ADS_FORM);
        loadData();
      } else {
        setError("Fehler beim Aktualisieren der Ads Konfiguration");
      }
    } catch (err: any) {
      setError(extractError(err, "Fehler beim Aktualisieren der Ads Konfiguration"));
    }
  };

  const handleDeleteAdsConfig = async (id: string) => {
    const confirmed = await showConfirm({
      title: "Ads Konfiguration löschen",
      description: "Ads Konfiguration wirklich löschen?",
      variant: "warning",
      confirmText: "Löschen",
      cancelText: "Abbrechen",
    });
    if (!confirmed) return;
    try {
      await deleteAdsConfig(id);
      showSuccess("Ads Konfiguration gelöscht");
      loadData();
    } catch (err: any) {
      setError(extractError(err, "Fehler beim Löschen"));
    }
  };

  const handleToggleAdsActive = async (cfg: AdPlatformConfig) => {
    try {
      const res = cfg.is_active
        ? await deactivateAdsConfig(cfg.id)
        : await activateAdsConfig(cfg.id);
      if (res.status === "success") {
        showSuccess(cfg.is_active ? "Konfiguration deaktiviert" : "Konfiguration aktiviert");
        loadData();
      }
    } catch (err: any) {
      setError(extractError(err, "Fehler beim Ändern des Status"));
    }
  };

  const openAdsEditDialog = (cfg: AdPlatformConfig) => {
    setEditingAdsConfig(cfg);
    setAdsForm({
      platform: cfg.platform,
      name: cfg.name,
      is_active: cfg.is_active,
      google_client_id: cfg.google_client_id || "",
      google_client_secret: cfg.google_client_secret || "",
      google_refresh_token: cfg.google_refresh_token || "",
      google_developer_token: cfg.google_developer_token || "",
      google_login_customer_id: cfg.google_login_customer_id || "",
      meta_access_token: cfg.meta_access_token || "",
      meta_app_id: cfg.meta_app_id || "",
      meta_ad_account_id: cfg.meta_ad_account_id || "",
    });
    setIsAdsDialogOpen(true);
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
        <AlertDialog {...alertDialogProps} />
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
            {/* Google Ads Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />Google Ads Konfigurationen</CardTitle>
                <CardDescription>Verwalten Sie Ihre Google Ads API Verbindungen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <Button onClick={() => { setAdsForm({...EMPTY_ADS_FORM, platform: "google_ads"}); setIsAdsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Neue Konfiguration
                  </Button>
                </div>
                {adsConfigs.filter(c => c.platform === "google_ads").length === 0 ? (
                  <p className="text-muted-foreground">Keine Google Ads Konfigurationen vorhanden.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Client ID</TableHead>
                        <TableHead>Developer Token</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adsConfigs.filter(c => c.platform === "google_ads").map(cfg => (
                        <TableRow key={cfg.id}>
                          <TableCell className="font-medium">{cfg.name}</TableCell>
                          <TableCell className="font-mono text-xs">{cfg.google_client_id ? `${cfg.google_client_id.substring(0, 8)}...` : "Nicht gesetzt"}</TableCell>
                          <TableCell className="font-mono text-xs">{cfg.google_developer_token ? `${cfg.google_developer_token.substring(0, 8)}...` : "Nicht gesetzt"}</TableCell>
                          <TableCell>
                            <Badge variant={cfg.is_active ? "default" : "secondary"}>
                              {cfg.is_active ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleToggleAdsActive(cfg)} title={cfg.is_active ? "Deaktivieren" : "Aktivieren"}>
                                {cfg.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openAdsEditDialog(cfg)} title="Bearbeiten">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteAdsConfig(cfg.id)} className="text-destructive" title="Löschen">
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

            {/* Meta Ads Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />Meta Ads Konfigurationen</CardTitle>
                <CardDescription>Verwalten Sie Ihre Meta Ads API Verbindungen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <Button onClick={() => { setAdsForm({...EMPTY_ADS_FORM, platform: "meta_ads"}); setIsAdsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Neue Konfiguration
                  </Button>
                </div>
                {adsConfigs.filter(c => c.platform === "meta_ads").length === 0 ? (
                  <p className="text-muted-foreground">Keine Meta Ads Konfigurationen vorhanden.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>App ID</TableHead>
                        <TableHead>Account ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adsConfigs.filter(c => c.platform === "meta_ads").map(cfg => (
                        <TableRow key={cfg.id}>
                          <TableCell className="font-medium">{cfg.name}</TableCell>
                          <TableCell className="font-mono text-xs">{cfg.meta_app_id || "Nicht gesetzt"}</TableCell>
                          <TableCell className="font-mono text-xs">{cfg.meta_ad_account_id || "Nicht gesetzt"}</TableCell>
                          <TableCell>
                            <Badge variant={cfg.is_active ? "default" : "secondary"}>
                              {cfg.is_active ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleToggleAdsActive(cfg)} title={cfg.is_active ? "Deaktivieren" : "Aktivieren"}>
                                {cfg.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openAdsEditDialog(cfg)} title="Bearbeiten">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteAdsConfig(cfg.id)} className="text-destructive" title="Löschen">
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

        {/* Ads Config Dialog */}
        <Dialog open={isAdsDialogOpen} onOpenChange={o => { setIsAdsDialogOpen(o); if (!o) { setEditingAdsConfig(null); setAdsForm(EMPTY_ADS_FORM); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAdsConfig ? 'Ads Konfiguration bearbeiten' : 'Neue Ads Konfiguration'}</DialogTitle>
              <DialogDescription>Konfigurieren Sie Ihre Google Ads oder Meta Ads API Verbindung</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Plattform</Label>
                  <Select
                    value={adsForm.platform}
                    onValueChange={(v) => setAds({ platform: v })}
                    disabled={!!editingAdsConfig}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Plattform auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_ads">Google Ads</SelectItem>
                      <SelectItem value="meta_ads">Meta Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={adsForm.name}
                    onChange={(e) => setAds({ name: e.target.value })}
                    placeholder="Meine Konfiguration"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={adsForm.is_active}
                      onChange={(e) => setAds({ is_active: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span>Aktiv</span>
                  </div>
                </Label>
              </div>

              {/* Google Ads Fields */}
              {adsForm.platform === 'google_ads' && (
                <div className="space-y-4 border p-4 rounded-lg">
                  <h4 className="font-medium">Google Ads Credentials</h4>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="google_client_id">Client ID</Label>
                      <Input
                        id="google_client_id"
                        value={adsForm.google_client_id || ''}
                        onChange={(e) => setAds({ google_client_id: e.target.value })}
                        placeholder="xxxxxxx.apps.googleusercontent.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="google_client_secret">Client Secret</Label>
                      <Input
                        id="google_client_secret"
                        type="password"
                        value={adsForm.google_client_secret || ''}
                        onChange={(e) => setAds({ google_client_secret: e.target.value })}
                        placeholder="GOCSPX-..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="google_refresh_token">Refresh Token</Label>
                      <Input
                        id="google_refresh_token"
                        type="password"
                        value={adsForm.google_refresh_token || ''}
                        onChange={(e) => setAds({ google_refresh_token: e.target.value })}
                        placeholder="1//..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="google_developer_token">Developer Token</Label>
                      <Input
                        id="google_developer_token"
                        type="password"
                        value={adsForm.google_developer_token || ''}
                        onChange={(e) => setAds({ google_developer_token: e.target.value })}
                        placeholder="ABCD..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="google_login_customer_id">Login Customer ID (optional)</Label>
                      <Input
                        id="google_login_customer_id"
                        value={adsForm.google_login_customer_id || ''}
                        onChange={(e) => setAds({ google_login_customer_id: e.target.value })}
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Meta Ads Fields */}
              {adsForm.platform === 'meta_ads' && (
                <div className="space-y-4 border p-4 rounded-lg">
                  <h4 className="font-medium">Meta Ads Credentials</h4>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="meta_access_token">Access Token</Label>
                      <Input
                        id="meta_access_token"
                        type="password"
                        value={adsForm.meta_access_token || ''}
                        onChange={(e) => setAds({ meta_access_token: e.target.value })}
                        placeholder="EAAG..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meta_app_id">App ID (optional)</Label>
                      <Input
                        id="meta_app_id"
                        value={adsForm.meta_app_id || ''}
                        onChange={(e) => setAds({ meta_app_id: e.target.value })}
                        placeholder="123456789012345"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meta_ad_account_id">Ad Account ID</Label>
                      <Input
                        id="meta_ad_account_id"
                        value={adsForm.meta_ad_account_id || ''}
                        onChange={(e) => setAds({ meta_ad_account_id: e.target.value })}
                        placeholder="act_123456789012345"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAdsDialogOpen(false); setEditingAdsConfig(null); setAdsForm(EMPTY_ADS_FORM); }}>Abbrechen</Button>
              <Button onClick={editingAdsConfig ? handleUpdateAdsConfig : handleAddAdsConfig} disabled={!adsForm.platform || !adsForm.name}>
                {editingAdsConfig ? 'Aktualisieren' : 'Speichern'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog {...alertDialogProps} />
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