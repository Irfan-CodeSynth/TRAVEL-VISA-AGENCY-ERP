import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";
import {
  BOOKING_ITEM_TYPE_MAP,
  BOOKING_STATUS_MAP,
  BOOKING_TYPE_MAP,
  PAYMENT_STATUS_MAP,
  type BookingStatus,
} from "../../shared/constants";
import {
  useAction,
  useAddItem,
  useDelete,
  useDeleteItem,
  useDetail,
  useUpdate,
  useUpdateItem,
} from "../hooks/use-bookings";
import { bookingsApi } from "../services/bookings.api";
import { BookingDialog } from "./booking-dialog";
import { BookingItemDialog } from "./booking-item-dialog";
import { customerName, type Booking, type BookingItem } from "../types";

const NEXT_ACTIONS: Partial<Record<BookingStatus, { status: BookingStatus; label: string; destructive?: boolean }[]>> = {
  DRAFT: [
    { status: "CONFIRMED", label: "Confirm booking" },
    { status: "CANCELLED", label: "Cancel booking", destructive: true },
  ],
  CONFIRMED: [
    { status: "COMPLETED", label: "Mark completed" },
    { status: "CANCELLED", label: "Cancel booking", destructive: true },
  ],
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useDetail(id);
  const update = useUpdate();
  const remove = useDelete();

  const [editOpen, setEditOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BookingItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<BookingItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ status: BookingStatus; label: string; destructive?: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const changeStatus = useAction<Booking>(
    (id, body) => bookingsApi.changeStatus(id, body),
    "Booking status updated"
  );

  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const items = booking?.items ?? [];
  const editable = booking?.status === "DRAFT" || booking?.status === "CONFIRMED";

  const balance = useMemo(() => {
    if (!booking) return 0;
    return Number(booking.totalAmount) - Number(booking.paidAmount);
  }, [booking]);

  if (isLoading || !booking) {
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
        { bookingId: booking.id, itemId: editingItem.id, data: values },
        { onSuccess: () => setItemDialogOpen(false) }
      );
    } else {
      addItem.mutate({ bookingId: booking.id, data: values }, { onSuccess: () => setItemDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/travel/bookings")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{booking.bookingNumber}</h1>
            <StatusBadge value={booking.status} map={BOOKING_STATUS_MAP} />
            <StatusBadge value={booking.type} map={BOOKING_TYPE_MAP} />
            <StatusBadge value={booking.paymentStatus} map={PAYMENT_STATUS_MAP} />
          </div>
          <p className="text-sm text-muted-foreground">
            {customerName(booking.customer)} · created {formatDate(booking.createdAt)}
          </p>
        </div>
        <PermissionGate permission="bookings.edit">
          {(NEXT_ACTIONS[booking.status] ?? []).map((a) => (
            <Button
              key={a.status + a.label}
              variant={a.destructive ? "outline" : "default"}
              className={a.destructive ? "text-destructive border-destructive/40 hover:bg-destructive/10" : ""}
              onClick={() => setConfirmAction(a)}
            >
              {a.status === "CONFIRMED" && <CheckCircle2 className="mr-2 h-4 w-4" />}
              {a.status === "COMPLETED" && <CheckCircle2 className="mr-2 h-4 w-4" />}
              {a.status === "CANCELLED" && <XCircle className="mr-2 h-4 w-4" />}
              {a.label}
            </Button>
          ))}
        </PermissionGate>
        <PermissionGate permission="bookings.edit">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <Link to={`/crm/customers/${booking.customerId}`} className="font-medium text-primary hover:underline">
                {customerName(booking.customer)}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pax</span>
              <span>{booking.paxCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Travel date</span>
              <span>{booking.travelDate ? formatDate(booking.travelDate) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Return date</span>
              <span>{booking.returnDate ? formatDate(booking.returnDate) : "—"}</span>
            </div>
            {booking.applicationId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Application</span>
                <Link to={`/visa/applications/${booking.applicationId}`} className="font-medium text-primary hover:underline">
                  View
                </Link>
              </div>
            )}
            {booking.notes && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground">{booking.notes}</p>
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
              <CurrencyDisplay amount={Number(booking.subtotal)} currency={booking.currencyCode} className="tabular-nums" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums">-<CurrencyDisplay amount={Number(booking.discount)} currency={booking.currencyCode} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <CurrencyDisplay amount={Number(booking.tax)} currency={booking.currencyCode} className="tabular-nums" />
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold text-base">
              <span>Total</span>
              <CurrencyDisplay amount={Number(booking.totalAmount)} currency={booking.currencyCode} className="tabular-nums" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <CurrencyDisplay amount={Number(booking.paidAmount)} currency={booking.currencyCode} className="tabular-nums" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance</span>
              <CurrencyDisplay amount={balance} currency={booking.currencyCode} className="tabular-nums font-medium" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line items ({items.length})</CardTitle>
          {editable && (
            <PermissionGate permission="bookings.edit">
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
                No items yet. Add flights, hotels, packages or services to build up the total.
              </p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-3">
                <StatusBadge value={item.itemType} map={BOOKING_ITEM_TYPE_MAP} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.description}</p>
                  {item.notes && <p className="truncate text-xs text-muted-foreground">{item.notes}</p>}
                </div>
                <span className="text-sm text-muted-foreground tabular-nums w-20 text-right">
                  {item.quantity} × {Number(item.unitPrice).toFixed(2)}
                </span>
                <CurrencyDisplay
                  amount={Number(item.lineTotal)}
                  currency={item.currencyCode}
                  className="w-28 text-right font-medium tabular-nums"
                />
                {editable && (
                  <PermissionGate permission="bookings.edit">
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
                <CurrencyDisplay amount={Number(booking.subtotal)} currency={booking.currencyCode} />
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div className="flex justify-end">
          <PermissionGate permission="bookings.delete">
            <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setDeleting(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete booking
            </Button>
          </PermissionGate>
        </div>
      )}

      <BookingDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        booking={booking as Booking}
        onSubmit={(values) =>
          update.mutate({ id: booking.id, data: values }, { onSuccess: () => setEditOpen(false) })
        }
        isSubmitting={update.isPending}
      />

      <BookingItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
        currencyCode={booking.currencyCode}
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
            { bookingId: booking.id, itemId: deletingItem.id },
            { onSuccess: () => setDeletingItem(null) }
          )
        }
        isLoading={deleteItem.isPending}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        title={confirmAction?.label ?? ""}
        description={
          confirmAction?.status === "CANCELLED"
            ? "Cancelled bookings are frozen and cannot be edited. This is not a refund."
            : `Move ${booking.bookingNumber} to ${BOOKING_STATUS_MAP[confirmAction?.status as BookingStatus]?.label ?? ""}?`
        }
        confirmLabel={confirmAction?.destructive ? "Yes, cancel" : "Yes, continue"}
        variant={confirmAction?.destructive ? "destructive" : "default"}
        onConfirm={() =>
          confirmAction &&
          changeStatus.mutate(
            { id: booking.id, body: { status: confirmAction.status } },
            { onSuccess: () => setConfirmAction(null) }
          )
        }
        isLoading={changeStatus.isPending}
      />

      <ConfirmDialog
        open={deleting}
        onOpenChange={(o) => !o && setDeleting(false)}
        title="Delete booking?"
        description={`${booking.bookingNumber} will be archived. Confirmed or completed bookings cannot be deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() =>
          remove.mutate(booking.id, {
            onSuccess: () => {
              setDeleting(false);
              navigate("/travel/bookings");
            },
          })
        }
        isLoading={remove.isPending}
      />
    </div>
  );
}
