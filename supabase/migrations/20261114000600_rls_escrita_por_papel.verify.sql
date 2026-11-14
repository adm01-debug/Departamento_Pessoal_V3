-- ok só se: as 9 tabelas não têm mais policy de escrita sem papel, as
-- policies antigas sumiram, a tautologia de premiacoes_campanhas sumiu,
-- cnab_remessas não tem leitura de tenant, canal_etica só deixa admin apagar
-- e o trigger de aprovação de ponto está ativo (aprova admin/RH/gestor; dia
-- aprovado só eles alteram).
SELECT 'ok'
WHERE NOT EXISTS (
  -- nenhuma policy de escrita (ALL/INSERT/UPDATE/DELETE) sem helper de papel,
  -- exceto o registro anônimo do canal de ética e o próprio ponto do colaborador
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('comunicados', 'convenios', 'seguros_vida', 'departamentos', 'pensoes',
                      'premiacoes_campanhas', 'cnab_remessas', 'canal_etica')
    AND cmd <> 'SELECT'
    AND policyname <> 'canal_etica_reportar'
    AND coalesce(qual, '') || coalesce(with_check, '') NOT LIKE '%pode_gerir_rh%'
    AND coalesce(qual, '') NOT LIKE '%is_admin%'
) AND NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public'
    AND (policyname IN ('empresa_comunicados', 'tenant_convenios', 'tenant_seguros_vida',
                        'tenant_departamentos', 'tenant_pensoes', 'cnab_remessas_tenant_read',
                        'canal_etica_rh_manage',
                        'Users can manage their own company campaigns',
                        'Users can view their own company campaigns')
      OR (tablename = 'premiacoes_campanhas'
          AND coalesce(qual, '') LIKE '%premiacoes_campanhas.empresa_id = premiacoes_campanhas.empresa_id%'))
) AND NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'cnab_remessas'
    AND cmd IN ('SELECT', 'ALL') AND coalesce(qual, '') NOT LIKE '%pode_gerir_rh%'
) AND NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'canal_etica'
    AND cmd IN ('ALL', 'DELETE') AND coalesce(qual, '') NOT LIKE '%is_admin%'
) AND (
  SELECT count(*) FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('comunicados', 'convenios', 'seguros_vida', 'departamentos', 'pensoes')
    AND cmd = 'SELECT' AND policyname LIKE '%_tenant_select'
    AND qual LIKE '%get_user_empresas%'
) = 5 AND EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'premiacoes_campanhas'
    AND cmd = 'SELECT' AND roles = '{authenticated}' AND qual LIKE '%pertence_a_empresa%'
) AND EXISTS (
  SELECT 1 FROM pg_trigger
  WHERE tgrelid = 'public.registros_ponto'::regclass
    AND tgname = 'tr_bloquear_aprovacao_ponto_sem_rh'
    AND tgenabled <> 'D'
) AND EXISTS (
  -- aprova quem pode_gerir_pessoas (admin/RH/gestor) e dia aprovado fica travado
  SELECT 1 FROM pg_proc
  WHERE oid = 'public.bloquear_aprovacao_ponto_sem_rh()'::regprocedure
    AND prosrc LIKE '%pode_gerir_pessoas(NEW.empresa_id)%'
    AND prosrc NOT LIKE '%pode_gerir_rh%'
    AND prosrc LIKE '%COALESCE(OLD.aprovado, false)%'
    AND prosrc LIKE '%registro aprovado: só RH/gestor altera%'
);
