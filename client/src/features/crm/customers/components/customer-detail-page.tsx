import { useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarClock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { PermissionGate } from "@/components/shared/permission-gate";
import { formatDate } from "@/lib/utils";
import { useCustomerSummary, useDetail, useUpdate } from "../hooks/use-customers";
import { CustomerActivityCard } from "./customer-activity-card";
import { CustomerDialog } from "./customer-dialog";
import { customerDisplayName } from "./customer-columns";
import { CUSTOMER_STATUS_MAP, LEAD_SOURCE_LABELS } from "../../shared/constants";
import { FOLLOW_UP_STATUS_MAP } from "../../follow-ups/constants";

function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useDetail(id);
  const { data: summary } = useCustomerSummary(id);
  const update = useUpdate();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!customer) {
    return <p className="text-muted-foreground">Customer not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{customerDisplayName(customer)}</h1>
            <StatusBadge value={customer.status} map={CUSTOMER_STATUS_MAP} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">{customer.customerNumber}</p>
        </div>
        <PermissionGate permission="customers.edit">
          <Button variant="outline" onClick={() => setEditOpen(true)}>Edit</Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Open follow-ups" value={summary?.stats.followUpsOpen ?? 0} icon={CalendarClock} />
        <StatCard title="Total follow-ups" value={summary?.stats.followUpsTotal ?? 0} icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Type" value={customer.customerType === "COMPANY" ? "Company" : "Individual"} />
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="WhatsApp" value={customer.whatsapp ?? undefined} />
            <InfoRow label="Email" value={customer.email ?? undefined} />
            <InfoRow label="City" value={customer.city ?? undefined} />
            <InfoRow label="Address" value={customer.address ?? undefined} />
            <InfoRow label="Occupation" value={customer.occupation ?? undefined} />
            <InfoRow label="Nationality" value={customer.nationalityCountry?.name ?? undefined} />
            <InfoRow label="Source" value={customer.source ? LEAD_SOURCE_LABELS[customer.source] : undefined} />
            <InfoRow label="Assigned to" value={customer.assignedToUser ? `${customer.assignedToUser.firstName} ${customer.assignedToUser.lastName ?? ""}` : "Unassigned"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Travel documents</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="National ID" value={customer.nationalId ?? undefined} />
            <InfoRow label="Passport" value={customer.passportNumber ?? undefined} />
            <InfoRow
              label="Passport expiry"
              value={customer.passportExpiry ? formatDate(customer.passportExpiry) : undefined}
            />
            <InfoRow label="Date of birth" value={customer.dateOfBirth ? formatDate(customer.dateOfBirth) : undefined} />
            <InfoRow label="Gender" value={customer.gender ?? undefined} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent follow-ups</CardTitle></CardHeader>
        <CardContent>
          {!summary?.recentFollowUps.length ? (
            <p className="text-sm text-muted-foreground">No follow-ups yet.</p>
          ) : (
            <ul className="divide-y">
              {summary.recentFollowUps.map((fu) => (
                <li key={fu.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{fu.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {fu.type} · {formatDate(fu.scheduledAt, "MMM dd, yyyy p")}
                    </p>
                  </div>
                  <StatusBadge value={fu.status} map={FOLLOW_UP_STATUS_MAP} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CustomerActivityCard customerId={customer.id} />

      <CustomerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editId={customer.id}
        isSubmitting={update.isPending}
        onSubmit={(values) =>
          update.mutate({ id: customer.id, data: values }, { onSuccess: () => setEditOpen(false) })
        }
      />
    </div>
  );
}
