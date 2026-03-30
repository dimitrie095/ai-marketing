"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronRight, ChevronLeft, FlaskConical } from "lucide-react";
import { fetchFromAPI } from "@/lib/api";

interface CreateExperimentDialogProps {
  campaignId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const TYPE_LABELS: Record<string, string> = {
  creative: "Creative Test (Anzeigenbilder / Texte)",
  audience: "Audience Test (Zielgruppen)",
  budget: "Budget Test (Budgetverteilung)",
};

export function CreateExperimentDialog({
  campaignId,
  onSuccess,
  trigger,
}: CreateExperimentDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    type: "creative",
    variantAName: "Variante A",
    variantADesc: "",
    variantBName: "Variante B",
    variantBDesc: "",
  });

  const reset = () => {
    setForm({ name: "", type: "creative", variantAName: "Variante A", variantADesc: "", variantBName: "Variante B", variantBDesc: "" });
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    try {
      setLoading(true);

      // 1. Create experiment
      const expRes = await fetchFromAPI("/api/v1/experiments", {
        method: "POST",
        body: JSON.stringify({ campaign_id: campaignId, name: form.name, type: form.type, status: "running" }),
      });
      if (expRes.status !== "success") throw new Error(expRes.message || "Fehler beim Erstellen");

      const experimentId: string = expRes.data?.id;

      if (!experimentId) throw new Error("Experiment-ID fehlt in der Antwort");

      // 2. Create variants (experiment_id comes from path, not body)
      await Promise.all([
        fetchFromAPI(`/api/v1/experiments/${experimentId}/variants`, {
          method: "POST",
          body: JSON.stringify({ name: form.variantAName, config: { description: form.variantADesc } }),
        }),
        fetchFromAPI(`/api/v1/experiments/${experimentId}/variants`, {
          method: "POST",
          body: JSON.stringify({ name: form.variantBName, config: { description: form.variantBDesc } }),
        }),
      ]);

      toast({ title: "Experiment erstellt", description: `"${form.name}" wurde erfolgreich gestartet.`, variant: "success" });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message || "Unbekannter Fehler", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neues Experiment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            {step === 1 ? "Experiment anlegen" : "Varianten konfigurieren"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Geben Sie dem Experiment einen Namen und wählen Sie den Testtyp."
              : "Definieren Sie die zwei Varianten (A und B) des Tests."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="exp-name">Name des Experiments</Label>
              <Input
                id="exp-name"
                placeholder="z.B. Creative Test Q2 2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Testtyp</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{TYPE_LABELS[form.type]}</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              {/* Variant A */}
              <div className="space-y-3 border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">A</Badge>
                  <span className="font-medium text-sm">Kontrollgruppe</span>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={form.variantAName}
                    onChange={(e) => setForm({ ...form, variantAName: e.target.value })}
                    placeholder="Variante A"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Beschreibung</Label>
                  <Textarea
                    value={form.variantADesc}
                    onChange={(e) => setForm({ ...form, variantADesc: e.target.value })}
                    placeholder="Was wird bei dieser Variante getestet?"
                    className="resize-none h-20 text-sm"
                  />
                </div>
              </div>
              {/* Variant B */}
              <div className="space-y-3 border rounded-lg p-3 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">B</Badge>
                  <span className="font-medium text-sm">Testvariante</span>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={form.variantBName}
                    onChange={(e) => setForm({ ...form, variantBName: e.target.value })}
                    placeholder="Variante B"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Beschreibung</Label>
                  <Textarea
                    value={form.variantBDesc}
                    onChange={(e) => setForm({ ...form, variantBDesc: e.target.value })}
                    placeholder="Was unterscheidet diese Variante?"
                    className="resize-none h-20 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>
          )}
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!form.name.trim()}>
              Weiter
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || !form.variantAName.trim() || !form.variantBName.trim()}>
              {loading ? "Wird erstellt..." : "Experiment starten"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
