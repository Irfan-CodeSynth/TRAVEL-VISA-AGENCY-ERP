import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { PermissionGate } from "@/components/shared/permission-gate";
import { formatDate, cn } from "@/lib/utils";
import { LEAD_SOURCE_LABELS } from "../../shared/constants";
import { LEAD_STATUS_MAP } from "../../shared/constants";
import type { Lead } from "../types";

export interface LeadRowActions {
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onLose: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

export function getLeadColumns(actions: LeadRowActions): ColumnDef<Lead>[] {
  return [
    {
      accessorKey: "leadNumber",
      header: "Lead #",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.leadNumber}</span>
      ),
    },
    {
      id: "name",
      accessorFn: (lead) => `${lead.firstName} ${lead.lastName ?? ""}`.trim(),
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const lead = row.original;
        return (
          <div>
            <p className="font-medium">{lead.firstName} {lead.lastName}</p>
            {lead.companyName && <p className="text-xs text-muted-foreground">{lead.companyName}</p>}
          </div>
        );
      },
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.phone}</p>
          {row.original.email && <p className="text-xs text-muted-foreground">{row.original.email}</p>}
        </div>
      ),
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="text-sm">{LEAD_SOURCE_LABELS[row.original.source] ?? row.original.source}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={LEAD_STATUS_MAP} />,
    },
    {
      id: "destination",
      header: "Destination",
      cell: ({ row }) => {
        const dest = row.original.interestedDestination;
        return dest ? (
          <span className="text-sm">{dest.flagEmoji} {dest.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "estimatedBudget",
      header: "Budget",
      cell: ({ row }) => {
        const { estimatedBudget, budgetCurrencyCode } = row.original;
        return estimatedBudget ? (
          <CurrencyDisplay amount={Number(estimatedBudget)} currency={budgetCurrencyCode ?? undefined} />
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
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
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const lead = row.original;
        const decided = lead.status === "WON" || lead.status === "LOST";
        return (
          <div className="flex justify-end">
            <PermissionGate permission="leads.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(lead)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  {!decided && (
                    <PermissionGate permission="leads.convert">
                      <DropdownMenuItem onClick={() => actions.onConvert(lead)}>
                        <Check className="mr-2 h-4 w-4" /> Convert to customer
                      </DropdownMenuItem>
                    </PermissionGate>
                  )}
                  {!decided && (
                    <DropdownMenuItem onClick={() => actions.onLose(lead)}>
                      <X className="mr-2 h-4 w-4" /> Mark lost
                    </DropdownMenuItem>
                  )}
                  <PermissionGate permission="leads.delete">
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(lead)}
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
