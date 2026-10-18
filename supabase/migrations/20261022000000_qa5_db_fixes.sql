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
