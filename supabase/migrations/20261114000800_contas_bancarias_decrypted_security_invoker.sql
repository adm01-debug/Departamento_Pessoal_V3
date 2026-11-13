-- Advisor Supabase ERROR `security_definer_view`: public.contas_bancarias_decrypted
-- (agência, conta, dígito e chave PIX descriptografados) roda com os privilégios
-- do dono (postgres), ignorando a RLS de quem consulta.
--
-- Causa raiz: 20261002103000_p0_fix_audit_critical_gaps.sql ligou
-- `security_invoker = true`, mas 20261019000000_qa3_db_fixes.sql recriou a view
-- com CREATE OR REPLACE VIEW sem `WITH (security_invoker = true)` — o Postgres
-- zera as opções da view nesse caso. No canônico, em 12/11/2026,
-- pg_class.reloptions da view = NULL.
--
-- Efeito de religar: a leitura passa a respeitar a policy de quem consulta em
-- public.contas_bancarias (`contas_bancarias_rh_manage`: pode_gerir_rh(empresa_id)
-- OR is_admin(auth.uid()), já com o bypass de admin de 20261024000000_qa_r4_fixes)
-- — o mesmo filtro do WHERE da view, então nenhum usuário legítimo perde linhas.
-- A descriptografia segue pelo wrapper SECURITY DEFINER
-- decrypt_dados_bancarios_tenant(text, uuid), executável por authenticated.
-- Preflight fail-closed: se o estado vivo não for esse, a migration aborta.

DO $migration$
BEGIN
  IF to_regclass('public.contas_bancarias_decrypted') IS NULL THEN
    RAISE EXCEPTION 'public.contas_bancarias_decrypted ausente — estado vivo diverge do esperado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contas_bancarias'
      AND policyname = 'contas_bancarias_rh_manage'
      AND qual LIKE '%pode_gerir_rh(empresa_id)%' AND qual LIKE '%is_admin(auth.uid())%'
  ) THEN
    RAISE EXCEPTION 'Policy contas_bancarias_rh_manage sem pode_gerir_rh OR is_admin: security_invoker esconderia linhas de admin/RH. Revisar antes de aplicar.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.decrypt_dados_bancarios_tenant(text,uuid)')
      AND p.prosecdef
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'decrypt_dados_bancarios_tenant(text,uuid) ausente, não SECURITY DEFINER ou sem EXECUTE para authenticated.';
  END IF;
END
$migration$;

ALTER VIEW public.contas_bancarias_decrypted SET (security_invoker = true);
