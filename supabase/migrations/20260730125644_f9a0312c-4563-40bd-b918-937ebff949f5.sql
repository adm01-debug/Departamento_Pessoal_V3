-- =====================================================================
-- FIX (IDOR): get_user_empresas / get_user_default_empresa
--
-- Vulnerabilidade:
--   Ambas são SECURITY DEFINER, recebem `_user_id uuid` arbitrário e têm
--   EXECUTE para `authenticated`. Sendo SECDEF, ignoram a RLS de
--   public.user_empresas ("Usuários podem ver suas associações").
--   Logo, qualquer usuário logado podia enumerar os vínculos empresa<->usuário
--   de QUALQUER outro usuário — reconhecimento cross-tenant da base.
--
-- Restrição de projeto (por que não basta revogar):
--   245 políticas RLS chamam get_user_empresas(auth.uid()). Revogar ou
--   alterar a assinatura quebraria o banco inteiro.
--
-- Solução:
--   Predicado de auto-escopo dentro do WHERE. Duas propriedades importantes:
--     a) Em política RLS o argumento já é auth.uid() -> comportamento idêntico.
--     b) A função permanece um ÚNICO SELECT, portanto continua elegível a
--        INLINING pelo planejador. Um guard em PL/pgSQL destruiria o inlining
--        e degradaria as 245 políticas. Isto é performance-neutral.
--
--   `auth.uid() IS NULL` libera o caminho de backend (service_role/postgres),
--   que legitimamente resolve vínculos de outros usuários. `anon` não possui
--   EXECUTE em nenhuma das duas, então esse ramo não é alcançável do exterior.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_user_empresas(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT empresa_id
  FROM public.user_empresas
  WHERE user_id = _user_id
    AND (_user_id = auth.uid() OR auth.uid() IS NULL)
$function$;

CREATE OR REPLACE FUNCTION public.get_user_default_empresa(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT empresa_id
  FROM public.user_empresas
  WHERE user_id = _user_id
    AND is_default = true
    AND (_user_id = auth.uid() OR auth.uid() IS NULL)
  LIMIT 1
$function$;

COMMENT ON FUNCTION public.get_user_empresas(uuid) IS
  'Vínculos empresa do usuário. SECDEF com auto-escopo: só responde sobre '
  'o próprio auth.uid() (ou contexto de backend sem JWT). Mantida como SQL '
  'de comando único para preservar o inlining nas ~245 políticas que a usam.';

COMMENT ON FUNCTION public.get_user_default_empresa(uuid) IS
  'Empresa padrão do usuário. SECDEF com auto-escopo — ver get_user_empresas.';