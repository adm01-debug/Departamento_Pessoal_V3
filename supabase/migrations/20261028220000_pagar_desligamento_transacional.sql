-- pagar_desligamento transacional, chamado pela edge `pagar-desligamento`.
--
-- Histórico: a versão de 20260719000000 exigia is_admin(auth.uid()) e foi
-- revogada para service_role em 20260722125517 DE PROPÓSITO ("efeito
-- financeiro — deve passar por edge function com CSRF, rate limit e
-- auditoria"). Como auth.uid() é NULL sob service_role, a RPC ficou
-- inalcançável e o front seguiu fazendo dois writes não-atômicos
-- (desligamentos + colaboradores, com erro do segundo só logado).
--
-- Esta versão MANTÉM o EXECUTE só em service_role e:
--   (a) recebe o ator explícito (_actor_id), validado pela edge (JWT +
--       requireRh) e revalidado aqui com pode_gerir_rh_para(ator, empresa);
--   (b) desativa o colaborador na MESMA transação;
--   (c) grava etapa='finalizado' (valor real do stepper — 'concluido' não
--       existia);
--   (d) mantém as travas originais (status homologado + duas assinaturas +
--       checklist de homologação + FOR UPDATE).
--
-- NÃO grava em trct/grrf: essas tabelas só são criadas pelas migrations de
-- versão com 16 dígitos (2025122813140019_create_trct /
-- 2025122813135918_create_grrf), e nenhuma tabela criada apenas por essa
-- série existe no banco de produção (não constam em
-- src/integrations/supabase/types.ts, gerado do banco). Um INSERT nelas
-- abortaria a transação inteira e nenhum pagamento seria registrado. A
-- obrigação de TRCT/GRRF fica registrada no audit_log até o dono decidir
-- criar essas tabelas com RLS por empresa.

-- Assinatura muda (3º parâmetro): remove a antiga para não sobrar overload.
DROP FUNCTION IF EXISTS public.pagar_desligamento(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.pagar_desligamento(
  _desligamento_id UUID,
  _comprovante_url TEXT DEFAULT NULL,
  _actor_id UUID DEFAULT NULL
)
RETURNS public.desligamentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_row public.desligamentos%ROWTYPE;
  v_multa numeric;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Ator obrigatório (chamada só pela edge pagar-desligamento)' USING ERRCODE = '42501';
  END IF;
  -- Sessão de usuário (se houver) não pode agir em nome de outro.
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM _actor_id THEN
    RAISE EXCEPTION 'Ator divergente da sessão' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.desligamentos WHERE id = _desligamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desligamento nao encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.pode_gerir_rh_para(_actor_id, v_row.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para registrar pagamento de rescisão' USING ERRCODE = '42501';
  END IF;

  IF v_row.status IS DISTINCT FROM 'homologado' THEN
    RAISE EXCEPTION 'Rescisao so pode ser paga apos homologacao (status atual: %)', v_row.status
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT COALESCE(v_row.assinado_empresa, false) OR NOT COALESCE(v_row.assinado_colaborador, false) THEN
    RAISE EXCEPTION 'Rescisao precisa da assinatura da empresa e do colaborador antes do pagamento'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT COALESCE(v_row.checklist_homologacao, false) THEN
    RAISE EXCEPTION 'Rescisao precisa da homologacao concluida antes do pagamento'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.desligamentos
  SET status = 'pago', etapa = 'finalizado', checklist_pagamento = true,
      data_pagamento = now(), comprovante_pagamento_url = COALESCE(_comprovante_url, comprovante_pagamento_url)
  WHERE id = _desligamento_id
  RETURNING * INTO v_row;

  -- Desativa o colaborador na mesma transação: antes era um segundo UPDATE
  -- client-side cujo erro era apenas logado (desligamento 'pago' com
  -- colaborador 'ativo').
  UPDATE public.colaboradores
  SET status = 'desligado', data_desligamento = v_row.data_desligamento
  WHERE id = v_row.colaborador_id AND empresa_id = v_row.empresa_id;

  v_multa := COALESCE(v_row.multa_fgts, NULLIF(v_row.detalhes_calculo->>'multaFGTS', '')::numeric, 0);

  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('desligamentos', _desligamento_id, 'UPDATE', _actor_id,
          jsonb_build_object(
            'action', 'pagar_desligamento',
            'comprovante_url', _comprovante_url,
            'empresa_id', v_row.empresa_id,
            'colaborador_id', v_row.colaborador_id,
            'colaborador_desativado', true,
            -- Obrigações documentais (sem tabela trct/grrf em produção):
            'trct', jsonb_build_object('numero', 'TRCT-' || left(v_row.id::text, 8),
                                       'valor', v_row.valor_liquido, 'status', 'emitido'),
            'grrf_pendente', v_multa > 0,
            'grrf_valor', CASE WHEN v_multa > 0 THEN v_multa END
          ));

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.pagar_desligamento(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pagar_desligamento(UUID, TEXT, UUID) TO service_role;
