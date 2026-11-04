CREATE OR REPLACE FUNCTION public.contratos_alertar_vencimentos()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT cg.id, cg.empresa_id, cg.data_fim, (cg.data_fim - CURRENT_DATE) AS dias,
           ct.tipo_contrato, ct.nome AS tnome
    FROM public.contratos_gerados cg
    JOIN public.contrato_templates ct ON ct.id = cg.template_id
    WHERE cg.data_fim IS NOT NULL
      AND cg.status IN ('gerado','enviado','assinado')
      AND (cg.data_fim - CURRENT_DATE) BETWEEN 0 AND 7
      AND (cg.alerta_vencimento_enviado_em IS NULL
           OR cg.alerta_vencimento_enviado_em < now() - interval '3 days')
  LOOP
    INSERT INTO public.notificacoes(empresa_id, user_id, tipo, titulo, mensagem, link, prioridade)
    SELECT r.empresa_id, ur.user_id, 'contrato_vencendo',
           'Contrato próximo ao vencimento',
           format('Contrato "%s" vence em %s dia(s) — %s. Prorrogue ou converta antes do prazo para evitar conversão automática em prazo indeterminado (CLT Art. 451).',
                  r.tnome, r.dias, to_char(r.data_fim,'DD/MM/YYYY')),
           format('/admissoes?contrato=%s', r.id),
           CASE WHEN r.dias <= 3 THEN 'alta' ELSE 'media' END
    FROM public.user_roles ur
    JOIN public.user_empresas ue ON ue.user_id = ur.user_id AND ue.empresa_id = r.empresa_id
    WHERE ur.role IN ('admin','rh');

    UPDATE public.contratos_gerados SET alerta_vencimento_enviado_em = now() WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$
