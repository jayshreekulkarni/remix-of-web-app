CREATE TABLE public.integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  message TEXT,
  leads_created INT NOT NULL DEFAULT 0,
  leads_skipped INT NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_logs_integration ON public.integration_sync_logs(integration_id, created_at DESC);

ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open all" ON public.integration_sync_logs FOR ALL USING (true) WITH CHECK (true);