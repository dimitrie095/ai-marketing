"use client";

import { useEffect, useState } from "react";
import * as yup from "yup";
import DOMPurify from 'dompurify';
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { withAuth } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Filter,
  CalendarIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Campaign } from "@/types/campaign";
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

// Validation schema for campaign forms
const campaignSchema = yup.object({
  name: yup.string()
    .required('Campaign name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  status: yup.string()
    .required('Status is required')
    .oneOf(['ACTIVE', 'PAUSED', 'ARCHIVED'], 'Invalid status'),
  objective: yup.string()
    .required('Objective is required')
    .oneOf(['CONVERSIONS', 'LEAD_GENERATION', 'TRAFFIC', 'AWARENESS', 'ENGAGEMENT'], 'Invalid objective'),
});

interface CampaignWithMetrics extends Campaign {
  total_spend: number;
  total_revenue: number;
  total_clicks: number;
  total_impressions: number;
  ad_sets_count: number;
  ctr: number;
  roas: number;
  version?: number;
}

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [datePreset, setDatePreset] = useState<string>("30");
  const { toast } = useToast();

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
  }, [statusFilter, dateRange]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const status = statusFilter !== "all" ? statusFilter : undefined;
      const startDate = format(dateRange.from, "yyyy-MM-dd");
      const endDate = format(dateRange.to, "yyyy-MM-dd");
      const response = await getCampaigns(status, startDate, endDate);

      if (response.status === "success" || response.status === "no_data") {
        const campaignsData = response.data || [];
        const enriched = campaignsData.map((c: any) => ({
          ...c,
          roas: c.total_spend > 0 ? c.total_revenue / c.total_spend : 0,
          ctr: c.ctr ?? (c.total_impressions > 0 ? (c.total_clicks / c.total_impressions) * 100 : 0),
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
      // 1. Validate input data
      await campaignSchema.validate(formData, { abortEarly: false });
      
      // 2. Sanitize input to prevent XSS
      const sanitizedData = {
        name: DOMPurify.sanitize(formData.name),
        status: formData.status,
        objective: formData.objective,
      };
      
      const response = await createCampaign(sanitizedData);
      
      // 3. Validate response
      if (!response || typeof response !== "object") {
        throw new Error("Ungültiges API-Response");
      }
      
      if (response.status === "success") {
        setIsCreateDialogOpen(false);
        setFormData({ id: "", name: "", status: "ACTIVE", objective: "CONVERSIONS" });
        setError(null);
        loadCampaigns();
        toast({
          title: "Kampagne erstellt",
          description: `Die Kampagne "${DOMPurify.sanitize(formData.name)}" wurde erfolgreich erstellt.`,
          variant: "success",
        });
      } else {
        throw new Error(response.message || "Erstellen fehlgeschlagen");
      }
    } catch (err) {
      const errorMessage =
        err instanceof yup.ValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setError(errorMessage);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCampaign) return;
    
    try {
      // 1. Validate input data
      await campaignSchema.validate(formData, { abortEarly: false });
      
      // 2. Sanitize input to prevent XSS
      const sanitizedData = {
        name: DOMPurify.sanitize(formData.name),
        status: formData.status,
        objective: formData.objective,
        version: selectedCampaign.version || 1, // Include version for optimistic locking
      };
      
      const response = await updateCampaign(selectedCampaign.id, sanitizedData);
      
      // 3. Validate response
      if (!response || typeof response !== "object") {
        throw new Error("Ungültiges API-Response");
      }
      
      if (response.status === "success") {
        setIsEditDialogOpen(false);
        setSelectedCampaign(null);
        setError(null);
        loadCampaigns();
        toast({
          title: "Kampagne aktualisiert",
          description: `Die Kampagne "${DOMPurify.sanitize(formData.name)}" wurde erfolgreich aktualisiert.`,
          variant: "success",
        });
      } else if (response.status === "conflict") {
        setError("Kampagne wurde inzwischen geändert. Bitte aktualisieren und erneut versuchen.");
        loadCampaigns(); // Refresh data
      } else {
        throw new Error(response.message || "Update fehlgeschlagen");
      }
    } catch (err) {
      const errorMessage =
        err instanceof yup.ValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setError(errorMessage);
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
        toast({
          title: "Kampagne gelöscht",
          description: `Die Kampagne "${selectedCampaign.name}" wurde erfolgreich gelöscht.`,
          variant: "destructive",
        });
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

  const applyPreset = (days: string) => {
    setDatePreset(days);
    setDateRange({ from: subDays(new Date(), Number(days)), to: new Date() });
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

  const OBJECTIVE_LABELS: Record<string, string> = {
    CONVERSIONS:     "Konversionen",
    LEAD_GENERATION: "Lead-Generierung",
    TRAFFIC:         "Traffic",
    AWARENESS:       "Bekanntheit",
    ENGAGEMENT:      "Interaktion",
  };

  const OBJECTIVE_COLORS: Record<string, string> = {
    CONVERSIONS:     "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    LEAD_GENERATION: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    TRAFFIC:         "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    AWARENESS:       "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    ENGAGEMENT:      "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  };

  const getObjectiveBadge = (objective?: string) => {
    if (!objective) return null;
    return (
      <Badge variant="secondary" className={OBJECTIVE_COLORS[objective] || "bg-gray-100 text-gray-800"}>
        {OBJECTIVE_LABELS[objective] || objective}
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
                      <SelectItem value="LEAD_GENERATION">Lead-Generierung</SelectItem>
                      <SelectItem value="TRAFFIC">Traffic</SelectItem>
                      <SelectItem value="AWARENESS">Bekanntheit</SelectItem>
                      <SelectItem value="ENGAGEMENT">Interaktion</SelectItem>
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
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Kampagnen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
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

          {/* Date preset buttons */}
          <div className="flex items-center gap-1">
            {[
              { label: "7T", value: "7" },
              { label: "14T", value: "14" },
              { label: "30T", value: "30" },
              { label: "90T", value: "90" },
            ].map((p) => (
              <Button
                key={p.value}
                variant={datePreset === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Custom date range picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(dateRange.from, "dd.MM.yy", { locale: de })} –{" "}
                {format(dateRange.to, "dd.MM.yy", { locale: de })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDatePreset("");
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                locale={de}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
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
                      €{campaign.total_spend.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Umsatz
                    </p>
                    <p className="text-lg font-semibold">
                      €{campaign.total_revenue.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">ROAS</p>
                    <p className={`text-lg font-semibold ${
                      campaign.roas >= 2 ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {campaign.roas.toFixed(2)}x
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Profit</p>
                    {(() => {
                      const profit = campaign.total_revenue - campaign.total_spend;
                      return (
                        <p className={`text-lg font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          €{profit.toFixed(2)}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>AdSets: {campaign.ad_sets_count}</span>
                  <span>CTR: {campaign.ctr.toFixed(2)}% · {campaign.total_clicks.toLocaleString("de-DE")} Klicks</span>
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

export default withAuth(CampaignsPage);
