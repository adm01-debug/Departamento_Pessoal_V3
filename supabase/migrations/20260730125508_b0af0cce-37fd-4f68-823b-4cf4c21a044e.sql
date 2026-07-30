-- =====================================================================
-- FIX CRÍTICO: INSERT em public.admissoes estava 100% quebrado
--
-- Causa raiz:
--   O trigger AFTER INSERT `trg_admissao_auto_workflow` executa
--   fn_workflow_admissao_auto(), que faz:
--       INSERT INTO workflows_execucoes (..., etapa_atual, ...) VALUES (..., 1, ...)
--   A coluna `etapa_atual` NÃO EXISTE. O schema real tem `etapa_atual_id uuid`
--   (FK lógica para workflows_etapas).
--
--   Como PL/pgSQL planeja o comando na primeira execução, o erro
--   "column etapa_atual does not exist" é levantado MESMO quando o SELECT
--   não retorna linhas. Resultado: toda admissão falhava, sempre.
--
-- Correções aplicadas:
--   1. Usa `etapa_atual_id`, resolvido para a etapa de menor `ordem`
--      do workflow — semanticamente equivalente ao "1" pretendido.
--   2. Filtra `ativo = true` e exige empresa_id não nulo.
--   3. Torna o trigger não-fatal: automação acessória não pode derrubar
--      a transação de negócio principal (defesa em profundidade contra
--      esta classe inteira de falha).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_workflow_admissao_auto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workflow_id  uuid;
  v_etapa_id     uuid;
BEGIN
  -- Sem empresa não há workflow a resolver.
  IF NEW.empresa_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT d.id
      INTO v_workflow_id
      FROM public.workflows_definicoes d
     WHERE d.tipo = 'admissao'
       AND d.empresa_id = NEW.empresa_id
       AND COALESCE(d.ativo, true) = true
     ORDER BY d.created_at
     LIMIT 1;

    IF v_workflow_id IS NULL THEN
      RETURN NEW;  -- empresa sem workflow de admissão configurado
    END IF;

    -- Primeira etapa = menor `ordem`. Substitui o literal `1` inválido.
    SELECT e.id
      INTO v_etapa_id
      FROM public.workflows_etapas e
     WHERE e.workflow_id = v_workflow_id
     ORDER BY e.ordem NULLS LAST
     LIMIT 1;

    INSERT INTO public.workflows_execucoes (
      workflow_id, empresa_id, entidade_id, entidade_tipo,
      status, etapa_atual_id, metadata
    ) VALUES (
      v_workflow_id, NEW.empresa_id, NEW.id, 'admissao',
      'em_andamento', v_etapa_id, jsonb_build_object('auto_start', true)
    );

  EXCEPTION WHEN OTHERS THEN
    -- Automação acessória NUNCA deve invalidar o cadastro da admissão.
    RAISE WARNING 'fn_workflow_admissao_auto falhou para admissao % : %',
      NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.fn_workflow_admissao_auto() IS
  'Inicia automaticamente a execução do workflow de admissão. Não-fatal: '
  'falhas são logadas como WARNING e não abortam o INSERT em admissoes.';