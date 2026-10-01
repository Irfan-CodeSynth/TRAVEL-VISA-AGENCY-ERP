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
import { SelectField } from "@/components/shared/form-fields";
import { useAgentOptions, useBookingOptions } from "@/hooks/use-reference";

const formSchema = z.object({
  bookingId: z.string().min(1, "Booking is required"),
  agentId: z.string().min(1, "Agent is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface GenerateCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { bookingId: string; agentId: string }) => void;
  isSubmitting: boolean;
}

export function GenerateCommissionDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: GenerateCommissionDialogProps) {
  const { data: agents } = useAgentOptions();
  const { data: bookings } = useBookingOptions();

  const agentOptions = (agents ?? []).map((a) => ({
    value: a.id,
    label: a.company ? `${a.name} · ${a.company}` : a.name,
  }));
  const bookingOptions = (bookings ?? []).map((b) => ({ value: b.id, label: b.bookingNumber }));

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { bookingId: "", agentId: "" },
  });

  useEffect(() => {
    if (open) methods.reset({ bookingId: "", agentId: "" });
  }, [open, methods]);

  const submit = methods.handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate commission from booking</DialogTitle>
          <DialogDescription>
            Uses the agent's commission type and rate, applied to the booking total. Duplicate
            active commissions for the same booking and agent are rejected.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <SelectField name="bookingId" label="Booking" options={bookingOptions} required />
            <SelectField name="agentId" label="Agent" options={agentOptions} required />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Generate
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
