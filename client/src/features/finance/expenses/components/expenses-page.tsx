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
import { EXPENSE_STATUS_OPTIONS } from "../../shared/constants";
import { useAction, useCreate, useDelete, useList, useUpdate } from "../hooks/use-expenses";
import { expensesApi } from "../services/expenses.api";
import { getExpenseColumns } from "./expense-columns";
import { ExpenseDialog } from "./expense-dialog";
import type { Expense } from "../types";

const ALL = "all";

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [approving, setApproving] = useState<Expense | null>(null);
  const [rejecting, setRejecting] = useState<Expense | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (status !== ALL) p.status = status;
    return p;
  }, [page, limit, debouncedSearch, status]);

  const { data, isLoading } = useList(params);
  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();
  const changeStatus = useAction<Expense>(
    (id, body) => expensesApi.changeStatus(id, body),
    "Expense status updated"
  );

  const columns = useMemo(
    () =>
      getExpenseColumns({
        onEdit: (e) => {
          setEditing(e);
          setDialogOpen(true);
        },
        onDelete: (e) => setDeleting(e),
        onApprove: (e) => setApproving(e),
        onReject: (e) => setRejecting(e),
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

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Operating costs pending approval.">
        <PermissionGate permission="expenses.create">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Expense
          </Button>
        </PermissionGate>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {EXPENSE_STATUS_OPTIONS.map((o) => (
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
        searchPlaceholder="Search expense number, title..."
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

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!approving}
        onOpenChange={(o) => !o && setApproving(null)}
        title="Approve expense?"
        description={approving ? `${approving.expenseNumber} will be locked after approval.` : ""}
        confirmLabel="Approve"
        onConfirm={() =>
          approving &&
          changeStatus.mutate(
            { id: approving.id, body: { status: "APPROVED" } },
            { onSuccess: () => setApproving(null) }
          )
        }
        isLoading={changeStatus.isPending}
      />

      <ConfirmDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title="Reject expense?"
        description={rejecting ? `${rejecting.expenseNumber} will be marked rejected.` : ""}
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={() =>
          rejecting &&
          changeStatus.mutate(
            { id: rejecting.id, body: { status: "REJECTED" } },
            { onSuccess: () => setRejecting(null) }
          )
        }
        isLoading={changeStatus.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete expense?"
        description={deleting ? `${deleting.expenseNumber} will be archived. Approved expenses cannot be deleted.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        isLoading={remove.isPending}
      />
    </div>
  );
}
