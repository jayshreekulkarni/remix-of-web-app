import { useMemo, useState } from "react";
import { format } from "date-fns";
import { LeadActivity, LeadStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus, ArrowRightLeft, StickyNote, PhoneCall, CalendarClock,
  UserCog, Tag as TagIcon, RotateCcw, Download, ExternalLink, Clock,
  ArrowDownUp, Play, Pause,
} from "lucide-react";

const ICONS: Record<LeadActivity["type"], React.ComponentType<{ className?: string }>> = {
  created: Plus,
  status_change: ArrowRightLeft,
  note: StickyNote,
  call: PhoneCall,
  follow_up: CalendarClock,
  assignment: UserCog,
  tag_change: TagIcon,
  returned: RotateCcw,
  integration_import: Download,
};

const ACCENT: Partial<Record<LeadActivity["type"], string>> = {
  status_change: "bg-primary/10 text-primary border-primary/30 ring-2 ring-primary/15",
  call: "bg-status-warm/15 text-status-warm border-status-warm/30",
  returned: "bg-warning/15 text-warning border-warning/30",
  follow_up: "bg-status-negotiation/15 text-status-negotiation border-status-negotiation/30",
  created: "bg-status-converted/15 text-status-converted border-status-converted/30",
};

export function ActivityTimeline({ activities }: { activities: LeadActivity[] }) {
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  const sorted = useMemo(() => {
    const arr = [...activities];
    arr.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return order === "desc" ? db - da : da - db;
    });
    return arr;
  }, [activities, order]);

  if (!activities.length) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{activities.length} event{activities.length === 1 ? "" : "s"}</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setOrder(order === "desc" ? "asc" : "desc")}
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
          {order === "desc" ? "Newest first" : "Oldest first"}
        </Button>
      </div>

      <ol className="relative border-l border-border ml-3 space-y-6">
        {sorted.map((a) => {
          const Icon = ICONS[a.type] ?? StickyNote;
          const isStatus = a.type === "status_change";
          return (
            <li key={a.id} className="ml-6">
              <span
                className={cn(
                  "absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full border",
                  ACCENT[a.type] ?? "bg-primary-soft text-primary border-border",
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
              <div
                className={cn(
                  "rounded-lg border bg-card p-3 shadow-soft",
                  isStatus ? "border-primary/30 bg-primary/5" : "border-border/60",
                )}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium">{a.title}</p>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {format(new Date(a.created_at), "MMM d, yyyy · HH:mm")}
                  </span>
                </div>
                {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                {a.type === "call" && <CallCard data={a.data} />}
                {a.type === "created" && a.data?.snapshot && <Snapshot data={a.data.snapshot} />}
                {a.type === "returned" && (
                  <div className="mt-2 text-xs text-warning">
                    Linked to previous lead: <code className="font-mono">{a.data?.returned_from_lead_id}</code>
                  </div>
                )}
                {isStatus && <StatusChange data={a.data} />}
                {a.type === "follow_up" && a.data?.scheduled_at && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                    <CalendarClock className="h-3 w-3" />
                    Scheduled for {format(new Date(a.data.scheduled_at), "MMM d, yyyy · HH:mm")}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StatusChange({ data }: { data: any }) {
  const from = data?.from as LeadStatus | undefined;
  const to = data?.to as LeadStatus | undefined;
  if (!from && !to) return null;
  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
      {from && <StatusBadge status={from} />}
      <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
      {to && <StatusBadge status={to} />}
    </div>
  );
}

function CallCard({ data }: { data: any }) {
  const dur = data?.duration_seconds;
  const url = data?.recording_url as string | undefined;
  const source = data?.source as string | undefined;
  return (
    <div className="mt-3 rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        {dur != null && (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(Number(dur))}
          </span>
        )}
        {source && (
          <span className="inline-flex items-center gap-1 rounded-full bg-background border border-border/60 px-2 py-0.5">
            {source}
          </span>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {url && <AudioPlayer url={url} />}
    </div>
  );
}

function AudioPlayer({ url }: { url: string }) {
  return (
    <audio controls preload="none" src={url} className="w-full h-9">
      Your browser does not support audio playback.
    </audio>
  );
}

function Snapshot({ data }: { data: any }) {
  const fields: Array<[string, any]> = [
    ["Name", data?.name],
    ["Phone", data?.phone],
    ["Email", data?.email],
    ["Source", data?.source],
    ["Campaign", data?.campaign_name],
    ["Status", data?.status],
  ];
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      {fields.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2">
          <span className="text-muted-foreground">{k}</span>
          <span className="text-foreground truncate">{v ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

function formatDuration(sec: number) {
  if (!sec || sec < 0) return "0m 00s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
