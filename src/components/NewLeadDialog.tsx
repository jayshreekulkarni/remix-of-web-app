import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STATUSES, Lead, Tag, TeamMember, LeadStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagSelector } from "@/components/TagSelector";

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  campaign_name: z.string().trim().max(120).optional().or(z.literal("")),
  status: z.enum(LEAD_STATUSES),
  assigned_to: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (lead: Lead) => void;
};

export function NewLeadDialog({ open, onOpenChange, onCreated }: Props) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "", source: "", campaign_name: "", status: "New", assigned_to: undefined },
  });

  useEffect(() => {
    if (!open) return;
    void supabase.from("team_members").select("*").order("name")
      .then(({ data }) => setTeam((data as TeamMember[]) ?? []));
    setTags([]);
    form.reset();
  }, [open]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const payload = {
      name: values.name,
      phone: values.phone || null,
      email: values.email || null,
      source: values.source || null,
      campaign_name: values.campaign_name || null,
      status: values.status as LeadStatus,
      assigned_to: values.assigned_to || null,
    };
    const { data, error } = await supabase.from("leads").insert(payload).select().single();
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    const lead = data as Lead;
    if (tags.length > 0) {
      await supabase.from("lead_tags").insert(tags.map((t) => ({ lead_id: lead.id, tag_id: t.id })));
    }
    toast.success(lead.is_returned ? "Returned lead detected & created" : "Lead created");
    onCreated?.(lead);
    onOpenChange(false);
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} placeholder="+1 555 ..." /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem><FormLabel>Source</FormLabel><FormControl><Input {...field} placeholder="Website, Meta, Call..." /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="campaign_name" render={({ field }) => (
                <FormItem><FormLabel>Campaign</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="assigned_to" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Assigned to</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                    <SelectContent>{team.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} — {t.role}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div>
              <FormLabel>Tags</FormLabel>
              <TagSelector selected={tags} onChange={setTags} className="mt-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create lead"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
