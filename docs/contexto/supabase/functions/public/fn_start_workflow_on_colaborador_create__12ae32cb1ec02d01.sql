CREATE OR REPLACE FUNCTION public.fn_start_workflow_on_colaborador_create()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_workflow_id uuid;
BEGIN
  -- Tenta criar execução de workflow para admissão (best-effort).
  -- Se tabela alvo/coluna não existir (banco em migração), ignora silenciosamente.
  BEGIN
    -- Verifica se workflows_execucoes existe
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'workflows_execucoes'
    ) THEN
      RETURN NEW;
    END IF;

    -- Tenta resolver workflow default; se não existir, pula silenciosamente
    BEGIN
      EXECUTE 'SELECT id FROM public.workflows_definitions WHERE categoria = ''admissao'' AND ativo = true LIMIT 1'
        INTO v_workflow_id;
    EXCEPTION WHEN OTHERS THEN
      v_workflow_id := NULL;
    END;

    IF v_workflow_id IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.workflows_execucoes (
      workflow_id, entidade_tipo, entidade_id, status, created_at, updated_at
    ) VALUES (
      v_workflow_id, 'colaborador', NEW.id, 'pendente', now(), now()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[fn_start_workflow_on_colaborador_create] skipped: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$
