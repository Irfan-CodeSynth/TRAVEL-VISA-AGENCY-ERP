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
import { TextAreaField } from "@/components/shared/form-fields";
import type { Document } from "../types";

const formSchema = z.object({
  rejectReason: z.string().trim().min(3, "A reason is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface RejectDocumentDialogProps {
  document: Document | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
  isSubmitting: boolean;
}

export function RejectDocumentDialog({ document, onOpenChange, onSubmit, isSubmitting }: RejectDocumentDialogProps) {
  const methods = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { rejectReason: "" } });

  useEffect(() => {
    if (document) methods.reset({ rejectReason: "" });
  }, [document, methods]);

  const submit = methods.handleSubmit((values) => onSubmit(values.rejectReason));

  return (
    <Dialog open={!!document} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reject document</DialogTitle>
          <DialogDescription>
            {document ? `Explain why "${document.title}" is being rejected.` : ""}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <TextAreaField name="rejectReason" label="Reason" required placeholder="e.g. Blurred copy, expired passport" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                Reject document
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
