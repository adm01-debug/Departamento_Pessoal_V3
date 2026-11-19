-- =============================================================================
-- Passo 2 de 3 da trilha de Auditoria de Admissões: dar TENANT e LEITURA à
-- trilha que o passo 1 (20261119150000) passou a gravar.
--
-- PROBLEMA MEDIDO NO CANÔNICO
--
-- 1. `public.log_audit_change()` — a função de auditoria genérica, usada por
--    7+ tabelas (colaboradores, admissoes, ferias, folhas_pagamento,
--    registros_ponto, desligamentos, tarefas_onboarding) — NUNCA preenche
--    `empresa_id`: a coluna não entra em nenhum dos três INSERTs dela
--    (DELETE/UPDATE/INSERT). Ver 20251220132737:52, :78 e :84. Resultado: toda
--    linha dessas tabelas nasce com tenant nulo, e qualquer policy por empresa
--    criada depois é incapaz de enxergá-la.
--
-- 2. `public.audit_log` tem exatamente 3 policies (lidas em produção com
--    supabase_db_list_policies): "Admins podem ver todo audit_log" (SELECT),
--    "audit_log_self_read" (SELECT) e "audit_log_self_insert" (INSERT). Ou
--    seja: quem NÃO é admin só vê o que ele mesmo fez. O RH, que é quem
--    responde por uma fiscalização de admissão, não vê a trilha da empresa.
--
-- O QUE ESTA MIGRATION FAZ
--
-- (a) `log_audit_change()` passa a preencher `empresa_id` a partir da PRÓPRIA
--     linha auditada, lendo do jsonb (`->>'empresa_id'`). Em tabela sem essa
--     coluna o jsonb devolve NULL e o comportamento fica idêntico ao de hoje —
--     é aditivo, não muda o acesso de ninguém.
--
-- (b) nova policy de SELECT para RH, por empresa:
--     `audit_log_rh_read_empresa`, USING pode_gerir_rh(empresa_id).
--
-- POR QUE RH E NÃO GESTOR: a trilha carrega `dados_anteriores`/`dados_novos`
-- em jsonb — a linha INTEIRA da tabela auditada, PII incluída (CPF, salário,
-- dados bancários). Abrir isso para gestor seria dar a ele, por via indireta,
-- leitura de colunas que a policy da tabela de origem não lhe dá.
--
-- POR QUE AS LINHAS ANTIGAS CONTINUAM INVISÍVEIS: como o item (1) mostra,
-- `log_audit_change` nunca gravou tenant, então todo o histórico tem
-- `empresa_id IS NULL`. A policy exige `empresa_id IS NOT NULL`, de propósito:
-- não há como saber a qual empresa uma linha antiga pertence, e adivinhar seria
-- vazar dado entre empresas. Só o que for gravado de agora em diante é legível.
--
-- NADA É REMOVIDO: as 3 policies existentes continuam como estão, e o sidecar
-- assere isso. A migration não apaga nem reescreve nenhuma linha de audit_log.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) empresa_id na função genérica de auditoria
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[];
  current_user_id UUID;
  current_user_email TEXT;
  v_empresa_id UUID;
BEGIN
  current_user_id := auth.uid();
  current_user_email := (SELECT email FROM auth.users WHERE id = current_user_id);

  IF (TG_OP = 'DELETE') THEN
    old_data := to_jsonb(OLD);
    -- Tabela sem a coluna: `->>` devolve NULL e grava como antes.
    v_empresa_id := NULLIF(old_data ->> 'empresa_id', '')::uuid;
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, user_id, user_email, empresa_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data, current_user_id, current_user_email, v_empresa_id);
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);

    SELECT array_agg(key) INTO changed_fields
    FROM (
      SELECT key FROM jsonb_each(old_data)
      EXCEPT
      SELECT key FROM jsonb_each(new_data)
      UNION
      SELECT key FROM jsonb_each(new_data)
      EXCEPT
      SELECT key FROM jsonb_each(old_data)
      UNION
      SELECT o.key FROM jsonb_each(old_data) o
      JOIN jsonb_each(new_data) n ON o.key = n.key
      WHERE o.value IS DISTINCT FROM n.value
    ) changed;

    IF changed_fields IS NOT NULL AND array_length(changed_fields, 1) > 0 THEN
      -- `new_data` primeiro: numa troca de empresa (raríssima, mas possível), a
      -- trilha pertence a quem o registro é AGORA.
      v_empresa_id := COALESCE(
        NULLIF(new_data ->> 'empresa_id', '')::uuid,
        NULLIF(old_data ->> 'empresa_id', '')::uuid
      );
      INSERT INTO public.audit_log (
        tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados,
        user_id, user_email, empresa_id
      )
      VALUES (
        TG_TABLE_NAME, NEW.id, 'UPDATE', old_data, new_data, changed_fields,
        current_user_id, current_user_email, v_empresa_id
      );
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'INSERT') THEN
    new_data := to_jsonb(NEW);
    v_empresa_id := NULLIF(new_data ->> 'empresa_id', '')::uuid;
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novos, user_id, user_email, empresa_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', new_data, current_user_id, current_user_email, v_empresa_id);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- A função é gatilho de tabela e não deve ser chamável pelo cliente — mantém o
-- REVOKE que 20260716175930 já aplicava.
REVOKE EXECUTE ON FUNCTION public.log_audit_change() FROM authenticated, anon, PUBLIC;

-- -----------------------------------------------------------------------------
-- (b) leitura da trilha pelo RH, por empresa
-- -----------------------------------------------------------------------------
-- audit-migration-style: allow-silent-drop policy nova, ainda não existe em produção; DROP é idempotência
DROP POLICY IF EXISTS "audit_log_rh_read_empresa" ON public.audit_log;
CREATE POLICY "audit_log_rh_read_empresa"
  ON public.audit_log FOR SELECT TO authenticated
  USING (empresa_id IS NOT NULL AND public.pode_gerir_rh(empresa_id));
