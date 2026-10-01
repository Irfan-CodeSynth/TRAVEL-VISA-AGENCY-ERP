import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Paperclip, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateField, SelectField, TextField } from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { useCustomerOptions, useBookingOptions, fullName } from "@/hooks/use-reference";
import { useList as useApplicationList } from "../../visa/applications/hooks/use-applications";
import { NONE_OPTION } from "../../crm/shared/constants";
import {
  DOCUMENT_ALLOWED_MIME,
  DOCUMENT_MAX_SIZE_BYTES,
  DOCUMENT_TYPE_OPTIONS,
  formatBytes,
} from "../shared/constants";
import type { Document } from "../types";

const formSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  type: z.string().min(1, "Type is required"),
  customerId: z.string().optional(),
  applicationId: z.string().optional(),
  bookingId: z.string().optional(),
  expiryDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onSubmit: (data: FormData | any) => void;
  isSubmitting: boolean;
}

export function DocumentDialog({
  open,
  onOpenChange,
  document,
  onSubmit,
  isSubmitting,
}: DocumentDialogProps) {
  const isEdit = !!document;
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: customers } = useCustomerOptions();
  const { data: bookings } = useBookingOptions();
  const { data: apps } = useApplicationList({ page: 1, limit: 100 });

  const customerOptions = useMemo(
    () => [
      NONE_OPTION,
      ...(customers ?? []).map((c) => ({ value: c.id, label: `${fullName(c)} — ${c.customerNumber}` })),
    ],
    [customers]
  );
  const applicationOptions = useMemo(
    () => [
      NONE_OPTION,
      ...(apps?.data ?? []).map((a) => ({
        value: a.id,
        label: `${a.applicationNumber} · ${a.visaType?.name ?? ""}`,
      })),
    ],
    [apps]
  );
  const bookingOptions = useMemo(
    () => [NONE_OPTION, ...(bookings ?? []).map((b) => ({ value: b.id, label: b.bookingNumber }))],
    [bookings]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", type: "OTHER" },
  });

  useEffect(() => {
    if (!open) return;
    setFile(null);
    methods.reset(
      document
        ? {
            title: document.title,
            type: document.type,
            customerId: document.customerId ?? "null",
            applicationId: document.applicationId ?? "null",
            bookingId: document.bookingId ?? "null",
            expiryDate: document.expiryDate ?? "",
          }
        : {
            title: "",
            type: "OTHER",
            customerId: "null",
            applicationId: "null",
            bookingId: "null",
            expiryDate: "",
          }
    );
  }, [open, document, methods]);

  const pickFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (!DOCUMENT_ALLOWED_MIME.includes(f.type)) {
      toast.error(`Unsupported file type: ${f.type || f.name}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (f.size > DOCUMENT_MAX_SIZE_BYTES) {
      toast.error(`File exceeds the ${formatBytes(DOCUMENT_MAX_SIZE_BYTES)} limit`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(f);
  };

  const submit = methods.handleSubmit((values) => {
    if (isEdit) {
      onSubmit(cleanPayload(values));
      return;
    }
    if (!file) {
      toast.error("Please choose a file to upload");
      return;
    }
    const fd = new FormData();
    fd.append("title", values.title);
    fd.append("type", values.type);
    if (values.customerId && values.customerId !== "null") fd.append("customerId", values.customerId);
    if (values.applicationId && values.applicationId !== "null") fd.append("applicationId", values.applicationId);
    if (values.bookingId && values.bookingId !== "null") fd.append("bookingId", values.bookingId);
    if (values.expiryDate) fd.append("expiryDate", values.expiryDate);
    fd.append("file", file);
    onSubmit(fd);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit document details" : "Upload document"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the title, type, expiry or links. The stored file is unchanged."
              : "PDF, images, Word/Excel or text files up to 10 MB."}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            {!isEdit && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  File<span className="text-destructive"> *</span>
                </label>
                {file ? (
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-4 w-4 shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-1 rounded-md border border-dashed px-3 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <UploadCloud className="h-5 w-5" />
                    Click to choose a file
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={DOCUMENT_ALLOWED_MIME.join(",")}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="title" label="Title" required className="sm:col-span-2" placeholder="e.g. Passport — Ali Khan" />
              <SelectField name="type" label="Type" options={DOCUMENT_TYPE_OPTIONS} required />
              <DateField name="expiryDate" label="Expiry date" />
              <SelectField name="customerId" label="Customer" options={customerOptions} />
              <SelectField name="applicationId" label="Application" options={applicationOptions} />
              <SelectField name="bookingId" label="Booking" options={bookingOptions} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? "Save changes" : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
