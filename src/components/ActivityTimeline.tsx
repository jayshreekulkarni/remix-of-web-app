import { format } from "date-fns";
import { LeadActivity } from "@/lib/types";
import {
  Plus, ArrowRightLeft, StickyNote, PhoneCall, CalendarClock,
  UserCog, Tag as TagIcon, RotateCcw, Download, ExternalLink, Clock,
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

export function ActivityTimeline({ activities }: { activities: LeadActivity[] }) {
  if (!activities.length) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="relative border-l border-border ml-3 space-y-6">
      {activities.map((a) => {
        const Icon = ICONS[a.type] ?? StickyNote;
        return (
          <li key={a.id} className="ml-6">
            <span className="absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-primary border border-border">
              <Icon className="h-3 w-3" />
            </span>
            <div className="rounded-lg border border-border/60 bg-card p-3 shadow-soft">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-medium">{a.title}</p>
                <span className="text-xs text-muted-foreground tabular-nums">{format(new Date(a.created_at), "MMM d, yyyy · HH:mm")}</span>
              </div>
              {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
              {a.type === "call" && <CallDetails data={a.data} />}
              {a.type === "created" && a.data?.snapshot && <Snapshot data={a.data.snapshot} />}
              {a.type === "returned" && (
                <div className="mt-2 text-xs text-warning">
                  Linked to previous lead: <code className="font-mono">{a.data?.returned_from_lead_id}</code>
                </div>
              )}
              {a.type === "status_change" && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {a.data?.from} → <span className="font-medium text-foreground">{a.data?.to}</span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CallDetails({ data }: { data: any }) {
  const dur = data?.duration_seconds;
  const url = data?.recording_url;
  return (
    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
      {dur != null && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(Number(dur))}</span>}
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
          Recording <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
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
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
