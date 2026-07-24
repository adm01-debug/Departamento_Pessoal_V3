-- Create table to track login attempts with lockout
CREATE TABLE IF NOT EXISTS public.login_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- email or IP
  identifier_type TEXT NOT NULL DEFAULT 'email', -- 'email' or 'ip'
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(identifier, identifier_type)
);

-- Enable RLS
ALTER TABLE public.login_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for login rate limiting (needed before auth)
DROP POLICY IF EXISTS "Public can read rate limits" ON public.login_rate_limits;
CREATE POLICY "Public can read rate limits"
ON public.login_rate_limits
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public can insert rate limits" ON public.login_rate_limits;
CREATE POLICY "Public can insert rate limits"
ON public.login_rate_limits
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update rate limits" ON public.login_rate_limits;
CREATE POLICY "Public can update rate limits"
ON public.login_rate_limits
FOR UPDATE
USING (true);

-- Admins can delete/manage all records
DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.login_rate_limits;
CREATE POLICY "Admins can manage rate limits"
ON public.login_rate_limits
FOR ALL
USING (is_admin(auth.uid()));

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_login_rate_limits_identifier ON public.login_rate_limits(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_login_rate_limits_locked_until ON public.login_rate_limits(locked_until);

-- Function to calculate lockout duration (exponential backoff)
CREATE OR REPLACE FUNCTION public.calculate_lockout_duration(attempts INTEGER)
RETURNS INTERVAL AS $$
BEGIN
  -- Exponential backoff: 1min, 2min, 4min, 8min, 16min, 32min, max 60min
  RETURN LEAST(
    POWER(2, GREATEST(0, attempts - 5))::INTEGER * INTERVAL '1 minute',
    INTERVAL '60 minutes'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(p_identifier TEXT, p_identifier_type TEXT DEFAULT 'email')
RETURNS TABLE(is_locked BOOLEAN, locked_until_ts TIMESTAMP WITH TIME ZONE, attempts INTEGER, lockout_minutes INTEGER) AS $$
DECLARE
  v_record login_rate_limits%ROWTYPE;
  v_lockout_duration INTERVAL;
  v_new_attempts INTEGER;
BEGIN
  -- Get or create record
  INSERT INTO public.login_rate_limits (identifier, identifier_type, failed_attempts, last_attempt_at)
  VALUES (p_identifier, p_identifier_type, 1, now())
  ON CONFLICT (identifier, identifier_type)
  DO UPDATE SET
    failed_attempts = CASE 
      WHEN login_rate_limits.locked_until IS NOT NULL AND login_rate_limits.locked_until > now() 
      THEN login_rate_limits.failed_attempts + 1
      WHEN login_rate_limits.last_attempt_at < now() - INTERVAL '1 hour'
      THEN 1 -- Reset after 1 hour of no attempts
      ELSE login_rate_limits.failed_attempts + 1
    END,
    last_attempt_at = now(),
    updated_at = now()
  RETURNING * INTO v_record;
  
  v_new_attempts := v_record.failed_attempts;
  
  -- Check if should lock (5+ attempts)
  IF v_new_attempts >= 5 THEN
    v_lockout_duration := public.calculate_lockout_duration(v_new_attempts);
    
    UPDATE public.login_rate_limits
    SET locked_until = now() + v_lockout_duration, updated_at = now()
    WHERE id = v_record.id
    RETURNING * INTO v_record;
    
    RETURN QUERY SELECT 
      TRUE,
      v_record.locked_until,
      v_new_attempts,
      EXTRACT(EPOCH FROM v_lockout_duration)::INTEGER / 60;
  END IF;
  
  RETURN QUERY SELECT 
    FALSE,
    NULL::TIMESTAMP WITH TIME ZONE,
    v_new_attempts,
    0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.check_login_lock(p_identifier TEXT, p_identifier_type TEXT DEFAULT 'email')
RETURNS TABLE(is_locked BOOLEAN, locked_until_ts TIMESTAMP WITH TIME ZONE, remaining_seconds INTEGER) AS $$
DECLARE
  v_record login_rate_limits%ROWTYPE;
BEGIN
  SELECT * INTO v_record
  FROM public.login_rate_limits
  WHERE identifier = p_identifier AND identifier_type = p_identifier_type;
  
  IF v_record IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMP WITH TIME ZONE, 0;
    RETURN;
  END IF;
  
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > now() THEN
    RETURN QUERY SELECT 
      TRUE,
      v_record.locked_until,
      GREATEST(0, EXTRACT(EPOCH FROM (v_record.locked_until - now()))::INTEGER);
  ELSE
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMP WITH TIME ZONE, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset login attempts on successful login
CREATE OR REPLACE FUNCTION public.reset_login_attempts(p_identifier TEXT, p_identifier_type TEXT DEFAULT 'email')
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.login_rate_limits
  WHERE identifier = p_identifier AND identifier_type = p_identifier_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;