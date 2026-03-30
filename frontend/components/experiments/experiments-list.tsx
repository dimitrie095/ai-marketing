"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, TrendingUp, BarChart3, Target } from "lucide-react";
import { getCampaignExperiments } from "@/lib/api";
import { CreateExperimentDialog } from "./create-experiment-dialog";
import { ExperimentDetails } from "./experiment-details";

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

export function ExperimentsList({ campaignId }: ExperimentsListProps) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadExperiments();
  }, [campaignId]);

  const loadExperiments = async () => {
    try {
      setLoading(true);
      const response = await getCampaignExperiments(campaignId);
      if (response.status === "success" || response.status === "no_data") {
        setExperiments(response.data || []);
      } else {
        throw new Error(response.message || "Failed to load experiments");
      }
      setError(null);
    } catch (err: any) {
      // Wenn es ein 404 ist, bedeutet das wahrscheinlich, dass keine Experimente existieren
      if (err.statusCode === 404) {
        setExperiments([]);
        setError(null);
        // Log as debug info, not error
        console.debug("No experiments found (404), returning empty list");
      } else {
        console.error("Failed to load experiments:", err);
        setError("Failed to load experiments");
        toast({
          title: "Error",
          description: "Could not load experiments",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge variant="default">Running</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "paused":
        return <Badge variant="outline">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "creative":
        return <BarChart3 className="h-4 w-4" />;
      case "audience":
        return <Target className="h-4 w-4" />;
      case "budget":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500">{error}</p>
          <Button variant="outline" onClick={loadExperiments} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">A/B Tests & Experimente</h3>
          <p className="text-sm text-muted-foreground">
            Erstellen und verwalten Sie Experimente zur Optimierung Ihrer Kampagne
          </p>
        </div>
        <CreateExperimentDialog
          campaignId={campaignId}
          onSuccess={loadExperiments}
        />
      </div>

      <Separator />

      {experiments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-medium text-lg">Noch keine Experimente</h4>
              <p className="text-muted-foreground mt-2">
                Erstellen Sie Ihr erstes A/B Test, um die Performance Ihrer Kampagne zu optimieren.
              </p>
              <CreateExperimentDialog
                campaignId={campaignId}
                onSuccess={loadExperiments}
                trigger={
                  <Button className="mt-6">
                    <Plus className="h-4 w-4 mr-2" />
                    Experiment erstellen
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {experiments.map((experiment) => (
            <Card key={experiment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(experiment.type)}
                    <CardTitle className="text-base">{experiment.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(experiment.status)}
                    <Badge variant="outline">{experiment.type}</Badge>
                  </div>
                </div>
                <CardDescription>
                  Created {new Date(experiment.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Experiment ID: {experiment.id}
                </p>
                <div className="flex justify-end mt-4">
                  <ExperimentDetails experimentId={experiment.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}