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
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { useCountryOptions } from "@/hooks/use-reference";
import { VISA_CATEGORY_OPTIONS } from "../../shared/constants";
import type { VisaType } from "../types";

const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().int("Whole days only").min(0).optional()
);

const formSchema = z.object({
  countryId: z.string().min(1, "Country is required"),
  code: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(2, "Name is required"),
  category: z.string().optional(),
  allowedStayDays: optionalInt,
  validityDays: optionalInt,
  processingDays: optionalInt,
  price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).max(999_999_999).optional()
  ),
  currencyCode: z.string().length(3, "3-letter code").optional().or(z.literal("")),
  requirements: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface VisaTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visaType: VisaType | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function VisaTypeDialog({ open, onOpenChange, visaType, onSubmit, isSubmitting }: VisaTypeDialogProps) {
  const { data: countries } = useCountryOptions();

  const countryOptions = useMemo(
    () => (countries ?? []).map((c) => ({ value: c.id, label: `${c.flagEmoji ?? ""} ${c.name}` })),
    [countries]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { countryId: "", code: "", name: "", currencyCode: "USD", isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      visaType
        ? {
            countryId: visaType.countryId,
            code: visaType.code,
            name: visaType.name,
            category: visaType.category ?? "",
            allowedStayDays: visaType.allowedStayDays ?? undefined,
            validityDays: visaType.validityDays ?? undefined,
            processingDays: visaType.processingDays ?? undefined,
            price: visaType.price ? Number(visaType.price) : undefined,
            currencyCode: visaType.currencyCode,
            requirements: visaType.requirements ?? "",
            isActive: visaType.isActive,
          }
        : { countryId: "", code: "", name: "", category: "", currencyCode: "USD", isActive: true }
    );
  }, [open, visaType, methods]);

  const submit = methods.handleSubmit((values) => {
    const payload = cleanPayload({
      ...values,
      price: values.price ?? "",
      allowedStayDays: values.allowedStayDays ?? "",
      validityDays: values.validityDays ?? "",
      processingDays: values.processingDays ?? "",
    });
    onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{visaType ? `Edit ${visaType.name}` : "New Visa Type"}</DialogTitle>
          <DialogDescription>
            Product catalogue per country: fees, processing time and requirements.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField name="countryId" label="Country" required options={countryOptions} placeholder="Select country..." />
              <TextField name="code" label="Code" required placeholder="TOUR-30" />
              <TextField name="name" label="Name" required placeholder="Tourist Visa (30 days)" className="sm:col-span-2" />
              <SelectField name="category" label="Category" options={VISA_CATEGORY_OPTIONS} placeholder="Select..." />
              <TextField name="allowedStayDays" label="Allowed stay (days)" type="number" />
              <TextField name="validityDays" label="Validity (days)" type="number" />
              <TextField name="processingDays" label="Processing (days)" type="number" />
              <MoneyField name="price" label="Price" currencyName="currencyCode" className="sm:col-span-2" />
              <TextAreaField name="requirements" label="Requirements" className="sm:col-span-2" placeholder="Passport, photos, bank statements..." />
              <SwitchField name="isActive" label="Active" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {visaType ? "Save changes" : "Create visa type"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
