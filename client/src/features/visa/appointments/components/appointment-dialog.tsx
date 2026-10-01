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
import { useUserOptions, useCustomerOptions, fullName } from "@/hooks/use-reference";
import { NONE_OPTION } from "../../../crm/shared/constants";
import { APPOINTMENT_TYPE_OPTIONS } from "../../shared/constants";
import { useList as useApplicationList } from "../../applications/hooks/use-applications";
import type { Appointment } from "../types";

const formSchema = z.object({
  subject: z.string().trim().min(2, "Subject is required"),
  type: z.string().min(1, "Type is required"),
  scheduledAt: z.string().min(1, "Date & time are required"),
  location: z.string().trim().optional(),
  durationMinutes: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(5).max(1440).optional()
  ),
  applicationId: z.string().optional(),
  customerId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  notes: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function defaultDateTime(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  defaultApplicationId?: string;
  defaultCustomerId?: string;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  defaultApplicationId,
  defaultCustomerId,
  onSubmit,
  isSubmitting,
}: AppointmentDialogProps) {
  const { data: users } = useUserOptions();
  const { data: customers } = useCustomerOptions();
  const { data: apps } = useApplicationList({ page: 1, limit: 100 });

  const customerOptions = useMemo(
    () => [
      NONE_OPTION,
      ...(customers ?? []).map((c) => ({
        value: c.id,
        label: `${[c.firstName, c.lastName].filter(Boolean).join(" ")} — ${c.customerNumber}`,
      })),
    ],
    [customers]
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

  const userOptions = useMemo(
    () => [NONE_OPTION, ...(users ?? []).map((u) => ({ value: u.id, label: fullName(u) }))],
    [users]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { subject: "", type: "INTERVIEW", scheduledAt: defaultDateTime() },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      appointment
        ? {
            subject: appointment.subject,
            type: appointment.type,
            scheduledAt: appointment.scheduledAt,
            location: appointment.location ?? "",
            durationMinutes: appointment.durationMinutes ?? undefined,
            applicationId: appointment.applicationId ?? "",
            customerId: appointment.customerId ?? "",
            assignedToUserId: appointment.assignedToUserId ?? "",
            notes: appointment.notes ?? "",
          }
        : {
            subject: "",
            type: "INTERVIEW",
            scheduledAt: defaultDateTime(),
            location: "",
            applicationId: defaultApplicationId ?? "",
            customerId: defaultCustomerId ?? "",
            assignedToUserId: "",
            notes: "",
          }
    );
  }, [open, appointment, defaultApplicationId, defaultCustomerId, methods]);

  const submit = methods.handleSubmit((values) => {
    const payload = cleanPayload({ ...values, durationMinutes: values.durationMinutes ?? "" });
    onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{appointment ? "Edit Appointment" : "New Appointment"}</DialogTitle>
          <DialogDescription>
            Biometrics, interviews, medicals and passport collections.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="subject" label="Subject" required className="sm:col-span-2" placeholder="VFS biometrics — Germany visa" />
              <SelectField name="type" label="Type" required options={APPOINTMENT_TYPE_OPTIONS} />
              <DateField name="scheduledAt" label="Scheduled" required withTime />
              <TextField name="location" label="Location" placeholder="VFS Dubai, Barsha" />
              <TextField name="durationMinutes" label="Duration (min)" type="number" placeholder="30" />
              <SelectField name="applicationId" label="Application" options={applicationOptions} />
              <SelectField name="customerId" label="Customer" options={customerOptions} />
              {users && (
                <SelectField name="assignedToUserId" label="Assigned to" options={userOptions} />
              )}
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {appointment ? "Save changes" : "Create appointment"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
