export const LEAD_STATUSES = [
  "New", "Qualified", "Disqualified", "Cold", "Warm", "Hot", "Negotiation", "Converted", "Inactive",
] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export const TEAM_ROLES = ["Admin", "Manager", "Sales Executive"] as const;
export type TeamRole = typeof TEAM_ROLES[number];

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
};

export type Tag = { id: string; name: string; color: string; created_at: string };

export type Lead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  campaign_name: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  returned_from_lead_id: string | null;
  is_returned: boolean;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  assignee?: TeamMember | null;
};

export type ActivityType =
  | "created" | "status_change" | "note" | "call" | "follow_up"
  | "assignment" | "tag_change" | "returned" | "integration_import";

export type LeadActivity = {
  id: string;
  lead_id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  actor_id: string | null;
  data: Record<string, any>;
  created_at: string;
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  New: "bg-status-new/15 text-status-new border-status-new/30",
  Qualified: "bg-status-qualified/15 text-status-qualified border-status-qualified/30",
  Disqualified: "bg-status-disqualified/15 text-status-disqualified border-status-disqualified/30",
  Cold: "bg-status-cold/15 text-status-cold border-status-cold/30",
  Warm: "bg-status-warm/15 text-status-warm border-status-warm/30",
  Hot: "bg-status-hot/15 text-status-hot border-status-hot/30",
  Negotiation: "bg-status-negotiation/15 text-status-negotiation border-status-negotiation/30",
  Converted: "bg-status-converted/15 text-status-converted border-status-converted/30",
  Inactive: "bg-status-inactive/15 text-status-inactive border-status-inactive/30",
};
