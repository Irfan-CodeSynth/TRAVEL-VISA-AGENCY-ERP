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
import { PACKAGE_TYPE_OPTIONS } from "../../shared/constants";
import { useCreate, useDelete, useList, useUpdate } from "../hooks/use-packages";
import { getPackageColumns } from "./package-columns";
import { PackageDialog } from "./package-dialog";
import type { TravelPackage } from "../types";

const ALL = "all";

export default function PackagesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TravelPackage | null>(null);
  const [deleting, setDeleting] = useState<TravelPackage | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, type]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (type !== ALL) p.type = type;
    return p;
  }, [page, limit, debouncedSearch, type]);

  const { data, isLoading } = useList(params);
  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();

  const columns = useMemo(
    () =>
      getPackageColumns({
        onEdit: (p) => {
          setEditing(p);
          setDialogOpen(true);
        },
        onDelete: (p) => setDeleting(p),
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
      <PageHeader title="Packages" description="Umrah, Hajj, tour and custom travel packages.">
        <PermissionGate permission="packages.manage">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Package
          </Button>
        </PermissionGate>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {PACKAGE_TYPE_OPTIONS.map((o) => (
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
        searchPlaceholder="Search name, code, destination..."
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

      <PackageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pkg={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete package?"
        description={deleting ? `${deleting.name} will be archived (soft delete).` : ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        isLoading={remove.isPending}
      />
    </div>
  );
}
