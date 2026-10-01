import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
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
import { DOCUMENT_STATUS_OPTIONS, DOCUMENT_TYPE_OPTIONS } from "../shared/constants";
import { useAction, useCreate, useDelete, useList, useUpdate } from "../hooks/use-documents";
import { documentsApi } from "../services/documents.api";
import { getDocumentColumns } from "./document-columns";
import { DocumentDialog } from "./document-dialog";
import { RejectDocumentDialog } from "./reject-document-dialog";
import type { Document } from "../types";

const ALL = "all";

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [expiringSoon, setExpiringSoon] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState<Document | null>(null);
  const [verifying, setVerifying] = useState<Document | null>(null);
  const [expiring, setExpiring] = useState<Document | null>(null);
  const [rejecting, setRejecting] = useState<Document | null>(null);
  const [movingPending, setMovingPending] = useState<Document | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, type, expiringSoon]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (status !== ALL) p.status = status;
    if (type !== ALL) p.type = type;
    if (expiringSoon) p.expiringSoon = "true";
    return p;
  }, [page, limit, debouncedSearch, status, type, expiringSoon]);

  const { data, isLoading } = useList(params);
  const upload = useCreate();
  const update = useUpdate();
  const remove = useDelete();
  const verify = useAction<Document>(
    (id, body) => documentsApi.changeStatus(id, body),
    "Document verified"
  );
  const reject = useAction<Document>(
    (id, body) => documentsApi.changeStatus(id, body),
    "Document rejected"
  );
  const expire = useAction<Document>(
    (id, body) => documentsApi.changeStatus(id, body),
    "Document marked expired"
  );
  const movePending = useAction<Document>(
    (id, body) => documentsApi.changeStatus(id, body),
    "Document moved to pending"
  );

  const columns = useMemo(
    () =>
      getDocumentColumns({
        onDownload: (d) =>
          documentsApi.download(d).catch((err: any) =>
            toast.error(err?.response?.data?.message ?? "Download failed")
          ),
        onVerify: (d) => setVerifying(d),
        onReject: (d) => setRejecting(d),
        onExpire: (d) => setExpiring(d),
        onReopen: (d) => setMovingPending(d),
        onEdit: (d) => {
          setEditing(d);
          setDialogOpen(true);
        },
        onDelete: (d) => setDeleting(d),
      }),
    []
  );

  const handleSubmit = (payload: FormData | any) => {
    const onSuccess = () => setDialogOpen(false);
    if (editing) {
      update.mutate({ id: editing.id, data: payload }, { onSuccess });
    } else {
      upload.mutate(payload, { onSuccess });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Customer and application files with a verification workflow.">
        <PermissionGate permission="documents.upload">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Upload className="mr-2 h-4 w-4" /> Upload document
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
            {DOCUMENT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {DOCUMENT_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={expiringSoon ? "default" : "outline"}
          size="sm"
          onClick={() => setExpiringSoon((v) => !v)}
        >
          Expiring within 30 days
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        searchKey="global"
        searchPlaceholder="Search title, file name..."
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

      <DocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        document={editing}
        onSubmit={handleSubmit}
        isSubmitting={upload.isPending || update.isPending}
      />

      <RejectDocumentDialog
        document={rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        isSubmitting={reject.isPending}
        onSubmit={(reason) =>
          rejecting &&
          reject.mutate(
            { id: rejecting.id, body: { status: "REJECTED", rejectReason: reason } },
            { onSuccess: () => setRejecting(null) }
          )
        }
      />

      <ConfirmDialog
        open={!!verifying}
        onOpenChange={(o) => !o && setVerifying(null)}
        title="Verify document?"
        description={verifying ? `${verifying.title} will be marked as verified.` : ""}
        confirmLabel="Verify"
        onConfirm={() =>
          verifying &&
          verify.mutate(
            { id: verifying.id, body: { status: "VERIFIED" } },
            { onSuccess: () => setVerifying(null) }
          )
        }
        isLoading={verify.isPending}
      />

      <ConfirmDialog
        open={!!expiring}
        onOpenChange={(o) => !o && setExpiring(null)}
        title="Mark document expired?"
        description={expiring ? `${expiring.title} will be marked expired.` : ""}
        confirmLabel="Mark expired"
        onConfirm={() =>
          expiring &&
          expire.mutate(
            { id: expiring.id, body: { status: "EXPIRED" } },
            { onSuccess: () => setExpiring(null) }
          )
        }
        isLoading={expire.isPending}
      />

      <ConfirmDialog
        open={!!movingPending}
        onOpenChange={(o) => !o && setMovingPending(null)}
        title="Move back to pending?"
        description={movingPending ? `${movingPending.title} will return to the verification queue.` : ""}
        confirmLabel="Move to pending"
        onConfirm={() =>
          movingPending &&
          movePending.mutate(
            { id: movingPending.id, body: { status: "PENDING" } },
            { onSuccess: () => setMovingPending(null) }
          )
        }
        isLoading={movePending.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete document?"
        description={
          deleting
            ? `${deleting.title} (${deleting.fileName}) and its stored file will be removed.`
            : ""
        }
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
