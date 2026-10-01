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
import { useVisaTypeOptions } from "@/hooks/use-reference";
import { APPLICATION_STATUS_OPTIONS } from "../../shared/constants";
import { useChangeStatus, useCreate, useDelete, useList, useUpdate } from "../hooks/use-applications";
import { getApplicationColumns } from "./application-columns";
import { ApplicationDialog } from "./application-dialog";
import { ChangeStatusDialog } from "./change-status-dialog";
import type { Application } from "../types";

const ALL = "all";

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [visaTypeId, setVisaTypeId] = useState(ALL);

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
  const [editing, setEditing] = useState<Application | null>(null);
  const [statusTarget, setStatusTarget] = useState<Application | null>(null);
  const [deleting, setDeleting] = useState<Application | null>(null);

  const { data: visaTypes } = useVisaTypeOptions();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, visaTypeId]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (status !== ALL) p.status = status;
    if (visaTypeId !== ALL) p.visaTypeId = visaTypeId;
    return p;
  }, [page, limit, debouncedSearch, status, visaTypeId]);

  const { data, isLoading } = useList(params);
  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();
  const changeStatus = useChangeStatus();

  const columns = useMemo(
    () =>
      getApplicationColumns({
        onView: (a) => navigate(`/visa/applications/${a.id}`),
        onEdit: (a) => {
          setEditing(a);
          setDialogOpen(true);
        },
        onChangeStatus: (a) => setStatusTarget(a),
        onDelete: (a) => setDeleting(a),
      }),
    [navigate]
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
      <PageHeader title="Visa Applications" description="Track every application through the embassy workflow.">
        <PermissionGate permission="applications.create">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Application
          </Button>
        </PermissionGate>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {APPLICATION_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {visaTypes && (
          <Select value={visaTypeId} onValueChange={setVisaTypeId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Visa type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All visa types</SelectItem>
              {visaTypes.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name} ({v.code})</SelectItem>
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
        searchPlaceholder="Search app #, customer, reference..."
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

      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <ChangeStatusDialog
        open={!!statusTarget}
        onOpenChange={(o) => !o && setStatusTarget(null)}
        application={statusTarget}
        isSubmitting={changeStatus.isPending}
        onConfirm={(status, note) =>
          statusTarget &&
          changeStatus.mutate(
            { id: statusTarget.id, body: { status, note } },
            { onSuccess: () => setStatusTarget(null) }
          )
        }
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete application?"
        description={deleting ? `${deleting.applicationNumber} will be archived (soft delete).` : ""}
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
