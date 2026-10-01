import { Link } from "react-router-dom";
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
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { BOOKING_STATUS_MAP, BOOKING_TYPE_MAP, PAYMENT_STATUS_MAP } from "../../shared/constants";
import { customerName, type Booking } from "../types";

export function getBookingColumns(actions: {
  onEdit: (b: Booking) => void;
  onDelete: (b: Booking) => void;
}): ColumnDef<Booking>[] {
  return [
    {
      accessorKey: "bookingNumber",
      header: "Booking",
      cell: ({ row }) => (
        <div>
          <Link
            to={`/travel/bookings/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.bookingNumber}
          </Link>
          <p className="text-xs text-muted-foreground">
            {row.original.travelDate ? formatDate(row.original.travelDate) : formatDate(row.original.createdAt)}
          </p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => customerName(row.original.customer),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <StatusBadge value={row.original.type} map={BOOKING_TYPE_MAP} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={BOOKING_STATUS_MAP} />,
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) =>
        formatCurrency(Number(row.original.totalAmount), row.original.currencyCode),
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => <StatusBadge value={row.original.paymentStatus} map={PAYMENT_STATUS_MAP} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const booking = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="bookings.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(booking)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <PermissionGate permission="bookings.delete">
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(booking)}
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
