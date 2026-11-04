CREATE OR REPLACE FUNCTION public.gerar_alertas_preditivos_ia()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Alerta de Férias em Dobro
    INSERT INTO public.ia_provisoes_alertas (empresa_id, tipo_alerta, descricao, impacto_financeiro_estimado, sugestao_acao)
    SELECT 
        c.empresa_id, 
        'FERIAS_EM_DOBRO', 
        'Colaborador ' || c.nome_completo || ' entrará em período de férias em dobro em breve.',
        c.salario_base * 1.33,
        'Agendar gozo de férias para antes de ' || (pa.data_fim + INTERVAL '12 months')::date
    FROM public.colaboradores c
    JOIN public.periodos_aquisitivos pa ON c.id = pa.colaborador_id
    WHERE pa.status = 'aberto' AND (pa.data_fim + INTERVAL '10 months') < now();
END;
$function$
