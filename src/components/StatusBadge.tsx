import { LeadStatus, STATUS_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}



/*import { LeadStatus, STATUS_COLORS } from "@lib/types";
import { cn } from "@lib/utils";
import { useUpdateLead } from "@/hooks/useCrmData";

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
  leadId: string; // Added to identify which lead to update
}

export function StatusBadge({ status, className, leadId }: StatusBadgeProps) {
  const updateLead = useUpdateLead();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as LeadStatus;
    updateLead.mutate({ id: leadId, payload: { status: newStatus } });
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {/* Dropdown for editing status */}
    /*  <select
        value={status}
        onChange={handleStatusChange}
        className="bg-transparent text-xs font-medium border-none outline-none cursor-pointer"
      >
        {Object.keys(STATUS_COLORS).map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </span>
  );
}*/
