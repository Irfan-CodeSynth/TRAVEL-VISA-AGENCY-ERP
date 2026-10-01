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
import { CABIN_LABEL } from "../constants";
import type { FlightFare } from "../types";

export function getFareColumns(
  actions: {
    onEdit: (f: FlightFare) => void;
    onDelete: (f: FlightFare) => void;
  },
  opts: { canSeeMargin: boolean }
): ColumnDef<FlightFare>[] {
  const cols: ColumnDef<FlightFare>[] = [
    {
      accessorKey: "flightNumber",
      header: "Flight",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {row.original.airline.name}{" "}
            <span className="text-muted-foreground">{row.original.flightNumber}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.originAirport.iataCode} → {row.original.destinationAirport.iataCode}
          </p>
        </div>
      ),
    },
    {
      id: "schedule",
      header: "Departure",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{formatDate(row.original.departureTime, "MMM dd, yyyy HH:mm")}</p>
          {row.original.arrivalTime && (
            <p className="text-xs text-muted-foreground">Arr {formatDate(row.original.arrivalTime, "MMM dd, HH:mm")}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "cabinClass",
      header: "Cabin",
      cell: ({ row }) => <Badge variant="outline">{CABIN_LABEL[row.original.cabinClass] ?? row.original.cabinClass}</Badge>,
    },
    {
      accessorKey: "sellingPrice",
      header: "Sell price",
      cell: ({ row }) => (
        <span className="font-medium">
          {formatCurrency(row.original.sellingPrice, row.original.currencyCode)}
        </span>
      ),
    },
  ];

  if (opts.canSeeMargin) {
    cols.push({
      id: "baseFare",
      header: "Cost",
      cell: ({ row }) =>
        row.original.baseFare != null
          ? formatCurrency(Number(row.original.baseFare), row.original.currencyCode)
          : "—",
    });
    cols.push({
      id: "margin",
      header: "Margin",
      cell: ({ row }) => {
        const t = row.original.marginType;
        const v = row.original.marginValue;
        const applied = row.original.marginApplied;
        if (!t) return <span className="text-xs text-muted-foreground">default</span>;
        return (
          <div className="text-sm">
            <span>{t === "PERCENT" ? `${v}%` : formatCurrency(Number(v), row.original.currencyCode)}</span>
            {applied != null && (
              <span className="ml-1 text-xs text-muted-foreground">
                (+{formatCurrency(applied, row.original.currencyCode)})
              </span>
            )}
          </div>
        );
      },
    });
  }

  cols.push({
    id: "seats",
    header: "Seats",
    cell: ({ row }) =>
      row.original.seatsLeft === null ? (
        <Badge variant="secondary">Unlimited</Badge>
      ) : (
        <span className={cn(row.original.seatsLeft === 0 && "text-destructive")}>
          {row.original.seatsLeft} left
        </span>
      ),
  });

  cols.push({
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) =>
      row.original.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>,
  });

  cols.push({
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const fare = row.original;
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
                <DropdownMenuItem onClick={() => actions.onEdit(fare)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <PermissionGate permission="flights.delete">
                  <DropdownMenuItem
                    className={cn("text-destructive focus:text-destructive")}
                    onClick={() => actions.onDelete(fare)}
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
  });

  return cols;
}
