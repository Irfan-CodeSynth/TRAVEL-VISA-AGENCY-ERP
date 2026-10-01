import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCreate, useDelete, useList, useUpdate, useInvalidateCountryReference } from "../hooks/use-countries";
import { getCountryColumns } from "./country-columns";
import { CountryDialog } from "./country-dialog";
import type { Country } from "../types";

export default function CountriesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Country | null>(null);
  const [deleting, setDeleting] = useState<Country | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [page, limit, debouncedSearch]);

  const { data, isLoading } = useList(params);
  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();
  const invalidateRef = useInvalidateCountryReference();

  const columns = useMemo(
    () =>
      getCountryColumns({
        onEdit: (c) => {
          setEditing(c);
          setDialogOpen(true);
        },
        onDelete: (c) => setDeleting(c),
      }),
    []
  );

  const handleSubmit = (values: any) => {
    const done = { onSuccess: () => { setDialogOpen(false); invalidateRef(); } };
    if (editing) update.mutate({ id: editing.id, data: values }, done);
    else create.mutate(values, done);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Countries" description="Destination countries used across visas, packages and leads.">
        <PermissionGate permission="visa.manage">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Country
          </Button>
        </PermissionGate>
      </PageHeader>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        searchKey="global"
        searchPlaceholder="Search name or code..."
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

      <CountryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        country={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete country?"
        description={deleting ? `${deleting.flagEmoji ?? ""} ${deleting.name} (${deleting.code}) — only possible if nothing references it.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
              invalidateRef();
            },
          })
        }
        isLoading={remove.isPending}
      />
    </div>
  );
}
