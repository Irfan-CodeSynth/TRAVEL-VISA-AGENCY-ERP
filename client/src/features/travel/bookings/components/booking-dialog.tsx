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
  TextField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { useCustomerOptions } from "@/hooks/use-reference";
import { BOOKING_TYPE_OPTIONS } from "../../shared/constants";
import type { Booking } from "../types";

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  type: z.string().optional(),
  paxCount: z.union([z.coerce.number().int().min(1).max(9999), z.literal("")]).optional(),
  travelDate: z.string().optional(),
  returnDate: z.string().optional(),
  discount: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  tax: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  currencyCode: z.string().optional(),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function BookingDialog({ open, onOpenChange, booking, onSubmit, isSubmitting }: BookingDialogProps) {
  const { data: customers } = useCustomerOptions();
  const customerOptions = (customers ?? []).map((c) => ({
    value: c.id,
    label: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || c.customerNumber,
  }));

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerId: "", type: "FLIGHT", paxCount: 1, currencyCode: "USD" },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      booking
        ? {
            customerId: booking.customerId,
            type: booking.type,
            paxCount: booking.paxCount,
            travelDate: booking.travelDate ?? "",
            returnDate: booking.returnDate ?? "",
            discount: Number(booking.discount) || "",
            tax: Number(booking.tax) || "",
            currencyCode: booking.currencyCode,
            notes: booking.notes ?? "",
          }
        : { customerId: "", type: "FLIGHT", paxCount: 1, travelDate: "", returnDate: "", discount: "", tax: "", currencyCode: "USD", notes: "" }
    );
  }, [open, booking, methods]);

  const submit = methods.handleSubmit((values) => onSubmit(cleanPayload(values)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{booking ? `Edit ${booking.bookingNumber}` : "New Booking"}</DialogTitle>
          <DialogDescription>
            Totals are computed on the server from line items, discount and tax.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField name="customerId" label="Customer" options={customerOptions} required />
              <SelectField name="type" label="Type" options={BOOKING_TYPE_OPTIONS} />
              <TextField name="paxCount" label="Pax count" type="number" />
              <DateField name="travelDate" label="Travel date" />
              <DateField name="returnDate" label="Return date" />
              <MoneyField name="discount" label="Discount" />
              <MoneyField name="tax" label="Tax" />
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {booking ? "Save changes" : "Create booking"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
