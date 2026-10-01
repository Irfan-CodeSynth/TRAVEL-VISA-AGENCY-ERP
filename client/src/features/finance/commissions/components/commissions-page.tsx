import { useEffect, useMemo, useState } from "react";
import { Plus, Wand2 } from "lucide-react";
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
import { COMMISSION_STATUS_OPTIONS } from "../../shared/constants";
import {
  useAction,
  useCreate,
  useDelete,
  useGenerateCommission,
  useList,
} from "../hooks/use-commissions";
import { commissionsApi } from "../services/commissions.api";
import { getCommissionColumns } from "./commission-columns";
import { CommissionDialog } from "./commission-dialog";
import { GenerateCommissionDialog } from "./generate-commission-dialog";
import type { Commission } from "../types";

const ALL = "all";

export default function CommissionsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deleting, setDeleting] = useState<Commission | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    commission: Commission;
    status: "APPROVED" | "REJECTED" | "PAID";
  } | null>(null);

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
  const remove = useDelete();
  const generate = useGenerateCommission();
  const changeStatus = useAction<Commission>(
    (id, body) => commissionsApi.changeStatus(id, body),
    "Commission status updated"
  );

  const columns = useMemo(
    () =>
      getCommissionColumns({
        onApprove: (c) => setPendingAction({ commission: c, status: "APPROVED" }),
        onReject: (c) => setPendingAction({ commission: c, status: "REJECTED" }),
        onPay: (c) => setPendingAction({ commission: c, status: "PAID" }),
        onDelete: (c) => setDeleting(c),
      }),
    []
  );

  const actionCopy =
    pendingAction?.status === "APPROVED"
      ? { title: "Approve commission?", description: "Approved commissions can later be marked paid.", label: "Approve" }
      : pendingAction?.status === "PAID"
        ? { title: "Mark commission paid?", description: "Paid commissions are locked and cannot be deleted.", label: "Mark paid" }
        : { title: "Reject commission?", description: "Rejected commissions cannot be re-approved.", label: "Reject" };

  return (
    <div className="space-y-6">
      <PageHeader title="Commissions" description="Agent payouts from bookings and invoices.">
        <PermissionGate permission="commissions.create">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGenerateOpen(true)}>
              <Wand2 className="mr-2 h-4 w-4" /> Generate from booking
            </Button>
            <Button
              onClick={() => {
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New Commission
            </Button>
          </div>
        </PermissionGate>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {COMMISSION_STATUS_OPTIONS.map((o) => (
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
        searchPlaceholder="Search commission number..."
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

      <CommissionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(values) => create.mutate(values, { onSuccess: () => setDialogOpen(false) })}
        isSubmitting={create.isPending}
      />

      <GenerateCommissionDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onSubmit={(values) => generate.mutate(values, { onSuccess: () => setGenerateOpen(false) })}
        isSubmitting={generate.isPending}
      />

      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={(o) => !o && setPendingAction(null)}
        title={actionCopy.title}
        description={
          pendingAction ? `${pendingAction.commission.commissionNumber} · ${actionCopy.description}` : ""
        }
        confirmLabel={actionCopy.label}
        variant={pendingAction?.status === "REJECTED" ? "destructive" : "default"}
        onConfirm={() =>
          pendingAction &&
          changeStatus.mutate(
            { id: pendingAction.commission.id, body: { status: pendingAction.status } },
            { onSuccess: () => setPendingAction(null) }
          )
        }
        isLoading={changeStatus.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete commission?"
        description={deleting ? `${deleting.commissionNumber} will be archived. Paid commissions cannot be deleted.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        isLoading={remove.isPending}
      />
    </div>
  );
}
