-- Enums
CREATE TYPE public.lead_status AS ENUM ('New','Qualified','Disqualified','Cold','Warm','Hot','Negotiation','Converted','Inactive');
CREATE TYPE public.team_role AS ENUM ('Admin','Manager','Sales Executive');
CREATE TYPE public.activity_type AS ENUM ('created','status_change','note','call','follow_up','assignment','tag_change','returned','integration_import');

-- Team
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role team_role NOT NULL DEFAULT 'Sales Executive',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'sand',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT,
  campaign_name TEXT,
  status lead_status NOT NULL DEFAULT 'New',
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  returned_from_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  is_returned BOOLEAN NOT NULL DEFAULT false,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned ON public.leads(assigned_to);

-- Lead <-> Tags
CREATE TABLE public.lead_tags (
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- Activities
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  actor_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_lead ON public.lead_activities(lead_id, created_at DESC);

-- Integrations
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_integrations_updated BEFORE UPDATE ON public.integrations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Returned-lead detection trigger
CREATE OR REPLACE FUNCTION public.detect_returned_lead()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE prev_id UUID;
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    SELECT id INTO prev_id FROM public.leads
      WHERE phone = NEW.phone AND id <> NEW.id
      ORDER BY created_at DESC LIMIT 1;
    IF prev_id IS NOT NULL THEN
      NEW.is_returned := true;
      NEW.returned_from_lead_id := prev_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_leads_returned BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.detect_returned_lead();

-- Activity: lead created snapshot
CREATE OR REPLACE FUNCTION public.log_lead_created()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.lead_activities (lead_id, type, title, description, data)
  VALUES (
    NEW.id,
    CASE WHEN NEW.is_returned THEN 'returned'::activity_type ELSE 'created'::activity_type END,
    CASE WHEN NEW.is_returned THEN 'Returned lead created' ELSE 'Lead created' END,
    'Initial snapshot of the lead at creation time.',
    jsonb_build_object(
      'snapshot', to_jsonb(NEW),
      'returned_from_lead_id', NEW.returned_from_lead_id
    )
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_leads_created_log AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_created();

-- Activity: status change
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_activities (lead_id, type, title, data)
    VALUES (NEW.id, 'status_change', 'Status changed to ' || NEW.status,
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.lead_activities (lead_id, type, title, data)
    VALUES (NEW.id, 'assignment', 'Assignment changed',
      jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_leads_status_log AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_status_change();

-- RLS: open access (no auth yet, per user request)
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.lead_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.lead_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open all" ON public.integrations FOR ALL USING (true) WITH CHECK (true);

-- Seed initial integration row
INSERT INTO public.integrations (provider, enabled, field_mapping)
VALUES ('meta_leads', false, '{"name":"full_name","phone":"phone_number","email":"email","campaign":"campaign_name","source":"platform","tags":"tags"}'::jsonb);
