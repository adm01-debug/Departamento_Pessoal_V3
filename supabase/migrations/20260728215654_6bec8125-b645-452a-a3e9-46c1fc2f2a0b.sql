-- =====================================================================
-- Correção: lockout de conta acionável por terceiros (DoS de login)
--
-- public.record_failed_login(text,text) incrementa o contador de falhas
-- de um identificador e, a partir de 5, bloqueia a conta por 5/15/60 min.
-- Estava com EXECUTE para anon: qualquer pessoa na internet, conhecendo
-- só o e-mail da vítima, podia chamá-la em laço e manter a conta
-- permanentemente bloqueada — sem jamais tentar uma senha. O contador
-- de falhas nunca deveria ser escrito por quem não sabe se a senha
-- falhou; essa é uma decisão do servidor.
--
-- O login do app já passa por completo pela edge function auth-login,
-- que usa service_role e chama check_account_lockout/record_login_attempt.
-- As RPCs abaixo eram um segundo sistema de lockout, redundante e
-- exposto. Ficam restritas ao servidor.
--
-- check_login_lock também sai do alcance de anon: além de alimentar o
-- mesmo par, ela permitia enumerar quais contas estão bloqueadas.
-- reset_login_attempts já era service_role-only e permanece assim.
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.record_failed_login(text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_login_lock(text, text)    FROM anon, authenticated, PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_failed_login(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_login_lock(text, text)    TO service_role;

-- Função de gatilho homônima (sem argumentos): só deve ser invocada pelo
-- executor de triggers, nunca pela API. Sem SECURITY DEFINER, mas exposta.
REVOKE EXECUTE ON FUNCTION public.record_failed_login() FROM anon, authenticated, PUBLIC;

COMMENT ON FUNCTION public.record_failed_login(text, text) IS
  'Contador de falhas de login. EXECUTE restrito a service_role: chamada por '
  'cliente permitiria bloquear a conta de terceiros (DoS). Use a edge function auth-login.';
COMMENT ON FUNCTION public.check_login_lock(text, text) IS
  'Consulta de bloqueio de login. EXECUTE restrito a service_role para evitar '
  'enumeração de contas bloqueadas. Use a edge function auth-login.';