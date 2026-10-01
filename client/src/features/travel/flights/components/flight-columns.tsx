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
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Flight } from "../types";

export function getFlightColumns(actions: {
  onEdit: (f: Flight) => void;
  onDelete: (f: Flight) => void;
}): ColumnDef<Flight>[] {
  return [
    {
      accessorKey: "airline",
      header: "Flight",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {row.original.airline} <span className="text-muted-foreground">{row.original.flightNumber}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {[row.original.originCity, row.original.destinationCity].filter(Boolean).join(" → ") || "—"}
          </p>
        </div>
      ),
    },
    {
      id: "schedule",
      header: "Schedule",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.departureTime ? formatDate(row.original.departureTime) : "—"}</p>
          {row.original.arrivalTime && (
            <p className="text-xs text-muted-foreground">Arr {formatDate(row.original.arrivalTime)}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "classType",
      header: "Class",
      cell: ({ row }) =>
        row.original.classType ? (
          <Badge variant="outline">{row.original.classType}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "baseFare",
      header: "Base fare",
      cell: ({ row }) =>
        row.original.baseFare != null
          ? formatCurrency(Number(row.original.baseFare), row.original.currencyCode)
          : "—",
    },
    {
      accessorKey: "seatsAvailable",
      header: "Seats",
      cell: ({ row }) => row.original.seatsAvailable ?? "—",
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
        const flight = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="flights.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(flight)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <PermissionGate permission="flights.delete">
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(flight)}
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
