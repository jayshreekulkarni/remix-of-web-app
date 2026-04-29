import { useEffect, useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      .insert({ name: query.trim() })
      .select()
      .single();
    if (!error && data) {
      const t = data as Tag;
      setAllTags((prev) => [...prev, t]);
      onChange([...selected, t]);
      setQuery("");
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
          <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
            {t.name}
            <button
              type="button"
              onClick={() => toggle(t)}
              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
              aria-label={`Remove ${t.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command shouldFilter>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search or create..."
              />
              <CommandList>
                <CommandEmpty>
                  {lower ? (
                    <button
                      type="button"
                      onClick={createTag}
                      className="w-full text-left text-sm px-2 py-1.5 hover:bg-accent rounded"
                    >
                      Create "<span className="font-medium">{query.trim()}</span>"
                    </button>
                  ) : "No tags yet"}
                </CommandEmpty>
                <CommandGroup>
                  {allTags.map((t) => {
                    const isSel = !!selected.find((s) => s.id === t.id);
                    return (
                      <CommandItem key={t.id} value={t.name} onSelect={() => toggle(t)}>
                        <Check className={cn("mr-2 h-4 w-4", isSel ? "opacity-100" : "opacity-0")} />
                        {t.name}
                      </CommandItem>
                    );
                  })}
                  {lower && !exists && (
                    <CommandItem value={`__create_${lower}`} onSelect={createTag}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create "{query.trim()}"
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
