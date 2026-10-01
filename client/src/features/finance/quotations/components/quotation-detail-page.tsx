import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FilePlus2, Pencil, Plus, ReceiptText, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { BOOKING_ITEM_TYPE_MAP } from "../../../travel/shared/constants";
import { QUOTATION_STATUS_MAP, type QuotationStatus } from "../../shared/constants";
import {
  useAction,
  useAddItem,
  useConvert,
  useDeleteItem,
  useDetail,
  useUpdate,
  useUpdateItem,
} from "../hooks/use-quotations";
import { quotationsApi } from "../services/quotations.api";
import { QuotationDialog } from "./quotation-dialog";
import { QuotationItemDialog } from "./quotation-item-dialog";
import { quotationCustomerName, type Quotation, type QuotationItem } from "../types";

const NEXT_ACTIONS: Partial<Record<QuotationStatus, { status: QuotationStatus; label: string; destructive?: boolean }[]>> = {
  DRAFT: [{ status: "SENT", label: "Send to customer" }],
  SENT: [
    { status: "ACCEPTED", label: "Mark accepted" },
    { status: "REJECTED", label: "Mark rejected", destructive: true },
    { status: "EXPIRED", label: "Mark expired", destructive: true },
  ],
};

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: quotation, isLoading } = useDetail(id);
  const update = useUpdate();

  const [editOpen, setEditOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<QuotationItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ status: QuotationStatus; label: string; destructive?: boolean } | null>(null);
  const [converting, setConverting] = useState(false);

  const changeStatus = useAction<Quotation>(
    (id, body) => quotationsApi.changeStatus(id, body),
    "Quotation status updated"
  );
  const convert = useConvert();

  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const items = quotation?.items ?? [];
  const editable = quotation?.status === "DRAFT";

  if (isLoading || !quotation) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleItemSubmit = (values: any) => {
    if (editingItem) {
      updateItem.mutate(
        { quotationId: quotation.id, itemId: editingItem.id, data: values },
        { onSuccess: () => setItemDialogOpen(false) }
      );
    } else {
      addItem.mutate({ quotationId: quotation.id, data: values }, { onSuccess: () => setItemDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/finance/quotations")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{quotation.quotationNumber}</h1>
            <StatusBadge value={quotation.status} map={QUOTATION_STATUS_MAP} />
          </div>
          <p className="text-sm text-muted-foreground">
            {quotationCustomerName(quotation.customer)} · created {formatDate(quotation.createdAt)}
          </p>
        </div>
        <PermissionGate permission="quotations.send">
          {(NEXT_ACTIONS[quotation.status] ?? []).map((a) => (
            <Button
              key={a.status + a.label}
              variant={a.destructive ? "outline" : "default"}
              className={a.destructive ? "text-destructive border-destructive/40 hover:bg-destructive/10" : ""}
              onClick={() => setConfirmAction(a)}
            >
              {(a.status === "ACCEPTED" || a.status === "SENT") && <CheckCircle2 className="mr-2 h-4 w-4" />}
              {(a.status === "REJECTED" || a.status === "EXPIRED") && <XCircle className="mr-2 h-4 w-4" />}
              {a.label}
            </Button>
          ))}
        </PermissionGate>
        {quotation.status === "ACCEPTED" && (
          <PermissionGate permission="quotations.create">
            {quotation.invoiceId ? (
              <Button variant="outline" onClick={() => navigate(`/finance/invoices/${quotation.invoiceId}`)}>
                <ReceiptText className="mr-2 h-4 w-4" /> View invoice
              </Button>
            ) : (
              <Button onClick={() => setConverting(true)}>
                <FilePlus2 className="mr-2 h-4 w-4" /> Convert to invoice
              </Button>
            )}
          </PermissionGate>
        )}
        {editable && (
          <PermissionGate permission="quotations.edit">
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
              <Link to={`/crm/customers/${quotation.customerId}`} className="font-medium text-primary hover:underline">
                {quotationCustomerName(quotation.customer)}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valid until</span>
              <span>{quotation.validUntil ? formatDate(quotation.validUntil) : "—"}</span>
            </div>
            {quotation.bookingId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking</span>
                <Link to={`/travel/bookings/${quotation.bookingId}`} className="font-medium text-primary hover:underline">
                  View
                </Link>
              </div>
            )}
            {quotation.sentAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sent</span>
                <span>{formatDate(quotation.sentAt)}</span>
              </div>
            )}
            {quotation.acceptedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accepted</span>
                <span>{formatDate(quotation.acceptedAt)}</span>
              </div>
            )}
            {quotation.notes && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground">{quotation.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Totals</CardTitle>
            <p className="text-xs text-muted-foreground">Computed by the server from items, discount and tax.</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <CurrencyDisplay amount={Number(quotation.subtotal)} currency={quotation.currencyCode} className="tabular-nums" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums">-<CurrencyDisplay amount={Number(quotation.discount)} currency={quotation.currencyCode} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <CurrencyDisplay amount={Number(quotation.tax)} currency={quotation.currencyCode} className="tabular-nums" />
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold text-base">
              <span>Total</span>
              <CurrencyDisplay amount={Number(quotation.totalAmount)} currency={quotation.currencyCode} className="tabular-nums" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line items ({items.length})</CardTitle>
          {editable && (
            <PermissionGate permission="quotations.edit">
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
                No items yet. Add services, flights or hotels to build up the quotation total.
              </p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-3">
                <StatusBadge value={item.itemType} map={BOOKING_ITEM_TYPE_MAP} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.description}</p>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums w-20 text-right">
                  {item.quantity} × {Number(item.unitPrice).toFixed(2)}
                </span>
                <CurrencyDisplay
                  amount={Number(item.lineTotal)}
                  currency={quotation.currencyCode}
                  className="w-28 text-right font-medium tabular-nums"
                />
                {editable && (
                  <PermissionGate permission="quotations.edit">
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
                <CurrencyDisplay amount={Number(quotation.subtotal)} currency={quotation.currencyCode} />
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <QuotationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        quotation={quotation as Quotation}
        onSubmit={(values) =>
          update.mutate({ id: quotation.id, data: values }, { onSuccess: () => setEditOpen(false) })
        }
        isSubmitting={update.isPending}
      />

      <QuotationItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
        currencyCode={quotation.currencyCode}
        onSubmit={handleItemSubmit}
        isSubmitting={addItem.isPending || updateItem.isPending}
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
            { quotationId: quotation.id, itemId: deletingItem.id },
            { onSuccess: () => setDeletingItem(null) }
          )
        }
        isLoading={deleteItem.isPending}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        title={confirmAction?.label ?? ""}
        description={`Move ${quotation.quotationNumber} to ${QUOTATION_STATUS_MAP[confirmAction?.status as QuotationStatus]?.label ?? ""}?`}
        confirmLabel={confirmAction?.destructive ? "Yes, continue" : "Yes, continue"}
        variant={confirmAction?.destructive ? "destructive" : "default"}
        onConfirm={() =>
          confirmAction &&
          changeStatus.mutate(
            { id: quotation.id, body: { status: confirmAction.status } },
            { onSuccess: () => setConfirmAction(null) }
          )
        }
        isLoading={changeStatus.isPending}
      />

      <ConfirmDialog
        open={converting}
        onOpenChange={(o) => !o && setConverting(false)}
        title="Convert to invoice?"
        description={`${quotation.quotationNumber} will create a draft invoice with the same items and totals. This cannot be undone.`}
        confirmLabel="Convert"
        onConfirm={() =>
          convert.mutate(quotation.id, {
            onSuccess: (invoice: any) => {
              setConverting(false);
              if (invoice?.id) navigate(`/finance/invoices/${invoice.id}`);
            },
          })
        }
        isLoading={convert.isPending}
      />
    </div>
  );
}
