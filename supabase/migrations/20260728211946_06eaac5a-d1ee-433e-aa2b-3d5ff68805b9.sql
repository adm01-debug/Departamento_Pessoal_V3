CREATE OR REPLACE FUNCTION public.sec_verify_seals()
RETURNS TABLE (tabela TEXT, selados BIGINT, divergentes BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH r AS (
    SELECT 'folhas_pagamento'::text AS t, hash_integridade AS h,
           COALESCE(empresa_id::text,'')||'|'||COALESCE(competencia::text,'')||'|'||
           COALESCE(total_proventos::text,'0')||'|'||COALESCE(total_descontos::text,'0')||'|'||
           COALESCE(total_liquido::text,'0')||'|'||COALESCE(version::text,'1')||'|'||
           COALESCE(status::text,'') AS c
    FROM public.folhas_pagamento
    UNION ALL
    SELECT 'batidas_ponto', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(data::text,'')||'|'||
           COALESCE(hora::text,'')||'|'||COALESCE(tipo,'')||'|'||COALESCE(dispositivo_id,'')
    FROM public.batidas_ponto
    UNION ALL
    SELECT 'medidas_disciplinares', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(tipo,'')||'|'||COALESCE(data_ocorrencia::text,'')||'|'||COALESCE(descricao,'')||'|'||
           COALESCE(dias_suspensao::text,'0')||'|'||COALESCE(artigo_clt,'')||'|'||
           COALESCE(testemunha_1_nome,'')||'|'||COALESCE(testemunha_1_cpf,'')||'|'||
           COALESCE(testemunha_2_nome,'')||'|'||COALESCE(testemunha_2_cpf,'')||'|'||
           COALESCE(recusa_assinatura::text,'false')||'|'||COALESCE(data_ciencia::text,'')||'|'||
           COALESCE(assinado_em::text,'')
    FROM public.medidas_disciplinares
    UNION ALL
    SELECT 'ferias', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(periodo_aquisitivo_id::text,'')||'|'||COALESCE(data_inicio::text,'')||'|'||
           COALESCE(data_fim::text,'')||'|'||COALESCE(dias_gozo::text,'0')||'|'||
           COALESCE(dias_abono::text,'0')||'|'||COALESCE(valor_ferias::text,'0')||'|'||
           COALESCE(valor_terco::text,'0')||'|'||COALESCE(valor_abono::text,'0')||'|'||
           COALESCE(valor_terco_abono::text,'0')||'|'||COALESCE(valor_total::text,'0')||'|'||
           COALESCE(descontos_inss::text,'0')||'|'||COALESCE(descontos_irrf::text,'0')||'|'||
           COALESCE(valor_liquido::text,'0')
    FROM public.ferias
    UNION ALL
    SELECT 'desligamentos', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(data_desligamento::text,'')||'|'||COALESCE(tipo::text,'')||'|'||
           COALESCE(saldo_salario::text,'0')||'|'||COALESCE(aviso_previo::text,'0')||'|'||
           COALESCE(ferias_vencidas::text,'0')||'|'||COALESCE(ferias_proporcionais::text,'0')||'|'||
           COALESCE(terco_constitucional::text,'0')||'|'||COALESCE(decimo_terceiro::text,'0')||'|'||
           COALESCE(multa_fgts::text,'0')||'|'||COALESCE(total_proventos::text,'0')||'|'||
           COALESCE(total_descontos::text,'0')||'|'||COALESCE(valor_liquido::text,'0')
    FROM public.desligamentos
    UNION ALL
    SELECT 'holerites', hash_assinatura,
           COALESCE(folha_id::text,'')||'|'||COALESCE(colaborador_id::text,'')||'|'||
           COALESCE(colaborador_cpf,'')||'|'||COALESCE(total_proventos::text,'0')||'|'||
           COALESCE(total_descontos::text,'0')||'|'||COALESCE(liquido::text,'0')||'|'||
           COALESCE(valor_inss::text,'0')||'|'||COALESCE(valor_irrf::text,'0')||'|'||
           COALESCE(valor_fgts::text,'0')
    FROM public.holerites
    UNION ALL
    SELECT 'asos', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(tipo,'')||'|'||COALESCE(data_exame::text,'')||'|'||COALESCE(data_validade::text,'')||'|'||
           COALESCE(resultado,'')||'|'||COALESCE(medico_nome,'')||'|'||COALESCE(medico_crm,'')||'|'||
           COALESCE(clinica,'')||'|'||COALESCE(arquivo_url,'')
    FROM public.asos
    UNION ALL
    SELECT 'epis_entregas', hash_integridade,
           COALESCE(epi_id::text,'')||'|'||COALESCE(colaborador_id::text,'')||'|'||
           COALESCE(empresa_id::text,'')||'|'||COALESCE(data_entrega::text,'')||'|'||
           COALESCE(quantidade::text,'1')||'|'||COALESCE(motivo,'')||'|'||
           COALESCE(assinatura_url,'')||'|'||COALESCE(entregue_por::text,'')
    FROM public.epis_entregas
    UNION ALL
    SELECT 'esocial_eventos', hash_arquivo,
           COALESCE(empresa_id::text,'')||'|'||COALESCE(tipo_evento,'')||'|'||
           COALESCE(competencia,'')||'|'||COALESCE(xml_envio, xml, '')||'|'||
           COALESCE(protocolo,'')||'|'||COALESCE(recibo,'')||'|'||COALESCE(id_recibo,'')
    FROM public.esocial_eventos
    UNION ALL
    SELECT 'documentos_assinatura', hash_documento,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(tipo_documento,'')||'|'||COALESCE(titulo,'')||'|'||COALESCE(conteudo_url,'')||'|'||
           COALESCE(assinatura_base64,'')||'|'||COALESCE(assinado_em::text,'')||'|'||
           COALESCE(assinado_por::text,'')||'|'||COALESCE(ip_assinatura,'')||'|'||
           COALESCE(validade_assinatura::text,'')
    FROM public.documentos_assinatura
    UNION ALL
    SELECT 'cnab_remessas', hash_integridade,
           COALESCE(empresa_id::text,'')||'|'||COALESCE(banco_codigo,'')||'|'||
           COALESCE(sequencial_arquivo::text,'')||'|'||COALESCE(data_geracao::text,'')||'|'||
           COALESCE(total_pagamentos::text,'0')||'|'||COALESCE(valor_total::text,'0')||'|'||
           COALESCE(arquivo_url,'')
    FROM public.cnab_remessas
    UNION ALL
    SELECT 'afastamentos', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(tipo::text,'')||'|'||COALESCE(data_inicio::text,'')||'|'||
           COALESCE(data_fim_prevista::text,'')||'|'||COALESCE(data_fim_real::text,'')||'|'||
           COALESCE(dias_empresa::text,'0')||'|'||COALESCE(dias_inss::text,'0')||'|'||
           COALESCE(cid::text,'')||'|'||COALESCE(numero_beneficio::text,'')||'|'||
           COALESCE(medico_nome::text,'')||'|'||COALESCE(medico_crm::text,'')||'|'||
           COALESCE(atestado_numero::text,'')||'|'||COALESCE(data_pericia::text,'')||'|'||
           COALESCE(status::text,'')
    FROM public.afastamentos
    UNION ALL
    SELECT 'sst_cat', hash_integridade,
           COALESCE(colaborador_id::text,'')||'|'||COALESCE(empresa_id::text,'')||'|'||
           COALESCE(data_acidente::text,'')||'|'||COALESCE(tipo_acidente,'')||'|'||
           COALESCE(local_acidente,'')||'|'||COALESCE(parte_corpo_atingida,'')||'|'||
           COALESCE(agente_causador,'')||'|'||COALESCE(houve_afastamento::text,'false')||'|'||
           COALESCE(houve_obito::text,'false')||'|'||COALESCE(protocolo_esocial,'')
    FROM public.sst_cat
  )
  SELECT r.t,
         count(*) FILTER (WHERE r.h IS NOT NULL AND r.h <> ''),
         count(*) FILTER (WHERE r.h IS NOT NULL AND r.h <> ''
                            AND r.h <> encode(digest(r.c, 'sha256'), 'hex'))
  FROM r
  GROUP BY r.t
  ORDER BY r.t;
$$;

REVOKE ALL ON FUNCTION public.sec_verify_seals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sec_verify_seals() TO service_role;

-- Wrapper com checagem de papel para uso pelo app
CREATE OR REPLACE FUNCTION public.sec_verify_seals_admin()
RETURNS TABLE (tabela TEXT, selados BIGINT, divergentes BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY SELECT * FROM public.sec_verify_seals();
END;
$$;

REVOKE ALL ON FUNCTION public.sec_verify_seals_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sec_verify_seals_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sec_verify_seals_admin() TO service_role;

-- Varredura semanal com alerta
CREATE OR REPLACE FUNCTION public.sec_verify_seals_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_total BIGINT := 0;
  v_detalhe TEXT := '';
BEGIN
  SELECT COALESCE(sum(v.divergentes), 0),
         COALESCE(string_agg(v.tabela || ' (' || v.divergentes || ')', ', ')
                  FILTER (WHERE v.divergentes > 0), '')
    INTO v_total, v_detalhe
  FROM public.sec_verify_seals() v;

  IF v_total > 0 THEN
    INSERT INTO public.historico_alertas (tipo, nivel, valor, limite, mensagem)
    VALUES ('integridade_selos', 'critico', v_total, 0,
            'Divergência na cadeia de custódia: ' || v_detalhe ||
            '. O conteúdo desses registros não corresponde ao selo gravado.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'divergentes', v_total, 'detalhe', v_detalhe);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.historico_alertas (tipo, nivel, valor, limite, mensagem)
  VALUES ('integridade_selos', 'critico', -1, 0,
          'Falha ao conferir a cadeia de custódia: ' || SQLERRM);
  RETURN jsonb_build_object('ok', false, 'erro', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.sec_verify_seals_scan() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sec_verify_seals_scan() TO service_role;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sec-verify-seals-weekly';

SELECT cron.schedule(
  'sec-verify-seals-weekly',
  '15 3 * * 1',
  $cron$SELECT public.sec_verify_seals_scan();$cron$
);