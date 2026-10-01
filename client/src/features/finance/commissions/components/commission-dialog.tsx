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
  MoneyField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { useAgentOptions, useBookingOptions, useInvoiceOptions } from "@/hooks/use-reference";
import { NONE_OPTION } from "../../../crm/shared/constants";
import { COMMISSION_TYPE_OPTIONS } from "../../shared/constants";

const formSchema = z.object({
  agentId: z.string().min(1, "Agent is required"),
  type: z.string().optional(),
  rate: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  baseAmount: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  bookingId: z.string().optional(),
  invoiceId: z.string().optional(),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function CommissionDialog({ open, onOpenChange, onSubmit, isSubmitting }: CommissionDialogProps) {
  const { data: agents } = useAgentOptions();
  const { data: bookings } = useBookingOptions();
  const { data: invoices } = useInvoiceOptions();

  const agentOptions = (agents ?? []).map((a) => ({
    value: a.id,
    label: a.company ? `${a.name} · ${a.company}` : a.name,
  }));
  const bookingOptions = [NONE_OPTION, ...(bookings ?? []).map((b) => ({ value: b.id, label: b.bookingNumber }))];
  const invoiceOptions = [NONE_OPTION, ...(invoices ?? []).map((i) => ({ value: i.id, label: i.invoiceNumber }))];

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { agentId: "", type: "PERCENTAGE", bookingId: "null", invoiceId: "null" },
  });

  useEffect(() => {
    if (open) {
      methods.reset({ agentId: "", type: "PERCENTAGE", rate: "", baseAmount: "", bookingId: "null", invoiceId: "null", notes: "" });
    }
  }, [open, methods]);

  const submit = methods.handleSubmit((values) => {
    const payload = cleanPayload(values);
    if (payload.rate !== undefined) payload.rate = Number(payload.rate);
    if (payload.baseAmount !== undefined) payload.baseAmount = Number(payload.baseAmount);
    onSubmit(payload);
  });

  const type = methods.watch("type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Commission</DialogTitle>
          <DialogDescription>
            Percentage applies the rate to the base amount. Without a base amount, the linked booking or
            invoice total is used.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField name="agentId" label="Agent" options={agentOptions} required />
              <SelectField name="type" label="Type" options={COMMISSION_TYPE_OPTIONS} />
              <TextField
                name="rate"
                label={type === "FLAT" ? "Flat amount" : "Rate (%)"}
                type="number"
                step="0.01"
              />
              <MoneyField name="baseAmount" label="Base amount (optional)" />
              <SelectField name="bookingId" label="Linked booking" options={bookingOptions} />
              <SelectField name="invoiceId" label="Linked invoice" options={invoiceOptions} />
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Create commission
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
