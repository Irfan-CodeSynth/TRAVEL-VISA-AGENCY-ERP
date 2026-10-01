import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { cn, formatCurrency } from "@/lib/utils";
import type { Hotel } from "../types";

export function getHotelColumns(actions: {
  onEdit: (h: Hotel) => void;
  onDelete: (h: Hotel) => void;
}): ColumnDef<Hotel>[] {
  return [
    {
      accessorKey: "name",
      header: "Hotel",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            {[row.original.city, row.original.country].filter(Boolean).join(", ") || "—"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "starRating",
      header: "Rating",
      cell: ({ row }) =>
        row.original.starRating ? (
          <span className="inline-flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {row.original.starRating}
          </span>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "roomType",
      header: "Room",
      cell: ({ row }) =>
        row.original.roomType ? <Badge variant="outline">{row.original.roomType}</Badge> : "—",
    },
    {
      accessorKey: "ratePerNight",
      header: "Rate / night",
      cell: ({ row }) =>
        row.original.ratePerNight != null
          ? formatCurrency(Number(row.original.ratePerNight), row.original.currencyCode)
          : "—",
    },
    {
      accessorKey: "roomsAvailable",
      header: "Rooms",
      cell: ({ row }) => row.original.roomsAvailable ?? "—",
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
        const hotel = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="hotels.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(hotel)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <PermissionGate permission="hotels.delete">
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(hotel)}
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
