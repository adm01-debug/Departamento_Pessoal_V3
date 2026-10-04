-- P0 (wave 2): auditoria_acesso_bancario aceitava INSERT de qualquer
-- authenticated (WITH CHECK(true)) — spoofing/spam de log de auditoria.
-- A tabela não tem escritor invoker (nem app, nem trigger): quem grava é
-- rotina SECURITY DEFINER/service_role, que atravessa RLS por natureza.
-- Restringir a service_role não muda o fluxo legítimo e fecha o spoofing.
DO $$
BEGIN
  IF to_regclass('public.auditoria_acesso_bancario') IS NULL THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "auditoria_bancario_insert" ON public.auditoria_acesso_bancario;
  CREATE POLICY "auditoria_bancario_insert" ON public.auditoria_acesso_bancario
    FOR INSERT TO service_role
    WITH CHECK (true);
END $$;
