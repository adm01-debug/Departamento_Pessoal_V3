-- Passo 1 de 3 da trilha de Auditoria de Admissões: PASSAR A GRAVAR.
--
-- MEDIDO NO CANÔNICO (frjbfeamybqsejlvmqbl), não deduzido:
--   • `audit_log` por tabela: folhas_pagamento 273, registros_ponto 120,
--     desligamentos 69, ferias 28, colaboradores 21, admissoes 8 — e ZERO de
--     `onboarding_colaborador` e `onboarding_tarefas`;
--   • as duas tabelas de onboarding têm APENAS trigger de `updated_at`
--     (`tr_updated_at_*`, `update_*_updated_at`); nenhuma auditoria. As etapas
--     do onboarding — justamente a trilha que a tela de Auditoria de Admissões
--     mostraria — não são gravadas em lugar nenhum.
--
-- Contexto: a camada de apresentação dessa aba existe pronta na PR #546
-- ("Muri", fechada sem merge) e NÃO foi portada de propósito, porque lá ela era
-- alimentada por mock e em produção renderizaria lista vazia — o mesmo defeito
-- que a #210 e a #471 removeram deste sistema. Ver
-- docs/auditoria/RESGATE_MURI_PENDENTE_2026-11-19.md §7. Esta migration é o
-- passo 1: o dado começa a acumular. O passo 2 (abrir leitura por empresa em
-- `audit_log` para RH/gestor) é decisão do dono, porque mexe na regra de
-- leitura de tabela com PII; o passo 3 é portar a tela.
--
-- POR QUE NÃO REUSAR `public.log_audit_change` DIRETO: ele nunca preenche
-- `empresa_id` — a coluna não entra em nenhum dos três ramos do INSERT dele.
-- A trilha nasceria com tenant nulo e seria ilegível por qualquer policy por
-- empresa criada depois, ou seja gravaria sem resolver nada. As duas tabelas
-- de onboarding TÊM `empresa_id`, então aqui a função preenche. Não altero o
-- `log_audit_change` existente: ele é usado por 7+ tabelas e mexer no que ele
-- grava é mudança de comportamento num caminho de auditoria/PII, que fica para
-- o passo 2, junto com a decisão de leitura.
--
-- NADA DE ACESSO MUDA AQUI: nenhuma policy é criada, alterada ou removida.
-- Só passa a existir registro do que acontece nas duas tabelas.

CREATE OR REPLACE FUNCTION public.onboarding_log_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_campos text[];
  v_user uuid;
  v_email text;
  v_empresa uuid;
BEGIN
  v_user := auth.uid();
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_user;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_empresa := OLD.empresa_id;
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, user_id, user_email, empresa_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', v_old, v_user, v_email, v_empresa);
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_empresa := NEW.empresa_id;

    SELECT array_agg(c.key ORDER BY c.key) INTO v_campos
    FROM (
      SELECT o.key
      FROM jsonb_each(v_old) AS o
      JOIN jsonb_each(v_new) AS n ON n.key = o.key
      WHERE o.value IS DISTINCT FROM n.value
    ) AS c;

    -- `updated_at` sozinho não é mudança de negócio: sem este filtro a trilha
    -- enche de linhas que não dizem nada (o trigger de updated_at dispara em
    -- todo UPDATE).
    IF v_campos IS NOT NULL
       AND array_length(v_campos, 1) > 0
       AND v_campos <> ARRAY['updated_at']::text[] THEN
      INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email, empresa_id)
      VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', v_old, v_new, v_campos, v_user, v_email, v_empresa);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_empresa := NEW.empresa_id;
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novos, user_id, user_email, empresa_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', v_new, v_user, v_email, v_empresa);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$;

COMMENT ON FUNCTION public.onboarding_log_audit_change() IS
  'Auditoria das tabelas de onboarding em public.audit_log, COM empresa_id (o log_audit_change generico nao preenche tenant). Passo 1 da trilha de Auditoria de Admissoes; ver 20261119150000.';

REVOKE ALL ON FUNCTION public.onboarding_log_audit_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_onboarding_colaborador ON public.onboarding_colaborador;
CREATE TRIGGER audit_onboarding_colaborador
  AFTER INSERT OR UPDATE OR DELETE ON public.onboarding_colaborador
  FOR EACH ROW
  EXECUTE FUNCTION public.onboarding_log_audit_change();

DROP TRIGGER IF EXISTS audit_onboarding_tarefas ON public.onboarding_tarefas;
CREATE TRIGGER audit_onboarding_tarefas
  AFTER INSERT OR UPDATE OR DELETE ON public.onboarding_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.onboarding_log_audit_change();

-- Pós-condição: os dois triggers no formato certo, e nenhuma policy tocada.
DO $pos$
DECLARE
  v_rec record;
  v_policies_antes int;
BEGIN
  FOR v_rec IN
    SELECT unnest(ARRAY['onboarding_colaborador', 'onboarding_tarefas']) AS tabela,
           unnest(ARRAY['audit_onboarding_colaborador', 'audit_onboarding_tarefas']) AS trg
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE n.nspname = 'public'
        AND c.relname = v_rec.tabela
        AND t.tgname = v_rec.trg
        AND NOT t.tgisinternal
        AND p.proname = 'onboarding_log_audit_change'
        -- 1 = FOR EACH ROW, 4 = INSERT, 8 = DELETE, 16 = UPDATE, 2 = BEFORE
        AND (t.tgtype & 1) = 1
        AND (t.tgtype & 4) = 4
        AND (t.tgtype & 8) = 8
        AND (t.tgtype & 16) = 16
        AND (t.tgtype & 2) = 0
    ) THEN
      RAISE EXCEPTION 'pos-condicao: trigger % em % nao ficou AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW', v_rec.trg, v_rec.tabela;
    END IF;
  END LOOP;

  -- A migration nao cria nem remove policy; audit_log tem de continuar com as
  -- 3 que ja tinha (admin read, self read, self insert).
  SELECT count(*) INTO v_policies_antes
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log';
  IF v_policies_antes <> 3 THEN
    RAISE EXCEPTION 'pos-condicao: audit_log deveria seguir com 3 policies, tem %', v_policies_antes;
  END IF;
END
$pos$;
