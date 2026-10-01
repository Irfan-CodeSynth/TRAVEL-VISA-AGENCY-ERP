import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { cn } from "@/lib/utils";
import { formatDateTime } from "../../visa/appointments/components/appointment-columns";
import { CHANNEL_MAP, COMM_DIRECTION_MAP, COMM_STATUS_MAP } from "../shared/constants";
import type { Communication } from "../types";

export function getCommunicationColumns(actions: {
  onEdit: (c: Communication) => void;
  onDelete: (c: Communication) => void;
}): ColumnDef<Communication>[] {
  return [
    {
      accessorKey: "subject",
      header: "Communication",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{c.subject}</p>
            {c.body && (
              <p className="max-w-80 truncate text-xs text-muted-foreground" title={c.body}>
                {c.body}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "channel",
      header: "Channel",
      cell: ({ row }) => <StatusBadge value={row.original.channel} map={CHANNEL_MAP} />,
    },
    {
      accessorKey: "direction",
      header: "Direction",
      cell: ({ row }) => <StatusBadge value={row.original.direction} map={COMM_DIRECTION_MAP} />,
    },
    {
      id: "with",
      header: "With",
      cell: ({ row }) => {
        const c = row.original;
        const label = c.customer
          ? [c.customer.firstName, c.customer.lastName].filter(Boolean).join(" ") ||
            c.customer.companyName ||
            "Customer"
          : c.lead
            ? [c.lead.firstName, c.lead.lastName].filter(Boolean).join(" ") || c.lead.leadNumber
            : c.application?.applicationNumber ?? null;
        return <span className="text-sm">{label ?? "—"}</span>;
      },
    },
    {
      accessorKey: "occurredAt",
      header: "When",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(row.original.occurredAt)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={COMM_STATUS_MAP} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="communications.create">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(c)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn("text-destructive focus:text-destructive")}
                    onClick={() => actions.onDelete(c)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGate>
          </div>
        );
      },
    },
  ];
}
