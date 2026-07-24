-- Create table for alert history
CREATE TABLE IF NOT EXISTS public.historico_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  nivel text NOT NULL,
  valor numeric NOT NULL,
  limite numeric NOT NULL,
  mensagem text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historico_alertas ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view historico_alertas" ON public.historico_alertas;
CREATE POLICY "Authenticated users can view historico_alertas" 
ON public.historico_alertas 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert historico_alertas" ON public.historico_alertas;
CREATE POLICY "Authenticated users can insert historico_alertas" 
ON public.historico_alertas 
FOR INSERT 
WITH CHECK (true);

-- Index for efficient querying by date
CREATE INDEX IF NOT EXISTS idx_historico_alertas_created_at ON public.historico_alertas(created_at DESC);