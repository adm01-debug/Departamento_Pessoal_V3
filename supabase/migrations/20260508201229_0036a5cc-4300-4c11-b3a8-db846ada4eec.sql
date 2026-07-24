-- Colunas para expatriados
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS expatriado BOOLEAN DEFAULT false;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS moeda_base TEXT DEFAULT 'BRL';
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS pais_origem TEXT;

-- Histórico de taxas de câmbio (para conversão na folha)
CREATE TABLE IF NOT EXISTS public.taxas_cambio (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    moeda_origem TEXT NOT NULL,
    moeda_destino TEXT NOT NULL DEFAULT 'BRL',
    taxa NUMERIC(15, 6) NOT NULL,
    data_referencia DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.taxas_cambio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view exchange rates" ON public.taxas_cambio;
CREATE POLICY "Users can view exchange rates" ON public.taxas_cambio FOR SELECT USING (true);
