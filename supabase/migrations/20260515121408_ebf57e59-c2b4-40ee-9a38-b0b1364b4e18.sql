-- Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_timestamp ON public.rate_limits (key, timestamp);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Deny all by default (Service Role only)
DROP POLICY IF EXISTS "Service Role only access" ON public.rate_limits;
CREATE POLICY "Service Role only access" 
ON public.rate_limits 
FOR ALL 
USING (false) 
WITH CHECK (false);