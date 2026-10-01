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
  DateField,
  MoneyField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { useSupplierOptions } from "@/hooks/use-reference";
import { NONE_OPTION } from "../../../crm/shared/constants";
import { PAYMENT_METHOD_OPTIONS } from "../../shared/constants";
import type { Expense } from "../types";

const formSchema = z.object({
  category: z.string().trim().min(2, "Category is required"),
  title: z.string().trim().optional(),
  supplierId: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  currencyCode: z.string().optional(),
  expenseDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  description: z.string().trim().optional(),
  receiptUrl: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function ExpenseDialog({ open, onOpenChange, expense, onSubmit, isSubmitting }: ExpenseDialogProps) {
  const { data: suppliers } = useSupplierOptions();
  const supplierOptions = [
    NONE_OPTION,
    ...(suppliers ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { category: "", amount: 0, supplierId: "null", currencyCode: "USD" },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      expense
        ? {
            category: expense.category,
            title: expense.title ?? "",
            supplierId: expense.supplierId ?? "null",
            amount: Number(expense.amount),
            currencyCode: expense.currencyCode,
            expenseDate: expense.expenseDate ?? "",
            paymentMethod: expense.paymentMethod ?? "null",
            description: expense.description ?? "",
            receiptUrl: expense.receiptUrl ?? "",
          }
        : {
            category: "",
            title: "",
            supplierId: "null",
            amount: 0,
            currencyCode: "USD",
            expenseDate: "",
            paymentMethod: "null",
            description: "",
            receiptUrl: "",
          }
    );
  }, [open, expense, methods]);

  const submit = methods.handleSubmit((values) => {
    const payload = cleanPayload(values);
    onSubmit({ ...payload, amount: Number(payload.amount) });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{expense ? `Edit ${expense.expenseNumber}` : "New Expense"}</DialogTitle>
          <DialogDescription>
            Expenses start as pending and must be approved. Approved expenses are locked.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="category" label="Category" required placeholder="e.g. Visa fee, Office rent" />
              <TextField name="title" label="Title" placeholder="Short description" />
              <MoneyField name="amount" label="Amount" required />
              <DateField name="expenseDate" label="Expense date" />
              <SelectField name="supplierId" label="Supplier" options={supplierOptions} />
              <SelectField name="paymentMethod" label="Payment method" options={[NONE_OPTION, ...PAYMENT_METHOD_OPTIONS]} />
              <TextAreaField name="description" label="Description" className="sm:col-span-2" />
              <TextField name="receiptUrl" label="Receipt URL" placeholder="https://..." className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {expense ? "Save changes" : "Create expense"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
