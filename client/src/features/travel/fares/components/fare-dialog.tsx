import { useEffect, useMemo, useState } from "react";
import { useForm, FormProvider, Controller, useWatch } from "react-hook-form";
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
import { AsyncCombobox, type ComboboxItem } from "@/components/shared/async-combobox";
import { cleanPayload } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { airportsApi, airlinesApi } from "../services/fares.api";
import { useGlobalMarginDefault } from "../hooks/use-fares";
import { CABIN_OPTIONS, MARGIN_TYPE_OPTIONS, applyMargin, resolveMargin } from "../constants";
import type { Airline, FlightFare } from "../types";

const formSchema = z.object({
  airlineId: z.string().min(1, "Airline is required"),
  flightNumber: z.string().trim().min(1, "Flight number is required"),
  originAirportId: z.string().min(1, "Origin airport is required"),
  destinationAirportId: z.string().min(1, "Destination airport is required"),
  departureTime: z.string().min(1, "Departure is required"),
  arrivalTime: z.string().optional(),
  cabinClass: z.string().optional(),
  baseFare: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  currencyCode: z.string().optional(),
  marginType: z.union([z.literal("PERCENT"), z.literal("FLAT"), z.literal("")]).optional(),
  marginValue: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  taxPercent: z.union([z.coerce.number().min(0).max(100), z.literal("")]).optional(),
  seatsTotal: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fare: FlightFare | null;
  canSeeMargin: boolean;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function FareDialog({ open, onOpenChange, fare, canSeeMargin, onSubmit, isSubmitting }: FareDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { airlineId: "", flightNumber: "", originAirportId: "", destinationAirportId: "", cabinClass: "ECONOMY", currencyCode: "USD", isActive: true },
  });

  const [airlineLabel, setAirlineLabel] = useState<string>("");
  const [originLabel, setOriginLabel] = useState<string>("");
  const [destLabel, setDestLabel] = useState<string>("");
  const [selectedAirline, setSelectedAirline] = useState<Airline | null>(null);

  const { data: globalDefault } = useGlobalMarginDefault(open && canSeeMargin);

  useEffect(() => {
    if (!open) return;
    if (fare) {
      methods.reset({
        airlineId: fare.airlineId,
        flightNumber: fare.flightNumber,
        originAirportId: fare.originAirportId,
        destinationAirportId: fare.destinationAirportId,
        departureTime: fare.departureTime ?? "",
        arrivalTime: fare.arrivalTime ?? "",
        cabinClass: fare.cabinClass,
        baseFare: fare.baseFare != null ? Number(fare.baseFare) : "",
        currencyCode: fare.currencyCode,
        marginType: fare.marginType ?? "",
        marginValue: fare.marginValue != null ? Number(fare.marginValue) : "",
        taxPercent: Number(fare.taxPercent) || "",
        seatsTotal: fare.seatsTotal ?? "",
        notes: fare.notes ?? "",
        isActive: fare.isActive,
      });
      setAirlineLabel(`${fare.airline.code} — ${fare.airline.name}`);
      setOriginLabel(`${fare.originAirport.iataCode} — ${fare.originAirport.city || fare.originAirport.name}`);
      setDestLabel(`${fare.destinationAirport.iataCode} — ${fare.destinationAirport.city || fare.destinationAirport.name}`);
      setSelectedAirline(fare.airline);
    } else {
      methods.reset({
        airlineId: "", flightNumber: "", originAirportId: "", destinationAirportId: "",
        departureTime: "", arrivalTime: "", cabinClass: "ECONOMY", baseFare: "", currencyCode: "USD",
        marginType: "", marginValue: "", taxPercent: "", seatsTotal: "", notes: "", isActive: true,
      });
      setAirlineLabel(""); setOriginLabel(""); setDestLabel(""); setSelectedAirline(null);
    }
  }, [open, fare, methods]);

  const fAirlineId = useWatch({ control: methods.control, name: "airlineId" });
  const fAirline = fAirlineId === selectedAirline?.id ? selectedAirline : null;
  const fMarginType = useWatch({ control: methods.control, name: "marginType" });
  const fMarginValue = useWatch({ control: methods.control, name: "marginValue" });
  const fBaseFare = useWatch({ control: methods.control, name: "baseFare" });

  const preview = useMemo(() => {
    if (!canSeeMargin || fBaseFare === "" || fBaseFare == null) return null;
    const base = Number(fBaseFare);
    const margin = resolveMargin({ marginType: fMarginType || null, marginValue: fMarginValue }, fAirline, globalDefault);
    const selling = applyMargin(base, margin);
    return { base, selling, margin };
  }, [canSeeMargin, fBaseFare, fMarginType, fMarginValue, fAirline, globalDefault]);

  const fetchAirlines = async (q: string): Promise<ComboboxItem[]> => {
    const res = await airlinesApi.search(q);
    return res.data.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}`, hint: a.country ?? undefined, raw: a } as any));
  };
  const fetchAirports = async (q: string): Promise<ComboboxItem[]> => {
    if (q.trim().length < 2) return [];
    const res = await airportsApi.search(q);
    return res.data.map((p) => ({ value: p.id, label: `${p.iataCode} — ${p.city || p.name}`, hint: p.country ?? undefined }));
  };

  const submit = methods.handleSubmit((values) => onSubmit(cleanPayload(values)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{fare ? `Edit ${fare.airline.code} ${fare.flightNumber}` : "New Fare"}</DialogTitle>
          <DialogDescription>
            Enter the market base fare and your agency margin. The selling price is always computed on the server.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="airlineId"
                control={methods.control}
                render={({ field }) => (
                  <AsyncCombobox
                    name="airlineId"
                    label="Airline"
                    required
                    placeholder="Search airline..."
                    queryKey="airlines"
                    value={field.value}
                    selectedLabel={airlineLabel}
                    fetchItems={fetchAirlines}
                    onChange={(v, label, item) => {
                      field.onChange(v);
                      setAirlineLabel(label);
                      setSelectedAirline((item as any)?.raw ?? null);
                    }}
                  />
                )}
              />
              <TextField name="flightNumber" label="Flight number" required placeholder="e.g. EK602" />
              <Controller
                name="originAirportId"
                control={methods.control}
                render={({ field }) => (
                  <AsyncCombobox
                    name="originAirportId"
                    label="Origin airport"
                    required
                    placeholder="Search city / IATA..."
                    queryKey="airports"
                    value={field.value}
                    selectedLabel={originLabel}
                    fetchItems={fetchAirports}
                    onChange={(v, label) => { field.onChange(v); setOriginLabel(label); }}
                  />
                )}
              />
              <Controller
                name="destinationAirportId"
                control={methods.control}
                render={({ field }) => (
                  <AsyncCombobox
                    name="destinationAirportId"
                    label="Destination airport"
                    required
                    placeholder="Search city / IATA..."
                    queryKey="airports"
                    value={field.value}
                    selectedLabel={destLabel}
                    fetchItems={fetchAirports}
                    onChange={(v, label) => { field.onChange(v); setDestLabel(label); }}
                  />
                )}
              />
              <DateField name="departureTime" label="Departure" required withTime />
              <DateField name="arrivalTime" label="Arrival" withTime />
              <SelectField name="cabinClass" label="Cabin" options={CABIN_OPTIONS} />
              <div className="sm:col-span-2 border-t pt-3">
                <p className="mb-2 text-sm font-medium">Pricing</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {canSeeMargin ? (
                    <>
                      <MoneyField name="baseFare" label="Base fare (market price)" required />
                      <SelectField name="marginType" label="Margin type" options={MARGIN_TYPE_OPTIONS} placeholder="Use default" />
                      <TextField name="marginValue" label="Margin value" type="number" description="Percent or flat amount. Leave blank to use airline/global default." />
                      <TextField name="taxPercent" label="Tax %" type="number" description="Applied to subtotal when selling." />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      You can view selling prices but not the underlying cost or margin.
                    </p>
                  )}
                  <TextField name="seatsTotal" label="Seats available" type="number" description="0 or blank = unlimited." />
                </div>
                {preview && (
                  <div className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Computed selling price: </span>
                    <span className="font-semibold">
                      {formatCurrency(preview.selling, methods.getValues("currencyCode") || "USD")}
                    </span>
                    {!preview.margin && (
                      <span className="ml-2 text-xs text-muted-foreground">(no margin configured — selling equals base)</span>
                    )}
                  </div>
                )}
              </div>
              <SwitchField name="isActive" label="Active" />
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {fare ? "Save changes" : "Create fare"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
