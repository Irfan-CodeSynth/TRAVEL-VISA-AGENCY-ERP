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
import {
  DateField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { PAYMENT_METHOD_OPTIONS } from "../../shared/constants";

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  method: z.string().optional(),
  status: z.string().optional(),
  paidAt: z.string().optional(),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface PaymentTargetInvoice {
  id: string;
  invoiceNumber: string;
  currencyCode: string;
  balanceDue: string;
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: PaymentTargetInvoice | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  onSubmit,
  isSubmitting,
}: RecordPaymentDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0, method: "CASH", status: "COMPLETED" },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset({
      amount: Number(invoice?.balanceDue ?? 0) || 0,
      method: "CASH",
      status: "COMPLETED",
      paidAt: "",
      reference: "",
      notes: "",
    });
  }, [open, invoice, methods]);

  const submit = methods.handleSubmit((values) => {
    const payload = cleanPayload(values);
    onSubmit({ ...payload, invoiceId: invoice?.id, amount: Number(payload.amount) });
  });

  const balance = Number(invoice?.balanceDue ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {invoice?.invoiceNumber} · balance due {balance.toFixed(2)} {invoice?.currencyCode}.
            Payments above the balance are rejected.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                name="amount"
                label={`Amount (${invoice?.currencyCode ?? "USD"})`}
                type="number"
                step="0.01"
                required
                description={balance > 0 ? `Max: ${balance.toFixed(2)}` : undefined}
              />
              <SelectField name="method" label="Method" options={PAYMENT_METHOD_OPTIONS} />
              <SelectField
                name="status"
                label="Status"
                options={[
                  { value: "COMPLETED", label: "Completed" },
                  { value: "PENDING", label: "Pending" },
                ]}
                description="Pending payments apply to the invoice only after confirmation."
              />
              <DateField name="paidAt" label="Paid at" />
              <TextField name="reference" label="Reference" placeholder="Bank slip, cheque no..." />
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
