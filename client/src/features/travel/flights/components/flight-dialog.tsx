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
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { FLIGHT_CLASS_OPTIONS } from "../../shared/constants";
import type { Flight } from "../types";

const formSchema = z.object({
  airline: z.string().trim().min(1, "Airline is required"),
  flightNumber: z.string().trim().min(1, "Flight number is required"),
  originCity: z.string().trim().optional(),
  originAirport: z.string().trim().optional(),
  destinationCity: z.string().trim().optional(),
  destinationAirport: z.string().trim().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  classType: z.string().optional(),
  baseFare: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  currencyCode: z.string().optional(),
  seatsAvailable: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flight: Flight | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function FlightDialog({ open, onOpenChange, flight, onSubmit, isSubmitting }: FlightDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { airline: "", flightNumber: "", isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      flight
        ? {
            airline: flight.airline,
            flightNumber: flight.flightNumber,
            originCity: flight.originCity ?? "",
            originAirport: flight.originAirport ?? "",
            destinationCity: flight.destinationCity ?? "",
            destinationAirport: flight.destinationAirport ?? "",
            departureTime: flight.departureTime ?? "",
            arrivalTime: flight.arrivalTime ?? "",
            classType: flight.classType ?? "",
            baseFare: flight.baseFare != null ? Number(flight.baseFare) : "",
            currencyCode: flight.currencyCode ?? "",
            seatsAvailable: flight.seatsAvailable ?? "",
            notes: flight.notes ?? "",
            isActive: flight.isActive,
          }
        : { airline: "", flightNumber: "", originCity: "", originAirport: "", destinationCity: "", destinationAirport: "", departureTime: "", arrivalTime: "", classType: "", baseFare: "", currencyCode: "USD", seatsAvailable: "", notes: "", isActive: true }
    );
  }, [open, flight, methods]);

  const submit = methods.handleSubmit((values) => onSubmit(cleanPayload(values)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{flight ? `Edit ${flight.airline} ${flight.flightNumber}` : "New Flight"}</DialogTitle>
          <DialogDescription>Schedule and fare availability for flight bookings.</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="airline" label="Airline" required placeholder="e.g. Emirates" />
              <TextField name="flightNumber" label="Flight number" required placeholder="e.g. EK-602" />
              <TextField name="originCity" label="Origin city" />
              <TextField name="originAirport" label="Origin airport (IATA)" />
              <TextField name="destinationCity" label="Destination city" />
              <TextField name="destinationAirport" label="Destination airport (IATA)" />
              <DateField name="departureTime" label="Departure" withTime />
              <DateField name="arrivalTime" label="Arrival" withTime />
              <SelectField name="classType" label="Class" options={FLIGHT_CLASS_OPTIONS} />
              <MoneyField name="baseFare" label="Base fare" />
              <TextField name="seatsAvailable" label="Seats available" type="number" />
              <SwitchField name="isActive" label="Active" />
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {flight ? "Save changes" : "Create flight"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
