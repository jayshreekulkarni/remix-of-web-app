import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTeam } from "@/hooks/useCrmData";
import { supabase } from "@/integrations/supabase/client";
import { TEAM_ROLES, TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  role: z.enum(TEAM_ROLES),
});

const ROLE_TONE: Record<string, string> = {
  Admin: "border-status-hot/40 text-status-hot",
  Manager: "border-status-negotiation/40 text-status-negotiation",
  "Sales Executive": "border-status-new/40 text-status-new",
};

export default function Team() {
  const { data: team = [], isLoading } = useTeam();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", role: "Sales Executive" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    const { error } = await supabase.from("team_members").insert({
      name: values.name, email: values.email, phone: values.phone || null, role: values.role,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Team member added");
    qc.invalidateQueries({ queryKey: ["team"] });
    form.reset(); setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">{team.length} members</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Invite member</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{TEAM_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter><Button type="submit">Add member</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        {team.map((m: TeamMember) => (
          <Card key={m.id} className="shadow-soft border-border/60 transition-smooth hover:shadow-card">
            <CardContent className="p-5 flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="gradient-primary text-primary-foreground font-semibold">
                  {m.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{m.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${ROLE_TONE[m.role]}`}>{m.role}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{m.email}</p>
                {m.phone && <p className="text-xs text-muted-foreground mt-0.5">{m.phone}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
