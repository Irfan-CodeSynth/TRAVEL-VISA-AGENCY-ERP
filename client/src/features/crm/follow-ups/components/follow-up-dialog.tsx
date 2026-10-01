import { useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DateField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { useUserOptions, fullName } from "@/hooks/use-reference";
import { NONE_OPTION } from "../../shared/constants";
import { useList as useCustomersList } from "../../customers/hooks/use-customers";
import { useList as useLeadsList } from "../../leads/hooks/use-leads";
import { customerDisplayName } from "../../customers/components/customer-columns";
import {
  FOLLOW_UP_PRIORITY_OPTIONS,
  FOLLOW_UP_STATUS_OPTIONS,
  FOLLOW_UP_TYPE_OPTIONS,
} from "../constants";
import type { FollowUp } from "../types";

const formSchema = z
  .object({
    subject: z.string().trim().min(1, "Subject is required"),
    type: z.string().optional(),
    scheduledAt: z.string().min(1, "Scheduled date is required"),
    status: z.string().optional(),
    priority: z.string().optional(),
    customerId: z.string().optional(),
    leadId: z.string().optional(),
    assignedToUserId: z.string().optional(),
    notes: z.string().trim().optional(),
  })
  .refine((d) => !!d.customerId || !!d.leadId, {
    message: "Link the follow-up to a customer or a lead",
    path: ["customerId"],
  });

type FormValues = z.input<typeof formSchema>;

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp: FollowUp | null;
  /** Pre-link to a customer or lead when opened from their profile */
  defaultCustomerId?: string | null;
  defaultLeadId?: string | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function FollowUpDialog({
  open,
  onOpenChange,
  followUp,
  defaultCustomerId,
  defaultLeadId,
  onSubmit,
  isSubmitting,
}: FollowUpDialogProps) {
  const { data: users } = useUserOptions();
  const { data: customersRes } = useCustomersList({ page: 1, limit: 100 });
  const { data: leadsRes } = useLeadsList({ page: 1, limit: 100 });

  const userOptions = useMemo(
    () => [NONE_OPTION, ...(users ?? []).map((u) => ({ value: u.id, label: fullName(u) }))],
    [users]
  );
  const customerOptions = useMemo(
    () =>
      [NONE_OPTION, ...(customersRes?.data ?? []).map((c) => ({
        value: c.id,
        label: `${customerDisplayName(c)} · ${c.customerNumber}`,
      }))],
    [customersRes]
  );
  const leadOptions = useMemo(
    () =>
      [NONE_OPTION, ...(leadsRes?.data ?? []).map((l) => ({
        value: l.id,
        label: `${l.firstName} ${l.lastName ?? ""}${l.companyName ? ` (${l.companyName})` : ""} · ${l.leadNumber}`,
      }))],
    [leadsRes]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: "CALL", priority: "MEDIUM", status: "PENDING" },
  });

  useEffect(() => {
    if (!open) return;
    if (followUp) {
      methods.reset({
        subject: followUp.subject,
        type: followUp.type,
        scheduledAt: followUp.scheduledAt,
        status: followUp.status,
        priority: followUp.priority,
        customerId: followUp.customerId ?? "",
        leadId: followUp.leadId ?? "",
        assignedToUserId: followUp.assignedToUserId ?? "",
        notes: followUp.notes ?? "",
      });
    } else {
      methods.reset({
        subject: "",
        type: "CALL",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: "PENDING",
        priority: "MEDIUM",
        customerId: defaultCustomerId ?? "",
        leadId: defaultLeadId ?? "",
        assignedToUserId: "",
        notes: "",
      });
    }
  }, [open, followUp, defaultCustomerId, defaultLeadId, methods]);

  const submit = methods.handleSubmit((values) => {
    onSubmit(cleanPayload(values));
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{followUp ? "Edit Follow-up" : "New Follow-up"}</DialogTitle>
          <DialogDescription>Schedule the next contact for a customer or lead.</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="subject" label="Subject" required className="sm:col-span-2" />
              <SelectField name="type" label="Channel" options={FOLLOW_UP_TYPE_OPTIONS} />
              <DateField name="scheduledAt" label="Scheduled for" required withTime />
              <SelectField name="priority" label="Priority" options={FOLLOW_UP_PRIORITY_OPTIONS} />
              <SelectField name="status" label="Status" options={FOLLOW_UP_STATUS_OPTIONS} />
              <SelectField name="customerId" label="Customer" options={customerOptions} />
              <SelectField name="leadId" label="Lead" options={leadOptions} />
              {users ? <SelectField name="assignedToUserId" label="Assigned to" options={userOptions} /> : null}
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {followUp ? "Save changes" : "Create follow-up"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
