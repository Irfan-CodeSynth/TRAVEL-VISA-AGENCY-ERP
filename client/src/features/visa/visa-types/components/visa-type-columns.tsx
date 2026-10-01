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
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { PermissionGate } from "@/components/shared/permission-gate";
import { cn } from "@/lib/utils";
import type { VisaType } from "../types";

export function getVisaTypeColumns(actions: {
  onEdit: (v: VisaType) => void;
  onDelete: (v: VisaType) => void;
}): ColumnDef<VisaType>[] {
  return [
    {
      id: "country",
      header: "Country",
      cell: ({ row }) => {
        const c = row.original.country;
        return c ? (
          <span className="text-sm">{c.flagEmoji} {c.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "Visa type",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.category && (
            <p className="text-xs text-muted-foreground">{row.original.category}</p>
          )}
        </div>
      ),
    },
    {
      id: "stay",
      header: "Stay / Validity",
      cell: ({ row }) => {
        const { allowedStayDays, validityDays } = row.original;
        return (
          <span className="text-sm">
            {allowedStayDays ? `${allowedStayDays}d` : "—"} / {validityDays ? `${validityDays}d` : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "processingDays",
      header: "Processing",
      cell: ({ row }) =>
        row.original.processingDays != null ? (
          <span className="text-sm">{row.original.processingDays} days</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) =>
        row.original.price ? (
          <CurrencyDisplay amount={Number(row.original.price)} currency={row.original.currencyCode} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const visaType = row.original;
        return (
          <div className="flex justify-end">
            <PermissionGate permission="visa.manage">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(visaType)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn("text-destructive focus:text-destructive")}
                    onClick={() => actions.onDelete(visaType)}
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
