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
import { useCustomerOptions, fullName } from "@/hooks/use-reference";
import { useList as useLeadList } from "../../crm/leads/hooks/use-leads";
import { useList as useApplicationList } from "../../visa/applications/hooks/use-applications";
import { NONE_OPTION } from "../../crm/shared/constants";
import {
  CHANNEL_OPTIONS,
  COMM_DIRECTION_OPTIONS,
  COMM_STATUS_OPTIONS,
} from "../shared/constants";
import type { Communication } from "../types";

const formSchema = z.object({
  subject: z.string().trim().min(2, "Subject is required"),
  body: z.string().trim().optional(),
  channel: z.string().min(1, "Channel is required"),
  direction: z.string().min(1, "Direction is required"),
  status: z.string().min(1, "Status is required"),
  occurredAt: z.string().min(1, "Date & time are required"),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  applicationId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communication: Communication | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function CommunicationDialog({
  open,
  onOpenChange,
  communication,
  onSubmit,
  isSubmitting,
}: CommunicationDialogProps) {
  const { data: customers } = useCustomerOptions();
  const { data: leads } = useLeadList({ page: 1, limit: 100 });
  const { data: apps } = useApplicationList({ page: 1, limit: 100 });

  const customerOptions = useMemo(
    () => [
      NONE_OPTION,
      ...(customers ?? []).map((c) => ({ value: c.id, label: `${fullName(c)} — ${c.customerNumber}` })),
    ],
    [customers]
  );
  const leadOptions = useMemo(
    () => [
      NONE_OPTION,
      ...(leads?.data ?? []).map((l) => ({
        value: l.id,
        label: `${[l.firstName, l.lastName].filter(Boolean).join(" ") || l.leadNumber} — ${l.leadNumber}`,
      })),
    ],
    [leads]
  );
  const applicationOptions = useMemo(
    () => [
      NONE_OPTION,
      ...(apps?.data ?? []).map((a) => ({
        value: a.id,
        label: `${a.applicationNumber} · ${a.visaType?.name ?? ""}`,
      })),
    ],
    [apps]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      channel: "CALL",
      direction: "OUTBOUND",
      status: "SENT",
      occurredAt: new Date().toISOString(),
      customerId: "null",
      leadId: "null",
      applicationId: "null",
    },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      communication
        ? {
            subject: communication.subject,
            body: communication.body ?? "",
            channel: communication.channel,
            direction: communication.direction,
            status: communication.status,
            occurredAt: communication.occurredAt,
            customerId: communication.customerId ?? "null",
            leadId: communication.leadId ?? "null",
            applicationId: communication.applicationId ?? "null",
          }
        : {
            subject: "",
            body: "",
            channel: "CALL",
            direction: "OUTBOUND",
            status: "SENT",
            occurredAt: new Date().toISOString(),
            customerId: "null",
            leadId: "null",
            applicationId: "null",
          }
    );
  }, [open, communication, methods]);

  const submit = methods.handleSubmit((values) => onSubmit(cleanPayload(values)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{communication ? "Edit communication" : "Log communication"}</DialogTitle>
          <DialogDescription>
            Record calls, messages and meetings. Links to customers, leads and applications are optional.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="subject" label="Subject" required placeholder="e.g. Discussed Umrah package" className="sm:col-span-2" />
              <SelectField name="channel" label="Channel" options={CHANNEL_OPTIONS} required />
              <SelectField name="direction" label="Direction" options={COMM_DIRECTION_OPTIONS} required />
              <SelectField name="status" label="Status" options={COMM_STATUS_OPTIONS} required />
              <DateField name="occurredAt" label="Occurred at" withTime required />
              <SelectField name="customerId" label="Customer" options={customerOptions} />
              <SelectField name="leadId" label="Lead" options={leadOptions} />
              <SelectField name="applicationId" label="Application" options={applicationOptions} />
              <TextAreaField name="body" label="Notes" rows={4} className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {communication ? "Save changes" : "Log communication"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
