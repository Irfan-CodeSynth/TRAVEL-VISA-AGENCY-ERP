import { Link } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, Check, MoreHorizontal, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_MAP, APPOINTMENT_TYPE_MAP } from "../../shared/constants";
import type { Appointment } from "../types";

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export interface AppointmentRowActions {
  onEdit: (a: Appointment) => void;
  onComplete: (a: Appointment) => void;
  onReschedule: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
  onDelete: (a: Appointment) => void;
}

export function getAppointmentColumns(actions: AppointmentRowActions): ColumnDef<Appointment>[] {
  return [
    {
      accessorKey: "subject",
      header: "Appointment",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div>
            <p className="font-medium">{a.subject}</p>
            <p className="text-xs text-muted-foreground">
              {APPOINTMENT_TYPE_MAP[a.type]?.label}
              {a.location ? ` · ${a.location}` : ""}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "scheduledAt",
      header: "Scheduled",
      cell: ({ row }) => {
        const a = row.original;
        const overdue = a.status === "SCHEDULED" && new Date(a.scheduledAt) < new Date();
        return (
          <span className={cn("text-sm", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
            {formatDateTime(a.scheduledAt)}
            {overdue && " · overdue"}
          </span>
        );
      },
    },
    {
      id: "related",
      header: "Related",
      cell: ({ row }) => {
        const a = row.original;
        if (a.application) {
          return (
            <Link to={`/visa/applications/${a.application.id}`} className="font-mono text-xs text-primary hover:underline">
              {a.application.applicationNumber}
            </Link>
          );
        }
        if (a.customer) {
          return (
            <Link to={`/crm/customers/${a.customer.id}`} className="text-sm text-primary hover:underline">
              {[a.customer.firstName, a.customer.lastName].filter(Boolean).join(" ")}
            </Link>
          );
        }
        return <span className="text-sm text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusBadge value={row.original.status} map={APPOINTMENT_STATUS_MAP} />
          {row.original.rescheduleCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              {row.original.rescheduleCount}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const a = row.original;
        const open = a.status === "SCHEDULED" || a.status === "RESCHEDULED";
        return (
          <div className="flex justify-end">
            <PermissionGate permission="appointments.edit">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => actions.onEdit(a)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  {open && (
                    <>
                      <DropdownMenuItem onClick={() => actions.onComplete(a)}>
                        <Check className="mr-2 h-4 w-4" /> Mark completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actions.onReschedule(a)}>
                        <CalendarClock className="mr-2 h-4 w-4" /> Reschedule
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => actions.onCancel(a)}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                      </DropdownMenuItem>
                    </>
                  )}
                  <PermissionGate permission="appointments.delete">
                    <DropdownMenuItem
                      className={cn("text-destructive focus:text-destructive")}
                      onClick={() => actions.onDelete(a)}
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
