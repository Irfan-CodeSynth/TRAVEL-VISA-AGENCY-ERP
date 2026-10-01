import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUS_MAP } from "../../shared/constants";
import type { ApplicationStatus } from "../../shared/constants";
import { useTransitions } from "../hooks/use-applications";
import type { Application } from "../types";

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onConfirm: (status: ApplicationStatus, note?: string) => void;
  isSubmitting: boolean;
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  application,
  onConfirm,
  isSubmitting,
}: ChangeStatusDialogProps) {
  const { data: transitions } = useTransitions(open ? application?.id : null);
  const [selected, setSelected] = useState<ApplicationStatus | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(null);
      setNote("");
    }
  }, [open, application?.id]);

  const allowed = transitions?.allowed ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>Pick the next stage in the embassy workflow.</DialogDescription>
          {application && (
            <div className="pt-1">
              <StatusBadge value={application.status} map={APPLICATION_STATUS_MAP} />
            </div>
          )}
        </DialogHeader>

        {transitions && allowed.length === 0 && (
          <p className="text-sm text-muted-foreground">This application is in a final state — no transitions available.</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {allowed.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelected(s)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent",
                selected === s && "border-primary bg-primary/5 ring-1 ring-primary"
              )}
            >
              <StatusBadge value={s} map={APPLICATION_STATUS_MAP} />
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status-note">Note (optional)</Label>
          <Input
            id="status-note"
            placeholder="e.g. Docs couriered to embassy"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || isSubmitting}
            onClick={() => selected && onConfirm(selected, note || undefined)}
          >
            Move to {selected ? APPLICATION_STATUS_MAP[selected].label : "…"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
