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
import { QUOTATION_STATUS_MAP } from "../../shared/constants";
import { quotationCustomerName, type Quotation } from "../types";

export function getQuotationColumns(actions: {
  onEdit: (q: Quotation) => void;
  onDelete: (q: Quotation) => void;
}): ColumnDef<Quotation>[] {
  return [
    {
      accessorKey: "quotationNumber",
      header: "Quotation",
      cell: ({ row }) => (
        <div>
          <Link
            to={`/finance/quotations/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.quotationNumber}
          </Link>
          <p className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => quotationCustomerName(row.original.customer),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={QUOTATION_STATUS_MAP} />,
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) =>
        formatCurrency(Number(row.original.totalAmount), row.original.currencyCode),
    },
    {
      accessorKey: "validUntil",
      header: "Valid until",
      cell: ({ row }) =>
        row.original.validUntil ? formatDate(row.original.validUntil) : "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const quotation = row.original;
        const editable = quotation.status === "DRAFT";
        return (
          <div className="flex justify-end">
            <PermissionGate permission="quotations.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!editable}
                    onClick={() => actions.onEdit(quotation)}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn("text-destructive focus:text-destructive")}
                    onClick={() => actions.onDelete(quotation)}
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
