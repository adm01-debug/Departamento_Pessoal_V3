-- 1. Hardening SECURITY DEFINER functions automatically
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT n.nspname as schema, p.proname as name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE p.prosecdef = true AND n.nspname = 'public'
    ) LOOP
        BEGIN
            EXECUTE 'ALTER FUNCTION ' || quote_ident(r.schema) || '.' || quote_ident(r.name) || '(' || r.args || ') SET search_path = public;';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not alter function %.%: %', r.schema, r.name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 2. Grant permissions to authenticated users and service_role for all tables in public schema
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.' || quote_ident(r.tablename) || ' TO authenticated;';
        EXECUTE 'GRANT ALL ON public.' || quote_ident(r.tablename) || ' TO service_role;';
    END LOOP;
END $$;

-- 3. Enable RLS on all tables that don't have it
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- 4. Add a generic system log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.logs_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nivel TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    contexto JSONB,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT ON public.logs_sistema TO authenticated;
GRANT ALL ON public.logs_sistema TO service_role;
ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own logs' AND tablename = 'logs_sistema') THEN
        CREATE POLICY "Users can insert their own logs" ON public.logs_sistema FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can see all logs' AND tablename = 'logs_sistema') THEN
        CREATE POLICY "Admins can see all logs" ON public.logs_sistema FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM auth.users 
                WHERE id = auth.uid() 
                AND (raw_user_meta_data->>'role')::text = 'admin'
            )
        );
    END IF;
END $$;
