CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_ups_assigned ON public.follow_ups(assigned_to, due_at);
CREATE INDEX idx_follow_ups_lead ON public.follow_ups(lead_id);

CREATE TRIGGER trg_follow_ups_updated BEFORE UPDATE ON public.follow_ups
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.follow_ups FOR ALL USING (true) WITH CHECK (true);