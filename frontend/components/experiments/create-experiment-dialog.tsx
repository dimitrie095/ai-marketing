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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { createExperiment, APIError } from "@/lib/api";

interface CreateExperimentDialogProps {
  campaignId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function CreateExperimentDialog({
  campaignId,
  onSuccess,
  trigger,
}: CreateExperimentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    type: "creative",
    status: "running",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await createExperiment({
        campaign_id: campaignId,
        name: formData.name,
        type: formData.type,
        status: formData.status,
      });

      if (response.status === "success") {
        toast({
          title: "Experiment created",
          description: `Experiment "${formData.name}" has been created successfully.`,
          variant: "success",
        });
        setOpen(false);
        setFormData({ name: "", type: "creative", status: "running" });
        if (onSuccess) onSuccess();
      } else {
        throw new Error(response.message || "Failed to create experiment");
      }
    } catch (error) {
      console.error("Create experiment error:", error);
      let description = "Failed to create experiment";
      if (error instanceof APIError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          description = "Authentication required. Please log in.";
        } else if (error.statusCode === 404) {
          description = "API endpoint not found. Please check backend server.";
        } else {
          description = error.message || `Server error: ${error.statusCode}`;
        }
      } else if (error instanceof Error) {
        description = error.message;
      }
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neues Experiment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Experiment</DialogTitle>
            <DialogDescription>
              Create a new A/B test for this campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Experiment Name</Label>
              <Input
                id="name"
                placeholder="e.g., Creative Test Q1"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Test Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creative">Creative Test</SelectItem>
                  <SelectItem value="audience">Audience Test</SelectItem>
                  <SelectItem value="budget">Budget Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Experiment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}