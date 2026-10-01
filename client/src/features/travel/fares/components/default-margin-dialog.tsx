import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalMarginDefault, useSetGlobalMarginDefault } from "../hooks/use-fares";
import { MARGIN_TYPE_OPTIONS } from "../constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DefaultMarginDialog({ open, onOpenChange }: Props) {
  const { data: current } = useGlobalMarginDefault(open);
  const setDefault = useSetGlobalMarginDefault();
  const [type, setType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setType(current?.type ?? "PERCENT");
    setValue(current?.value != null ? String(current.value) : "");
  }, [open, current]);

  const save = () => {
    const num = Number(value);
    if (value === "" || !Number.isFinite(num)) return;
    setDefault.mutate({ type, value: num }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Global default margin</DialogTitle>
          <DialogDescription>
            Fallback margin used when a fare and its airline have no margin set. Applies to all branches.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Margin type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARGIN_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{type === "PERCENT" ? "Percent (%)" : "Flat amount"}</Label>
            <Input type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          {current && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDefault.mutate(null, { onSuccess: () => onOpenChange(false) })}
              disabled={setDefault.isPending}
            >
              Clear
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={setDefault.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
