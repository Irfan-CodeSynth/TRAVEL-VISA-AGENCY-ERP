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
import { PermissionGate } from "@/components/shared/permission-gate";
import { cn } from "@/lib/utils";
import type { Country } from "../types";

export function getCountryColumns(actions: {
  onEdit: (c: Country) => void;
  onDelete: (c: Country) => void;
}): ColumnDef<Country>[] {
  return [
    {
      accessorKey: "name",
      header: "Country",
      cell: ({ row }) => (
        <span className="font-medium">
          <span className="mr-2">{row.original.flagEmoji || "🏳️"}</span>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
      accessorKey: "region",
      header: "Region",
      cell: ({ row }) => row.original.region ?? <span className="text-muted-foreground">—</span>,
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
        const country = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="visa.manage">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(country)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn("text-destructive focus:text-destructive")}
                    onClick={() => actions.onDelete(country)}
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
