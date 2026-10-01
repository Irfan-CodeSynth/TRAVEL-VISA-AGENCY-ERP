import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { CUSTOMER_STATUS_OPTIONS } from "../../shared/constants";
import { useCreate, useDelete, useList, useUpdate } from "../hooks/use-customers";
import { getCustomerColumns, customerDisplayName } from "./customer-columns";
import { CustomerDialog } from "./customer-dialog";
import type { Customer } from "../types";

const ALL = "all";

export default function CustomersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [customerType, setCustomerType] = useState(ALL);
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const { data: users } = useUserOptions();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, customerType, assignedToUserId]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (status !== ALL) p.status = status;
    if (customerType !== ALL) p.customerType = customerType;
    if (assignedToUserId !== ALL) p.assignedToUserId = assignedToUserId;
    return p;
  }, [page, limit, debouncedSearch, status, customerType, assignedToUserId]);

  const { data, isLoading } = useList(params);
  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();

  const columns = useMemo(
    () =>
      getCustomerColumns({
        onView: (customer) => navigate(`/crm/customers/${customer.id}`),
        onEdit: (customer) => {
          setEditingId(customer.id);
          setDialogOpen(true);
        },
        onDelete: (customer) => setDeleting(customer),
      }),
    [navigate]
  );

  const handleSubmit = (values: any) => {
    if (editingId) {
      update.mutate(
        { id: editingId, data: values },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      create.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Your active book of customers.">
        <PermissionGate permission="customers.create">
          <Button
            onClick={() => {
              setEditingId(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Customer
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
            {CUSTOMER_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={customerType} onValueChange={setCustomerType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            <SelectItem value="INDIVIDUAL">Individual</SelectItem>
            <SelectItem value="COMPANY">Company</SelectItem>
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
          onPageSizeChange: setLimit,
          onSearchChange: setSearch,
          searchValue: search,
        }}
      />

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editId={editingId}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete customer?"
        description={deleting ? `${deleting.customerNumber} — ${customerDisplayName(deleting)}` : ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        isLoading={remove.isPending}
      />
    </div>
  );
}
