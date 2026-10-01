import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
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
import { EXPENSE_STATUS_MAP, PAYMENT_METHOD_MAP } from "../../shared/constants";
import type { Expense } from "../types";

export function getExpenseColumns(actions: {
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
  onApprove: (e: Expense) => void;
  onReject: (e: Expense) => void;
}): ColumnDef<Expense>[] {
  return [
    {
      accessorKey: "expenseNumber",
      header: "Expense",
      cell: ({ row }) => {
        const e = row.original;
        return (
          <div>
            <p className="font-medium">{e.expenseNumber}</p>
            <p className="text-xs text-muted-foreground">
              {e.title || e.category} · {formatDate(e.expenseDate)}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <span className="text-sm">{row.original.category}</span>,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(Number(row.original.amount), row.original.currencyCode),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) =>
        row.original.paymentMethod ? (
          <StatusBadge value={row.original.paymentMethod} map={PAYMENT_METHOD_MAP} />
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={EXPENSE_STATUS_MAP} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const e = row.original;
        const pending = e.status === "PENDING";
        return (
          <div className="flex justify-end">
            <PermissionGate permission="expenses.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={!pending} onClick={() => actions.onEdit(e)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <PermissionGate permission="expenses.edit">
                    <DropdownMenuItem disabled={!pending} onClick={() => actions.onApprove(e)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!pending}
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onReject(e)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" /> Reject
                    </DropdownMenuItem>
                  </PermissionGate>
                  <DropdownMenuItem
                    disabled={e.status === "APPROVED"}
                    className={cn("text-destructive focus:text-destructive")}
                    onClick={() => actions.onDelete(e)}
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
