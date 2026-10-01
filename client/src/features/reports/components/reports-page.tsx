import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, PieChart } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface ReportColumn {
  key: string;
  label: string;
  money?: boolean;
}

interface ReportPayload {
  type: string;
  summary: { label: string; value: number }[];
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  extra?: { title: string; columns: ReportColumn[]; rows: Record<string, string | number>[] };
}

const REPORTS = [
  { value: "revenue", label: "Revenue", description: "Money received, refunds and approved expenses per month." },
  { value: "pipeline", label: "Sales & Visa Pipeline", description: "Leads by stage beside applications by status." },
  { value: "receivables", label: "Receivables", description: "Open invoices with balances and overdue days." },
  { value: "bookings", label: "Bookings", description: "Travel bookings grouped by type with collected amounts." },
  { value: "expenses", label: "Expenses", description: "Spend by category with share of total." },
  { value: "commissions", label: "Commissions", description: "Agent earnings, payable and paid-out totals." },
  { value: "margins", label: "Ticket Margins", description: "Fares sold: sold value vs market base cost and agency margin earned." },
];

const DATE_RANGE_TYPES = new Set(["revenue", "bookings", "expenses", "commissions", "margins"]);

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const COUNT_LABELS = new Set([
  "Leads", "Applications", "Open invoices", "Bookings", "Confirmed", "Cancelled",
  "Categories used", "Agents earned", "Tickets sold",
]);

function formatSummaryValue(label: string, value: number): string {
  if (label.includes("%")) return `${value.toLocaleString()}%`;
  if (COUNT_LABELS.has(label)) return value.toLocaleString();
  return formatCurrency(value);
}

function formatCell(column: ReportColumn, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") return "—";
  if (column.money) return formatCurrency(Number(value));
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

function toCsv(columns: ReportColumn[], rows: Record<string, string | number>[]): string {
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export default function ReportsPage() {
  const [type, setType] = useState("revenue");
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  const dateParams = DATE_RANGE_TYPES.has(type) ? { from, to } : {};
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports", type, DATE_RANGE_TYPES.has(type) ? from : null, DATE_RANGE_TYPES.has(type) ? to : null],
    queryFn: () => apiGet<ReportPayload>(`/reports/${type}`, dateParams),
  });

  const active = REPORTS.find((r) => r.value === type)!;

  const exportCsv = () => {
    if (!data) return;
    let csv = toCsv(data.columns, data.rows);
    if (data.extra?.rows.length) {
      csv += `\n\n${data.extra.title}\n${toCsv(data.extra.columns, data.extra.rows)}`;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational and financial reports computed from your live data."
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setType(r.value)}
            className={`rounded-lg border p-3 text-left text-sm transition-colors ${
              type === r.value
                ? "border-primary bg-primary/5 font-medium"
                : "hover:bg-muted/50"
            }`}
          >
            {r.label}
            <span className="block text-xs text-muted-foreground font-normal mt-0.5">{r.description}</span>
          </button>
        ))}
      </div>

      {DATE_RANGE_TYPES.has(type) && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="report-from">From</Label>
            <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-to">To</Label>
            <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent>
            <ErrorState message={`Could not load the ${active.label} report.`} onRetry={() => refetch()} />
          </CardContent>
        </Card>
      ) : data ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {data.summary.map((s) => (
              <div key={s.label} className="rounded-lg border bg-card p-3 min-w-[160px] flex-1">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold mt-1">{formatSummaryValue(s.label, s.value)}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{active.label}</CardTitle>
                <CardDescription>{active.description}</CardDescription>
              </div>
              <PermissionGate permission="reports.export">
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data.rows.length}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              {data.rows.length === 0 ? (
                <EmptyState icon={PieChart} title="No data" description="No rows for this report in the selected range." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        {data.columns.map((c) => (
                          <th key={c.key} className={`py-2 pr-4 font-medium ${c.money ? "text-right" : ""}`}>
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                          {data.columns.map((c) => (
                            <td key={c.key} className={`py-2 pr-4 ${c.money ? "text-right tabular-nums" : ""}`}>
                              {formatCell(c, row[c.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {data.extra && data.extra.rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{data.extra.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        {data.extra.columns.map((c) => (
                          <th key={c.key} className={`py-2 pr-4 font-medium ${c.money ? "text-right" : ""}`}>
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.extra.rows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {data.extra!.columns.map((c) => (
                            <td key={c.key} className={`py-2 pr-4 ${c.money ? "text-right tabular-nums" : ""}`}>
                              {formatCell(c, row[c.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
