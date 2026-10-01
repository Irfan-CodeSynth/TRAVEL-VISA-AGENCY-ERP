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
  MoneyField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { useUserOptions, useCustomerOptions, useVisaTypeOptions, fullName } from "@/hooks/use-reference";
import { NONE_OPTION } from "../../../crm/shared/constants";
import type { Application } from "../types";

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  visaTypeId: z.string().min(1, "Visa type is required"),
  applicantCount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1, "At least 1").max(100).optional()
  ),
  referenceNumber: z.string().trim().optional(),
  totalFees: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).max(999_999_999).optional()
  ),
  currencyCode: z.string().length(3, "3-letter code").optional().or(z.literal("")),
  notes: z.string().trim().optional(),
  assignedToUserId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  defaultCustomerId?: string;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function ApplicationDialog({
  open,
  onOpenChange,
  application,
  defaultCustomerId,
  onSubmit,
  isSubmitting,
}: ApplicationDialogProps) {
  const { data: users } = useUserOptions();
  const { data: customers } = useCustomerOptions();
  const { data: visaTypes } = useVisaTypeOptions();

  const customerOptions = useMemo(
    () =>
      (customers ?? []).map((c) => ({
        value: c.id,
        label: `${[c.firstName, c.lastName].filter(Boolean).join(" ")}${c.companyName ? ` (${c.companyName})` : ""} — ${c.customerNumber}`,
      })),
    [customers]
  );

  const visaTypeOptions = useMemo(
    () =>
      (visaTypes ?? []).map((v) => ({
        value: v.id,
        label: `${v.country?.flagEmoji ?? ""} ${v.name} (${v.code})`,
      })),
    [visaTypes]
  );

  const userOptions = useMemo(
    () => [NONE_OPTION, ...(users ?? []).map((u) => ({ value: u.id, label: fullName(u) }))],
    [users]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerId: "", visaTypeId: "", applicantCount: 1, currencyCode: "USD" },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      application
        ? {
            customerId: application.customerId,
            visaTypeId: application.visaTypeId,
            applicantCount: application.applicantCount,
            referenceNumber: application.referenceNumber ?? "",
            totalFees: application.totalFees ? Number(application.totalFees) : undefined,
            currencyCode: application.currencyCode,
            notes: application.notes ?? "",
            assignedToUserId: application.assignedToUserId ?? "",
          }
        : {
            customerId: defaultCustomerId ?? "",
            visaTypeId: "",
            applicantCount: 1,
            referenceNumber: "",
            currencyCode: "USD",
            notes: "",
            assignedToUserId: "",
          }
    );
  }, [open, application, defaultCustomerId, methods]);

  const submit = methods.handleSubmit((values) => {
    const payload = cleanPayload({
      ...values,
      totalFees: values.totalFees ?? "",
      applicantCount: values.applicantCount ?? "",
    });
    onSubmit(payload);
  });

  const isEdit = !!application;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${application.applicationNumber}` : "New Application"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update application details. Status changes go through the workflow."
              : "Start a visa application for a customer. It begins as a draft."}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                name="customerId"
                label="Customer"
                required
                options={isEdit ? [{ value: application.customerId, label: application.customer ? [application.customer.firstName, application.customer.lastName].filter(Boolean).join(" ") : application.customerId }] : customerOptions}
                placeholder="Select customer..."
              />
              <SelectField
                name="visaTypeId"
                label="Visa type"
                required
                options={isEdit ? [{ value: application.visaTypeId, label: application.visaType?.name ?? application.visaTypeId }] : visaTypeOptions}
                placeholder="Select visa type..."
              />
              <TextField name="applicantCount" label="Applicants" type="number" />
              <TextField name="referenceNumber" label="External reference" placeholder="Embassy / VFS reference" />
              <MoneyField name="totalFees" label="Total fees" currencyName="currencyCode" className="sm:col-span-2" />
              {users && !isEdit ? (
                <SelectField name="assignedToUserId" label="Assigned to" options={userOptions} />
              ) : null}
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? "Save changes" : "Create application"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
