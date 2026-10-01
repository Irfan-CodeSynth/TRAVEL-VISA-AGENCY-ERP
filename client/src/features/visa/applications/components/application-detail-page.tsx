import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, FileText, Pencil, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { CurrencyDisplay } from "@/components/shared/currency-display";
import { cn, formatDate } from "@/lib/utils";
import { APPLICATION_PIPELINE, APPLICATION_STATUS_MAP, APPOINTMENT_STATUS_MAP, APPOINTMENT_TYPE_MAP } from "../../shared/constants";
import { useChangeStatus, useDetail, useTimeline, useUpdate } from "../hooks/use-applications";
import { ApplicationDialog } from "./application-dialog";
import { ChangeStatusDialog } from "./change-status-dialog";
import type { TimelineEvent } from "../types";

function StatusStepper({ current }: { current: string }) {
  const inPipeline = APPLICATION_PIPELINE.includes(current as any);
  const currentIndex = inPipeline ? APPLICATION_PIPELINE.indexOf(current as any) : -1;
  const percent = inPipeline ? Math.round((currentIndex / (APPLICATION_PIPELINE.length - 1)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute top-3 left-3 right-3 h-1 rounded-full bg-muted" />
        <div
          className="absolute top-3 left-3 h-1 rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `calc((100% - 24px) * ${percent / 100})` }}
        />
        <div className="relative flex justify-between">
          {APPLICATION_PIPELINE.map((step, i) => {
            const reached = inPipeline && i <= currentIndex;
            return (
              <div key={step} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background text-xs font-semibold transition-all duration-500",
                    reached ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {i + 1}
                </div>
                <span className={cn("text-[11px]", reached ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {APPLICATION_STATUS_MAP[step].label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {!inPipeline && (
        <div className="flex justify-center">
          <StatusBadge value={current} map={APPLICATION_STATUS_MAP} />
        </div>
      )}
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  if (event.kind === "APPOINTMENT") {
    const a = event.appointment;
    return (
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-purple-600">
          <CalendarClock className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm">
            <span className="font-medium">{a.subject}</span>{" "}
            <StatusBadge value={a.status} map={APPOINTMENT_STATUS_MAP} />
          </p>
          <p className="text-xs text-muted-foreground">
            {APPOINTMENT_TYPE_MAP[a.type]?.label} · {formatDate(a.scheduledAt)}
            {a.location ? ` · ${a.location}` : ""}
          </p>
        </div>
      </div>
    );
  }
  if (event.kind === "CREATED") {
    return (
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Application created</p>
          <p className="text-xs text-muted-foreground">{formatDate(event.at)}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        <StatusBadge value={event.toStatus} map={APPLICATION_STATUS_MAP} />
      </div>
      <div>
        <p className="text-sm">
          {event.fromStatus ? (
            <>
              <span className="text-muted-foreground">{APPLICATION_STATUS_MAP[event.fromStatus].label}</span>
              {" → "}
            </>
          ) : null}
          <span className="font-medium">{APPLICATION_STATUS_MAP[event.toStatus].label}</span>
        </p>
        {event.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
        <p className="text-xs text-muted-foreground">{formatDate(event.at)}</p>
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: application, isLoading } = useDetail(id ?? null);
  const { data: timeline } = useTimeline(id ?? null);
  const changeStatus = useChangeStatus();
  const update = useUpdate();

  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const events = useMemo(() => timeline ?? [], [timeline]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Application not found.</p>
        <Button variant="outline" onClick={() => navigate("/visa/applications")}>
          Back to applications
        </Button>
      </div>
    );
  }

  const customerName = application.customer
    ? [application.customer.firstName, application.customer.lastName].filter(Boolean).join(" ")
    : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/visa/applications")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{application.applicationNumber}</h1>
              <StatusBadge value={application.status} map={APPLICATION_STATUS_MAP} />
            </div>
            <p className="text-sm text-muted-foreground">
              {application.visaType?.country?.flagEmoji} {application.visaType?.name} ·{" "}
              <Link to={`/crm/customers/${application.customerId}`} className="text-primary hover:underline">
                {customerName}
              </Link>
            </p>
          </div>
        </div>
        <PermissionGate permission="applications.edit">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button onClick={() => setStatusOpen(true)}>
              <Shuffle className="mr-2 h-4 w-4" /> Change status
            </Button>
          </div>
        </PermissionGate>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusStepper current={application.status} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Applicants</span>
              <span className="font-medium">{application.applicantCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total fees</span>
              <span>
                {application.totalFees ? (
                  <CurrencyDisplay amount={Number(application.totalFees)} currency={application.currencyCode} />
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{application.submissionDate ? formatDate(application.submissionDate) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Decision</span>
              <span>{application.decisionDate ? formatDate(application.decisionDate) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">External ref</span>
              <span className="font-mono text-xs">{application.referenceNumber ?? "—"}</span>
            </div>
            {application.visaType?.country && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country</span>
                <Badge variant="outline">
                  {application.visaType.country.flagEmoji} {application.visaType.country.name}
                </Badge>
              </div>
            )}
            {application.notes && (
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-line">{application.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-5">
                {events.map((e, i) => (
                  <TimelineItem key={i} event={e} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ApplicationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        application={application}
        isSubmitting={update.isPending}
        onSubmit={(values) =>
          update.mutate(
            { id: application.id, data: values },
            { onSuccess: () => setEditOpen(false) }
          )
        }
      />

      <ChangeStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        application={application}
        isSubmitting={changeStatus.isPending}
        onConfirm={(status, note) =>
          changeStatus.mutate(
            { id: application.id, body: { status, note } },
            { onSuccess: () => setStatusOpen(false) }
          )
        }
      />
    </div>
  );
}
