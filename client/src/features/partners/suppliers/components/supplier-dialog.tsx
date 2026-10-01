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
import { SUPPLIER_TYPE_OPTIONS } from "../../shared/constants";
import type { Supplier } from "../types";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  type: z.string().optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  country: z.string().trim().optional(),
  city: z.string().trim().optional(),
  website: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  contactPerson: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function SupplierDialog({ open, onOpenChange, supplier, onSubmit, isSubmitting }: SupplierDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", type: "OTHER", isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      supplier
        ? {
            name: supplier.name,
            type: supplier.type,
            email: supplier.email ?? "",
            phone: supplier.phone ?? "",
            country: supplier.country ?? "",
            city: supplier.city ?? "",
            website: supplier.website ?? "",
            contactPerson: supplier.contactPerson ?? "",
            taxNumber: supplier.taxNumber ?? "",
            notes: supplier.notes ?? "",
            isActive: supplier.isActive,
          }
        : { name: "", type: "OTHER", email: "", phone: "", country: "", city: "", website: "", contactPerson: "", taxNumber: "", notes: "", isActive: true }
    );
  }, [open, supplier, methods]);

  const submit = methods.handleSubmit((values) => onSubmit(cleanPayload(values)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? `Edit ${supplier.name}` : "New Supplier"}</DialogTitle>
          <DialogDescription>Airlines, hotels, embassies, insurers and other service providers.</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="name" label="Name" required />
              <SelectField name="type" label="Type" options={SUPPLIER_TYPE_OPTIONS} />
              <TextField name="contactPerson" label="Contact person" />
              <TextField name="phone" label="Phone" placeholder="+971 50 123 4567" />
              <TextField name="email" label="Email" type="email" />
              <TextField name="website" label="Website" placeholder="https://example.com" />
              <TextField name="city" label="City" />
              <TextField name="country" label="Country" />
              <TextField name="taxNumber" label="Tax number" />
              <SwitchField name="isActive" label="Active" />
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {supplier ? "Save changes" : "Create supplier"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
