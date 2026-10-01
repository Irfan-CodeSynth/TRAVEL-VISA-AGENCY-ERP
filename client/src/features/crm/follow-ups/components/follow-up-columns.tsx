import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { formatDate, cn } from "@/lib/utils";
import { FOLLOW_UP_PRIORITY_MAP, FOLLOW_UP_STATUS_MAP } from "../constants";
import type { FollowUp } from "../types";

export interface FollowUpRowActions {
  onComplete: (fu: FollowUp) => void;
  onEdit: (fu: FollowUp) => void;
  onDelete: (fu: FollowUp) => void;
}

export function followUpRelatedLabel(fu: Pick<FollowUp, "customer" | "lead">) {
  const target = fu.customer ?? fu.lead;
  if (!target) return "—";
  const label = fu.customer ? "CUS" : "LEAD";
  const num = "customerNumber" in target ? target.customerNumber : target.leadNumber;
  const fullNameStr = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.companyName || "";
  return `${fullNameStr || label} · ${num}`;
}

export function getFollowUpColumns(actions: FollowUpRowActions): ColumnDef<FollowUp>[] {
  return [
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.subject}</p>
          <p className="text-xs text-muted-foreground">{followUpRelatedLabel(row.original)}</p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-sm capitalize">{row.original.type.toLowerCase()}</span>
      ),
    },
    {
      accessorKey: "scheduledAt",
      header: "Scheduled",
      cell: ({ row }) => {
        const fu = row.original;
        const overdue = fu.status === "PENDING" && new Date(fu.scheduledAt) < new Date();
        return (
          <span className={cn("text-sm", overdue && "font-medium text-destructive")}>
            {formatDate(fu.scheduledAt, "MMM dd, yyyy p")}
          </span>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <StatusBadge value={row.original.priority} map={FOLLOW_UP_PRIORITY_MAP} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={FOLLOW_UP_STATUS_MAP} />,
    },
    {
      id: "assignee",
      header: "Assignee",
      cell: ({ row }) => {
        const u = row.original.assignedToUser;
        return u ? (
          <span className="text-sm">{u.firstName} {u.lastName}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const fu = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="follow_ups.edit">
              {fu.status === "PENDING" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-1 h-8 text-teal-600 hover:text-teal-700 dark:text-teal-400"
                  onClick={() => actions.onComplete(fu)}
                  disabled={false}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(fu)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <PermissionGate permission="follow_ups.edit">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => actions.onDelete(fu)}
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
