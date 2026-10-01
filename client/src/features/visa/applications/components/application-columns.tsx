import { Link } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { PermissionGate } from "@/components/shared/permission-gate";
import { cn, formatDate } from "@/lib/utils";
import { APPLICATION_STATUS_MAP } from "../../shared/constants";
import type { Application } from "../types";

export interface ApplicationRowActions {
  onView: (a: Application) => void;
  onEdit: (a: Application) => void;
  onChangeStatus: (a: Application) => void;
  onDelete: (a: Application) => void;
}

const TERMINAL: string[] = ["APPROVED", "REJECTED", "WITHDRAWN"];

export function getApplicationColumns(actions: ApplicationRowActions): ColumnDef<Application>[] {
  return [
    {
      accessorKey: "applicationNumber",
      header: "App #",
      cell: ({ row }) => (
        <Link
          to={`/visa/applications/${row.original.id}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.original.applicationNumber}
        </Link>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const c = row.original.customer;
        if (!c) return <span className="text-muted-foreground">—</span>;
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
        return (
          <div>
            <Link to={`/crm/customers/${c.id}`} className="font-medium hover:underline">
              {name}
            </Link>
            {c.companyName && <p className="text-xs text-muted-foreground">{c.companyName}</p>}
          </div>
        );
      },
    },
    {
      id: "visa",
      header: "Visa",
      cell: ({ row }) => {
        const vt = row.original.visaType;
        if (!vt) return <span className="text-muted-foreground">—</span>;
        return (
          <div>
            <p className="text-sm font-medium">{vt.country?.flagEmoji} {vt.name}</p>
            <p className="text-xs text-muted-foreground">{vt.code}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.status} map={APPLICATION_STATUS_MAP} />,
    },
    {
      accessorKey: "applicantCount",
      header: "Applicants",
      cell: ({ row }) => <span className="text-sm">{row.original.applicantCount}</span>,
    },
    {
      accessorKey: "totalFees",
      header: "Fees",
      cell: ({ row }) =>
        row.original.totalFees ? (
          <CurrencyDisplay amount={Number(row.original.totalFees)} currency={row.original.currencyCode} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "submissionDate",
      header: "Submitted",
      cell: ({ row }) =>
        row.original.submissionDate ? (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.submissionDate)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const application = row.original;
        const terminal = TERMINAL.includes(application.status);
        return (
          <div className="flex justify-end">
            <PermissionGate permission="applications.view">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onView(application)}>
                    <Eye className="mr-2 h-4 w-4" /> View details
                  </DropdownMenuItem>
                  <PermissionGate permission="applications.edit">
                    <DropdownMenuItem onClick={() => actions.onEdit(application)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    {!terminal && (
                      <DropdownMenuItem onClick={() => actions.onChangeStatus(application)}>
                        <Shuffle className="mr-2 h-4 w-4" /> Change status
                      </DropdownMenuItem>
                    )}
                  </PermissionGate>
                  <PermissionGate permission="applications.delete">
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(application)}
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
