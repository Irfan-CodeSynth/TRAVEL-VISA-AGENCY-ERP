import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS } from "../../shared/constants";
import { useConfirmPayment, useDelete, useFailPayment, useList, useRefundPayment } from "../hooks/use-payments";
import { getPaymentColumns } from "./payment-columns";
import { RefundDialog } from "./refund-dialog";
import type { Payment } from "../types";

const ALL = "all";

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [method, setMethod] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [refundView, setRefundView] = useState(ALL);

  const [refunding, setRefunding] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<Payment | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, method, status, refundView]);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit };
    if (debouncedSearch) p.search = debouncedSearch;
    if (method !== ALL) p.method = method;
    if (status !== ALL) p.status = status;
    if (refundView !== ALL) p.isRefund = refundView === "refunds" ? "true" : "false";
    return p;
  }, [page, limit, debouncedSearch, method, status, refundView]);

  const { data, isLoading } = useList(params);
  const refund = useRefundPayment();
  const confirmPayment = useConfirmPayment();
  const failPayment = useFailPayment();
  const remove = useDelete();

  const columns = useMemo(
    () =>
      getPaymentColumns({
        onRefund: (p) => setRefunding(p),
        onDelete: (p) => setDeleting(p),
        onConfirm: (p) => confirmPayment.mutate(p.id),
        onFail: (p) => failPayment.mutate(p.id),
      }),
    [confirmPayment, failPayment]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Money received and refunded against invoices." />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All methods</SelectItem>
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={refundView} onValueChange={setRefundView}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All records</SelectItem>
            <SelectItem value="payments">Payments only</SelectItem>
            <SelectItem value="refunds">Refunds only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        searchKey="global"
        searchPlaceholder="Search payment number, reference..."
        server={{
          page,
          pageSize: limit,
          totalCount: data?.pagination.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: setLimit,
          onSearchChange: setSearch,
          searchValue: search,
        }}
      />

      <RefundDialog
        open={!!refunding}
        onOpenChange={(o) => !o && setRefunding(null)}
        payment={refunding}
        onSubmit={(amount) =>
          refunding &&
          refund.mutate(
            { id: refunding.id, amount },
            { onSuccess: () => setRefunding(null) }
          )
        }
        isSubmitting={refund.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete payment?"
        description={
          deleting
            ? `${deleting.paymentNumber} will be archived. Completed payments cannot be deleted — refund instead.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        isLoading={remove.isPending}
      />
    </div>
  );
}
