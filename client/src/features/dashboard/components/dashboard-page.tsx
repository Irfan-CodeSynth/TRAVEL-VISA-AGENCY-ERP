import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, FileText, FileWarning, Phone, DollarSign, CreditCard, Plane,
  TrendingUp, CalendarClock, AlertTriangle, Wallet, Hourglass, Lock as LockIcon,
} from "lucide-react";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, Pie, PieChart,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { apiGet } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { APPLICATION_STATUS_MAP } from "../../visa/shared/constants";
import { BOOKING_STATUS_MAP, BOOKING_TYPE_MAP } from "../../travel/shared/constants";

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
  recentBookings: {
    id: string; bookingNumber: string; type: string; status: string;
    totalAmount: string; travelDate: string; customerName: string;
  }[];
  recentApplications: {
    id: string; applicationNumber: string; status: string;
    visaType: string; customerName: string; updatedAt: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SUBMITTED: "#3b82f6",
  UNDER_REVIEW: "#8b5cf6",
  AT_EMBASSY: "#f59e0b",
  ADDITIONAL_DOCS: "#ec4899",
  APPROVED: "#22c55e",
  REJECTED: "#ef4444",
  RETURNED: "#f97316",
  WITHDRAWN: "#6b7280",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardData>("/dashboard"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Live overview of your agency across branches." />

      <PermissionGate
        permission="reports.view"
        fallback={
          <EmptyState
            icon={LockIcon}
            title="Not available"
            description="You do not have permission to view the dashboard overview."
          />
        }
      >
        {isLoading ? (
          <DashboardSkeleton />
        ) : isError ? (
          <Card>
            <CardContent>
              <ErrorState message="Could not load the dashboard." onRetry={() => refetch()} />
            </CardContent>
          </Card>
        ) : data ? (
          <DashboardContent data={data} />
        ) : null}
      </PermissionGate>
    </div>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  const k = data.kpis;
  const pieData = data.applicationsByStatus
    .filter((g) => g.count > 0)
    .map((g) => ({
      name: APPLICATION_STATUS_MAP[g.status]?.label ?? g.status,
      value: g.count,
      color: STATUS_COLORS[g.status] ?? "#64748b",
    }));
  const hasRevenue = data.revenueTrend.some((m) => m.total !== 0);

  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={item}>
          <StatCard title="Total Customers" value={k.totalCustomers} icon={Users} iconColor="text-blue-500"
            changeLabel={`+${k.newCustomersThisMonth} new this month`} />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Active Applications" value={k.activeApplications} icon={FileText} iconColor="text-violet-500" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Pending Documents" value={k.pendingDocuments} icon={FileWarning} iconColor="text-amber-500" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Expiring Documents" value={k.expiringDocuments} icon={Hourglass} iconColor="text-rose-500"
            changeLabel="within 30 days" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Today's Follow-ups" value={k.todaysFollowUps} icon={Phone} iconColor="text-teal-500" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Overdue Follow-ups" value={k.overdueFollowUps} icon={AlertTriangle} iconColor="text-red-500" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Monthly Revenue" value={k.monthlyRevenue} formatAsCurrency icon={DollarSign} iconColor="text-green-500" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Outstanding" value={k.outstanding} formatAsCurrency icon={CreditCard} iconColor="text-red-500"
            changeLabel="on open invoices" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Net Received" value={k.netReceived} formatAsCurrency icon={Wallet} iconColor="text-emerald-500"
            changeLabel="all time, after refunds" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Upcoming Departures" value={k.upcomingDepartures} icon={Plane} iconColor="text-blue-500"
            changeLabel="next 14 days" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Upcoming Appointments" value={k.upcomingAppointments} icon={CalendarClock} iconColor="text-violet-500"
            changeLabel="next 14 days" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title="Lead Conversion" value={k.conversionRate} icon={TrendingUp} iconColor="text-teal-500"
            changeLabel="% of leads won" />
        </motion.div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Net payments received per month, past 12 months.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {hasRevenue ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.revenueTrend}>
                  <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <RechartsTooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No payments recorded yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>Distribution of all visa applications.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No applications yet.
              </div>
            )}
            {pieData.length > 0 && (
              <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
                {pieData.map((d) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Latest visa application activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications yet.</p>
            ) : (
              <div className="space-y-4">
                {data.recentApplications.map((a) => (
                  <Link key={a.id} to={`/visa/applications/${a.id}`} className="flex items-center justify-between hover:bg-muted/50 -mx-2 rounded-md px-2 py-1 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[a.status] ?? "#64748b" }} />
                      <div>
                        <p className="text-sm font-medium leading-none">{a.customerName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{a.visaType} · {a.applicationNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge value={a.status} map={APPLICATION_STATUS_MAP} />
                      <p className="text-xs text-muted-foreground mt-1"><RelativeTime date={a.updatedAt} /></p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Newest travel bookings.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <div className="divide-y">
                {data.recentBookings.map((b) => (
                  <Link key={b.id} to={`/travel/bookings/${b.id}`} className="flex items-center justify-between py-2.5 hover:bg-muted/50 -mx-2 rounded-md px-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium leading-none">{b.customerName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {BOOKING_TYPE_MAP[b.type]?.label ?? b.type} · {b.bookingNumber}
                        {b.travelDate ? ` · departs ${formatDate(b.travelDate)}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(Number(b.totalAmount))}</p>
                      <div className="mt-1"><StatusBadge value={b.status} map={BOOKING_STATUS_MAP} /></div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[380px]" />
        <Skeleton className="h-[380px]" />
      </div>
    </div>
  );
}
