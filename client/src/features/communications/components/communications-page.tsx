import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
import {
  CHANNEL_OPTIONS,
  COMM_DIRECTION_OPTIONS,
  COMM_STATUS_OPTIONS,
} from "../shared/constants";
import { useCreate, useDelete, useList, useUpdate } from "../hooks/use-communications";
import { getCommunicationColumns } from "./communication-columns";
import { CommunicationDialog } from "./communication-dialog";
import type { Communication } from "../types";

const ALL = "all";

export default function CommunicationsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [channel, setChannel] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [direction, setDirection] = useState(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Communication | null>(null);
  const [deleting, setDeleting] = useState<Communication | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, channel, status, direction]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (channel !== ALL) p.channel = channel;
    if (status !== ALL) p.status = status;
    if (direction !== ALL) p.direction = direction;
    return p;
  }, [page, limit, debouncedSearch, channel, status, direction]);

  const { data, isLoading } = useList(params);
  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();

  const columns = useMemo(
    () =>
      getCommunicationColumns({
        onEdit: (c) => {
          setEditing(c);
          setDialogOpen(true);
        },
        onDelete: (c) => setDeleting(c),
      }),
    []
  );

  const handleSubmit = (values: any) => {
    const onSuccess = () => setDialogOpen(false);
    if (editing) {
      update.mutate({ id: editing.id, data: values }, { onSuccess });
    } else {
      create.mutate(values, { onSuccess });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Communications" description="Log of calls, messages and meetings with customers and leads.">
        <PermissionGate permission="communications.create">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Log communication
          </Button>
        </PermissionGate>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All channels</SelectItem>
            {CHANNEL_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={direction} onValueChange={setDirection}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Both directions</SelectItem>
            {COMM_DIRECTION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {COMM_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        searchKey="global"
        searchPlaceholder="Search name, subject, notes..."
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

      <CommunicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        communication={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete communication?"
        description={deleting ? `"${deleting.subject}" will be archived.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() =>
          deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
        isLoading={remove.isPending}
      />
    </div>
  );
}
