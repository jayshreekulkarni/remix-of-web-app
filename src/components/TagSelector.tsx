import { useEffect, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/TagBadge";
import { TAG_COLORS, TagColor, tagDotStyle } from "@/lib/tagColors";
import { cn } from "@/lib/utils";

type Props = {
  selected: Tag[];
  onChange: (tags: Tag[]) => void;
  className?: string;
};

export function TagSelector({ selected, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [newColor, setNewColor] = useState<TagColor>("sand");

  useEffect(() => { void loadTags(); }, []);

  async function loadTags() {
    const { data } = await supabase.from("tags").select("*").order("name");
    if (data) setAllTags(data as Tag[]);
  }

  const lower = query.trim().toLowerCase();
  const exists = useMemo(
    () => allTags.some((t) => t.name.toLowerCase() === lower),
    [allTags, lower],
  );

  async function createTag() {
    if (!lower) return;
    const { data, error } = await supabase
      .from("tags")
      .insert({ name: query.trim(), color: newColor })
      .select()
      .single();
    if (!error && data) {
      const t = data as Tag;
      setAllTags((prev) => [...prev, t]);
      onChange([...selected, t]);
      setQuery("");
      setNewColor("sand");
    }
  }

  function toggle(tag: Tag) {
    if (selected.find((t) => t.id === tag.id)) {
      onChange(selected.filter((t) => t.id !== tag.id));
    } else {
      onChange([...selected, tag]);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((t) => (
          <TagBadge key={t.id} tag={t} onRemove={() => toggle(t)} />
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command shouldFilter>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search or create..."
              />
              {lower && !exists && (
                <div className="border-b border-border/60 px-3 py-2 space-y-2 bg-muted/30">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pick a color</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        style={tagDotStyle(c)}
                        className={cn(
                          "h-5 w-5 rounded-full border transition-all",
                          newColor === c ? "ring-2 ring-offset-1 ring-foreground/40 scale-110" : "border-black/10",
                        )}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={createTag}
                    className="w-full text-left text-sm px-2 py-1.5 hover:bg-accent rounded flex items-center gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create "<span className="font-medium">{query.trim()}</span>"
                  </button>
                </div>
              )}
              <CommandList>
                <CommandEmpty>{lower ? null : "No tags yet"}</CommandEmpty>
                <CommandGroup>
                  {allTags.map((t) => {
                    const isSel = !!selected.find((s) => s.id === t.id);
                    return (
                      <CommandItem key={t.id} value={t.name} onSelect={() => toggle(t)}>
                        <Check className={cn("mr-2 h-4 w-4", isSel ? "opacity-100" : "opacity-0")} />
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
      </div>
    </div>
  );
}
