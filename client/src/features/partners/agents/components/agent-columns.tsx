import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { PermissionGate } from "@/components/shared/permission-gate";
import { cn } from "@/lib/utils";
import type { Agent } from "../types";

export function getAgentColumns(actions: {
  onEdit: (a: Agent) => void;
  onDelete: (a: Agent) => void;
}): ColumnDef<Agent>[] {
  return [
    {
      accessorKey: "name",
      header: "Agent",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.company && <p className="text-xs text-muted-foreground">{row.original.company}</p>}
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.phone ?? "—"}</p>
          {row.original.email && <p className="text-xs text-muted-foreground">{row.original.email}</p>}
        </div>
      ),
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => (
        <span className="text-sm">
          {[row.original.city, row.original.country].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      id: "commission",
      header: "Commission",
      cell: ({ row }) => {
        const a = row.original;
        if (!a.commissionRate) return <span className="text-muted-foreground">—</span>;
        return a.commissionType === "PERCENTAGE" ? (
          <span className="text-sm font-medium">{Number(a.commissionRate)}%</span>
        ) : (
          <CurrencyDisplay amount={Number(a.commissionRate)} currency={a.currencyCode} />
        );
      },
    },
    {
      id: "commissions",
      header: "Deals",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original._count?.commissions ?? 0}</span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const agent = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="agents.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(agent)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <PermissionGate permission="agents.delete">
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(agent)}
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
