/*import { useQuery } from "@tanstack/react-query";
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
/*export function useLeadActivitiesWithHistory(leadId: string | undefined, previousLeadId: string | null | undefined) {
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
}*/




import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = "http://187.127.128.34:5000"; // VPS backend URL

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/leads`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      return res.json();
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ["lead", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/leads/${id}`);
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json();
    },
  });
}

export function useAddLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API_BASE_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok){
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to add lead");
      } 
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] }) // refresh leads after adding
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to update lead");
      }
      return res.json();
    },
   onSuccess: (_data, { id }) => {
      // Invalidate both the list and the individual lead cache
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
    },
    onError: (err: Error) => {
      console.error("[useUpdateLead] failed:", err.message);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useLeadActivitiesWithHistory(leadId: string | undefined) {
  return useQuery({
    queryKey: ["activities-with-history", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/leads/${leadId}/activities`);
      if (!res.ok) throw new Error("Failed to fetch lead activities");
      return res.json(); // should return an array of lead activities from your backend
    },
  });
}

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/team`);
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; email: string; role?: string; avatar_url?: string }) => {
      const res = await fetch(`${API_BASE_URL}/api/team_members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to create team member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (err: Error) => {
      console.error("[useCreateTeamMember] failed:", err.message);
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/tags`);
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
  });
}