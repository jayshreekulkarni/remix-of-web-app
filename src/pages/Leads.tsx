import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLeads, useTags, useTeam } from "@/hooks/useCrmData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/TagBadge";
import { tagDotStyle } from "@/lib/tagColors";
import { LEAD_STATUSES, LeadStatus } from "@/lib/types";
import { NewLeadDialog } from "@/components/NewLeadDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function Leads() {
  const { data: leads = [], isLoading } = useLeads();
  const { data: allTags = [] } = useTags();
  const { data: team = [] } = useTeam();
  const qc = useQueryClient();
  const nav = useNavigate();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [campaign, setCampaign] = useState<string>("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [bulkBusy, setBulkBusy] = useState(false);

  const campaigns = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.campaign_name && set.add(l.campaign_name));
    return Array.from(set).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (campaign !== "all" && l.campaign_name !== campaign) return false;
      if (assignee !== "all") {
        if (assignee === "unassigned" ? !!l.assigned_to : l.assigned_to !== assignee) return false;
      }
      if (tagIds.length > 0) {
        const ids = new Set((l.tags ?? []).map((t) => t.id));
        if (!tagIds.every((id) => ids.has(id))) return false;
      }
      if (q.trim()) {
        const needle = q.toLowerCase();
        const hit = [l.name, l.email, l.phone].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
        if (!hit) return false;
      }
      return true;
    });
  }, [leads, q, status, tagIds, campaign, assignee]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [q, status, tagIds, campaign, assignee]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const allOnPageSelected = paged.length > 0 && paged.every((l) => selected.has(l.id));
  function togglePage() {
    const next = new Set(selected);
    if (allOnPageSelected) paged.forEach((l) => next.delete(l.id));
    else paged.forEach((l) => next.add(l.id));
    setSelected(next);
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function clearSelection() { setSelected(new Set()); }

  async function bulkAssign(userId: string | null) {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const { error } = await supabase.from("leads").update({ assigned_to: userId }).in("id", Array.from(selected));
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Assigned ${selected.size} lead${selected.size > 1 ? "s" : ""}`);
    clearSelection();
    qc.invalidateQueries({ queryKey: ["leads"] });
  }
  async function bulkStatus(s: LeadStatus) {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const { error } = await supabase.from("leads").update({ status: s }).in("id", Array.from(selected));
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Updated ${selected.size} lead${selected.size > 1 ? "s" : ""}`);
    clearSelection();
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  const activeFilters = (status !== "all" ? 1 : 0) + (campaign !== "all" ? 1 : 0) + (assignee !== "all" ? 1 : 0) + tagIds.length;

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

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email..." className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={campaign} onValueChange={setCampaign}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Campaign" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Tag multi-filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              Tags {tagIds.length > 0 && <Badge variant="secondary" className="h-5 px-1.5">{tagIds.length}</Badge>}
              <ChevronDown className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Filter tags..." />
              <CommandList>
                <CommandEmpty>No tags</CommandEmpty>
                <CommandGroup>
                  {allTags.map((t) => {
                    const sel = tagIds.includes(t.id);
                    return (
                      <CommandItem
                        key={t.id}
                        value={t.name}
                        onSelect={() =>
                          setTagIds(sel ? tagIds.filter((id) => id !== t.id) : [...tagIds, t.id])
                        }
                      >
                        <Check className={cn("mr-2 h-4 w-4", sel ? "opacity-100" : "opacity-0")} />
                        <span style={tagDotStyle(t.color)} className="h-2.5 w-2.5 rounded-full mr-2" />
                        {t.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {activeFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => { setStatus("all"); setCampaign("all"); setAssignee("all"); setTagIds([]); }}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 flex-wrap rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="h-4 w-px bg-border" />
          <Select onValueChange={(v) => bulkStatus(v as LeadStatus)} disabled={bulkBusy}>
            <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Change status..." /></SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => bulkAssign(v === "unassigned" ? null : v)} disabled={bulkBusy}>
            <SelectTrigger className="h-8 w-[200px]"><SelectValue placeholder="Assign to..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassign</SelectItem>
              {team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} — {t.role}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={clearSelection} className="ml-auto gap-1">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox checked={allOnPageSelected} onCheckedChange={togglePage} aria-label="Select page" />
                </TableHead>
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
                <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                  No leads match your filters.
                </TableCell></TableRow>
              )}
              {paged.map((l) => {
                const isSel = selected.has(l.id);
                return (
                  <TableRow
                    key={l.id}
                    data-state={isSel ? "selected" : undefined}
                    className="cursor-pointer transition-smooth"
                    onClick={(e) => {
                      // don't navigate when clicking the checkbox cell
                      if ((e.target as HTMLElement).closest("[data-row-checkbox]")) return;
                      nav(`/leads/${l.id}`);
                    }}
                  >
                    <TableCell data-row-checkbox onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSel} onCheckedChange={() => toggleOne(l.id)} aria-label={`Select ${l.name}`} />
                    </TableCell>
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
                        {(l.tags ?? []).slice(0, 3).map((t) => <TagBadge key={t.id} tag={t} size="xs" />)}
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
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => { e.preventDefault(); if (currentPage > 1) setPage(currentPage - 1); }}
                  className={cn("cursor-pointer", currentPage === 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {pageRange(currentPage, totalPages).map((p, i) =>
                p === "..." ? (
                  <PaginationItem key={`e${i}`}><PaginationEllipsis /></PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === currentPage}
                      onClick={(e) => { e.preventDefault(); setPage(p as number); }}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setPage(currentPage + 1); }}
                  className={cn("cursor-pointer", currentPage === totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <NewLeadDialog open={open} onOpenChange={setOpen} onCreated={() => qc.invalidateQueries({ queryKey: ["leads"] })} />
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function pageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}
