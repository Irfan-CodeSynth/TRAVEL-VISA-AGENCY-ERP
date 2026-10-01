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
import { useUserOptions, fullName } from "@/hooks/use-reference";
import { useCompleteFollowUp, useCreate, useDelete, useList, useOverdueFollowUps, useUpcomingFollowUps, useUpdate } from "../hooks/use-follow-ups";
import {
  FOLLOW_UP_PRIORITY_OPTIONS,
  FOLLOW_UP_STATUS_OPTIONS,
} from "../constants";
import { getFollowUpColumns } from "./follow-up-columns";
import { FollowUpDialog } from "./follow-up-dialog";
import type { FollowUp } from "../types";
import { cn } from "@/lib/utils";

const ALL = "all";
type View = "all" | "upcoming" | "overdue";

export default function FollowUpsPage() {
  const [view, setView] = useState<View>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [priority, setPriority] = useState(ALL);
  const [assignedToUserId, setAssignedToUserId] = useState(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [completing, setCompleting] = useState<FollowUp | null>(null);
  const [deleting, setDeleting] = useState<FollowUp | null>(null);

  const { data: users } = useUserOptions();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, priority, assignedToUserId, view]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (status !== ALL) p.status = status;
    if (priority !== ALL) p.priority = priority;
    if (assignedToUserId !== ALL) p.assignedToUserId = assignedToUserId;
    return p;
  }, [page, limit, debouncedSearch, status, priority, assignedToUserId]);

  const listQuery = useList(params);
  const upcomingQuery = useUpcomingFollowUps(3);
  const overdueQuery = useOverdueFollowUps();

  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();
  const complete = useCompleteFollowUp();

  const columns = useMemo(
    () =>
      getFollowUpColumns({
        onComplete: (fu) => setCompleting(fu),
        onEdit: (fu) => {
          setEditing(fu);
          setDialogOpen(true);
        },
        onDelete: (fu) => setDeleting(fu),
      }),
    []
  );

  const handleSubmit = (values: any) => {
    if (editing) {
      update.mutate({ id: editing.id, data: values }, { onSuccess: () => setDialogOpen(false) });
    } else {
      create.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const viewData =
    view === "upcoming" ? upcomingQuery.data ?? [] : view === "overdue" ? overdueQuery.data ?? [] : listQuery.data?.data ?? [];
  const viewLoading =
    view === "upcoming" ? upcomingQuery.isLoading : view === "overdue" ? overdueQuery.isLoading : listQuery.isLoading;

  const viewButton = (v: View, label: string, badge?: number, danger?: boolean) => (
    <Button
      variant={view === v ? "default" : "outline"}
      size="sm"
      onClick={() => setView(v)}
      className={cn(danger && badge ? "text-destructive" : "")}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={cn("ml-2 rounded-full px-1.5 text-xs", view === v ? "bg-background/20" : "bg-muted")}>
          {badge}
        </span>
      )}
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Follow-ups" description="Never miss the next conversation.">
        <PermissionGate permission="follow_ups.create">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Follow-up
          </Button>
        </PermissionGate>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {viewButton("all", "All")}
          {viewButton("upcoming", "Next 3 days", upcomingQuery.data?.length)}
          {viewButton("overdue", "Overdue", overdueQuery.data?.length, true)}
        </div>
        {view === "all" && (
          <>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {FOLLOW_UP_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All priorities</SelectItem>
                {FOLLOW_UP_PRIORITY_OPTIONS.map((o) => (
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
          </>
        )}
      </div>

      {view === "all" ? (
        <DataTable
          columns={columns}
          data={viewData}
          isLoading={viewLoading}
          searchKey="global"
          searchPlaceholder="Search subject, notes..."
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
        <DataTable columns={columns} data={viewData} isLoading={viewLoading} />
      )}

      <FollowUpDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        followUp={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!completing}
        onOpenChange={(o) => !o && setCompleting(null)}
        title="Mark follow-up as completed?"
        description={completing?.subject ?? ""}
        confirmLabel="Complete"
        onConfirm={() =>
          completing && complete.mutate({ id: completing.id }, { onSuccess: () => setCompleting(null) })
        }
        isLoading={complete.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete follow-up?"
        description={deleting?.subject ?? ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        isLoading={remove.isPending}
      />
    </div>
  );
}
