import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { apiErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useCustomerOptions } from "@/hooks/use-reference";
import { faresApi } from "../../fares/services/fares.api";
import { CABIN_LABEL } from "../../fares/constants";
import type { FlightFare } from "../../fares/types";

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  pax: z.coerce.number().int().min(1).max(9),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  fare: FlightFare | null;
  onClose: () => void;
  onSold: (bookingId: string) => void;
}

export function SellTicketDialog({ fare, onClose, onSold }: Props) {
  const qc = useQueryClient();
  const { data: customers } = useCustomerOptions();
  const customerOptions = (customers ?? []).map((c) => ({
    value: c.id,
    label: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || c.customerNumber,
  }));

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerId: "", pax: 1 },
  });

  useEffect(() => {
    if (!fare) return;
    methods.reset({ customerId: "", pax: 1, notes: "" });
  }, [fare, methods]);

  const sell = useMutation({
    mutationFn: (values: FormValues) =>
      faresApi.sell(fare!.id, { customerId: values.customerId, pax: values.pax, notes: values.notes || undefined }),
    onSuccess: (booking) => {
      toast.success(`Ticket sold · Booking ${booking.bookingNumber}`);
      qc.invalidateQueries({ queryKey: ["flightFares"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      onClose();
      onSold(booking.id);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const submit = methods.handleSubmit((values) => sell.mutate(values));
  const seatsForPreview = fare ? methods.watch("pax") || 1 : 1;

  return (
    <Dialog open={!!fare} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sell ticket</DialogTitle>
          <DialogDescription>
            {fare && (
              <>
                {fare.airline.code} {fare.airline.name} · {fare.originAirport.iataCode} →{" "}
                {fare.destinationAirport.iataCode} · {CABIN_LABEL[fare.cabinClass]} ·{" "}
                {formatCurrency(fare.sellingPrice, fare.currencyCode)}/seat
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {fare && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            Line total:{" "}
            <span className="font-semibold">
              {formatCurrency(fare.sellingPrice * seatsForPreview, fare.currencyCode)}
            </span>
            {Number(fare.taxPercent) > 0 && (
              <span className="text-muted-foreground"> (+{fare.taxPercent}% tax, computed on server)</span>
            )}
          </div>
        )}
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <SelectField name="customerId" label="Customer" options={customerOptions} required />
            <TextField
              name="pax"
              label="Passengers"
              type="number"
              description={fare?.seatsLeft === null ? undefined : `${fare?.seatsLeft ?? 0} seat(s) available`}
            />
            <TextAreaField name="notes" label="Notes" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={sell.isPending || !fare}>
                {sell.isPending ? "Selling..." : "Confirm sale"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
