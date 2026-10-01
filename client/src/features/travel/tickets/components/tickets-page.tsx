import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Search, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { AsyncCombobox, type ComboboxItem } from "@/components/shared/async-combobox";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { formatDate, formatCurrency } from "@/lib/utils";
import { airportsApi } from "../../fares/services/fares.api";
import { CABIN_OPTIONS, CABIN_LABEL } from "../../fares/constants";
import { useFareSearch } from "../../fares/hooks/use-fares";
import { SellTicketDialog } from "./sell-ticket-dialog";
import type { FlightFare } from "../../fares/types";

export default function TicketsPage() {
  const navigate = useNavigate();
  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState("");
  const [fromLabel, setFromLabel] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [date, setDate] = useState("");
  const [cabinClass, setCabinClass] = useState("");
  const [pax, setPax] = useState(1);
  const [searching, setSearching] = useState(false);

  const [sellFare, setSellFare] = useState<FlightFare | null>(null);

  const params = useMemo(
    () => ({ fromCode, toCode, date: date || undefined, cabinClass: cabinClass || undefined, pax }),
    [fromCode, toCode, date, cabinClass, pax]
  );

  const { data, isFetching, isError, refetch } = useFareSearch({
    enabled: searching && !!fromCode && !!toCode,
    ...params,
  });

  const fetchAirports = async (q: string): Promise<ComboboxItem[]> => {
    if (q.trim().length < 2) return [];
    const res = await airportsApi.search(q);
    return res.data.map((p) => ({ value: p.iataCode, label: `${p.iataCode} — ${p.city || p.name}`, hint: p.country ?? undefined }));
  };

  const runSearch = () => {
    if (!fromCode || !toCode) return;
    if (searching) refetch();
    else setSearching(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticket Counter"
        description="Search available fares and sell tickets. Selling prices include the agency margin."
      />

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>From</Label>
            <AsyncCombobox
              name="from"
              placeholder="Origin city / IATA"
              queryKey="airportSearchFrom"
              value={fromCode}
              selectedLabel={fromLabel}
              fetchItems={fetchAirports}
              onChange={(v, label) => { setFromCode(v); setFromLabel(label); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <AsyncCombobox
              name="to"
              placeholder="Destination city / IATA"
              queryKey="airportSearchTo"
              value={toCode}
              selectedLabel={toLabel}
              fetchItems={fetchAirports}
              onChange={(v, label) => { setToCode(v); setToLabel(label); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Departure date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cabin</Label>
            <Select value={cabinClass || "ALL"} onValueChange={(v) => setCabinClass(v === "ALL" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any cabin</SelectItem>
                {CABIN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Passengers</Label>
            <Input
              type="number"
              min="1"
              max="9"
              value={pax}
              onChange={(e) => setPax(Math.max(1, Math.min(9, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <Button onClick={runSearch} disabled={!fromCode || !toCode || isFetching}>
              <Search className="mr-2 h-4 w-4" /> Search fares
            </Button>
          </div>
        </CardContent>
      </Card>

      {!searching ? (
        <EmptyState
          icon={Plane}
          title="Search for fares"
          description="Pick an origin and destination airport to see available fares and sell tickets."
        />
      ) : isFetching ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={Ticket} title="No fares found" description="No available fares match this search. Try another route, date, or cabin." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data!.map((f) => {
            const soldOut = f.seatsLeft !== null && f.seatsLeft < pax;
            return (
              <Card key={f.id}>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">
                        {f.airline.code} {f.flightNumber}
                        <span className="ml-2 font-normal text-muted-foreground">{f.airline.name}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {f.originAirport.iataCode} → {f.destinationAirport.iataCode}
                        {" · "}
                        {formatDate(f.departureTime, "MMM dd, yyyy HH:mm")}
                      </p>
                    </div>
                    <Badge variant="outline">{CABIN_LABEL[f.cabinClass] ?? f.cabinClass}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(f.sellingPrice, f.currencyCode)}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.seatsLeft === null ? "Seats available" : `${f.seatsLeft} seat(s) left`}
                        {Number(f.taxPercent) > 0 ? ` · +${f.taxPercent}% tax at sale` : ""}
                      </p>
                    </div>
                    <PermissionGate permission="bookings.create">
                      <Button onClick={() => setSellFare(f)} disabled={soldOut || !f.isActive}>
                        <Ticket className="mr-2 h-4 w-4" /> {soldOut ? "Sold out" : "Sell"}
                      </Button>
                    </PermissionGate>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SellTicketDialog fare={sellFare} onClose={() => setSellFare(null)} onSold={(id) => navigate(`/travel/bookings/${id}`)} />
    </div>
  );
}
