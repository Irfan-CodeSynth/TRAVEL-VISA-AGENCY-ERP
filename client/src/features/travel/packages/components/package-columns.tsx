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
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { cn, formatCurrency } from "@/lib/utils";
import { PACKAGE_TYPE_MAP } from "../../shared/constants";
import type { TravelPackage } from "../types";

export function getPackageColumns(actions: {
  onEdit: (p: TravelPackage) => void;
  onDelete: (p: TravelPackage) => void;
}): ColumnDef<TravelPackage>[] {
  return [
    {
      accessorKey: "name",
      header: "Package",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.code && <p className="text-xs text-muted-foreground">{row.original.code}</p>}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) =>
        row.original.type ? <StatusBadge value={row.original.type} map={PACKAGE_TYPE_MAP} /> : "—",
    },
    {
      accessorKey: "destination",
      header: "Destination",
      cell: ({ row }) => row.original.destination ?? "—",
    },
    {
      accessorKey: "durationDays",
      header: "Duration",
      cell: ({ row }) => (row.original.durationDays ? `${row.original.durationDays} days` : "—"),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) =>
        row.original.price != null
          ? formatCurrency(Number(row.original.price), row.original.currencyCode)
          : "—",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const pkg = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="packages.manage">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(pkg)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn("text-destructive focus:text-destructive")}
                    onClick={() => actions.onDelete(pkg)}
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
