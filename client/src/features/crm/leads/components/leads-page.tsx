import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserOptions, fullName } from "@/hooks/use-reference";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "../../shared/constants";
import { useConvertLead, useDelete, useLoseLead, useCreate, useList, useUpdate } from "../hooks/use-leads";
import { getLeadColumns } from "./lead-columns";
import { LeadDialog } from "./lead-dialog";
import type { Lead } from "../types";

const ALL = "all";

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [assignedToUserId, setAssignedToUserId] = useState(ALL);

  const [dialogOpen, setDialogOpen] = useState(() => {
    const wantsNew = new URLSearchParams(window.location.search).get("new") === "1";
    if (wantsNew) window.history.replaceState(null, "", window.location.pathname);
    return wantsNew;
  });

  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDialogOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [searchParams]);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);
  const [losing, setLosing] = useState<Lead | null>(null);
  const [loseReason, setLoseReason] = useState("");

  const { data: users } = useUserOptions();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, source, assignedToUserId]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (status !== ALL) p.status = status;
    if (source !== ALL) p.source = source;
    if (assignedToUserId !== ALL) p.assignedToUserId = assignedToUserId;
    return p;
  }, [page, limit, debouncedSearch, status, source, assignedToUserId]);

  const { data, isLoading } = useList(params);
  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();
  const convert = useConvertLead();
  const lose = useLoseLead();

  const columns = useMemo(
    () =>
      getLeadColumns({
        onEdit: (lead) => {
          setEditing(lead);
          setDialogOpen(true);
        },
        onConvert: (lead) => setConverting(lead),
        onLose: (lead) => {
          setLosing(lead);
          setLoseReason("");
        },
        onDelete: (lead) => setDeleting(lead),
      }),
    []
  );

  const handleSubmit = (values: any) => {
    if (editing) {
      update.mutate(
        { id: editing.id, data: values },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      create.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const isSubmitting = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description="Capture enquiries and track them through to conversion.">
        <PermissionGate permission="leads.create">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Lead
          </Button>
        </PermissionGate>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {LEAD_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            {LEAD_SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {users && (
          <Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All assignees</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{fullName(u)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        searchKey="global"
        searchPlaceholder="Search name, phone, email..."
        server={{
          page,
          pageSize: limit,
          totalCount: data?.pagination.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (size) => setLimit(size),
          onSearchChange: setSearch,
          searchValue: search,
        }}
      />

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={editing}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={!!converting}
        onOpenChange={(o) => !o && setConverting(null)}
        title="Convert lead to customer?"
        description={
          converting
            ? `${converting.firstName} ${converting.lastName ?? ""} will become an active customer with a new customer number.`
            : ""
        }
        confirmLabel="Convert"
        onConfirm={() =>
          converting && convert.mutate({ id: converting.id }, { onSuccess: () => setConverting(null) })
        }
        isLoading={convert.isPending}
      />

      <Dialog open={!!losing} onOpenChange={(o) => !o && setLosing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark lead as lost</DialogTitle>
            <DialogDescription>Add a reason so the team learns what went wrong.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Reason (e.g. price, went with competitor)"
            value={loseReason}
            onChange={(e) => setLoseReason(e.target.value)}
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setLosing(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={lose.isPending}
              onClick={() =>
                losing &&
                lose.mutate(
                  { id: losing.id, body: { reason: loseReason || undefined } },
                  { onSuccess: () => setLosing(null) }
                )
              }
            >
              Mark lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete lead?"
        description={deleting ? `${deleting.leadNumber} — ${deleting.firstName} ${deleting.lastName ?? ""}` : ""}
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
