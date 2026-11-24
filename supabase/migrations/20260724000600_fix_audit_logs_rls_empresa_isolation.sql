-- Issues 33+34: Substitui políticas RLS quebradas em audit_logs e auditoria_logs.
--
-- 20260516174949_* criou em ambas as tabelas a policy:
--   USING (empresa_id = auth.uid() OR ...)
-- auth.uid() retorna o UUID do usuário autenticado, não um empresa_id.
-- A comparação é sempre falsa → ninguém lê/escreve (fail-closed acidental
-- para auditoria_logs). Para audit_logs, pior: a tabela não tem empresa_id,
-- portanto a policy causa erro de coluna inexistente em DDL-time.
--
-- Correção:
--  • audit_logs    — sem empresa_id; escopar por user_id (coluna presente).
--  • auditoria_logs — tem empresa_id; usar get_auth_empresa_id() (padrão do schema).

-- ── audit_logs ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Multi-tenant access for audit_logs" ON public.audit_logs;

CREATE POLICY "audit_logs_user_isolation"
  ON public.audit_logs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── auditoria_logs ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Multi-tenant access for auditoria_logs" ON public.auditoria_logs;

CREATE POLICY "auditoria_logs_empresa_isolation"
  ON public.auditoria_logs
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());
