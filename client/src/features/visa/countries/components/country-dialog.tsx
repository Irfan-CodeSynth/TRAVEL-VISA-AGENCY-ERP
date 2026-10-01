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
import { SwitchField, TextField } from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import type { Country } from "../types";

const formSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Use the 3-letter ISO code")
    .regex(/^[A-Z]{3}$/, "Use the 3-letter ISO code"),
  name: z.string().trim().min(2, "Name is required"),
  region: z.string().trim().optional(),
  flagEmoji: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CountryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: Country | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function CountryDialog({ open, onOpenChange, country, onSubmit, isSubmitting }: CountryDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "", name: "", isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      country
        ? {
            code: country.code,
            name: country.name,
            region: country.region ?? "",
            flagEmoji: country.flagEmoji ?? "",
            isActive: country.isActive,
          }
        : { code: "", name: "", region: "", flagEmoji: "", isActive: true }
    );
  }, [open, country, methods]);

  const submit = methods.handleSubmit((values) => onSubmit(cleanPayload(values)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{country ? `Edit ${country.name}` : "New Country"}</DialogTitle>
          <DialogDescription>Countries power destinations, visa types and packages.</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="code" label="ISO code" required placeholder="UAE" />
              <TextField name="name" label="Name" required placeholder="United Arab Emirates" />
              <TextField name="region" label="Region" placeholder="Middle East" />
              <TextField name="flagEmoji" label="Flag emoji" placeholder="🇦🇪" />
              <SwitchField name="isActive" label="Active" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {country ? "Save changes" : "Create country"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
