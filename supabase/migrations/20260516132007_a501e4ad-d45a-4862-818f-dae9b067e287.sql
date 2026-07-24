-- Create promo_brindes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.promo_brindes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco NUMERIC(10,2) DEFAULT 0,
    estoque INTEGER DEFAULT 0,
    categoria TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(nome)
);

-- Ensure times table has a consistent structure for our needs
-- If the user wants specific "TIME" records, we use the existing 'times' table
-- but we might want to ensure it has what we need.

-- Enable RLS
ALTER TABLE public.promo_brindes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.times ENABLE ROW LEVEL SECURITY;

-- Simple policies (allowing all for now as it's a management system, 
-- but in production these would be restricted by auth.uid())
DROP POLICY IF EXISTS "Enable read access for all users" ON public.promo_brindes;
CREATE POLICY "Enable read access for all users" ON public.promo_brindes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON public.promo_brindes;
CREATE POLICY "Enable insert for all users" ON public.promo_brindes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON public.promo_brindes;
CREATE POLICY "Enable update for all users" ON public.promo_brindes FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON public.promo_brindes;
CREATE POLICY "Enable delete for all users" ON public.promo_brindes FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.times;
CREATE POLICY "Enable read access for all users" ON public.times FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON public.times;
CREATE POLICY "Enable insert for all users" ON public.times FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON public.times;
CREATE POLICY "Enable update for all users" ON public.times FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON public.times;
CREATE POLICY "Enable delete for all users" ON public.times FOR DELETE USING (true);

-- Trigger for updated_at on promo_brindes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_promo_brindes_updated_at ON public.promo_brindes;
CREATE TRIGGER update_promo_brindes_updated_at
BEFORE UPDATE ON public.promo_brindes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
