-- Add new columns to epis table
ALTER TABLE public.epis 
ADD COLUMN IF NOT EXISTS fabricante TEXT,
ADD COLUMN IF NOT EXISTS unidade_medida TEXT DEFAULT 'un',
ADD COLUMN IF NOT EXISTS estoque_atual INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;

-- Ensure RLS is enabled (should already be, but safe to verify)
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;

-- Refined policies for better security context
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Empresas can manage their own epis' AND tablename = 'epis') THEN
        CREATE POLICY "Empresas can manage their own epis" 
        ON public.epis 
        FOR ALL 
        USING (empresa_id IN (SELECT id FROM empresas));
    END IF;
END $$;
