import { useEffect, useMemo, useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useList, useCreate, useUpdate, useDelete } from "../hooks/use-fares";
import { useCanSeeMargin } from "../hooks/use-can-see-margin";
import { getFareColumns } from "./fare-columns";
import { FareDialog } from "./fare-dialog";
import { DefaultMarginDialog } from "./default-margin-dialog";
import { CABIN_OPTIONS } from "../constants";
import type { FlightFare } from "../types";

export default function FaresPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cabinClass, setCabinClass] = useState<string>("");
  const [upcoming, setUpcoming] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [marginDialogOpen, setMarginDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FlightFare | null>(null);
  const [deleting, setDeleting] = useState<FlightFare | null>(null);

  const canSeeMargin = useCanSeeMargin();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, cabinClass, upcoming]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (cabinClass) p.cabinClass = cabinClass;
    if (upcoming) p.upcoming = "true";
    return p;
  }, [page, limit, debouncedSearch, cabinClass, upcoming]);

  const { data, isLoading } = useList(params);
  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();

  const columns = useMemo(
    () =>
      getFareColumns(
        {
          onEdit: (f) => {
            setEditing(f);
            setDialogOpen(true);
          },
          onDelete: (f) => setDeleting(f),
        },
        { canSeeMargin }
      ),
    [canSeeMargin]
  );

  const handleSubmit = (values: any) => {
    if (editing) {
      update.mutate({ id: editing.id, data: values }, { onSuccess: () => setDialogOpen(false) });
    } else {
      create.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agency Fares"
        description="Enter market base fares and agency margins. Selling prices are computed on the server."
      >
        <div className="flex items-center gap-2">
          <PermissionGate permission="settings.manage">
            <Button variant="outline" onClick={() => setMarginDialogOpen(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" /> Default margin
            </Button>
          </PermissionGate>
          <PermissionGate permission="flights.create">
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New Fare
            </Button>
          </PermissionGate>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={cabinClass || "ALL"} onValueChange={(v) => setCabinClass(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All cabins" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All cabins</SelectItem>
            {CABIN_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={upcoming ? "default" : "outline"}
          size="sm"
          onClick={() => setUpcoming((u) => !u)}
        >
          {upcoming ? "Upcoming only" : "All departures"}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        searchKey="global"
        searchPlaceholder="Search airline, flight number..."
        server={{
          page,
          pageSize: limit,
          totalCount: data?.pagination.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: setLimit,
          onSearchChange: setSearch,
          searchValue: search,
        }}
      />

      <FareDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        fare={editing}
        canSeeMargin={canSeeMargin}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <DefaultMarginDialog open={marginDialogOpen} onOpenChange={setMarginDialogOpen} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete fare?"
        description={deleting ? `${deleting.airline.code} ${deleting.flightNumber} ${deleting.originAirport.iataCode}→${deleting.destinationAirport.iataCode} will be archived.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        isLoading={remove.isPending}
      />
    </div>
  );
}
