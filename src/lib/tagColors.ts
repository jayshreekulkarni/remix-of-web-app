import { cn } from "@/lib/utils";

/** Notion-inspired tag color palette. Soft warm neutrals + accents. */
export const TAG_COLORS = [
  "sand", "rose", "amber", "olive", "teal", "sky", "indigo", "violet", "pink", "stone",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

/** Background / text / border classes for each tag color. Uses HSL inline so we
 *  don't have to enumerate dozens of Tailwind classes. */
const PALETTE: Record<TagColor, { bg: string; text: string; border: string; dot: string }> = {
  sand:   { bg: "30 35% 92%",  text: "24 40% 28%",  border: "30 25% 80%",  dot: "28 45% 55%"  },
  rose:   { bg: "350 75% 94%", text: "350 60% 35%", border: "350 60% 82%", dot: "350 70% 58%" },
  amber:  { bg: "38 90% 90%",  text: "30 70% 30%",  border: "38 70% 75%",  dot: "35 85% 55%"  },
  olive:  { bg: "75 35% 88%",  text: "80 35% 25%",  border: "75 30% 72%",  dot: "80 40% 45%"  },
  teal:   { bg: "175 45% 88%", text: "180 45% 22%", border: "175 35% 70%", dot: "175 55% 40%" },
  sky:    { bg: "205 70% 92%", text: "210 60% 30%", border: "205 55% 78%", dot: "205 70% 52%" },
  indigo: { bg: "230 60% 92%", text: "230 50% 35%", border: "230 45% 78%", dot: "230 60% 58%" },
  violet: { bg: "270 55% 93%", text: "270 45% 38%", border: "270 40% 78%", dot: "270 55% 60%" },
  pink:   { bg: "325 70% 93%", text: "325 55% 38%", border: "325 50% 80%", dot: "325 65% 60%" },
  stone:  { bg: "30 8% 90%",   text: "30 10% 28%",  border: "30 8% 75%",   dot: "30 8% 50%"   },
};

export function getTagColor(name: string | null | undefined): TagColor {
  if (name && (TAG_COLORS as readonly string[]).includes(name)) return name as TagColor;
  return "sand";
}

export function tagStyle(color: string | null | undefined): React.CSSProperties {
  const c = PALETTE[getTagColor(color)];
  return {
    backgroundColor: `hsl(${c.bg})`,
    color: `hsl(${c.text})`,
    borderColor: `hsl(${c.border})`,
  };
}

export function tagDotStyle(color: string | null | undefined): React.CSSProperties {
  const c = PALETTE[getTagColor(color)];
  return { backgroundColor: `hsl(${c.dot})` };
}

export function tagSwatchClass() {
  return cn("h-3 w-3 rounded-full border border-black/10");
}
