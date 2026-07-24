-- Add compliance fields to raw point records (currently called registros_ponto in this project)
ALTER TABLE public.registros_ponto 
ADD COLUMN IF NOT EXISTS hash_digital TEXT,
ADD COLUMN IF NOT EXISTS dispositivo_id TEXT,
ADD COLUMN IF NOT EXISTS versao_app TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';

-- Create point settings table
CREATE TABLE IF NOT EXISTS public.configuracoes_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tolerancia_minutos INTEGER DEFAULT 10,
    intervalo_minimo_minutos INTEGER DEFAULT 60,
    permite_ponto_offline BOOLEAN DEFAULT true,
    exige_geolocalizacao BOOLEAN DEFAULT true,
    exige_reconhecimento_facial BOOLEAN DEFAULT false,
    raio_maximo_metros INTEGER DEFAULT 200, -- Raio de tolerância para geofencing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id)
);

-- Enable RLS
ALTER TABLE public.configuracoes_ponto ENABLE ROW LEVEL SECURITY;

-- Policies for configuracoes_ponto
DROP POLICY IF EXISTS "Configurações de ponto visíveis por membros da empresa" ON public.configuracoes_ponto;
CREATE POLICY "Configurações de ponto visíveis por membros da empresa" 
ON public.configuracoes_ponto FOR SELECT 
USING (empresa_id IN (SELECT id FROM empresas));

DROP POLICY IF EXISTS "Apenas admins podem atualizar configurações de ponto" ON public.configuracoes_ponto;
CREATE POLICY "Apenas admins podem atualizar configurações de ponto" 
ON public.configuracoes_ponto FOR UPDATE 
USING (empresa_id IN (SELECT id FROM empresas)); -- Simplified for now, usually checks role

-- Function to generate hash for records (simulation for now, usually done in edge function or trigger)
CREATE OR REPLACE FUNCTION public.gerar_hash_ponto()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple concatenation for hashing simulation
  NEW.hash_digital := encode(digest(
    COALESCE(NEW.colaborador_id::text, '') || 
    COALESCE(NEW.data::text, '') || 
    COALESCE(NEW.hora::text, '') || 
    COALESCE(NEW.tipo, ''), 
    'sha256'
  ), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_gerar_hash_ponto ON public.registros_ponto;
CREATE TRIGGER tr_gerar_hash_ponto
BEFORE INSERT ON public.registros_ponto
FOR EACH ROW
EXECUTE FUNCTION public.gerar_hash_ponto();
