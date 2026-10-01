import { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { formatDate } from "@/lib/utils";
import { CUSTOMER_STATUS_MAP, LEAD_SOURCE_LABELS } from "../../shared/constants";
import type { Customer } from "../types";

export interface CustomerRowActions {
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function customerDisplayName(c: Pick<Customer, "firstName" | "lastName" | "companyName" | "customerType">) {  if (c.customerType === "COMPANY") return c.companyName ?? "—";
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || "—";
}

export function getCustomerColumns(actions: CustomerRowActions): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: "customerNumber",
      header: "Customer #",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.customerNumber}</span>
      ),
    },
    {
      id: "name",
      accessorFn: (c) => customerDisplayName(c),
      header: "Name",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div>
            <button
              className="font-medium hover:underline"
              onClick={() => actions.onView(c)}
            >
              {customerDisplayName(c)}
            </button>
            <p className="text-xs text-muted-foreground capitalize">
              {c.customerType === "COMPANY" ? "Company" : "Individual"}
              {c.city ? ` · ${c.city}` : ""}
            </p>
          </div>
        );
      },
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.phone}</p>
          {row.original.email && <p className="text-xs text-muted-foreground">{row.original.email}</p>}
        </div>
      ),
    },
    {
      id: "passport",
      header: "Passport",
      cell: ({ row }) => {
        const c = row.original;
        if (!c.passportNumber) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="text-sm">
            <p className="font-mono">{c.passportNumber}</p>
            {c.passportExpiry && (
              <p className="text-xs text-muted-foreground">exp {formatDate(c.passportExpiry)}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={CUSTOMER_STATUS_MAP} />,
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) =>
        row.original.source ? (
          <span className="text-sm">{LEAD_SOURCE_LABELS[row.original.source]}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "assignee",
      header: "Assignee",
      cell: ({ row }) => {
        const u = row.original.assignedToUser;
        return u ? (
          <span className="text-sm">{u.firstName} {u.lastName}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Since",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="customers.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onView(customer)}>
                    <Eye className="mr-2 h-4 w-4" /> View profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actions.onEdit(customer)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <PermissionGate permission="customers.delete">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => actions.onDelete(customer)}
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
