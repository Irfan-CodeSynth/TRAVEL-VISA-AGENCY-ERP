import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowRight, Bot, CheckCircle2, Info, Lightbulb, ShieldAlert, Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { APPLICATION_STATUS_MAP } from "../../visa/shared/constants";

interface DashboardData {
  kpis: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    activeApplications: number;
    pendingDocuments: number;
    expiringDocuments: number;
    todaysFollowUps: number;
    overdueFollowUps: number;
    monthlyRevenue: number;
    outstanding: number;
    upcomingDepartures: number;
    upcomingAppointments: number;
    conversionRate: number;
    netReceived: number;
  };
  revenueTrend: { month: string; label: string; total: number }[];
  applicationsByStatus: { status: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
}

interface Insight {
  id: string;
  severity: "critical" | "warning" | "positive" | "info";
  title: string;
  detail: string;
  link?: { to: string; label: string };
}

const SEVERITY_STYLE: Record<Insight["severity"], { icon: typeof AlertTriangle; className: string; label: string }> = {
  critical: { icon: ShieldAlert, className: "text-red-500 bg-red-500/10", label: "Action needed" },
  warning: { icon: AlertTriangle, className: "text-amber-500 bg-amber-500/10", label: "Watch" },
  positive: { icon: CheckCircle2, className: "text-green-500 bg-green-500/10", label: "Good" },
  info: { icon: Info, className: "text-blue-500 bg-blue-500/10", label: "FYI" },
};

// All rules below are deterministic and run locally against the dashboard payload.
// No external AI service is called; results never leave this app.
function deriveInsights(data: DashboardData): Insight[] {
  const k = data.kpis;
  const insights: Insight[] = [];

  if (k.overdueFollowUps > 0) {
    insights.push({
      id: "overdue-followups",
      severity: k.overdueFollowUps >= 5 ? "critical" : "warning",
      title: `${k.overdueFollowUps} follow-up${k.overdueFollowUps === 1 ? "" : "s"} overdue`,
      detail: "Past-due follow-ups mean customers waiting on you. Clearing these first protects deals already in motion.",
      link: { to: "/crm/follow-ups", label: "Review follow-ups" },
    });
  }

  if (k.expiringDocuments > 0) {
    insights.push({
      id: "expiring-documents",
      severity: "warning",
      title: `${k.expiringDocuments} document${k.expiringDocuments === 1 ? "" : "s"} expiring within 30 days`,
      detail: "Passports or visas close to expiry can stall applications at the embassy stage. Ask affected customers to renew now.",
      link: { to: "/documents", label: "Open documents" },
    });
  }

  if (k.pendingDocuments >= 5) {
    insights.push({
      id: "document-backlog",
      severity: "warning",
      title: `Document review backlog: ${k.pendingDocuments} pending`,
      detail: "Uploaded documents are waiting to be verified. A growing backlog delays application submissions.",
      link: { to: "/documents", label: "Verify documents" },
    });
  }

  if (k.outstanding > 0) {
    insights.push({
      id: "outstanding",
      severity: k.outstanding > k.monthlyRevenue && k.monthlyRevenue > 0 ? "critical" : "warning",
      title: `${formatCurrency(k.outstanding)} still unpaid on invoices`,
      detail: k.monthlyRevenue > 0 && k.outstanding > k.monthlyRevenue
        ? "Unpaid balances exceed everything collected this month. Prioritise collection calls on the oldest invoices."
        : "Chase balances on open invoices — receivables this size are worth a weekly collection routine.",
      link: { to: "/reports", label: "See receivables report" },
    });
  }

  const negativeMonths = data.revenueTrend.filter((m) => m.total < 0);
  if (negativeMonths.length > 0) {
    const worst = negativeMonths.reduce((a, b) => (b.total < a.total ? b : a));
    insights.push({
      id: "refund-months",
      severity: "warning",
      title: `${negativeMonths.length} month${negativeMonths.length === 1 ? "" : "s"} with net-negative revenue`,
      detail: `Refunds exceeded collections in ${negativeMonths.map((m) => m.label).join(", ")} (worst: ${worst.label} at ${formatCurrency(worst.total)}).`,
    });
  }

  const leadTotal = data.leadsByStatus.reduce((s, g) => s + g.count, 0);
  if (leadTotal >= 10 && k.conversionRate < 15) {
    insights.push({
      id: "low-conversion",
      severity: "warning",
      title: `Lead conversion at ${k.conversionRate}%`,
      detail: `Only ${k.conversionRate}% of ${leadTotal} leads become customers. Check whether leads are being qualified before follow-up, or whether the source mix needs changing.`,
      link: { to: "/crm/leads", label: "Inspect leads" },
    });
  }

  const openStatuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "AT_EMBASSY", "ADDITIONAL_DOCS"];
  const bottleneck = data.applicationsByStatus
    .filter((g) => openStatuses.includes(g.status))
    .sort((a, b) => b.count - a.count)[0];
  if (bottleneck && bottleneck.count >= 3) {
    const label = APPLICATION_STATUS_MAP[bottleneck.status]?.label ?? bottleneck.status;
    insights.push({
      id: "pipeline-bottleneck",
      severity: "info",
      title: `Pipeline clusters at “${label}” (${bottleneck.count} applications)`,
      detail: bottleneck.status === "ADDITIONAL_DOCS"
        ? "Most cases are waiting on extra documents. A template reminder to customers could unblock several files at once."
        : bottleneck.status === "AT_EMBASSY"
          ? "Cases are sitting with the embassy — manage customer expectations on timelines rather than pushing internally."
          : `Focus the next sprint on moving “${label}” cases forward.`,
      link: { to: "/visa/applications", label: "Open applications" },
    });
  }

  if (k.upcomingDepartures > 0) {
    insights.push({
      id: "departures",
      severity: "info",
      title: `${k.upcomingDepartures} departure${k.upcomingDepartures === 1 ? "" : "s"} in the next 14 days`,
      detail: "Confirm tickets, visas and pickup arrangements for travellers leaving soon.",
      link: { to: "/travel/bookings", label: "Check bookings" },
    });
  }

  if (k.upcomingAppointments > 0) {
    insights.push({
      id: "appointments",
      severity: "info",
      title: `${k.upcomingAppointments} appointment${k.upcomingAppointments === 1 ? "" : "s"} scheduled within 14 days`,
      detail: "Send reminders and prepare document kits before biometrics or embassy interviews.",
      link: { to: "/visa/appointments", label: "See appointments" },
    });
  }

  if (k.monthlyRevenue > 0 && k.netReceived > 0) {
    insights.push({
      id: "revenue-positive",
      severity: "positive",
      title: `${formatCurrency(k.monthlyRevenue)} collected this month`,
      detail: `Lifetime net receipts stand at ${formatCurrency(k.netReceived)} after refunds.`,
    });
  }

  if (k.newCustomersThisMonth > 0) {
    insights.push({
      id: "growth",
      severity: "positive",
      title: `${k.newCustomersThisMonth} new customer${k.newCustomersThisMonth === 1 ? "" : "s"} added this month`,
      detail: `Customer base is now ${k.totalCustomers}. Keep first-contact response times low to convert momentum.`,
    });
  }

  const order = { critical: 0, warning: 1, info: 2, positive: 3 };
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}

export default function AIPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardData>("/dashboard"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        description="Rule-based recommendations computed locally from your agency data."
      />

      <PermissionGate
        permission="reports.view"
        fallback={
          <EmptyState
            icon={Bot}
            title="Not available"
            description="You do not have permission to view insights."
          />
        }
      >
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </div>
        ) : isError ? (
          <Card>
            <CardContent>
              <ErrorState message="Could not compute insights." onRetry={() => refetch()} />
            </CardContent>
          </Card>
        ) : data ? (
          <InsightsList data={data} />
        ) : null}
      </PermissionGate>
    </div>
  );
}

function InsightsList({ data }: { data: DashboardData }) {
  const insights = deriveInsights(data);

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="rounded-full bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">How these insights are made</CardTitle>
            <CardDescription>
              Deterministic rules over live figures — revenue trend, pipeline, receivables, follow-ups and documents.
              No external service sees your data, and the same numbers always give the same advice.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {insights.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={Lightbulb}
              title="Nothing needs attention"
              description="No warnings triggered — revenue, pipeline, documents and follow-ups all look healthy right now."
            />
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="grid gap-3 md:grid-cols-2"
        >
          {insights.map((ins) => {
            const style = SEVERITY_STYLE[ins.severity];
            const Icon = style.icon;
            return (
              <motion.div
                key={ins.id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              >
                <Card className="h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-md p-1.5 ${style.className}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{ins.title}</p>
                          <Badge variant="outline" className="text-[10px]">{style.label}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{ins.detail}</p>
                        {ins.link && (
                          <Link
                            to={ins.link.to}
                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          >
                            {ins.link.label}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
