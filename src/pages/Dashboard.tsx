import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Phone, Sparkles } from "lucide-react";
import { useLeads, useTeam } from "@/hooks/useCrmData";
import { StatusBadge } from "@/components/StatusBadge";
import { LEAD_STATUSES, LeadStatus } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: leads = [], isLoading } = useLeads();
  const { data: team = [] } = useTeam();

  const stats = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter((l) => l.status === "Converted").length;
    const hot = leads.filter((l) => l.status === "Hot" || l.status === "Negotiation").length;
    const returned = leads.filter((l) => l.is_returned).length;
    const conv = total ? Math.round((converted / total) * 100) : 0;
    return { total, converted, hot, returned, conv };
  }, [leads]);

  const byStatus = useMemo(() => {
    const map: Record<LeadStatus, number> = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as any;
    leads.forEach((l) => { map[l.status] = (map[l.status] ?? 0) + 1; });
    return map;
  }, [leads]);

  const recent = leads.slice(0, 6);

  const cards = [
    { label: "Total leads", value: stats.total, icon: Users, hint: `${team.length} teammates` },
    { label: "Conversion", value: `${stats.conv}%`, icon: TrendingUp, hint: `${stats.converted} converted` },
    { label: "Hot pipeline", value: stats.hot, icon: Sparkles, hint: "Hot + Negotiation" },
    { label: "Returned leads", value: stats.returned, icon: Phone, hint: "Auto-detected" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">An overview of your pipeline and team activity.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-soft border-border/60 transition-smooth hover:shadow-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardDescription className="text-xs uppercase tracking-wide">{c.label}</CardDescription>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-semibold">{isLoading ? <Skeleton className="h-8 w-16" /> : c.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-soft border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Pipeline by status</CardTitle>
            <CardDescription>Distribution of leads across stages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {LEAD_STATUSES.map((s) => {
              const count = byStatus[s];
              const pct = stats.total ? (count / stats.total) * 100 : 0;
              return (
                <div key={s} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <StatusBadge status={s} />
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full gradient-primary transition-smooth" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-soft border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Recent leads</CardTitle>
            <CardDescription>Latest additions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground">No leads yet — create one from the Leads page.</p>
            )}
            {recent.map((l) => (
              <div key={l.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.source ?? "—"} · {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                  </div>
                </div>
                <StatusBadge status={l.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
