CREATE OR REPLACE FUNCTION public.validate_ponto_compliance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_config RECORD;
BEGIN
    -- Busca configurações da empresa
    SELECT * INTO v_config FROM public.configuracoes_ponto WHERE empresa_id = NEW.empresa_id LIMIT 1;

    -- 1. Validação de Integridade (Hash SHA256)
    -- O hash deve ser validado no backend se houver segredo, aqui apenas checamos presença
    IF NEW.hash_integridade IS NULL THEN
        INSERT INTO public.conformidade_ponto_logs (empresa_id, batida_id, tipo_alerta, descricao, severidade)
        VALUES (NEW.empresa_id, NEW.id, 'integridade', 'Batida sem hash de integridade gerado.', 'alta');
    END IF;

    -- 2. Validação de Geofencing (se ativo)
    IF NEW.dentro_raio = false THEN
        INSERT INTO public.conformidade_ponto_logs (empresa_id, batida_id, tipo_alerta, descricao, severidade)
        VALUES (NEW.empresa_id, NEW.id, 'geofencing', 'Colaborador registrou ponto fora do raio permitido.', 'media');
    END IF;

    -- 3. Validação de Timezone Divergente
    IF NEW.timezone IS NOT NULL AND NEW.timezone <> 'America/Sao_Paulo' THEN -- Exemplo, ideal buscar da empresa
         INSERT INTO public.conformidade_ponto_logs (empresa_id, batida_id, tipo_alerta, descricao, severidade)
        VALUES (NEW.empresa_id, NEW.id, 'timezone', 'Timezone divergente detectado: ' || NEW.timezone, 'baixa');
    END IF;

    RETURN NEW;
END;
$function$
