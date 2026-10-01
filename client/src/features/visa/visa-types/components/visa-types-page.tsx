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
import { useCountryOptions } from "@/hooks/use-reference";
import { useCreate, useDelete, useList, useUpdate, useInvalidateVisaTypeReference } from "../hooks/use-visa-types";
import { getVisaTypeColumns } from "./visa-type-columns";
import { VisaTypeDialog } from "./visa-type-dialog";
import type { VisaType } from "../types";

const ALL = "all";

export default function VisaTypesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [countryId, setCountryId] = useState(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VisaType | null>(null);
  const [deleting, setDeleting] = useState<VisaType | null>(null);

  const { data: countries } = useCountryOptions();
  const invalidateRef = useInvalidateVisaTypeReference();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, countryId]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (countryId !== ALL) p.countryId = countryId;
    return p;
  }, [page, limit, debouncedSearch, countryId]);

  const { data, isLoading } = useList(params);
  const create = useCreate();
  const update = useUpdate();
  const remove = useDelete();

  const columns = useMemo(
    () =>
      getVisaTypeColumns({
        onEdit: (v) => {
          setEditing(v);
          setDialogOpen(true);
        },
        onDelete: (v) => setDeleting(v),
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
      <PageHeader title="Visa Types" description="Visa products per country: codes, fees, processing times and requirements.">
        <PermissionGate permission="visa.manage">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Visa Type
          </Button>
        </PermissionGate>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        {countries && (
          <Select value={countryId} onValueChange={setCountryId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.flagEmoji} {c.name}
                </SelectItem>
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
        searchPlaceholder="Search name, code, category..."
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

      <VisaTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        visaType={editing}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete visa type?"
        description={deleting ? `${deleting.name} (${deleting.code}) — blocked while applications reference it.` : ""}
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
