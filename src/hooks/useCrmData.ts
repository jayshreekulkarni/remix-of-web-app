import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lead, LeadActivity, Tag, TeamMember } from "@/lib/types";

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Tag[];
    },
  });
}

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, assignee:team_members!leads_assigned_to_fkey(*), lead_tags(tag:tags(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const all = (data ?? []).map((l: any) => ({
        ...l,
        tags: (l.lead_tags ?? []).map((lt: any) => lt.tag).filter(Boolean),
      })) as Lead[];
      // Hide superseded leads: any lead that a newer returned lead points back to.
      const supersededIds = new Set(
        all.filter((l) => l.is_returned && l.returned_from_lead_id).map((l) => l.returned_from_lead_id as string),
      );
      return all.filter((l) => !supersededIds.has(l.id));
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ["lead", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, assignee:team_members!leads_assigned_to_fkey(*), lead_tags(tag:tags(*))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return { ...data, tags: (data.lead_tags ?? []).map((lt: any) => lt.tag).filter(Boolean) } as Lead;
    },
  });
}

export function useLeadActivities(leadId: string | undefined) {
  return useQuery({
    queryKey: ["activities", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadActivity[];
    },
  });
}

/**
 * Returns activities for a lead AND, if it's a returned lead,
 * the activities + summary of the previous (linked) lead so they can
 * be displayed in the same timeline.
 */
export function useLeadActivitiesWithHistory(leadId: string | undefined, previousLeadId: string | null | undefined) {
  return useQuery({
    queryKey: ["activities-with-history", leadId, previousLeadId ?? null],
    enabled: !!leadId,
    queryFn: async () => {
      const ids = [leadId!, ...(previousLeadId ? [previousLeadId] : [])];
      const { data: acts, error: e1 } = await supabase
        .from("lead_activities")
        .select("*")
        .in("lead_id", ids)
        .order("created_at", { ascending: false });
      if (e1) throw e1;

      let previousLead: Lead | null = null;
      if (previousLeadId) {
        const { data: prev } = await supabase
          .from("leads")
          .select("*, assignee:team_members!leads_assigned_to_fkey(*), lead_tags(tag:tags(*))")
          .eq("id", previousLeadId)
          .maybeSingle();
        if (prev) {
          previousLead = {
            ...(prev as any),
            tags: ((prev as any).lead_tags ?? []).map((lt: any) => lt.tag).filter(Boolean),
          } as Lead;
        }
      }

      return {
        activities: (acts ?? []) as LeadActivity[],
        previousLead,
        previousLeadId: previousLeadId ?? null,
      };
    },
  });
}
