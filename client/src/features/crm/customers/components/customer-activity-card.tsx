import { useMemo } from "react";
import { FileText, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PermissionGate } from "@/components/shared/permission-gate";
import { formatDateTime } from "../../../visa/appointments/components/appointment-columns";
import { useList as useCommunicationList } from "../../../communications/hooks/use-communications";
import { useList as useDocumentList } from "../../../documents/hooks/use-documents";
import { CHANNEL_MAP } from "../../../communications/shared/constants";
import { DOCUMENT_STATUS_MAP, DOCUMENT_TYPE_MAP } from "../../../documents/shared/constants";
import type { Communication } from "../../../communications/types";
import type { Document } from "../../../documents/types";

type TimelineItem =
  | { kind: "communication"; at: string; data: Communication }
  | { kind: "document"; at: string; data: Document };

export function CustomerActivityCard({ customerId }: { customerId: string }) {
  const comms = useCommunicationList({ page: 1, limit: 10, customerId });
  const docs = useDocumentList({ page: 1, limit: 10, customerId });

  const items = useMemo<TimelineItem[]>(() => {
    const list: TimelineItem[] = [
      ...(comms.data?.data ?? []).map((c) => ({ kind: "communication" as const, at: c.occurredAt, data: c })),
      ...(docs.data?.data ?? []).map((d) => ({ kind: "document" as const, at: d.createdAt, data: d })),
    ];
    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 12);
  }, [comms.data, docs.data]);

  const isEmpty =
    (comms.isLoading || !comms.data?.data.length) && (docs.isLoading || !docs.data?.data.length);

  return (
    <PermissionGate permission="communications.view">
      <Card>
        <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
        <CardContent>
          {isEmpty ? (
            <p className="text-sm text-muted-foreground">No communications or documents yet.</p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={`${item.kind}-${item.data.id}`} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      {item.kind === "communication" ? (
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">
                        {item.kind === "communication" ? item.data.subject : item.data.title}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.at)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {item.kind === "communication" ? (
                      <StatusBadge value={item.data.channel} map={CHANNEL_MAP} />
                    ) : (
                      <>
                        <StatusBadge value={item.data.type} map={DOCUMENT_TYPE_MAP} />
                        <StatusBadge value={item.data.status} map={DOCUMENT_STATUS_MAP} />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PermissionGate>
  );
}
