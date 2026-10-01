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
import { useCountryOptions, useUserOptions, fullName } from "@/hooks/use-reference";
import {
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  GENDER_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  NONE_OPTION,
} from "../../shared/constants";
import { useDetail } from "../hooks/use-customers";
import type { Customer } from "../types";

const formSchema = z
  .object({
    customerType: z.enum(["INDIVIDUAL", "COMPANY"]),
    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    companyName: z.string().trim().optional(),
    phone: z.string().trim().min(5, "Phone is required"),
    whatsapp: z.string().trim().optional(),
    email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
    nationalId: z.string().trim().optional(),
    passportNumber: z.string().trim().optional(),
    passportExpiry: z.string().optional(),
    gender: z.string().optional(),
    dateOfBirth: z.string().optional(),
    nationalityCountryId: z.string().optional(),
    occupation: z.string().trim().optional(),
    city: z.string().trim().optional(),
    address: z.string().trim().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
    assignedToUserId: z.string().optional(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (d) => (d.customerType === "COMPANY" ? !!d.companyName : !!(d.firstName && d.lastName)),
    {
      message: "Individual customers need first + last name; companies need a company name",
      path: ["firstName"],
    }
  );

type FormValues = z.input<typeof formSchema>;

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** id of the customer being edited, or null for create */
  editId: string | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function CustomerDialog({ open, onOpenChange, editId, onSubmit, isSubmitting }: CustomerDialogProps) {
  const { data: users } = useUserOptions();
  const { data: countries } = useCountryOptions();
  const { data: detail, isFetching: fetchingDetail } = useDetail(editId && open ? editId : null);

  const userOptions = useMemo(
    () => [NONE_OPTION, ...(users ?? []).map((u) => ({ value: u.id, label: fullName(u) }))],
    [users]
  );
  const countryOptions = useMemo(
    () => [
      NONE_OPTION,
      ...(countries ?? []).map((c) => ({ value: c.id, label: `${c.flagEmoji ?? ""} ${c.name}` })),
    ],
    [countries]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerType: "INDIVIDUAL", status: "ACTIVE" },
  });

  useEffect(() => {
    if (!open) return;
    if (editId && detail) {
      const c: Customer = detail;
      methods.reset({
        customerType: c.customerType,
        firstName: c.firstName ?? "",
        lastName: c.lastName ?? "",
        companyName: c.companyName ?? "",
        phone: c.phone,
        whatsapp: c.whatsapp ?? "",
        email: c.email ?? "",
        nationalId: c.nationalId ?? "",
        passportNumber: c.passportNumber ?? "",
        passportExpiry: c.passportExpiry ?? "",
        gender: c.gender ?? "",
        dateOfBirth: c.dateOfBirth ?? "",
        nationalityCountryId: c.nationalityCountryId ?? "",
        occupation: c.occupation ?? "",
        city: c.city ?? "",
        address: c.address ?? "",
        status: c.status,
        source: c.source ?? "",
        assignedToUserId: c.assignedToUserId ?? "",
        notes: c.notes ?? "",
      });
    } else if (!editId) {
      methods.reset({
        customerType: "INDIVIDUAL",
        firstName: "",
        lastName: "",
        companyName: "",
        phone: "",
        whatsapp: "",
        email: "",
        nationalId: "",
        passportNumber: "",
        passportExpiry: "",
        gender: "",
        dateOfBirth: "",
        nationalityCountryId: "",
        occupation: "",
        city: "",
        address: "",
        status: "ACTIVE",
        source: "",
        assignedToUserId: "",
        notes: "",
      });
    }
  }, [open, editId, detail, methods]);

  const submit = methods.handleSubmit((values) => {
    onSubmit(cleanPayload(values));
  });

  const loading = !!editId && !detail && (fetchingDetail || open);
  const isCompany = methods.watch("customerType") === "COMPANY";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Customer" : "New Customer"}</DialogTitle>
          <DialogDescription>
            {editId ? "Update the customer profile." : "Register a new customer."}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading customer…</p>
        ) : (
          <FormProvider {...methods}>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField name="customerType" label="Customer type" options={CUSTOMER_TYPE_OPTIONS} required />
                <SelectField name="status" label="Status" options={CUSTOMER_STATUS_OPTIONS} />
                {isCompany ? (
                  <TextField name="companyName" label="Company name" required className="sm:col-span-2" />
                ) : (
                  <>
                    <TextField name="firstName" label="First name" required />
                    <TextField name="lastName" label="Last name" required />
                  </>
                )}
                <TextField name="phone" label="Phone" required />
                <TextField name="whatsapp" label="WhatsApp" />
                <TextField name="email" label="Email" type="email" />
                <TextField name="nationalId" label="National ID" />
                <TextField name="passportNumber" label="Passport number" />
                <DateField name="passportExpiry" label="Passport expiry" />
                <SelectField name="gender" label="Gender" options={[NONE_OPTION, ...GENDER_OPTIONS]} />
                <DateField name="dateOfBirth" label="Date of birth" />
                <SelectField
                  name="nationalityCountryId"
                  label="Nationality"
                  options={countryOptions}
                />
                <TextField name="occupation" label="Occupation" />
                <TextField name="city" label="City" />
                <SelectField
                  name="source"
                  label="Acquisition source"
                  options={[NONE_OPTION, ...LEAD_SOURCE_OPTIONS]}
                />
                {users ? <SelectField name="assignedToUserId" label="Assigned to" options={userOptions} /> : null}
                <TextField name="address" label="Address" className="sm:col-span-2" />
                <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {editId ? "Save changes" : "Create customer"}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
