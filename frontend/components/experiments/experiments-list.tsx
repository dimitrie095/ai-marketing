"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, TrendingUp, BarChart3, Target, MoreVertical,
  Play, Pause, CheckCircle, Trash2, FlaskConical, Calendar, Zap,
} from "lucide-react";
import { fetchFromAPI, getCampaignExperiments, deleteExperiment } from "@/lib/api";
import { CreateExperimentDialog } from "./create-experiment-dialog";
import { ExperimentDetails } from "./experiment-details";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Experiment {
  id: string;
  campaign_id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ExperimentsListProps {
  campaignId: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
  running: { label: "Läuft", variant: "default", icon: <Play className="h-3 w-3" /> },
  paused:  { label: "Pausiert", variant: "secondary", icon: <Pause className="h-3 w-3" /> },
  completed: { label: "Abgeschlossen", variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  creative: { label: "Creative",  icon: <BarChart3 className="h-4 w-4" /> },
  audience: { label: "Audience",  icon: <Target className="h-4 w-4" /> },
  budget:   { label: "Budget",    icon: <TrendingUp className="h-4 w-4" /> },
};

export function ExperimentsList({ campaignId }: ExperimentsListProps) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadExperiments(); }, [campaignId]);

  const loadExperiments = async () => {
    try {
      setLoading(true);
      const response = await getCampaignExperiments(campaignId);
      setExperiments(response.data || []);
    } catch (err: any) {
      if (err.statusCode !== 404) {
        toast({ title: "Fehler", description: "Experimente konnten nicht geladen werden.", variant: "destructive" });
      }
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      setUpdatingId(id);
      await fetchFromAPI(`/api/v1/experiments/${id}/status?status=${status}`, { method: "PATCH" });
      setExperiments((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
      const label = STATUS_CONFIG[status]?.label ?? status;
      toast({ title: "Status aktualisiert", description: `Experiment ist jetzt: ${label}` });
    } catch {
      toast({ title: "Fehler", description: "Status konnte nicht geändert werden.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Experiment "${name}" wirklich löschen?`)) return;
    try {
      setUpdatingId(id);
      await deleteExperiment(id);
      setExperiments((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Gelöscht", description: `"${name}" wurde gelöscht.` });
    } catch {
      toast({ title: "Fehler", description: "Löschen fehlgeschlagen.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const runExperiment = async (id: string, name: string) => {
    try {
      setRunningId(id);
      await fetchFromAPI(`/api/v1/experiments/${id}/run`, { method: "POST" });
      toast({ title: "Experiment ausgeführt", description: `"${name}" wurde simuliert. Ergebnisse sind jetzt verfügbar.`, variant: "success" });
      setExperiments((prev) => prev.map((e) => e.id === id ? { ...e, status: "running" } : e));
      setOpenDetailsId(id);
    } catch {
      toast({ title: "Fehler", description: "Experiment konnte nicht ausgeführt werden.", variant: "destructive" });
    } finally {
      setRunningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">A/B Tests & Experimente</h3>
          <p className="text-sm text-muted-foreground">
            {experiments.length} Experiment{experiments.length !== 1 ? "e" : ""} für diese Kampagne
          </p>
        </div>
        <CreateExperimentDialog campaignId={campaignId} onSuccess={loadExperiments} />
      </div>

      <Separator />

      {experiments.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <FlaskConical className="h-14 w-14 mx-auto text-muted-foreground/50" />
          <div>
            <h4 className="font-semibold text-lg">Noch keine Experimente</h4>
            <p className="text-muted-foreground text-sm mt-1">
              Starten Sie einen A/B Test, um die Performance zu optimieren.
            </p>
          </div>
          <CreateExperimentDialog
            campaignId={campaignId}
            onSuccess={loadExperiments}
            trigger={
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Erstes Experiment erstellen
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4">
          {experiments.map((exp) => {
            const status = STATUS_CONFIG[exp.status] ?? STATUS_CONFIG.paused;
            const type = TYPE_CONFIG[exp.type] ?? { label: exp.type, icon: <BarChart3 className="h-4 w-4" /> };
            const isUpdating = updatingId === exp.id;

            return (
              <Card key={exp.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-md bg-muted shrink-0">{type.icon}</div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{exp.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(exp.created_at), "dd. MMM yyyy", { locale: de })}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        {status.icon}
                        {status.label}
                      </Badge>
                      <Badge variant="outline">{type.label}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {exp.status !== "running" && (
                            <DropdownMenuItem onClick={() => updateStatus(exp.id, "running")}>
                              <Play className="h-4 w-4 mr-2 text-green-600" />
                              Starten / Fortsetzen
                            </DropdownMenuItem>
                          )}
                          {exp.status === "running" && (
                            <DropdownMenuItem onClick={() => updateStatus(exp.id, "paused")}>
                              <Pause className="h-4 w-4 mr-2 text-yellow-600" />
                              Pausieren
                            </DropdownMenuItem>
                          )}
                          {exp.status !== "completed" && (
                            <DropdownMenuItem onClick={() => updateStatus(exp.id, "completed")}>
                              <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                              Abschließen
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(exp.id, exp.name)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => runExperiment(exp.id, exp.name)}
                      disabled={runningId === exp.id || updatingId === exp.id}
                      className="gap-1.5"
                    >
                      {runningId === exp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      {runningId === exp.id ? "Läuft..." : "Lauf starten"}
                    </Button>
                    <ExperimentDetails
                      experimentId={exp.id}
                      experimentName={exp.name}
                      open={openDetailsId === exp.id}
                      onOpenChange={(v) => setOpenDetailsId(v ? exp.id : null)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
