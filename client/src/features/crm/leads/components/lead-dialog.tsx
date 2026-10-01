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
import { useUserOptions, useCountryOptions, fullName } from "@/hooks/use-reference";
import {
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  NONE_OPTION,
} from "../../shared/constants";
import type { Lead } from "../types";

const formSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  phone: z.string().trim().min(5, "Phone is required"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  whatsapp: z.string().trim().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  interestedDestinationId: z.string().optional(),
  estimatedBudget: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0, "Must be positive").max(999_999_999).optional()
  ),
  budgetCurrencyCode: z.string().length(3, "3-letter code").optional().or(z.literal("")),
  servicesInterested: z.string().trim().optional(),
  description: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  assignedToUserId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function LeadDialog({ open, onOpenChange, lead, onSubmit, isSubmitting }: LeadDialogProps) {
  const { data: users } = useUserOptions();
  const { data: countries } = useCountryOptions();

  const userOptions = useMemo(
    () => [NONE_OPTION, ...(users ?? []).map((u) => ({ value: u.id, label: fullName(u) }))],
    [users]
  );
  const destinationOptions = useMemo(
    () => [
      NONE_OPTION,
      ...(countries ?? []).map((c) => ({ value: c.id, label: `${c.flagEmoji ?? ""} ${c.name}` })),
    ],
    [countries]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      status: "NEW",
      source: "WEBSITE",
    },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      lead
        ? {
            firstName: lead.firstName,
            lastName: lead.lastName ?? "",
            companyName: lead.companyName ?? "",
            phone: lead.phone,
            email: lead.email ?? "",
            whatsapp: lead.whatsapp ?? "",
            source: lead.source,
            status: lead.status,
            interestedDestinationId: lead.interestedDestinationId ?? "",
            estimatedBudget: lead.estimatedBudget ? Number(lead.estimatedBudget) : undefined,
            budgetCurrencyCode: lead.budgetCurrencyCode ?? "",
            servicesInterested: lead.servicesInterested ?? "",
            description: lead.description ?? "",
            notes: lead.notes ?? "",
            assignedToUserId: lead.assignedToUserId ?? "",
          }
        : {
            firstName: "",
            lastName: "",
            companyName: "",
            phone: "",
            email: "",
            whatsapp: "",
            source: "WEBSITE",
            status: "NEW",
            interestedDestinationId: "",
            estimatedBudget: undefined,
            budgetCurrencyCode: "",
            servicesInterested: "",
            description: "",
            notes: "",
            assignedToUserId: "",
          }
    );
  }, [open, lead, methods]);

  const submit = methods.handleSubmit((values) => {
    const payload = cleanPayload({ ...values, estimatedBudget: values.estimatedBudget ?? "" });
    onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead ? `Edit Lead ${lead.leadNumber}` : "New Lead"}</DialogTitle>
          <DialogDescription>
            {lead
              ? "Update the lead details."
              : "Capture a new enquiry. Convert it to a customer once qualified."}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="firstName" label="First name" required />
              <TextField name="lastName" label="Last name" />
              <TextField name="companyName" label="Company" />
              <TextField name="phone" label="Phone" required placeholder="+971 50 123 4567" />
              <TextField name="email" label="Email" type="email" />
              <TextField name="whatsapp" label="WhatsApp" />
              <SelectField name="source" label="Source" options={LEAD_SOURCE_OPTIONS} />
              <SelectField name="status" label="Status" options={LEAD_STATUS_OPTIONS} />
              <SelectField
                name="interestedDestinationId"
                label="Interested destination"
                options={destinationOptions}
              />
              {users ? (
                <SelectField
                  name="assignedToUserId"
                  label="Assigned to"
                  options={userOptions}
                />
              ) : null}
              <MoneyField
                name="estimatedBudget"
                label="Estimated budget"
                currencyName="budgetCurrencyCode"
                className="sm:col-span-2"
              />
              <TextField
                name="servicesInterested"
                label="Services interested in"
                placeholder="Visa, Umrah package, air tickets..."
                className="sm:col-span-2"
              />
              <TextAreaField name="description" label="Description" className="sm:col-span-2" />
              <TextAreaField name="notes" label="Internal notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {lead ? "Save changes" : "Create lead"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
