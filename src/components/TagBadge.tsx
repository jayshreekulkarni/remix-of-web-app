import { Tag } from "@/lib/types";
import { tagStyle, tagDotStyle } from "@/lib/tagColors";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type Props = {
  tag: Pick<Tag, "name" | "color">;
  onRemove?: () => void;
  className?: string;
  size?: "xs" | "sm";
};

export function TagBadge({ tag, onRemove, className, size = "sm" }: Props) {
  return (
    <span
      style={tagStyle(tag.color)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "xs" ? "px-2 py-0 text-[10px] h-5" : "px-2.5 py-0.5 text-xs",
        className,
      )}
    >
      <span style={tagDotStyle(tag.color)} className="h-1.5 w-1.5 rounded-full" />
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="rounded-full hover:bg-black/10 p-0.5 -mr-1"
          aria-label={`Remove ${tag.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
