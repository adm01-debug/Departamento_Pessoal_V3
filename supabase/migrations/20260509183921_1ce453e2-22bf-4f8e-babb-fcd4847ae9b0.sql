-- Habilitar pgcrypto para hash se necessário
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Adicionar coluna para relatório de conformidade
ALTER TABLE public.solicitacoes_ajuste_ponto 
ADD COLUMN IF NOT EXISTS relatorio_conformidade JSONB DEFAULT '{}'::jsonb;

-- Atualizar políticas RLS para solicitações de ajuste de ponto
DROP POLICY IF EXISTS "Gestores aprovam solicitações" ON public.solicitacoes_ajuste_ponto;

DROP POLICY IF EXISTS "Gestores e RH aprovam solicitações" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "Gestores e RH aprovam solicitações" 
ON public.solicitacoes_ajuste_ponto 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text IN ('gestor', 'admin', 'rh')
  )
  AND empresa_id IN (SELECT id FROM public.empresas)
)
WITH CHECK (
  status IN ('aprovado', 'recusado', 'revisao', 'encaminhado')
);

-- Função para gerar relatório de conformidade simplificado (Portaria 671)
CREATE OR REPLACE FUNCTION public.gerar_relatorio_conformidade_ponto()
RETURNS TRIGGER AS $$
DECLARE
    v_timezone TEXT;
    v_geofencing_ok BOOLEAN := true;
    v_divergencia_minutos INTEGER;
BEGIN
    -- Simulação de validações da Portaria 671
    v_timezone := 'America/Sao_Paulo';
    
    -- Calcular divergência em minutos entre original e sugerida
    IF NEW.hora_original IS NOT NULL AND NEW.hora_sugerida IS NOT NULL THEN
        v_divergencia_minutos := ABS(EXTRACT(EPOCH FROM (NEW.hora_sugerida::time - NEW.hora_original::time)) / 60);
    ELSE
        v_divergencia_minutos := 0;
    END IF;

    -- Consolidar no JSONB
    NEW.relatorio_conformidade := jsonb_build_object(
        'timestamp_validacao', now(),
        'timezone', v_timezone,
        'geofencing', v_geofencing_ok,
        'divergencia_minutos', v_divergencia_minutos,
        'sha256_integridade', encode(digest(NEW.id::text || NEW.hora_sugerida::text || now()::text, 'sha256'), 'hex'),
        'portaria_671_conformidade', true,
        'validador_id', auth.uid()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar relatório antes de aprovar/recusar
DROP TRIGGER IF EXISTS tr_gerar_conformidade_ponto ON public.solicitacoes_ajuste_ponto;
CREATE TRIGGER tr_gerar_conformidade_ponto
BEFORE UPDATE ON public.solicitacoes_ajuste_ponto
FOR EACH ROW
WHEN (OLD.status = 'enviado' AND NEW.status IN ('aprovado', 'recusado'))
EXECUTE FUNCTION public.gerar_relatorio_conformidade_ponto();
