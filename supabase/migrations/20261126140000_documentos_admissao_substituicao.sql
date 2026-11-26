-- =============================================================================
-- admissao: "Trocar" deixa de empilhar anexos do mesmo tipo
--
-- DIAGNOSTICO
-- O portal /contratacao oferece "Trocar" em cada documento. O fluxo chama a
-- edge `admissao-publica`, que sobe um NOVO objeto (timestamp no nome) e chama
-- `admissao_registrar_documento`, cujo INSERT nao referencia o envio anterior.
-- Resultado: os dois arquivos ficam vinculados a mesma admissao e ao mesmo
-- tipo, indistinguiveis. O RH ve dois comprovantes de residencia e nao sabe
-- qual vale — e a conferencia pode aprovar o documento errado.
--
-- CORRECAO
-- `substituido_em` marca a versao que deixou de valer. O trigger BEFORE INSERT
-- fecha as anteriores do mesmo (admissao_id, tipo) na MESMA transacao do
-- insert: ou o novo registro entra e as anteriores ficam marcadas, ou nada
-- acontece (sem janela em que dois anexos estao vigentes nem em que nenhum
-- esta). O historico continua no banco, distingivel do vigente.
--
-- Por que trigger e nao mudar a RPC: existem dois caminhos de escrita — a RPC
-- token-scoped (candidato) e o service_role da edge. Trigger cobre os dois,
-- inclusive correcao manual pelo painel, sem duplicar a regra.
--
-- O trigger e SECURITY DEFINER porque o candidato anonimo nao tem UPDATE em
-- `documentos_admissao` (a RLS exige vinculo de empresa); sem isso a marcacao
-- falharia justamente no fluxo publico.
--
-- Aditivo e idempotente: ADD COLUMN IF NOT EXISTS, indice parcial recriavel,
-- trigger recriado. Nenhuma linha existente e alterada no apply.
-- =============================================================================

ALTER TABLE public.documentos_admissao
  ADD COLUMN IF NOT EXISTS substituido_em timestamptz;

COMMENT ON COLUMN public.documentos_admissao.substituido_em IS
  'Quando preenchido, este anexo foi substituido por um envio posterior do mesmo tipo e nao e mais a versao vigente.';

CREATE INDEX IF NOT EXISTS idx_documentos_admissao_vigentes
  ON public.documentos_admissao (admissao_id, tipo)
  WHERE substituido_em IS NULL;

CREATE OR REPLACE FUNCTION public.documentos_admissao_marcar_anteriores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE public.documentos_admissao
     SET substituido_em = now()
   WHERE admissao_id = NEW.admissao_id
     AND tipo = NEW.tipo
     AND id <> NEW.id
     AND substituido_em IS NULL;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.documentos_admissao_marcar_anteriores() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_documentos_admissao_marcar_anteriores ON public.documentos_admissao;

CREATE TRIGGER trg_documentos_admissao_marcar_anteriores
  BEFORE INSERT ON public.documentos_admissao
  FOR EACH ROW
  EXECUTE FUNCTION public.documentos_admissao_marcar_anteriores();

-- Linhas ja duplicadas antes desta migration continuam todas sem marcacao (nao
-- ha como saber qual o RH aprovou). O indice parcial deixa a listagem do painel
-- eficiente de qualquer forma: ela ordena por created_at.