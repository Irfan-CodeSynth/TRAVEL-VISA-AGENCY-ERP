import { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  Clock,
  Download,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { cn, formatDate } from "@/lib/utils";
import { DOCUMENT_STATUS_MAP, DOCUMENT_TYPE_MAP, formatBytes } from "../shared/constants";
import type { Document } from "../types";

export function getDocumentColumns(actions: {
  onDownload: (d: Document) => void;
  onVerify: (d: Document) => void;
  onReject: (d: Document) => void;
  onExpire: (d: Document) => void;
  onReopen: (d: Document) => void;
  onEdit: (d: Document) => void;
  onDelete: (d: Document) => void;
}): ColumnDef<Document>[] {
  return [
    {
      accessorKey: "title",
      header: "Document",
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{d.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {d.fileName} · {formatBytes(d.sizeBytes)}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <StatusBadge value={row.original.type} map={DOCUMENT_TYPE_MAP} />,
    },
    {
      id: "linked",
      header: "Linked to",
      cell: ({ row }) => {
        const d = row.original;
        const label =
          d.customer
            ? [d.customer.firstName, d.customer.lastName].filter(Boolean).join(" ") ||
              d.customer.companyName ||
              "Customer"
            : d.application?.applicationNumber ?? d.booking?.bookingNumber ?? null;
        return <span className="text-sm">{label ?? "—"}</span>;
      },
    },
    {
      accessorKey: "expiryDate",
      header: "Expiry",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.expiryDate ? formatDate(row.original.expiryDate) : "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="space-y-0.5">
            <StatusBadge value={d.status} map={DOCUMENT_STATUS_MAP} />
            {d.status === "REJECTED" && d.rejectReason && (
              <p className="max-w-40 truncate text-xs text-muted-foreground" title={d.rejectReason}>
                {d.rejectReason}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="documents.view">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onDownload(d)}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </DropdownMenuItem>
                  <PermissionGate permission="documents.verify">
                    <DropdownMenuItem
                      disabled={!["PENDING", "EXPIRED"].includes(d.status)}
                      onClick={() => actions.onVerify(d)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Verify
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!["PENDING", "VERIFIED"].includes(d.status)}
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onReject(d)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Reject
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!["PENDING", "VERIFIED"].includes(d.status)}
                      onClick={() => actions.onExpire(d)}
                    >
                      <Clock className="mr-2 h-4 w-4" /> Mark expired
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={d.status !== "REJECTED"}
                      onClick={() => actions.onReopen(d)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Move to pending
                    </DropdownMenuItem>
                  </PermissionGate>
                  <PermissionGate permission="documents.upload">
                    <DropdownMenuItem onClick={() => actions.onEdit(d)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit details
                    </DropdownMenuItem>
                  </PermissionGate>
                  <PermissionGate permission="documents.delete">
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(d)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </PermissionGate>
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGate>
          </div>
        );
      },
    },
  ];
}
