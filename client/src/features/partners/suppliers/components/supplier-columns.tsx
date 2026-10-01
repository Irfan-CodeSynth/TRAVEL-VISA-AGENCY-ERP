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
import { cn } from "@/lib/utils";
import { SUPPLIER_TYPE_MAP } from "../../shared/constants";
import type { Supplier } from "../types";

export function getSupplierColumns(actions: {
  onEdit: (s: Supplier) => void;
  onDelete: (s: Supplier) => void;
}): ColumnDef<Supplier>[] {
  return [
    {
      accessorKey: "name",
      header: "Supplier",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.contactPerson && (
            <p className="text-xs text-muted-foreground">{row.original.contactPerson}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <StatusBadge value={row.original.type} map={SUPPLIER_TYPE_MAP} />,
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
      cell: ({ row }) => {
        const { city, country } = row.original;
        return (
          <span className="text-sm">
            {[city, country].filter(Boolean).join(", ") || "—"}
          </span>
        );
      },
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
        const supplier = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="suppliers.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(supplier)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <PermissionGate permission="suppliers.delete">
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(supplier)}
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
