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
import {
  MoneyField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { PACKAGE_TYPE_OPTIONS } from "../../shared/constants";
import type { TravelPackage } from "../types";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  code: z.string().trim().optional(),
  type: z.string().optional(),
  destination: z.string().trim().optional(),
  durationDays: z.union([z.coerce.number().int().min(1).max(365), z.literal("")]).optional(),
  price: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  currencyCode: z.string().optional(),
  includes: z.string().trim().optional(),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: TravelPackage | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function PackageDialog({ open, onOpenChange, pkg, onSubmit, isSubmitting }: PackageDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      pkg
        ? {
            name: pkg.name,
            code: pkg.code ?? "",
            type: pkg.type ?? "",
            destination: pkg.destination ?? "",
            durationDays: pkg.durationDays ?? "",
            price: pkg.price != null ? Number(pkg.price) : "",
            currencyCode: pkg.currencyCode ?? "",
            includes: pkg.includes ?? "",
            description: pkg.description ?? "",
            isActive: pkg.isActive,
          }
        : { name: "", code: "", type: "", destination: "", durationDays: "", price: "", currencyCode: "USD", includes: "", description: "", isActive: true }
    );
  }, [open, pkg, methods]);

  const submit = methods.handleSubmit((values) => onSubmit(cleanPayload(values)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pkg ? `Edit ${pkg.name}` : "New Package"}</DialogTitle>
          <DialogDescription>Umrah, Hajj, tour and custom travel packages.</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="name" label="Package name" required />
              <TextField name="code" label="Code" placeholder="e.g. UMR-14N" />
              <SelectField name="type" label="Type" options={PACKAGE_TYPE_OPTIONS} />
              <TextField name="destination" label="Destination" />
              <TextField name="durationDays" label="Duration (days)" type="number" />
              <MoneyField name="price" label="Price" />
              <SwitchField name="isActive" label="Active" />
              <TextAreaField name="includes" label="What's included" placeholder="Hotels, transfers, meals..." className="sm:col-span-2" />
              <TextAreaField name="description" label="Description" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {pkg ? "Save changes" : "Create package"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
