import { Link } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { BadgeCheck, CircleDollarSign, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
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
import { COMMISSION_STATUS_MAP } from "../../shared/constants";
import type { Commission } from "../types";

export function getCommissionColumns(actions: {
  onApprove: (c: Commission) => void;
  onReject: (c: Commission) => void;
  onPay: (c: Commission) => void;
  onDelete: (c: Commission) => void;
}): ColumnDef<Commission>[] {
  return [
    {
      accessorKey: "commissionNumber",
      header: "Commission",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div>
            <p className="font-medium">{c.commissionNumber}</p>
            <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
          </div>
        );
      },
    },
    {
      id: "agent",
      header: "Agent",
      cell: ({ row }) => row.original.agent?.name ?? "—",
    },
    {
      id: "source",
      header: "Source",
      cell: ({ row }) => {
        const c = row.original;
        if (c.booking) {
          return (
            <Link to={`/travel/bookings/${c.booking.id}`} className="text-sm text-primary hover:underline">
              {c.booking.bookingNumber}
            </Link>
          );
        }
        if (c.invoice) {
          return (
            <Link to={`/finance/invoices/${c.invoice.id}`} className="text-sm text-primary hover:underline">
              {c.invoice.invoiceNumber}
            </Link>
          );
        }
        return <span className="text-sm text-muted-foreground">Manual</span>;
      },
    },
    {
      id: "calc",
      header: "Basis",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <span className="text-sm text-muted-foreground tabular-nums">
            {c.type === "PERCENTAGE" && c.rate ? `${Number(c.rate)}% of ` : ""}
            {formatCurrency(Number(c.baseAmount), c.currencyCode)}
          </span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(Number(row.original.amount), row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={COMMISSION_STATUS_MAP} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const c = row.original;
        const pending = c.status === "PENDING";
        const approved = c.status === "APPROVED";
        const deletable = c.status !== "PAID";
        return (
          <div className="flex justify-end">
            <PermissionGate permission="commissions.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(pending || approved) && (
                    <DropdownMenuItem onClick={() => actions.onApprove(c)}>
                      <BadgeCheck className="mr-2 h-4 w-4" /> Approve
                    </DropdownMenuItem>
                  )}
                  {approved && (
                    <DropdownMenuItem onClick={() => actions.onPay(c)}>
                      <CircleDollarSign className="mr-2 h-4 w-4" /> Mark paid
                    </DropdownMenuItem>
                  )}
                  {(pending || approved) && (
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onReject(c)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Reject
                    </DropdownMenuItem>
                  )}
                  {deletable && (
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(c)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGate>
          </div>
        );
      },
    },
  ];
}
