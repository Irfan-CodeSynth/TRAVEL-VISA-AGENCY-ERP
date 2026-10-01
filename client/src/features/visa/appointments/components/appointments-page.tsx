import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_OPTIONS, APPOINTMENT_TYPE_OPTIONS } from "../../shared/constants";
import {
  useChangeStatus,
  useCreate,
  useDelete,
  useList,
  useUpdate,
  useUpcoming,
} from "../hooks/use-appointments";
import { getAppointmentColumns } from "./appointment-columns";
import { AppointmentDialog } from "./appointment-dialog";
import type { Appointment } from "../types";

const ALL = "all";

export default function AppointmentsPage() {
  const [view, setView] = useState<"all" | "upcoming">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [type, setType] = useState(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState<Appointment | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, type, view]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (status !== ALL) p.status = status;
    if (type !== ALL) p.type = type;
    return p;
  }, [page, limit, debouncedSearch, status, type]);

  const listQuery = useList(params);
  const upcoming = useUpcoming(7, view === "upcoming");
  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();
  const changeStatus = useChangeStatus();

  const columns = useMemo(
    () =>
      getAppointmentColumns({
        onEdit: (a) => {
          setEditing(a);
          setDialogOpen(true);
        },
        onComplete: (a) => changeStatus.mutate({ id: a.id, body: { status: "COMPLETED" } }),
        onReschedule: (a) => {
          const next = new Date(Math.max(Date.now(), new Date(a.scheduledAt).getTime()));
          next.setDate(next.getDate() + 3);
          next.setHours(10, 0, 0, 0);
          setRescheduling(a);
          setRescheduleAt(next.toISOString().slice(0, 16));
        },
        onCancel: (a) => changeStatus.mutate({ id: a.id, body: { status: "CANCELLED" } }),
        onDelete: (a) => setDeleting(a),
      }),
    [changeStatus]
  );

  const handleSubmit = (values: any) => {
    if (editing) {
      update.mutate({ id: editing.id, data: values }, { onSuccess: () => setDialogOpen(false) });
    } else {
      create.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const toggle = (
    <div className="inline-flex rounded-lg border p-1">
      {(["all", "upcoming"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-all",
            view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {v === "all" ? "All" : "Next 7 days"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" description="Biometrics, interviews, medicals and passport collections.">
        <PermissionGate permission="appointments.create">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Appointment
          </Button>
        </PermissionGate>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        {toggle}
        {view === "all" && (
          <>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {APPOINTMENT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {APPOINTMENT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {view === "all" ? (
        <DataTable
          columns={columns}
          data={listQuery.data?.data ?? []}
          isLoading={listQuery.isLoading}
          searchKey="global"
          searchPlaceholder="Search subject, location, customer..."
          server={{
            page,
            pageSize: limit,
            totalCount: listQuery.data?.pagination.total ?? 0,
            onPageChange: setPage,
            onPageSizeChange: setLimit,
            onSearchChange: setSearch,
            searchValue: search,
          }}
        />
      ) : (
        <DataTable columns={columns} data={upcoming.data ?? []} isLoading={upcoming.isLoading} searchKey="global" searchPlaceholder="Search upcoming..." />
      )}

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete appointment?"
        description={deleting ? `${deleting.subject} — ${new Date(deleting.scheduledAt).toLocaleString()}` : ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        isLoading={remove.isPending}
      />

      <Dialog open={!!rescheduling} onOpenChange={(o) => !o && setRescheduling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule appointment</DialogTitle>
            <DialogDescription>
              {rescheduling?.subject} — pick the new slot. The reschedule counter increments.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="datetime-local"
            value={rescheduleAt}
            onChange={(e) => setRescheduleAt(e.target.value)}
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRescheduling(null)}>Cancel</Button>
            <Button
              disabled={!rescheduleAt || changeStatus.isPending}
              onClick={() =>
                rescheduling &&
                changeStatus.mutate(
                  { id: rescheduling.id, body: { status: "RESCHEDULED", scheduledAt: new Date(rescheduleAt).toISOString() } },
                  { onSuccess: () => setRescheduling(null) }
                )
              }
            >
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
