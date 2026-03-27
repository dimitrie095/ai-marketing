"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings,
  Key,
  Bot,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Server,
  CreditCard,
  Thermometer,
  TestTube,
  ExternalLink,
  Power,
  Star,
  Megaphone,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  getLLMProviders,
  getLLMConfigs,
  createLLMConfig,
  updateLLMConfig,
  deleteLLMConfig,
  setDefaultLLMConfig,
  testLLMConfig,
  getLLMGatewayStatus,
  getMetaAdsStatus,
  syncMetaAdsCampaigns,
  syncMetaAdsAdSets,
  syncMetaAdsAds,
  syncMetaAdsInsights,
  syncMetaAdsAll,
} from "@/lib/api";
import { cn } from "@/lib/utils";

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

const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
  kimi: ["kimi-latest", "kimi-pro"],
};

export default function SettingsPage() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [metaAdsStatus, setMetaAdsStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [testingConfig, setTestingConfig] = useState<number | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    provider_id: "",
    model_name: "",
    api_key: "",
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 1.0,
    is_default: false,
    cost_per_1k_input_tokens: 0,
    cost_per_1k_output_tokens: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [providersRes, configsRes, statusRes, metaAdsStatusRes] = await Promise.all([
        getLLMProviders(),
        getLLMConfigs(),
        getLLMGatewayStatus().catch(() => null),
        getMetaAdsStatus().catch(() => null),
      ]);
      
      if (providersRes) setProviders(providersRes);
      if (configsRes?.configs) setConfigs(configsRes.configs);
      if (statusRes) setGatewayStatus(statusRes);
      if (metaAdsStatusRes) setMetaAdsStatus(metaAdsStatusRes);
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError("Fehler beim Laden der Einstellungen");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (type: string) => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      setSyncSuccess(null);
      let response;
      switch (type) {
        case 'campaigns':
          response = await syncMetaAdsCampaigns();
          break;
        case 'adsets':
          response = await syncMetaAdsAdSets();
          break;
        case 'ads':
          response = await syncMetaAdsAds();
          break;
        case 'insights':
          // For simplicity, we don't pass parameters; backend may use defaults
          response = await syncMetaAdsInsights('campaign', [], new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0]);
          break;
        case 'all':
          response = await syncMetaAdsAll();
          break;
        default:
          throw new Error('Unbekannter Sync-Typ');
      }
      if (response.status === 'started' || response.status === 'success') {
        setSyncSuccess(`Sync (${type}) erfolgreich gestartet.`);
      } else {
        setSyncError(`Sync fehlgeschlagen: ${response.message || 'Unbekannter Fehler'}`);
      }
    } catch (err) {
      console.error('Sync error:', err);
      setSyncError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsSyncing(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleAddConfig = async () => {
    try {
      setError(null);
      const response = await createLLMConfig({
        ...formData,
        provider_id: parseInt(formData.provider_id),
      });
      
      if (response.status === "success") {
        showSuccess("Konfiguration erfolgreich erstellt");
        setIsAddDialogOpen(false);
        resetForm();
        loadData();
      } else {
        setError(response.detail || "Fehler beim Erstellen");
      }
    } catch (err) {
      console.error("Failed to create config:", err);
      setError("Fehler beim Erstellen der Konfiguration");
    }
  };

  const handleUpdateConfig = async () => {
    if (!editingConfig) return;
    
    try {
      setError(null);
      const updateData: any = {
        name: formData.name,
        model_name: formData.model_name,
        max_tokens: formData.max_tokens,
        temperature: formData.temperature,
        top_p: formData.top_p,
        is_default: formData.is_default,
        cost_per_1k_input_tokens: formData.cost_per_1k_input_tokens,
        cost_per_1k_output_tokens: formData.cost_per_1k_output_tokens,
      };
      
      if (formData.api_key) {
        updateData.api_key = formData.api_key;
      }
      
      const response = await updateLLMConfig(editingConfig.id, updateData);
      
      if (response.status === "success") {
        showSuccess("Konfiguration erfolgreich aktualisiert");
        setIsEditDialogOpen(false);
        setEditingConfig(null);
        resetForm();
        loadData();
      } else {
        setError(response.detail || "Fehler beim Aktualisieren");
      }
    } catch (err) {
      console.error("Failed to update config:", err);
      setError("Fehler beim Aktualisieren der Konfiguration");
    }
  };

  const handleDeleteConfig = async (configId: number) => {
    if (!confirm("Möchten Sie diese Konfiguration wirklich löschen?")) return;
    
    try {
      await deleteLLMConfig(configId);
      showSuccess("Konfiguration gelöscht");
      loadData();
    } catch (err) {
      console.error("Failed to delete config:", err);
      setError("Fehler beim Löschen");
    }
  };

  const handleSetDefault = async (configId: number) => {
    try {
      await setDefaultLLMConfig(configId);
      showSuccess("Als Standard gesetzt");
      loadData();
    } catch (err) {
      console.error("Failed to set default:", err);
      setError("Fehler beim Setzen als Standard");
    }
  };

  const handleTestConfig = async (configId: number) => {
    try {
      setTestingConfig(configId);
      const response = await testLLMConfig(configId);
      
      if (response.status === "success") {
        alert(`Test erfolgreich!\nAntwort: ${response.response?.slice(0, 100)}...\nLatency: ${response.latency_ms}ms`);
      } else {
        alert(`Test fehlgeschlagen: ${response.detail}`);
      }
    } catch (err) {
      console.error("Failed to test config:", err);
      alert("Test fehlgeschlagen");
    } finally {
      setTestingConfig(null);
    }
  };

  const openEditDialog = (config: LLMConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      provider_id: config.provider_id.toString(),
      model_name: config.model_name,
      api_key: "",
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      is_default: config.is_default,
      cost_per_1k_input_tokens: config.cost_per_1k_input_tokens,
      cost_per_1k_output_tokens: config.cost_per_1k_output_tokens,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      provider_id: "",
      model_name: "",
      api_key: "",
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 1.0,
      is_default: false,
      cost_per_1k_input_tokens: 0,
      cost_per_1k_output_tokens: 0,
    });
  };

  const getProviderName = (providerId: number) => {
    return providers.find((p) => p.id === providerId)?.display_name || "Unknown";
  };

  const getAvailableModels = () => {
    const provider = providers.find((p) => p.id === parseInt(formData.provider_id));
    if (!provider) return [];
    return DEFAULT_MODELS[provider.name] || [];
  };

  if (loading) {
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
          <p className="text-muted-foreground">
            Konfiguration des Systems und der LLM-Integration
          </p>
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
            <TabsTrigger value="llm" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              LLM Konfiguration
            </TabsTrigger>
            <TabsTrigger value="ads" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Ads Provider
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              System Status
            </TabsTrigger>
          </TabsList>

          {/* LLM Configuration Tab */}
          <TabsContent value="llm" className="space-y-6">
            {/* Gateway Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-5 w-5" />
                  LLM Gateway Status
                </CardTitle>
                <CardDescription>
                  Aktueller Status des LLM Gateways
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={gatewayStatus?.initialized ? "default" : "destructive"}>
                      {gatewayStatus?.initialized ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p className="text-2xl font-bold">{gatewayStatus?.providers || 0}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Gesamte Anfragen</p>
                    <p className="text-2xl font-bold">{gatewayStatus?.total_requests || 0}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Erfolgsrate</p>
                    <p className="text-2xl font-bold">
                      {gatewayStatus?.success_rate ? `${(gatewayStatus.success_rate * 100).toFixed(1)}%` : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurations List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    LLM Konfigurationen
                  </CardTitle>
                  <CardDescription>
                    Verwalten Sie Ihre LLM-Provider und API-Keys
                  </CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Neue LLM Konfiguration</DialogTitle>
                      <DialogDescription>
                        Fügen Sie einen neuen LLM-Provider mit API-Key hinzu
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="z.B. OpenAI Production"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="provider">Provider</Label>
                        <Select
                          value={formData.provider_id}
                          onValueChange={(value) => setFormData({ ...formData, provider_id: value, model_name: "" })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Provider wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {providers.map((provider) => (
                              <SelectItem key={provider.id} value={provider.id.toString()}>
                                {provider.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="model">Modell</Label>
                        <Select
                          value={formData.model_name}
                          onValueChange={(value) => setFormData({ ...formData, model_name: value })}
                          disabled={!formData.provider_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={formData.provider_id ? "Modell wählen" : "Zuerst Provider wählen"} />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableModels().map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="api_key">API Key</Label>
                        <Input
                          id="api_key"
                          type="password"
                          value={formData.api_key}
                          onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                          placeholder="sk-..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="max_tokens">Max Tokens ({formData.max_tokens})</Label>
                        <Input
                          id="max_tokens"
                          type="number"
                          value={formData.max_tokens}
                          onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 4096 })}
                          min={256}
                          max={8192}
                          step={256}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="temperature">Temperature ({formData.temperature})</Label>
                        <Input
                          id="temperature"
                          type="number"
                          value={formData.temperature}
                          onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0.7 })}
                          min={0}
                          max={2}
                          step={0.1}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Kosten pro 1k Tokens</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Input</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={formData.cost_per_1k_input_tokens}
                              onChange={(e) => setFormData({ ...formData, cost_per_1k_input_tokens: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Output</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={formData.cost_per_1k_output_tokens}
                              onChange={(e) => setFormData({ ...formData, cost_per_1k_output_tokens: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_default"
                          checked={formData.is_default}
                          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="is_default">Als Standard verwenden</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                        Abbrechen
                      </Button>
                      <Button onClick={handleAddConfig} disabled={!formData.name || !formData.provider_id || !formData.model_name || !formData.api_key}>
                        Speichern
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>LLM Konfiguration bearbeiten</DialogTitle>
                      <DialogDescription>
                        Aktualisieren Sie die Konfiguration
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit_name">Name</Label>
                        <Input
                          id="edit_name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit_model">Modell</Label>
                        <Select
                          value={formData.model_name}
                          onValueChange={(value) => setFormData({ ...formData, model_name: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableModels().map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit_api_key">Neuer API Key (optional)</Label>
                        <Input
                          id="edit_api_key"
                          type="password"
                          value={formData.api_key}
                          onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                          placeholder="Nur eingeben wenn ändern"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit_max_tokens">Max Tokens ({formData.max_tokens})</Label>
                        <Input
                          id="edit_max_tokens"
                          type="number"
                          value={formData.max_tokens}
                          onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 4096 })}
                          min={256}
                          max={8192}
                          step={256}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit_temperature">Temperature ({formData.temperature})</Label>
                        <Input
                          id="edit_temperature"
                          type="number"
                          value={formData.temperature}
                          onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0.7 })}
                          min={0}
                          max={2}
                          step={0.1}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit_is_default"
                          checked={formData.is_default}
                          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="edit_is_default">Als Standard verwenden</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingConfig(null); }}>
                        Abbrechen
                      </Button>
                      <Button onClick={handleUpdateConfig}>
                        Aktualisieren
                      </Button>
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
                      {configs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {config.name}
                              {config.is_default && (
                                <Badge variant="default" className="bg-yellow-500">
                                  <Star className="h-3 w-3 mr-1" />
                                  Standard
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getProviderName(config.provider_id)}</TableCell>
                          <TableCell>{config.model_name}</TableCell>
                          <TableCell>
                            <Badge variant={config.is_active ? "default" : "secondary"}>
                              {config.is_active ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <div>In: ${config.cost_per_1k_input_tokens.toFixed(4)}</div>
                              <div>Out: ${config.cost_per_1k_output_tokens.toFixed(4)}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!config.is_default && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSetDefault(config.id)}
                                  title="Als Standard setzen"
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleTestConfig(config.id)}
                                disabled={testingConfig === config.id}
                                title="Testen"
                              >
                                {testingConfig === config.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <TestTube className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(config)}
                                title="Bearbeiten"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteConfig(config.id)}
                                className="text-destructive hover:text-destructive"
                                title="Löschen"
                              >
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

            {/* Available Providers Info */}
            <Card>
              <CardHeader>
                <CardTitle>Verfügbare Provider</CardTitle>
                <CardDescription>
                  Unterstützte LLM-Provider im System
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {providers.map((provider) => (
                    <div key={provider.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold">{provider.display_name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{provider.name}</p>
                      <a
                        href={provider.docs_url || provider.base_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Dokumentation
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ads Provider Tab */}
          <TabsContent value="ads" className="space-y-6">
            {/* Meta Ads Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Meta Ads Status
                </CardTitle>
                <CardDescription>
                  Status der Meta Ads API Integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={metaAdsStatus?.status === 'configured' ? 'default' : 'destructive'}>
                      {metaAdsStatus?.status === 'configured' ? 'Konfiguriert' : 'Nicht konfiguriert'}
                    </Badge>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Modus</p>
                    <p className="text-2xl font-bold">{metaAdsStatus?.mode === 'real' ? 'Live' : 'Mock'}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Account ID</p>
                    <p className="text-lg font-mono">{metaAdsStatus?.account_id || 'Nicht gesetzt'}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Access Token</p>
                    <p className="text-lg font-mono">{metaAdsStatus?.has_access_token ? 'Vorhanden' : 'Fehlt'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sync Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Meta Ads Sync
                </CardTitle>
                <CardDescription>
                  Manuellen Sync von Meta Ads Daten starten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Button onClick={() => handleSync('campaigns')} disabled={isSyncing}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Kampagnen syncen
                  </Button>
                  <Button onClick={() => handleSync('adsets')} disabled={isSyncing}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    AdSets syncen
                  </Button>
                  <Button onClick={() => handleSync('ads')} disabled={isSyncing}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ads syncen
                  </Button>
                  <Button onClick={() => handleSync('insights')} disabled={isSyncing}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Insights syncen
                  </Button>
                  <Button onClick={() => handleSync('all')} disabled={isSyncing} variant="default">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Vollständiger Sync
                  </Button>
                </div>
                {syncError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{syncError}</AlertDescription>
                  </Alert>
                )}
                {syncSuccess && (
                  <Alert className="mt-4 bg-green-50 border-green-200">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{syncSuccess}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Status Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Informationen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Frontend Version</p>
                    <p className="text-lg font-semibold">1.0.0</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Backend API</p>
                    <p className="text-lg font-semibold">/api/v1</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Database</p>
                    <p className="text-lg font-semibold">MongoDB</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">AI Layer</p>
                    <p className="text-lg font-semibold">Multi-LLM Gateway</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Kostenübersicht
                </CardTitle>
                <CardDescription>
                  Geschätzte Kosten basierend auf Token-Nutzung
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {configs.map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{config.name}</p>
                        <p className="text-sm text-muted-foreground">{config.model_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">${config.cost_per_1k_input_tokens.toFixed(4)} / ${config.cost_per_1k_output_tokens.toFixed(4)}</p>
                        <p className="text-xs text-muted-foreground">pro 1k Tokens</p>
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
