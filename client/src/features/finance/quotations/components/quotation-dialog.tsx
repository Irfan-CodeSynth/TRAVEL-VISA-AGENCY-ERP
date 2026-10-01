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
  MoneyField,
  SelectField,
  TextAreaField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { useBookingOptions, useCustomerOptions } from "@/hooks/use-reference";
import { NONE_OPTION } from "../../../crm/shared/constants";
import type { Quotation } from "../types";

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  bookingId: z.string().optional(),
  validUntil: z.string().optional(),
  discount: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  tax: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  currencyCode: z.string().optional(),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface QuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function QuotationDialog({ open, onOpenChange, quotation, onSubmit, isSubmitting }: QuotationDialogProps) {
  const { data: customers } = useCustomerOptions();
  const { data: bookings } = useBookingOptions();

  const customerOptions = (customers ?? []).map((c) => ({
    value: c.id,
    label: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || c.customerNumber,
  }));
  const bookingOptions = [NONE_OPTION, ...(bookings ?? []).map((b) => ({ value: b.id, label: b.bookingNumber }))];

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerId: "", bookingId: "null", currencyCode: "USD" },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      quotation
        ? {
            customerId: quotation.customerId,
            bookingId: quotation.bookingId ?? "null",
            validUntil: quotation.validUntil ?? "",
            discount: Number(quotation.discount) || "",
            tax: Number(quotation.tax) || "",
            currencyCode: quotation.currencyCode,
            notes: quotation.notes ?? "",
          }
        : { customerId: "", bookingId: "null", validUntil: "", discount: "", tax: "", currencyCode: "USD", notes: "" }
    );
  }, [open, quotation, methods]);

  const submit = methods.handleSubmit((values) => onSubmit(cleanPayload(values)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{quotation ? `Edit ${quotation.quotationNumber}` : "New Quotation"}</DialogTitle>
          <DialogDescription>
            Totals are computed on the server from line items, discount and tax.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField name="customerId" label="Customer" options={customerOptions} required />
              <SelectField
                name="bookingId"
                label="Linked booking"
                options={bookingOptions}
              />
              <DateField name="validUntil" label="Valid until" />
              <MoneyField name="discount" label="Discount" />
              <MoneyField name="tax" label="Tax" />
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {quotation ? "Save changes" : "Create quotation"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
