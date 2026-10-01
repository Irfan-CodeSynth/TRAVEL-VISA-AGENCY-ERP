import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectField, TextAreaField, TextField } from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { BOOKING_ITEM_TYPE_OPTIONS } from "../../shared/constants";
import type { BookingItem } from "../types";

const formSchema = z.object({
  itemType: z.string().optional(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().int().min(1).max(9999),
  unitPrice: z.coerce.number().min(0),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BookingItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BookingItem | null;
  currencyCode: string;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function BookingItemDialog({
  open,
  onOpenChange,
  item,
  currencyCode,
  onSubmit,
  isSubmitting,
}: BookingItemDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { itemType: "SERVICE", description: "", quantity: 1, unitPrice: 0 },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      item
        ? {
            itemType: item.itemType,
            description: item.description,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            notes: item.notes ?? "",
          }
        : { itemType: "SERVICE", description: "", quantity: 1, unitPrice: 0, notes: "" }
    );
  }, [open, item, methods]);

  const submit = methods.handleSubmit((values) => {
    const payload = cleanPayload(values);
    onSubmit({ ...payload, currencyCode, unitPrice: Number(payload.unitPrice) || 0 });
  });

  const qty = methods.watch("quantity");
  const price = methods.watch("unitPrice");
  const preview = (Number(qty) || 0) * (Number(price) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>The line total is calculated by the server.</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <SelectField name="itemType" label="Item type" options={BOOKING_ITEM_TYPE_OPTIONS} />
            <TextField name="description" label="Description" required placeholder="e.g. KHI-DXB return flight" />
            <div className="grid grid-cols-3 gap-4">
              <TextField name="quantity" label="Qty" type="number" required />
              <TextField name="unitPrice" label={`Unit price (${currencyCode})`} type="number" step="0.01" required />
              <div className="space-y-1.5">
                <p className="text-sm font-medium leading-none">Line total</p>
                <p className="text-sm text-muted-foreground tabular-nums pt-1.5">
                  {preview.toFixed(2)}
                </p>
              </div>
            </div>
            <TextAreaField name="notes" label="Notes" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {item ? "Save item" : "Add item"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
