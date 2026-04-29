import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, StickyNote, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLead, useLeadActivitiesWithHistory, useTeam } from "@/hooks/useCrmData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAD_STATUSES, LeadStatus } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: lead, isLoading } = useLead(id);
  const { data: history } = useLeadActivitiesWithHistory(id, lead?.returned_from_lead_id ?? null);
  const activities = history?.activities ?? [];
  const previousLead = history?.previousLead ?? null;
  const previousLeadId = history?.previousLeadId ?? null;
  const { data: team = [] } = useTeam();

  const [note, setNote] = useState("");
  const [callDur, setCallDur] = useState("");
  const [callRec, setCallRec] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [followNote, setFollowNote] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["activities", id] });
    qc.invalidateQueries({ queryKey: ["lead", id] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  async function changeStatus(s: LeadStatus) {
    if (!lead) return;
    const { error } = await supabase.from("leads").update({ status: s }).eq("id", lead.id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); refresh(); }
  }

  async function changeAssignee(uid: string) {
    if (!lead) return;
    const { error } = await supabase.from("leads").update({ assigned_to: uid || null }).eq("id", lead.id);
    if (error) toast.error(error.message); else { toast.success("Assignee updated"); refresh(); }
  }

  async function addNote() {
    if (!note.trim() || !lead) return;
    const { error } = await supabase.from("lead_activities").insert({
      lead_id: lead.id, type: "note", title: "Note added", description: note.trim(),
    });
    if (error) toast.error(error.message);
    else { setNote(""); toast.success("Note added"); refresh(); }
  }

  async function logCall() {
    if (!lead) return;
    const { error } = await supabase.from("lead_activities").insert({
      lead_id: lead.id, type: "call", title: "Call logged",
      data: { duration_seconds: Number(callDur) || 0, recording_url: callRec || null, source: "manual" },
    });
    if (error) toast.error(error.message);
    else { setCallDur(""); setCallRec(""); toast.success("Call logged"); refresh(); }
  }

  async function scheduleFollowUp() {
    if (!followUpAt || !lead) return;
    const { error } = await supabase.from("lead_activities").insert({
      lead_id: lead.id, type: "follow_up",
      title: `Follow-up scheduled for ${format(new Date(followUpAt), "MMM d, HH:mm")}`,
      description: followNote || null,
      data: { scheduled_at: followUpAt },
    });
    if (error) toast.error(error.message);
    else { setFollowUpAt(""); setFollowNote(""); toast.success("Follow-up scheduled"); refresh(); }
  }

  if (isLoading || !lead) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => nav("/leads")} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{lead.name}</h1>
            <StatusBadge status={lead.status} />
            {lead.is_returned && <Badge variant="outline" className="border-warning/40 text-warning">Returned lead</Badge>}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Created {format(new Date(lead.created_at), "MMM d, yyyy · HH:mm")}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={lead.status} onValueChange={(v) => changeStatus(v as LeadStatus)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={lead.assigned_to ?? ""} onValueChange={changeAssignee}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              {team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-soft border-border/60 h-fit">
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail label="Phone" value={lead.phone} />
            <Detail label="Email" value={lead.email} />
            <Detail label="Source" value={lead.source} />
            <Detail label="Campaign" value={lead.campaign_name} />
            <Detail label="Assigned" value={lead.assignee?.name ?? "Unassigned"} />
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1">
                {(lead.tags ?? []).length === 0 && <span className="text-muted-foreground text-xs">No tags</span>}
                {(lead.tags ?? []).map((t) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)}
              </div>
            </div>
            {lead.is_returned && lead.returned_from_lead_id && (
              <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-xs">
                This lead returned from a previous record. Previous lead snapshot is shown in the activity timeline.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-soft border-border/60">
            <CardHeader><CardTitle className="text-base">Add activity</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue="note">
                <TabsList>
                  <TabsTrigger value="note" className="gap-1.5"><StickyNote className="h-3.5 w-3.5" />Note</TabsTrigger>
                  <TabsTrigger value="call" className="gap-1.5"><Phone className="h-3.5 w-3.5" />Call</TabsTrigger>
                  <TabsTrigger value="follow" className="gap-1.5"><CalendarClock className="h-3.5 w-3.5" />Follow-up</TabsTrigger>
                </TabsList>
                <TabsContent value="note" className="space-y-3 pt-4">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write a note..." />
                  <Button onClick={addNote} disabled={!note.trim()}>Save note</Button>
                </TabsContent>
                <TabsContent value="call" className="space-y-3 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label>Duration (seconds)</Label><Input type="number" min={0} value={callDur} onChange={(e) => setCallDur(e.target.value)} /></div>
                    <div><Label>Recording URL</Label><Input value={callRec} onChange={(e) => setCallRec(e.target.value)} placeholder="https://..." /></div>
                  </div>
                  <Button onClick={logCall}>Log call</Button>
                </TabsContent>
                <TabsContent value="follow" className="space-y-3 pt-4">
                  <div><Label>When</Label><Input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} /></div>
                  <div><Label>Note (optional)</Label><Textarea value={followNote} onChange={(e) => setFollowNote(e.target.value)} /></div>
                  <Button onClick={scheduleFollowUp} disabled={!followUpAt}>Schedule</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border/60">
            <CardHeader><CardTitle className="text-base">Activity timeline</CardTitle></CardHeader>
            <CardContent><ActivityTimeline activities={activities} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right truncate max-w-[60%]">{value || "—"}</span>
    </div>
  );
}
