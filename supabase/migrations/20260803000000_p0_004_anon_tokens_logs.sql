-- ============================================================================
-- P0-004: Remove acesso anon em admissao_tokens e logs_sistema
-- ----------------------------------------------------------------------------
-- admissao_tokens: política permitia que QUALQUER anon lesse TODOS os tokens.
-- Correção: o portador do token só consegue ver o SEU token (via header).
--
-- logs_sistema: política permitia INSERT anon irrestrito (log poisoning).
-- Correção: apenas authenticated pode inserir; rate limit via Edge Function
-- processar-agendamentos (única origem legítima de log anônimo).
-- ============================================================================

-- ---------- admissao_tokens ----------
DROP POLICY IF EXISTS "Candidato pode acessar seu proprio token" ON public.admissao_tokens;
DROP POLICY IF EXISTS "anon_select_admissao_tokens" ON public.admissao_tokens;
DROP POLICY IF EXISTS "anon_admissao_tokens_select" ON public.admissao_tokens;

-- Política correta: anon pode tentar lookup, mas SÓ do token que apresentar
-- via header. Tentar ler todos retorna 0 rows.
CREATE POLICY "anon_select_own_token_via_header" ON public.admissao_tokens
  FOR SELECT TO anon, authenticated
  USING (
    token = COALESCE(
      current_setting('request.headers', true)::json->>'x-admissao-token',
      ''
    )
  );

-- Bloqueia qualquer escrita direta via anon (apenas Edge Functions com service_role)
REVOKE INSERT, UPDATE, DELETE ON public.admissao_tokens FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.admissao_tokens FROM authenticated;

-- ---------- logs_sistema ----------
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.logs_sistema;
DROP POLICY IF EXISTS "anon_insert_logs" ON public.logs_sistema;
DROP POLICY IF EXISTS "logs_sistema_anon_insert" ON public.logs_sistema;

-- Apenas authenticated pode inserir logs (com isolamento de tenant)
CREATE POLICY "authenticated_insert_logs" ON public.logs_sistema
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = (
      current_setting('request.jwt.claims', true)::jsonb
        -> 'app_metadata' ->> 'empresa_id'
    )::uuid
    OR empresa_id IS NULL -- logs de sistema (sem tenant)
  );

-- SELECT: apenas admins da empresa leem logs
CREATE POLICY "admin_select_logs" ON public.logs_sistema
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- UPDATE/DELETE: ninguém (logs são imutáveis)
REVOKE UPDATE, DELETE ON public.logs_sistema FROM authenticated, anon;

-- Comentários de auditoria
COMMENT ON TABLE public.admissao_tokens IS
  '[P0-004] Acesso anon corrigido — portador só vê seu próprio token via header.';
COMMENT ON TABLE public.logs_sistema IS
  '[P0-004] Logs imutáveis. Insert só authenticated com tenant; select só admin.';
