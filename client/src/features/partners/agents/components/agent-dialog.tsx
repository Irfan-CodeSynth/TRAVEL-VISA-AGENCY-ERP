import { useEffect } from "react";
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
import { SelectField, SwitchField, TextAreaField, TextField } from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { useCurrencies } from "@/hooks/use-currencies";
import { COMMISSION_TYPE_OPTIONS } from "../../shared/constants";
import type { Agent } from "../types";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  company: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  contactPerson: z.string().trim().optional(),
  commissionType: z.string().min(1),
  commissionRate: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0, "Must be positive").max(999999.99, "Too large").optional()
  ),
  currencyCode: z.string().length(3, "3-letter code").optional().or(z.literal("")),
  notes: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function AgentDialog({ open, onOpenChange, agent, onSubmit, isSubmitting }: AgentDialogProps) {
  const { data: currencies } = useCurrencies();

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", commissionType: "PERCENTAGE", currencyCode: "USD", isActive: true },
  });

  const commissionType = methods.watch("commissionType");

  useEffect(() => {
    if (!open) return;
    methods.reset(
      agent
        ? {
            name: agent.name,
            company: agent.company ?? "",
            email: agent.email ?? "",
            phone: agent.phone ?? "",
            city: agent.city ?? "",
            country: agent.country ?? "",
            contactPerson: agent.contactPerson ?? "",
            commissionType: agent.commissionType,
            commissionRate: agent.commissionRate ? Number(agent.commissionRate) : undefined,
            currencyCode: agent.currencyCode,
            notes: agent.notes ?? "",
            isActive: agent.isActive,
          }
        : {
            name: "",
            company: "",
            email: "",
            phone: "",
            city: "",
            country: "",
            contactPerson: "",
            commissionType: "PERCENTAGE",
            currencyCode: "USD",
            notes: "",
            isActive: true,
          }
    );
  }, [open, agent, methods]);

  const submit = methods.handleSubmit((values) => {
    onSubmit(cleanPayload({ ...values, commissionRate: values.commissionRate ?? "" }));
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{agent ? `Edit ${agent.name}` : "New Agent"}</DialogTitle>
          <DialogDescription>Partner agents that refer business and earn commissions.</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="name" label="Agent name" required />
              <TextField name="company" label="Company" />
              <TextField name="contactPerson" label="Contact person" />
              <TextField name="phone" label="Phone" placeholder="+971 50 123 4567" />
              <TextField name="email" label="Email" type="email" />
              <TextField name="city" label="City" />
              <TextField name="country" label="Country" />
              <SelectField name="commissionType" label="Commission type" options={COMMISSION_TYPE_OPTIONS} />
              <div className="grid grid-cols-[1fr_110px] gap-2">
                <TextField
                  name="commissionRate"
                  label={commissionType === "FLAT" ? "Flat amount" : "Rate (%)"}
                  type="number"
                />
                {commissionType === "FLAT" && currencies ? (
                  <SelectField name="currencyCode" label=" " options={(currencies ?? []).map((c) => ({ value: c.code, label: c.code }))} />
                ) : null}
              </div>
              <SwitchField name="isActive" label="Active" />
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {agent ? "Save changes" : "Create agent"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
