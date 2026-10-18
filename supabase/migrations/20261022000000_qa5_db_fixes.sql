-- QA rodada 2 (agente QA-5) — dois achados no ciclo de rescisão/MTP-671:
--
-- 1) desligamentos.detalhes_calculo (criada em 20261018150000) ficou fora da
--    lista protegida de impedir_alteracao_desligamento_homologado: UPDATE
--    direto em linha homologada/paga alterava o detalhamento do cálculo.
--    Recria a função (versão mais recente, com 'pago' protegido) incluindo
--    detalhes_calculo.
-- 2) Reassinatura de espelho MTP-671 após revogação quebrava: a função
--    assinar_espelho_ponto permite novo INSERT quando o anterior foi revogado
--    (revogação vive em ponto_espelhos_revogacoes), mas o índice único
--    uq_espelho_colab_competencia não exclui revogados → duplicate key.
--    Fix: coluna revogado_em (flag indexável; ponto_espelhos_revogacoes segue
--    como trilha append-only) + índice único parcial WHERE revogado_em IS NULL
--    + revogar_espelho_ponto passa a marcar a coluna.

-- (1) detalhes_calculo entra na imutabilidade de desligamento homologado/pago
CREATE OR REPLACE FUNCTION public.impedir_alteracao_desligamento_homologado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('homologado','finalizado','concluido','concluído','pago') THEN
    IF NEW.status = OLD.status THEN
      IF NEW.data_desligamento     IS DISTINCT FROM OLD.data_desligamento
         OR NEW.tipo               IS DISTINCT FROM OLD.tipo
         OR NEW.saldo_salario      IS DISTINCT FROM OLD.saldo_salario
         OR NEW.aviso_previo       IS DISTINCT FROM OLD.aviso_previo
         OR NEW.ferias_vencidas    IS DISTINCT FROM OLD.ferias_vencidas
         OR NEW.ferias_proporcionais IS DISTINCT FROM OLD.ferias_proporcionais
         OR NEW.terco_constitucional IS DISTINCT FROM OLD.terco_constitucional
         OR NEW.decimo_terceiro    IS DISTINCT FROM OLD.decimo_terceiro
         OR NEW.multa_fgts         IS DISTINCT FROM OLD.multa_fgts
         OR NEW.total_proventos    IS DISTINCT FROM OLD.total_proventos
         OR NEW.total_descontos    IS DISTINCT FROM OLD.total_descontos
         OR NEW.valor_liquido      IS DISTINCT FROM OLD.valor_liquido
         OR NEW.detalhes_calculo   IS DISTINCT FROM OLD.detalhes_calculo
         OR NEW.hash_integridade   IS DISTINCT FROM OLD.hash_integridade
         OR NEW.hash_assinatura_empresa IS DISTINCT FROM OLD.hash_assinatura_empresa
         OR NEW.hash_assinatura_colaborador IS DISTINCT FROM OLD.hash_assinatura_colaborador
         OR NEW.colaborador_id     IS DISTINCT FROM OLD.colaborador_id
         OR NEW.empresa_id         IS DISTINCT FROM OLD.empresa_id THEN
        RAISE EXCEPTION 'Desligamento homologado/pago é imutável. Reabra oficialmente antes de alterar valores.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- (2) Reassinatura pós-revogação possível sem perder a proteção do índice
ALTER TABLE public.ponto_espelhos_assinados
  ADD COLUMN IF NOT EXISTS revogado_em timestamptz;

COMMENT ON COLUMN public.ponto_espelhos_assinados.revogado_em IS
  'Flag de revogação (a trilha completa fica em ponto_espelhos_revogacoes). '
  'Permite índice único parcial: revogado não bloqueia reassinatura.';

-- Backfill: espelhos já revogados ganham o carimbo da revogação mais antiga
UPDATE public.ponto_espelhos_assinados e
SET revogado_em = (
  SELECT min(r.revogado_em) FROM public.ponto_espelhos_revogacoes r
  WHERE r.espelho_id = e.id
)
WHERE e.revogado_em IS NULL
  AND EXISTS (
    SELECT 1 FROM public.ponto_espelhos_revogacoes r
    WHERE r.espelho_id = e.id
  );

DROP INDEX IF EXISTS public.uq_espelho_colab_competencia;
CREATE UNIQUE INDEX uq_espelho_colab_competencia
  ON public.ponto_espelhos_assinados (colaborador_id, competencia)
  WHERE competencia IS NOT NULL AND revogado_em IS NULL;

-- revogar_espelho_ponto passa a marcar revogado_em no espelho (mantém o
-- INSERT na trilha append-only — mesma assinatura e guardas da versão atual)
CREATE OR REPLACE FUNCTION public.revogar_espelho_ponto(
  _espelho_id uuid,
  _motivo text,
  _ip inet DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem revogar assinaturas';
  END IF;

  IF _motivo IS NULL OR length(trim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mín. 5 caracteres)';
  END IF;

  INSERT INTO public.ponto_espelhos_revogacoes (
    espelho_id, revogado_por_user_id, motivo, ip, user_agent
  ) VALUES (_espelho_id, auth.uid(), _motivo, _ip, _user_agent);

  UPDATE public.ponto_espelhos_assinados
  SET revogado_em = now()
  WHERE id = _espelho_id AND revogado_em IS NULL;

  RETURN jsonb_build_object('success', true, 'espelho_id', _espelho_id);
END;
$$;

REVOKE ALL ON FUNCTION public.revogar_espelho_ponto(uuid, text, inet, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revogar_espelho_ponto(uuid, text, inet, text) TO authenticated;

-- (3) QA-1 F1 — gerar_canonical_espelho_ponto lia batidas_ponto.data_hora e
--     b.nsr, colunas que nunca existiram (a tabela tem data date + hora time;
--     NSR é campo AFDT em afdt_registros_raw). Resultado: a função quebrava e
--     nenhum espelho 671 era gerado. Recria o corpo igual à versão mais
--     recente (20260924220000 — SECURITY DEFINER + guarda sou_o_colaborador/
--     pode_gerir_rh), montando o timestamp a partir de data+hora e removendo
--     o campo nsr.
CREATE OR REPLACE FUNCTION public.gerar_canonical_espelho_ponto(_colaborador_id uuid, _competencia text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inicio date;
  v_fim date;
  v_colab record;
  v_batidas jsonb;
BEGIN
  v_inicio := to_date(_competencia || '-01', 'YYYY-MM-DD');
  v_fim := (v_inicio + interval '1 month' - interval '1 day')::date;

  SELECT c.id, c.nome_completo, c.cpf, c.pis_pasep, c.empresa_id, c.matricula
    INTO v_colab
    FROM public.colaboradores c
   WHERE c.id = _colaborador_id;

  IF v_colab.id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  IF NOT (public.sou_o_colaborador(_colaborador_id) OR public.pode_gerir_rh(v_colab.empresa_id)) THEN
    RAISE EXCEPTION 'Sem permissão para este espelho de ponto';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      -- data+hora já são horário local; monta o timestamp sem conversão de tz
      'data_hora', to_char(b.data + b.hora, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'tipo', b.tipo,
      'origem', b.origem,
      'ordem', b.ordem
    ) ORDER BY b.data ASC, b.hora ASC, b.ordem ASC, b.id ASC
  ), '[]'::jsonb)
  INTO v_batidas
  FROM public.batidas_ponto b
  WHERE b.colaborador_id = _colaborador_id
    AND b.data BETWEEN v_inicio AND v_fim;

  RETURN jsonb_build_object(
    'versao', '1.0',
    'colaborador', jsonb_build_object(
      'id', v_colab.id,
      'nome', v_colab.nome_completo,
      'cpf', v_colab.cpf,
      'pis', v_colab.pis_pasep,
      'matricula', v_colab.matricula
    ),
    'empresa_id', v_colab.empresa_id,
    'competencia', _competencia,
    'periodo', jsonb_build_object('inicio', v_inicio, 'fim', v_fim),
    'batidas', v_batidas,
    'total_batidas', jsonb_array_length(v_batidas)
  );
END;
$function$;

-- ACL canônica (20260731151103): só service_role — a função é chamada por
-- assinar_espelho_ponto (SECURITY DEFINER), nunca direto pelo cliente.
REVOKE ALL ON FUNCTION public.gerar_canonical_espelho_ponto(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_canonical_espelho_ponto(uuid, text) TO service_role;

-- (4) QA-1 F3 — fn_consolidar_batidas calculava campos derivados com a regra
--     LEGADA (alvo semanal/5, atraso linear delta-10, sem DSR/HE100/noturno)
--     enquanto a apuração CLT real vive na edge processar-ponto. Resultado:
--     espelho antes do "Processar" mostrava outra matemática e batida tardia
--     misturava os dois motores na mesma linha (derrubava o HE100 domingal
--     gravado pelo motor). A trigger passa a espelhar SÓ as batidas brutas;
--     os campos derivados ficam NULL até o motor apurar — e nunca mais são
--     sobrescritos depois (DO UPDATE não toca nos campos do motor).
CREATE OR REPLACE FUNCTION public.fn_consolidar_batidas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_batidas INTEGER;
  v_entrada_1 TEXT; v_saida_1 TEXT;
  v_entrada_2 TEXT; v_saida_2 TEXT;
  v_entrada_3 TEXT; v_saida_3 TEXT;
  v_entrada_4 TEXT; v_saida_4 TEXT;
  v_entrada_5 TEXT; v_saida_5 TEXT;
  v_entrada_6 TEXT; v_saida_6 TEXT;
BEGIN
  SELECT COUNT(*) INTO v_total_batidas
  FROM public.batidas_ponto
  WHERE colaborador_id = NEW.colaborador_id AND data = NEW.data;

  SELECT
    MAX(CASE WHEN ordem = 1  AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 2  AND tipo = 'saida'   THEN hora::text END),
    MAX(CASE WHEN ordem = 3  AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 4  AND tipo = 'saida'   THEN hora::text END),
    MAX(CASE WHEN ordem = 5  AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 6  AND tipo = 'saida'   THEN hora::text END),
    MAX(CASE WHEN ordem = 7  AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 8  AND tipo = 'saida'   THEN hora::text END),
    MAX(CASE WHEN ordem = 9  AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 10 AND tipo = 'saida'   THEN hora::text END),
    MAX(CASE WHEN ordem = 11 AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 12 AND tipo = 'saida'   THEN hora::text END)
  INTO v_entrada_1, v_saida_1, v_entrada_2, v_saida_2, v_entrada_3, v_saida_3,
       v_entrada_4, v_saida_4, v_entrada_5, v_saida_5, v_entrada_6, v_saida_6
  FROM public.batidas_ponto
  WHERE colaborador_id = NEW.colaborador_id AND data = NEW.data;

  INSERT INTO public.registros_ponto (
    colaborador_id, empresa_id, data,
    entrada_1, saida_1, entrada_2, saida_2, entrada_3, saida_3,
    entrada_4, saida_4, entrada_5, saida_5, entrada_6, saida_6,
    saida_intervalo, retorno_intervalo, total_batidas
  ) VALUES (
    NEW.colaborador_id, NEW.empresa_id, NEW.data,
    v_entrada_1::time, v_saida_1::time, v_entrada_2::time, v_saida_2::time,
    v_entrada_3::time, v_saida_3::time, v_entrada_4::time, v_saida_4::time,
    v_entrada_5::time, v_saida_5::time, v_entrada_6::time, v_saida_6::time,
    v_saida_1::time, v_entrada_2::time, v_total_batidas
  )
  ON CONFLICT (colaborador_id, data)
  DO UPDATE SET
    entrada_1 = EXCLUDED.entrada_1, saida_1 = EXCLUDED.saida_1,
    entrada_2 = EXCLUDED.entrada_2, saida_2 = EXCLUDED.saida_2,
    entrada_3 = EXCLUDED.entrada_3, saida_3 = EXCLUDED.saida_3,
    entrada_4 = EXCLUDED.entrada_4, saida_4 = EXCLUDED.saida_4,
    entrada_5 = EXCLUDED.entrada_5, saida_5 = EXCLUDED.saida_5,
    entrada_6 = EXCLUDED.entrada_6, saida_6 = EXCLUDED.saida_6,
    saida_intervalo = EXCLUDED.saida_intervalo,
    retorno_intervalo = EXCLUDED.retorno_intervalo,
    total_batidas = EXCLUDED.total_batidas,
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A consolidação é um resumo derivado. Uma falha aqui NUNCA pode impedir o
  -- registro da batida, que é o documento com valor legal (Portaria 671).
  INSERT INTO public.logs_sistema (nivel, mensagem, contexto)
  VALUES ('error',
          'Falha ao consolidar espelho do dia; batida preservada',
          jsonb_build_object(
            'origem', 'fn_consolidar_batidas',
            'colaborador_id', NEW.colaborador_id,
            'data', NEW.data,
            'erro', SQLERRM,
            'sqlstate', SQLSTATE));
  RETURN NEW;
END;
$function$;
