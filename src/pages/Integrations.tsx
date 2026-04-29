import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Facebook, Plug, RefreshCw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Integration = {
  id: string; provider: string; enabled: boolean;
  config: Record<string, any>; field_mapping: Record<string, string>;
  last_sync_at: string | null;
};

const META_FIELDS = ["name", "phone", "email", "campaign", "tags", "source"] as const;

export default function Integrations() {
  const [meta, setMeta] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageId, setPageId] = useState("");
  const [formId, setFormId] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("integrations").select("*").eq("provider", "meta_leads").maybeSingle();
    if (data) {
      const i = data as Integration;
      setMeta(i);
      setPageId(i.config?.page_id ?? "");
      setFormId(i.config?.form_id ?? "");
      setMapping(i.field_mapping ?? {});
    }
    setLoading(false);
  }

  async function save() {
    if (!meta) return;
    setSaving(true);
    const { error } = await supabase.from("integrations").update({
      config: { ...meta.config, page_id: pageId, form_id: formId },
      field_mapping: mapping,
    }).eq("id", meta.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Integration settings saved"); load(); }
  }

  async function toggle(enabled: boolean) {
    if (!meta) return;
    const { error } = await supabase.from("integrations").update({ enabled }).eq("id", meta.id);
    if (error) toast.error(error.message); else { setMeta({ ...meta, enabled }); toast.success(enabled ? "Enabled" : "Disabled"); }
  }

  function setMap(k: string, v: string) { setMapping((m) => ({ ...m, [k]: v })); }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">Connect external sources to auto-import leads.</p>
      </div>

      {loading && <Skeleton className="h-64" />}
      {!loading && meta && (
        <Card className="shadow-soft border-border/60 max-w-3xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/15 text-info flex items-center justify-center">
                  <Facebook className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Meta Lead Ads
                    {meta.enabled ? <Badge className="bg-success/15 text-success border-success/30" variant="outline">Connected</Badge>
                      : <Badge variant="outline">Disabled</Badge>}
                  </CardTitle>
                  <CardDescription>Fetch leads from Meta and auto-create them in your CRM.</CardDescription>
                </div>
              </div>
              <Switch checked={meta.enabled} onCheckedChange={toggle} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Meta Page ID</Label><Input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="e.g. 1234567890" /></div>
              <div><Label>Lead Form ID</Label><Input value={formId} onChange={(e) => setFormId(e.target.value)} placeholder="e.g. 9876543210" /></div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Field mapping</h3>
              <p className="text-xs text-muted-foreground mb-3">Map fields from the Meta payload to CRM lead fields.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {META_FIELDS.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Label className="w-20 capitalize text-muted-foreground">{f}</Label>
                    <Input value={mapping[f] ?? ""} onChange={(e) => setMap(f, e.target.value)} placeholder={`Meta field for ${f}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {meta.last_sync_at ? `Last synced ${format(new Date(meta.last_sync_at), "MMM d, HH:mm")}` : "Never synced"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" disabled>
                  <RefreshCw className="h-4 w-4" /> Sync now
                </Button>
                <Button onClick={save} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save settings"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Coming soon:</strong> Live sync with Meta Graph API. Add a Meta Page Access Token via secrets to enable. The mapping & UI are ready — wiring is one edge function away.
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-soft border-border/60 max-w-3xl border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Plug className="h-4 w-4" /> Mobile call logging API</CardTitle>
          <CardDescription>Reserved for the upcoming mobile app to push call logs and recordings.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The CRM already accepts call activities with <code className="text-xs">duration_seconds</code> and <code className="text-xs">recording_url</code> fields. Lead source can be auto-detected from the caller phone number via the returned-lead linkage.</p>
        </CardContent>
      </Card>
    </div>
  );
}
