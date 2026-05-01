import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv, rowsToCsv, timestampedName } from "@/lib/csv";

type TableKey = "leads" | "follow_ups" | "team_members" | "integration_sync_logs";

const TABLES: { key: TableKey; title: string; description: string }[] = [
  { key: "leads", title: "Leads", description: "All leads with status, source, campaign, and assignment." },
  { key: "follow_ups", title: "Follow-ups", description: "Scheduled follow-ups, due dates, and completion status." },
  { key: "team_members", title: "Team members", description: "Team directory with roles and contact info." },
  { key: "integration_sync_logs", title: "Integration sync logs", description: "History of integration sync runs and outcomes." },
];

export default function Export() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleExport = async (table: TableKey, title: string) => {
    setLoading((s) => ({ ...s, [table]: true }));
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      if (!rows.length) {
        toast.info(`No rows to export in ${title}.`);
        return;
      }
      const csv = rowsToCsv(rows);
      downloadCsv(timestampedName(table), csv);
      toast.success(`Exported ${rows.length} ${title.toLowerCase()} row${rows.length === 1 ? "" : "s"}.`);
    } catch (e: any) {
      toast.error(e?.message ?? `Failed to export ${title}`);
    } finally {
      setLoading((s) => ({ ...s, [table]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Export</h1>
        <p className="text-sm text-muted-foreground">Download your CRM data as CSV files.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TABLES.map((t) => (
          <Card key={t.key}>
            <CardHeader>
              <CardTitle className="text-base">{t.title}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExport(t.key, t.title)}
                disabled={!!loading[t.key]}
                size="sm"
              >
                {loading[t.key] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
