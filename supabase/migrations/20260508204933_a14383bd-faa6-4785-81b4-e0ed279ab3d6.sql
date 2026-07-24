ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS pais_residencia_fiscal TEXT DEFAULT 'Brasil',
ADD COLUMN IF NOT EXISTS data_chegada_pais DATE,
ADD COLUMN IF NOT EXISTS data_saida_pais DATE,
ADD COLUMN IF NOT EXISTS regime_fiscal_especial BOOLEAN DEFAULT false;

-- Table for exchange rates if not exists (already checked it exists, but let's ensure structure)
CREATE TABLE IF NOT EXISTS public.taxas_cambio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moeda_origem TEXT NOT NULL,
    moeda_destino TEXT NOT NULL,
    taxa DECIMAL(18,6) NOT NULL,
    data_referencia DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(moeda_origem, moeda_destino, data_referencia)
);

-- RLS for exchange rates
ALTER TABLE public.taxas_cambio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view exchange rates" ON public.taxas_cambio;
CREATE POLICY "Public can view exchange rates" ON public.taxas_cambio FOR SELECT USING (true);
