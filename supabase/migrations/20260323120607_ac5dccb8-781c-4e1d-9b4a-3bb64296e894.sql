
CREATE TABLE IF NOT EXISTS public.query_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation TEXT NOT NULL,
  table_name TEXT,
  rpc_name TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  record_count INTEGER,
  query_limit INTEGER,
  query_offset INTEGER,
  count_mode TEXT,
  severity TEXT NOT NULL DEFAULT 'normal',
  error_message TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.query_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read telemetry" ON public.query_telemetry;
CREATE POLICY "Authenticated users can read telemetry"
  ON public.query_telemetry FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert telemetry" ON public.query_telemetry;
CREATE POLICY "Authenticated users can insert telemetry"
  ON public.query_telemetry FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete telemetry" ON public.query_telemetry;
CREATE POLICY "Authenticated users can delete telemetry"
  ON public.query_telemetry FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_query_telemetry_created_at ON public.query_telemetry (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_telemetry_severity ON public.query_telemetry (severity);
