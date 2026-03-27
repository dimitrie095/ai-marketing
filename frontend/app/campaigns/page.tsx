"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Eye,
  AlertCircle,
  Search,
  Filter
} from "lucide-react";
import { Campaign } from "@/types/campaign";
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

interface CampaignWithMetrics extends Campaign {
  total_spend: number;
  total_revenue: number;
  ad_sets_count: number;
  ctr?: number;
  roas?: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithMetrics | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    status: "ACTIVE",
    objective: "CONVERSIONS",
  });

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const status = statusFilter !== "all" ? statusFilter : undefined;
      const response = await getCampaigns(status);

      if (response.status === "success" || response.status === "no_data") {
        const campaignsData = response.data || [];
        // Enrich with calculated metrics
        const enriched = campaignsData.map((c: CampaignWithMetrics) => ({
          ...c,
          roas: c.total_spend > 0 ? c.total_revenue / c.total_spend : 0,
          ctr: Math.random() * 5 + 1, // Simulated CTR for demo
        }));
        setCampaigns(enriched);
      } else {
        setError("Fehler beim Laden der Kampagnen");
      }
    } catch (err) {
      console.error("Campaigns load error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      // Generate ID if not provided
      const campaignData = {
        ...formData,
        id: formData.id || `camp_${Date.now().toString(36)}`,
      };
      const response = await createCampaign(campaignData);
      if (response.status === "success") {
        setIsCreateDialogOpen(false);
        setFormData({ id: "", name: "", status: "ACTIVE", objective: "CONVERSIONS" });
        loadCampaigns();
      } else {
        setError("Fehler beim Erstellen der Kampagne");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleUpdate = async () => {
    if (!selectedCampaign) return;
    try {
      const response = await updateCampaign(selectedCampaign.id, {
        name: formData.name,
        status: formData.status,
        objective: formData.objective,
      });
      if (response.status === "success") {
        setIsEditDialogOpen(false);
        setSelectedCampaign(null);
        loadCampaigns();
      } else {
        setError("Fehler beim Aktualisieren der Kampagne");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDelete = async () => {
    if (!selectedCampaign) return;
    try {
      const response = await deleteCampaign(selectedCampaign.id);
      if (response.status === "success") {
        setIsDeleteDialogOpen(false);
        setSelectedCampaign(null);
        loadCampaigns();
      } else {
        setError("Fehler beim Löschen der Kampagne");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const openEditDialog = (campaign: CampaignWithMetrics) => {
    setSelectedCampaign(campaign);
    setFormData({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective || "CONVERSIONS",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (campaign: CampaignWithMetrics) => {
    setSelectedCampaign(campaign);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      ACTIVE: "bg-green-500 hover:bg-green-600",
      PAUSED: "bg-yellow-500 hover:bg-yellow-600",
      DELETED: "bg-red-500 hover:bg-red-600",
      ARCHIVED: "bg-gray-500 hover:bg-gray-600",
    };
    return (
      <Badge className={variants[status] || variants.ACTIVE}>
        {status}
      </Badge>
    );
  };

  const getObjectiveBadge = (objective?: string) => {
    const colors: Record<string, string> = {
      CONVERSIONS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      REACH: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      LINK_CLICKS: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    if (!objective) return null;
    return (
      <Badge variant="secondary" className={colors[objective] || "bg-gray-100 text-gray-800"}>
        {objective}
      </Badge>
    );
  };

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kampagnen</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Marketing-Kampagnen
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Neue Kampagne
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Neue Kampagne erstellen</DialogTitle>
                <DialogDescription>
                  Erstellen Sie eine neue Marketing-Kampagne
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Kampagnenname"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="id">Kampagnen-ID (optional)</Label>
                  <Input
                    id="id"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="Wird automatisch generiert wenn leer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wenn leer, wird eine ID automatisch generiert
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Aktiv</SelectItem>
                      <SelectItem value="PAUSED">Pausiert</SelectItem>
                      <SelectItem value="ARCHIVED">Archiviert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="objective">Ziel</Label>
                  <Select
                    value={formData.objective}
                    onValueChange={(value) => setFormData({ ...formData, objective: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ziel wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONVERSIONS">Konversionen</SelectItem>
                      <SelectItem value="REACH">Reichweite</SelectItem>
                      <SelectItem value="LINK_CLICKS">Link-Klicks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreate} disabled={!formData.name.trim()}>
                  Erstellen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Kampagnen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="ACTIVE">Aktiv</SelectItem>
                <SelectItem value="PAUSED">Pausiert</SelectItem>
                <SelectItem value="ARCHIVED">Archiviert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Campaigns Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">ID: {campaign.id}</p>
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(campaign)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(campaign)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {getStatusBadge(campaign.status)}
                  {getObjectiveBadge(campaign.objective)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Ausgaben
                    </p>
                    <p className="text-lg font-semibold">
                      €{campaign.total_spend?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Umsatz
                    </p>
                    <p className="text-lg font-semibold">
                      €{campaign.total_revenue?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">ROAS</p>
                    <p className={`text-lg font-semibold ${
                      (campaign.roas || 0) >= 2 ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {campaign.roas?.toFixed(2) || "0.00"}x
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">AdSets</p>
                    <p className="text-lg font-semibold">
                      {campaign.ad_sets_count || 0}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Erstellt: {new Date(campaign.created_at).toLocaleDateString("de-DE")}</span>
                  <span>CTR: {campaign.ctr?.toFixed(2) || "0.00"}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCampaigns.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Keine Kampagnen gefunden</p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Kampagne bearbeiten</DialogTitle>
              <DialogDescription>
                Bearbeiten Sie die Details der Kampagne
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktiv</SelectItem>
                    <SelectItem value="PAUSED">Pausiert</SelectItem>
                    <SelectItem value="ARCHIVED">Archiviert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-objective">Ziel</Label>
                <Select
                  value={formData.objective}
                  onValueChange={(value) => setFormData({ ...formData, objective: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ziel wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONVERSIONS">Konversionen</SelectItem>
                    <SelectItem value="REACH">Reichweite</SelectItem>
                    <SelectItem value="LINK_CLICKS">Link-Klicks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdate}>Speichern</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Kampagne löschen</DialogTitle>
              <DialogDescription>
                Sind Sie sicher, dass Sie die Kampagne &quot;{selectedCampaign?.name}&quot; löschen möchten?
                Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
