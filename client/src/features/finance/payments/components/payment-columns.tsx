import { Link } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, MoreHorizontal, Trash2, Undo2, XCircle } from "lucide-react";
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
import { PAYMENT_METHOD_MAP, PAYMENT_STATUS_MAP } from "../../shared/constants";
import type { Payment } from "../types";

export function getPaymentColumns(actions: {
  onRefund: (p: Payment) => void;
  onDelete: (p: Payment) => void;
  onConfirm: (p: Payment) => void;
  onFail: (p: Payment) => void;
}): ColumnDef<Payment>[] {
  return [
    {
      accessorKey: "paymentNumber",
      header: "Payment",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{p.paymentNumber}</span>
              {p.isRefund && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-600">
                  <Undo2 className="h-3 w-3" /> Refund
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</p>
          </div>
        );
      },
    },
    {
      id: "invoice",
      header: "Invoice",
      cell: ({ row }) =>
        row.original.invoice ? (
          <Link
            to={`/finance/invoices/${row.original.invoice.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {row.original.invoice.invoiceNumber}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className={cn("tabular-nums", row.original.isRefund && "text-purple-600 font-medium")}>
          {row.original.isRefund ? "-" : ""}
          {formatCurrency(Number(row.original.amount), row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => <StatusBadge value={row.original.method} map={PAYMENT_METHOD_MAP} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={PAYMENT_STATUS_MAP} />,
    },
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => row.original.reference ?? "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const p = row.original;
        const refundable = !p.isRefund && p.status === "COMPLETED";
        const deletable = p.status !== "COMPLETED";
        const pending = p.status === "PENDING";
        if (!refundable && !deletable) return null;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="payments.create">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {pending && (
                    <>
                      <DropdownMenuItem onClick={() => actions.onConfirm(p)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actions.onFail(p)}>
                        <XCircle className="mr-2 h-4 w-4" /> Mark failed
                      </DropdownMenuItem>
                    </>
                  )}
                  {refundable && (
                    <PermissionGate permission="payments.refund">
                      <DropdownMenuItem onClick={() => actions.onRefund(p)}>
                        <Undo2 className="mr-2 h-4 w-4" /> Refund
                      </DropdownMenuItem>
                    </PermissionGate>
                  )}
                  {deletable && (
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(p)}
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
