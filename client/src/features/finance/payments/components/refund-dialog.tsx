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
import { TextField } from "@/components/shared/form-fields";
import { formatCurrency } from "@/lib/utils";
import type { Payment } from "../types";

const formSchema = z.object({
  amount: z
    .union([z.coerce.number().min(0.01, "Amount must be positive"), z.literal("")])
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  onSubmit: (amount?: number) => void;
  isSubmitting: boolean;
}

export function RefundDialog({ open, onOpenChange, payment, onSubmit, isSubmitting }: RefundDialogProps) {
  const max = payment ? Number(payment.amount) - Number(payment.refundedAmount) : 0;

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: "" },
  });

  useEffect(() => {
    if (open) methods.reset({ amount: "" });
  }, [open, payment, methods]);

  const submit = methods.handleSubmit((values) => {
    const raw = (values as any).amount;
    const amount = raw === "" || raw === undefined || raw === null ? undefined : Number(raw);
    onSubmit(amount);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refund payment</DialogTitle>
          <DialogDescription>
            {payment?.paymentNumber} · {formatCurrency(Number(payment?.amount ?? 0), payment?.currencyCode ?? "USD")}{" "}
            collected. Refundable now: {formatCurrency(max, payment?.currencyCode ?? "USD")}. Leave the amount
            empty to refund the full remaining balance.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <TextField
              name="amount"
              label={`Refund amount (${payment?.currencyCode ?? "USD"})`}
              type="number"
              step="0.01"
              placeholder={max.toFixed(2)}
              description={`Cannot exceed ${max.toFixed(2)} or the invoice's paid amount.`}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="text-destructive border border-destructive/40">
                Record refund
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
