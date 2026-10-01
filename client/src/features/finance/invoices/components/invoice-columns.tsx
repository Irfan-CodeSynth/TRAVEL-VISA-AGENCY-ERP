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
import { INVOICE_STATUS_MAP } from "../../shared/constants";
import { invoiceCustomerName, type Invoice } from "../types";

export function getInvoiceColumns(actions: {
  onEdit: (i: Invoice) => void;
  onDelete: (i: Invoice) => void;
}): ColumnDef<Invoice>[] {
  return [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice",
      cell: ({ row }) => (
        <div>
          <Link
            to={`/finance/invoices/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.invoiceNumber}
          </Link>
          <p className="text-xs text-muted-foreground">
            Issued {formatDate(row.original.issueDate)}
            {row.original.dueDate ? ` · due ${formatDate(row.original.dueDate)}` : ""}
          </p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => invoiceCustomerName(row.original.customer),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={INVOICE_STATUS_MAP} />,
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) =>
        formatCurrency(Number(row.original.totalAmount), row.original.currencyCode),
    },
    {
      accessorKey: "paidAmount",
      header: "Paid",
      cell: ({ row }) =>
        formatCurrency(Number(row.original.paidAmount), row.original.currencyCode),
    },
    {
      accessorKey: "balanceDue",
      header: "Balance",
      cell: ({ row }) => {
        const balance = Number(row.original.balanceDue);
        return (
          <span className={cn("tabular-nums", balance > 0 ? "font-medium text-amber-600" : "text-muted-foreground")}>
            {formatCurrency(balance, row.original.currencyCode)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const invoice = row.original;
        const editable = invoice.status === "DRAFT";
        const deletable = Number(invoice.paidAmount) === 0;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="invoices.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={!editable} onClick={() => actions.onEdit(invoice)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!deletable}
                    className={cn("text-destructive focus:text-destructive")}
                    onClick={() => actions.onDelete(invoice)}
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
