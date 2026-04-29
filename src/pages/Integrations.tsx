import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Facebook, Plug, Plug2, RefreshCw, Save } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Integration = {
  id: string; provider: string; enabled: boolean;
  config: Record<string, any>; field_mapping: Record<string, string>;
  last_sync_at: string | null;
};

type SyncLog = {
  id: string;
  integration_id: string;
  status: "success" | "error" | "partial";
  message: string | null;
  leads_created: number;
  leads_skipped: number;
  details: Record<string, any>;
  created_at: string;
};

const META_FIELDS = ["name", "phone", "email", "campaign", "tags", "source"] as const;

/** Sample payload representing what Meta Lead Ads webhook would deliver.
 *  Field names intentionally mirror Meta's `field_data` shape so the user's
 *  field mapping has something realistic to map against. */
const SAMPLE_META_PAYLOAD = [
  { full_name: "Aanya Sharma", phone_number: "+91 98000 11221", email: "aanya@example.com",
    campaign_name: "Spring Launch", ad_name: "Carousel A", form_name: "Demo Request" },
  { full_name: "Marco Rossi", phone_number: "+39 320 555 7711", email: "marco@example.com",
    campaign_name: "Webinar Replay", ad_name: "Video Ad", form_name: "Webinar Signup" },
  { full_name: "Lina Park", phone_number: "+82 10 4422 8801", email: "lina@example.com",
    campaign_name: "Spring Launch", ad_name: "Lookalike", form_name: "Demo Request" },
];

export default function Integrations() {
  const [meta, setMeta] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pageId, setPageId] = useState("");
  const [formId, setFormId] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<SyncLog[]>([]);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("integrations").select("*").eq("provider", "meta_leads").maybeSingle();
    if (data) {
      const i = data as Integration;
      setMeta(i);
      setPageId(i.config?.page_id ?? "");
      setFormId(i.config?.form_id ?? "");
      setMapping({
        name: i.field_mapping?.name ?? "full_name",
        phone: i.field_mapping?.phone ?? "phone_number",
        email: i.field_mapping?.email ?? "email",
        campaign: i.field_mapping?.campaign ?? "campaign_name",
        tags: i.field_mapping?.tags ?? "form_name",
        source: i.field_mapping?.source ?? "ad_name",
      });
      await loadLogs(i.id);
    }
    setLoading(false);
  }

  async function loadLogs(integrationId: string) {
    const { data } = await supabase
      .from("integration_sync_logs")
      .select("*")
      .eq("integration_id", integrationId)
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs((data ?? []) as SyncLog[]);
  }

  async function save() {
    if (!meta) return;
    setSaving(true);
    const { error } = await supabase.from("integrations").update({
      config: { ...meta.config, page_id: pageId, form_id: formId },
      field_mapping: mapping,
    }).eq("id", meta.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Settings saved"); load(); }
  }

  async function toggle(enabled: boolean) {
    if (!meta) return;
    const { error } = await supabase.from("integrations").update({ enabled }).eq("id", meta.id);
    if (error) toast.error(error.message); else { setMeta({ ...meta, enabled }); toast.success(enabled ? "Connected" : "Disconnected"); }
  }

  async function syncNow() {
    if (!meta) return;
    if (!meta.enabled) {
      toast.error("Connect the integration first");
      return;
    }
    setSyncing(true);
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of SAMPLE_META_PAYLOAD) {
      try {
        const name = pickField(row, mapping.name) || "Unknown";
        const phone = pickField(row, mapping.phone);
        const email = pickField(row, mapping.email);
        const campaign = pickField(row, mapping.campaign);
        const sourceLabel = pickField(row, mapping.source);
        const tagLabel = pickField(row, mapping.tags);

        // Insert lead
        const { data: lead, error: e1 } = await supabase
          .from("leads")
          .insert({
            name,
            phone: phone || null,
            email: email || null,
            campaign_name: campaign || null,
            source: sourceLabel ? `Meta · ${sourceLabel}` : "Meta",
            meta: { provider: "meta_leads", raw: row },
          })
          .select()
          .single();
        if (e1) throw e1;

        // Tag from form_name (or whatever was mapped to "tags")
        if (tagLabel && lead) {
          const { data: existingTag } = await supabase
            .from("tags").select("*").ilike("name", tagLabel).maybeSingle();
          let tagId = existingTag?.id;
          if (!tagId) {
            const { data: newTag } = await supabase
              .from("tags").insert({ name: tagLabel, color: "sky" }).select().single();
            tagId = newTag?.id;
          }
          if (tagId) {
            await supabase.from("lead_tags").insert({ lead_id: lead.id, tag_id: tagId });
          }
        }
        created++;
      } catch (err: any) {
        skipped++;
        errors.push(`${row.full_name ?? "(unknown)"}: ${err.message ?? String(err)}`);
      }
    }

    const status: SyncLog["status"] = errors.length === 0 ? "success" : (created > 0 ? "partial" : "error");
    const message = errors.length === 0
      ? `Imported ${created} lead${created === 1 ? "" : "s"} from Meta`
      : `Imported ${created}, skipped ${skipped}`;

    await supabase.from("integration_sync_logs").insert({
      integration_id: meta.id,
      status,
      message,
      leads_created: created,
      leads_skipped: skipped,
      details: { errors, sample_size: SAMPLE_META_PAYLOAD.length },
    });
    await supabase.from("integrations").update({ last_sync_at: new Date().toISOString() }).eq("id", meta.id);

    setSyncing(false);
    if (status === "success") toast.success(message);
    else if (status === "partial") toast.warning(message);
    else toast.error(message);
    load();
  }

  function setMap(k: string, v: string) { setMapping((m) => ({ ...m, [k]: v })); }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Lead integrations</h1>
        <p className="text-muted-foreground mt-1">Connect external sources to auto-import leads.</p>
      </div>

      {loading && <Skeleton className="h-64 max-w-3xl" />}
      {!loading && meta && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
          <Card className="shadow-soft border-border/60 lg:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-info/15 text-info flex items-center justify-center">
                    <Facebook className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Meta Lead Ads
                      {meta.enabled
                        ? <Badge className="bg-success/15 text-success border-success/30" variant="outline">Connected</Badge>
                        : <Badge variant="outline">Not connected</Badge>}
                    </CardTitle>
                    <CardDescription>Fetch leads from Meta Lead Ads and auto-create them in your CRM.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Active</Label>
                  <Switch checked={meta.enabled} onCheckedChange={toggle} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Meta Page ID</Label><Input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="e.g. 1234567890" /></div>
                <div><Label>Lead Form ID</Label><Input value={formId} onChange={(e) => setFormId(e.target.value)} placeholder="e.g. 9876543210" /></div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Field mapping</h3>
                <p className="text-xs text-muted-foreground mb-3">Map fields from the Meta payload to CRM lead fields. Defaults match Meta Lead Ads naming.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {META_FIELDS.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Label className="w-20 capitalize text-muted-foreground">{f}</Label>
                      <Input value={mapping[f] ?? ""} onChange={(e) => setMap(f, e.target.value)} placeholder={`Meta field for ${f}`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>{meta.last_sync_at
                    ? <>Last synced <span className="font-medium text-foreground">{formatDistanceToNow(new Date(meta.last_sync_at), { addSuffix: true })}</span></>
                    : "Never synced"}</p>
                  {!meta.enabled && <p className="text-warning">Connect the integration to enable syncing.</p>}
                </div>
                <div className="flex gap-2">
                  {meta.enabled ? (
                    <Button variant="outline" className="gap-2" onClick={() => toggle(false)}>
                      <Plug2 className="h-4 w-4" /> Disconnect
                    </Button>
                  ) : (
                    <Button variant="outline" className="gap-2" onClick={() => toggle(true)}>
                      <Plug className="h-4 w-4" /> Connect
                    </Button>
                  )}
                  <Button variant="outline" className="gap-2" onClick={syncNow} disabled={syncing || !meta.enabled}>
                    <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} /> {syncing ? "Syncing..." : "Sync leads"}
                  </Button>
                  <Button onClick={save} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Note:</strong> Sync uses a sample Meta payload to demonstrate the mapping. Wire this to the Meta Graph API by adding a Page Access Token; the import logic will work as-is.
              </div>
            </CardContent>
          </Card>

          {/* Sync logs */}
          <Card className="shadow-soft border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Sync activity</CardTitle>
              <CardDescription>Last 20 sync runs and errors.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[420px]">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">No syncs yet. Hit "Sync leads" to import a sample batch.</p>
                ) : (
                  <ol className="divide-y divide-border">
                    {logs.map((l) => <LogRow key={l.id} log={l} />)}
                  </ol>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-soft border-border/60 max-w-3xl border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Plug className="h-4 w-4" /> Mobile call logging API</CardTitle>
          <CardDescription>Reserved for the upcoming mobile app to push call logs and recordings.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The CRM accepts call activities with <code className="text-xs">duration_seconds</code> and <code className="text-xs">recording_url</code>. Lead source can be auto-detected from the caller phone number via the returned-lead linkage.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function LogRow({ log }: { log: SyncLog }) {
  const Icon = log.status === "success" ? CheckCircle2 : AlertCircle;
  const color = log.status === "success" ? "text-success" : log.status === "partial" ? "text-warning" : "text-destructive";
  const errors = (log.details?.errors ?? []) as string[];
  return (
    <li className="px-4 py-3 space-y-1.5">
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{log.message ?? log.status}</p>
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
              {format(new Date(log.created_at), "MMM d · HH:mm")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>+{log.leads_created} created</span>
            {log.leads_skipped > 0 && <span>· {log.leads_skipped} skipped</span>}
          </div>
          {errors.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded p-2">
              {errors.slice(0, 4).map((e, i) => <li key={i} className="truncate">• {e}</li>)}
              {errors.length > 4 && <li>… and {errors.length - 4} more</li>}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

function pickField(row: Record<string, any>, key: string | undefined): string {
  if (!key) return "";
  const v = row[key];
  return v == null ? "" : String(v);
}
