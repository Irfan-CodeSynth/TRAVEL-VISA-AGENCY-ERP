import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { INVOICE_STATUS_MAP, PAYMENT_METHOD_MAP, PAYMENT_STATUS_MAP } from "../../shared/constants";
import {
  useAction,
  useAddItem,
  useDeleteItem,
  useDetail,
  useRecordPayment,
  useUpdate,
  useUpdateItem,
} from "../hooks/use-invoices";
import { invoicesApi } from "../services/invoices.api";
import { useConfirmPayment, useFailPayment, useRefundPayment } from "../../payments/hooks/use-payments";
import { RefundDialog } from "../../payments/components/refund-dialog";
import { RecordPaymentDialog } from "../../payments/components/record-payment-dialog";
import { InvoiceDialog } from "./invoice-dialog";
import { InvoiceItemDialog } from "./invoice-item-dialog";
import { invoiceCustomerName, type Invoice, type InvoiceItem } from "../types";
import type { Payment } from "../../payments/types";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useDetail(id);
  const update = useUpdate();

  const [editOpen, setEditOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InvoiceItem | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [refunding, setRefunding] = useState<Payment | null>(null);
  const [confirmAction, setConfirmAction] = useState<"SEND" | "OVERDUE" | "CANCEL" | null>(null);

  const send = useAction<Invoice>((id) => invoicesApi.send(id), "Invoice sent");
  const markOverdue = useAction<Invoice>((id) => invoicesApi.markOverdue(id), "Invoice marked overdue");
  const cancel = useAction<Invoice>((id) => invoicesApi.cancel(id), "Invoice cancelled");

  const recordPayment = useRecordPayment();
  const refundPayment = useRefundPayment();
  const confirmPayment = useConfirmPayment();
  const failPayment = useFailPayment();

  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  if (isLoading || !invoice) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const items = invoice.items ?? [];
  const payments = (invoice.payments ?? []) as unknown as Payment[];
  const editable = invoice.status === "DRAFT";
  const payOpen = !["DRAFT", "CANCELLED", "REFUNDED"].includes(invoice.status) && Number(invoice.balanceDue) > 0;
  const balance = Number(invoice.balanceDue);

  const handleItemSubmit = (values: any) => {
    if (editingItem) {
      updateItem.mutate(
        { invoiceId: invoice.id, itemId: editingItem.id, data: values },
        { onSuccess: () => setItemDialogOpen(false) }
      );
    } else {
      addItem.mutate({ invoiceId: invoice.id, data: values }, { onSuccess: () => setItemDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/finance/invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{invoice.invoiceNumber}</h1>
            <StatusBadge value={invoice.status} map={INVOICE_STATUS_MAP} />
          </div>
          <p className="text-sm text-muted-foreground">
            {invoiceCustomerName(invoice.customer)} · issued {formatDate(invoice.issueDate)}
            {invoice.dueDate ? ` · due ${formatDate(invoice.dueDate)}` : ""}
          </p>
        </div>
        {editable && (
          <PermissionGate permission="invoices.send">
            <Button onClick={() => setConfirmAction("SEND")}>
              <BadgeCheck className="mr-2 h-4 w-4" /> Send
            </Button>
          </PermissionGate>
        )}
        {invoice.status === "SENT" && (
          <PermissionGate permission="invoices.edit">
            <Button variant="outline" onClick={() => setConfirmAction("OVERDUE")}>
              <AlertTriangle className="mr-2 h-4 w-4" /> Mark overdue
            </Button>
          </PermissionGate>
        )}
        {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
          <PermissionGate permission="invoices.edit">
            <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setConfirmAction("CANCEL")}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </PermissionGate>
        )}
        {payOpen && (
          <PermissionGate permission="payments.create">
            <Button onClick={() => setPayDialogOpen(true)}>
              <Banknote className="mr-2 h-4 w-4" /> Record payment
            </Button>
          </PermissionGate>
        )}
        {editable && (
          <PermissionGate permission="invoices.edit">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </PermissionGate>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <Link to={`/crm/customers/${invoice.customerId}`} className="font-medium text-primary hover:underline">
                {invoiceCustomerName(invoice.customer)}
              </Link>
            </div>
            {invoice.quotationId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quotation</span>
                <Link to={`/finance/quotations/${invoice.quotationId}`} className="font-medium text-primary hover:underline">
                  View
                </Link>
              </div>
            )}
            {invoice.bookingId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking</span>
                <Link to={`/travel/bookings/${invoice.bookingId}`} className="font-medium text-primary hover:underline">
                  View
                </Link>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due date</span>
              <span>{invoice.dueDate ? formatDate(invoice.dueDate) : "—"}</span>
            </div>
            {invoice.notes && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Totals</CardTitle>
            <p className="text-xs text-muted-foreground">Paid and balance follow recorded payments automatically.</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <CurrencyDisplay amount={Number(invoice.subtotal)} currency={invoice.currencyCode} className="tabular-nums" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums">-<CurrencyDisplay amount={Number(invoice.discount)} currency={invoice.currencyCode} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <CurrencyDisplay amount={Number(invoice.tax)} currency={invoice.currencyCode} className="tabular-nums" />
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold text-base">
              <span>Total</span>
              <CurrencyDisplay amount={Number(invoice.totalAmount)} currency={invoice.currencyCode} className="tabular-nums" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <CurrencyDisplay amount={Number(invoice.paidAmount)} currency={invoice.currencyCode} className="tabular-nums text-green-600" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance due</span>
              <CurrencyDisplay
                amount={balance}
                currency={invoice.currencyCode}
                className={`tabular-nums font-medium ${balance > 0 ? "text-amber-600" : "text-green-600"}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line items ({items.length})</CardTitle>
          {editable && (
            <PermissionGate permission="invoices.edit">
              <Button
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setItemDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add item
              </Button>
            </PermissionGate>
          )}
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {items.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No items yet. Add line items to build up the invoice total.
              </p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.description}</p>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums w-20 text-right">
                  {item.quantity} × {Number(item.unitPrice).toFixed(2)}
                </span>
                <CurrencyDisplay
                  amount={Number(item.lineTotal)}
                  currency={invoice.currencyCode}
                  className="w-28 text-right font-medium tabular-nums"
                />
                {editable && (
                  <PermissionGate permission="invoices.edit">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingItem(item);
                          setItemDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeletingItem(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </PermissionGate>
                )}
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <div className="mt-2 flex justify-end gap-4 border-t pt-3 text-sm">
              <span className="text-muted-foreground tabular-nums w-20 text-right">
                {items.reduce((s, i) => s + i.quantity, 0)} units
              </span>
              <span className="w-28 text-right font-semibold tabular-nums">
                <CurrencyDisplay amount={Number(invoice.subtotal)} currency={invoice.currencyCode} />
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payments ({payments.length})</CardTitle>
          {payOpen && (
            <PermissionGate permission="payments.create">
              <Button size="sm" onClick={() => setPayDialogOpen(true)}>
                <Banknote className="mr-2 h-4 w-4" /> Record payment
              </Button>
            </PermissionGate>
          )}
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {payments.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            )}
            {payments.map((p) => {
              const refundable = !p.isRefund && p.status === "COMPLETED" && Number(p.amount) - Number(p.refundedAmount) > 0;
              return (
                <div key={p.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.paymentNumber}</span>
                      <StatusBadge value={p.method} map={PAYMENT_METHOD_MAP} />
                      <StatusBadge value={p.status} map={PAYMENT_STATUS_MAP} />
                      {p.isRefund && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-600">
                          <Undo2 className="h-3 w-3" /> Refund
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.paidAt)}
                      {p.reference ? ` · ${p.reference}` : ""}
                      {Number(p.refundedAmount) > 0 ? ` · refunded ${Number(p.refundedAmount).toFixed(2)}` : ""}
                    </p>
                  </div>
                  <CurrencyDisplay
                    amount={p.isRefund ? -Number(p.amount) : Number(p.amount)}
                    currency={p.currencyCode}
                    className={`w-28 text-right font-medium tabular-nums ${p.isRefund ? "text-purple-600" : ""}`}
                  />
                  {p.status === "PENDING" && (
                    <PermissionGate permission="payments.create">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => confirmPayment.mutate(p.id)}>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => failPayment.mutate(p.id)}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </PermissionGate>
                  )}
                  {refundable && (
                    <PermissionGate permission="payments.refund">
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => setRefunding(p as unknown as Payment)}>
                        <Undo2 className="mr-1 h-4 w-4" /> Refund
                      </Button>
                    </PermissionGate>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <InvoiceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        invoice={invoice as Invoice}
        onSubmit={(values) =>
          update.mutate({ id: invoice.id, data: values }, { onSuccess: () => setEditOpen(false) })
        }
        isSubmitting={update.isPending}
      />

      <InvoiceItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
        currencyCode={invoice.currencyCode}
        onSubmit={handleItemSubmit}
        isSubmitting={addItem.isPending || updateItem.isPending}
      />

      <RecordPaymentDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        invoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          currencyCode: invoice.currencyCode,
          balanceDue: invoice.balanceDue,
        }}
        onSubmit={(values) =>
          recordPayment.mutate(values, { onSuccess: () => setPayDialogOpen(false) })
        }
        isSubmitting={recordPayment.isPending}
      />

      <RefundDialog
        open={!!refunding}
        onOpenChange={(o) => !o && setRefunding(null)}
        payment={refunding}
        onSubmit={(amount) =>
          refunding &&
          refundPayment.mutate(
            { id: refunding.id, amount },
            { onSuccess: () => setRefunding(null) }
          )
        }
        isSubmitting={refundPayment.isPending}
      />

      <ConfirmDialog
        open={!!deletingItem}
        onOpenChange={(o) => !o && setDeletingItem(null)}
        title="Remove item?"
        description={deletingItem ? `"${deletingItem.description}" will be removed and totals recalculated.` : ""}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() =>
          deletingItem &&
          deleteItem.mutate(
            { invoiceId: invoice.id, itemId: deletingItem.id },
            { onSuccess: () => setDeletingItem(null) }
          )
        }
        isLoading={deleteItem.isPending}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        title={
          confirmAction === "SEND" ? "Send invoice?" : confirmAction === "OVERDUE" ? "Mark overdue?" : "Cancel invoice?"
        }
        description={
          confirmAction === "CANCEL"
            ? `${invoice.invoiceNumber} will be cancelled. Cancelled invoices cannot accept payments and must have no payments recorded.`
            : confirmAction === "OVERDUE"
              ? `${invoice.invoiceNumber} will be flagged as overdue.`
              : `${invoice.invoiceNumber} moves from draft to sent. Items and totals are frozen after sending.`
        }
        confirmLabel={confirmAction === "CANCEL" ? "Yes, cancel" : "Yes, continue"}
        variant={confirmAction === "CANCEL" ? "destructive" : "default"}
        onConfirm={() => {
          if (confirmAction === "SEND") {
            send.mutate({ id: invoice.id }, { onSuccess: () => setConfirmAction(null) });
          } else if (confirmAction === "OVERDUE") {
            markOverdue.mutate({ id: invoice.id }, { onSuccess: () => setConfirmAction(null) });
          } else if (confirmAction === "CANCEL") {
            cancel.mutate({ id: invoice.id }, { onSuccess: () => setConfirmAction(null) });
          }
        }}
        isLoading={send.isPending || markOverdue.isPending || cancel.isPending}
      />
    </div>
  );
}
