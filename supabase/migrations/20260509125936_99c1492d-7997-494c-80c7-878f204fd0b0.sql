-- Tabela de Trilha de Auditoria para o Ponto
CREATE TABLE IF NOT EXISTS public.trilha_auditoria_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ponto_id UUID REFERENCES public.batidas_ponto(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    acao TEXT NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    justificativa TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.trilha_auditoria_ponto ENABLE ROW LEVEL SECURITY;

-- Campos Adicionais
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'batidas_ponto' AND column_name = 'hash_integridade') THEN
        ALTER TABLE public.batidas_ponto ADD COLUMN hash_integridade TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'batidas_ponto' AND column_name = 'latitude') THEN
        ALTER TABLE public.batidas_ponto ADD COLUMN latitude DECIMAL(10, 8);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'batidas_ponto' AND column_name = 'longitude') THEN
        ALTER TABLE public.batidas_ponto ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'batidas_ponto' AND column_name = 'dispositivo_id') THEN
        ALTER TABLE public.batidas_ponto ADD COLUMN dispositivo_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'batidas_ponto' AND column_name = 'offline') THEN
        ALTER TABLE public.batidas_ponto ADD COLUMN offline BOOLEAN DEFAULT false;
    END IF;
END $$;

-- RLS simplificado: Usuários logados podem ver (restringido pelo app)
DROP POLICY IF EXISTS "Acesso à trilha de auditoria" ON public.trilha_auditoria_ponto;
CREATE POLICY "Acesso à trilha de auditoria" ON public.trilha_auditoria_ponto
FOR SELECT USING (auth.uid() IS NOT NULL);
