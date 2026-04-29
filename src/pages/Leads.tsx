import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLeads } from "@/hooks/useCrmData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { LEAD_STATUSES } from "@/lib/types";
import { NewLeadDialog } from "@/components/NewLeadDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Leads() {
  const { data: leads = [], isLoading } = useLeads();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return [l.name, l.email, l.phone, l.campaign_name, l.source]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [leads, q, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} of {leads.length} leads</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New lead
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone, campaign..." className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/60 bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  No leads match your filters.
                </TableCell></TableRow>
              )}
              {filtered.map((l) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer transition-smooth"
                  onClick={() => nav(`/leads/${l.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {l.name}
                      {l.is_returned && <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Returned</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{l.email ?? "—"}</TableCell>
                  <TableCell>{l.source ?? "—"}</TableCell>
                  <TableCell>{l.campaign_name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(l.tags ?? []).slice(0, 3).map((t) => <Badge key={t.id} variant="secondary" className="text-[10px]">{t.name}</Badge>)}
                      {(l.tags?.length ?? 0) > 3 && <span className="text-xs text-muted-foreground">+{(l.tags!.length - 3)}</span>}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                  <TableCell>
                    {l.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{initials(l.assignee.name)}</AvatarFallback></Avatar>
                        <span className="text-sm">{l.assignee.name}</span>
                      </div>
                    ) : <span className="text-muted-foreground text-sm">Unassigned</span>}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm tabular-nums">{format(new Date(l.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <NewLeadDialog open={open} onOpenChange={setOpen} onCreated={() => qc.invalidateQueries({ queryKey: ["leads"] })} />
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}
