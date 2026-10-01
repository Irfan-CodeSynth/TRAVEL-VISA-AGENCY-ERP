import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { INVOICE_STATUS_OPTIONS } from "../../shared/constants";
import { useCreate, useDelete, useList, useUpdate } from "../hooks/use-invoices";
import { getInvoiceColumns } from "./invoice-columns";
import { InvoiceDialog } from "./invoice-dialog";
import type { Invoice } from "../types";

const ALL = "all";

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(ALL);

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
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);

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

  const columns = useMemo(
    () =>
      getInvoiceColumns({
        onEdit: (i) => {
          setEditing(i);
          setDialogOpen(true);
        },
        onDelete: (i) => setDeleting(i),
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
      <PageHeader title="Invoices" description="Customer invoices with payments, refunds and live balances.">
        <PermissionGate permission="invoices.create">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Invoice
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
            {INVOICE_STATUS_OPTIONS.map((o) => (
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
        searchPlaceholder="Search invoice number, customer..."
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

      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invoice={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete invoice?"
        description={
          deleting
            ? `${deleting.invoiceNumber} will be archived. Invoices with payments cannot be deleted.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        isLoading={remove.isPending}
      />
    </div>
  );
}
