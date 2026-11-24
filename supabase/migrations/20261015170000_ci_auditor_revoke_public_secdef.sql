-- Codex review (P1, PR #238): REVOKE ALL ON SCHEMA public FROM ci_auditor
-- (migration 20261015160000) revoga apenas privilégios concedidos
-- diretamente a ci_auditor no SCHEMA (USAGE/CREATE) -- não tem efeito sobre
-- privilégios concedidos ao pseudo-role PUBLIC. No Postgres, GRANT EXECUTE é
-- concedido a PUBLIC por padrão em toda função nova (CREATE FUNCTION), e um
-- REVOKE direcionado a um role específico (ci_auditor) nunca revoga o que foi
-- concedido a PUBLIC -- PUBLIC se aplica a todo role, sem exceção, por
-- definição. Isso significa que ci_auditor (role de LOGIN, credencial exposta
-- a PRs internos via SUPABASE_DB_URL_READONLY) conseguia executar qualquer
-- função SECURITY DEFINER do schema public que nunca teve seu EXECUTE
-- revogado de PUBLIC explicitamente -- incluindo funções que mutam dados de
-- negócio sob os privilégios do owner (postgres), contornando RLS
-- completamente: admissao_salvar_dados, admissao_assinar_contrato,
-- admissao_marcar_documentos, admissao_registrar_documento (fluxo de
-- admissão por token).
--
-- Confirmado ao vivo antes desta migration: as 18 funções abaixo são as
-- únicas SECURITY DEFINER em public hoje executáveis por ci_auditor, e as
-- três únicas identidades da aplicação que realmente as usam (anon,
-- authenticated, service_role) TAMBÉM só tinham acesso via PUBLIC -- nenhuma
-- delas tinha um GRANT explícito. Portanto: revogar de PUBLIC e conceder
-- explicitamente a essas três preserva 100% do comportamento da aplicação,
-- e remove apenas o acesso incidental de ci_auditor (e de qualquer role
-- futuro que não deveria ter acesso por padrão).
--
-- SQL 100% estático (sem EXECUTE/dynamic SQL) -- lista fixa, auditável,
-- mesma convenção da migration anterior (evita o sinalizador de scanner de
-- segurança sem ganho real, já discutido na sessão 23/07/2026 do CLAUDE.md).
--
-- Limitação residual, documentada: isto NÃO é auto-aplicável a funções
-- SECURITY DEFINER criadas no futuro -- toda nova função herda EXECUTE para
-- PUBLIC por padrão do Postgres. Cada migration futura que criar uma função
-- SECURITY DEFINER sensível precisa fazer o mesmo REVOKE/GRANT explícito, ou
-- o time precisa adotar `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON
-- FUNCTIONS FROM PUBLIC` como política (decisão de escopo maior, fora desta
-- migration pontual).

REVOKE EXECUTE ON FUNCTION public.admissao_assinar_contrato(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admissao_assinar_contrato(text, text, text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admissao_marcar_documentos(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admissao_marcar_documentos(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admissao_registrar_documento(text, text, text, text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admissao_registrar_documento(text, text, text, text, bigint) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admissao_salvar_dados(text, text, text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admissao_salvar_dados(text, text, text, date, text, text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_brute_force(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_brute_force(text, text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, uuid) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.contrato_consultar_por_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_consultar_por_token(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.contrato_preview_url_por_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_preview_url_por_token(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.contrato_verificar_autenticidade_v2(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_verificar_autenticidade_v2(text, text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.contrato_verificar_autenticidade(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_verificar_autenticidade(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_admissao_por_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admissao_por_token(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_empresas(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_empresas(uuid) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_country_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_country_allowed(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_ip_blocked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_ip_blocked(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_ip_whitelisted(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_ip_whitelisted(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.medida_verificar_ciencia_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.medida_verificar_ciencia_hash(text) TO anon, authenticated, service_role;

-- pgaudit_* são funções de event trigger (owner supabase_admin) -- nunca
-- deveriam ser chamadas diretamente por nenhum role de API; o REVOKE abaixo
-- não regranta a anon/authenticated/service_role (nenhum dos três deveria
-- precisar, e o event trigger do pgaudit roda independente de GRANT de
-- EXECUTE do role chamador).
--
-- LIMITAÇÃO CONHECIDA (verificada ao vivo nesta sessão, 15/10/2026): quem
-- roda as migrations deste projeto conecta como `postgres`, que aqui NÃO é
-- superuser (`rolsuper = false` -- self-hosted Supabase reserva o bit real
-- de superuser para `supabase_admin`) e não é o grantor original do EXECUTE
-- de PUBLIC nestas duas funções especificamente (proacl mostra
-- `=X/supabase_admin`). Por isso o REVOKE abaixo é um no-op silencioso
-- (Postgres emite WARNING, não ERROR, e o comando "sucede" sem revogar
-- nada) sob a role que roda esta migration -- confirmado via
-- has_function_privilege: ci_auditor continua com EXECUTE nestas duas após
-- a tentativa. Mantido como best-effort (funciona se algum dia rodar como
-- supabase_admin) e documentado para o dono: risco residual BAIXO (funções
-- de auditoria de DDL, não mutam dados de negócio) que só supabase_admin
-- pode corrigir.
REVOKE EXECUTE ON FUNCTION public.pgaudit_ddl_command_end() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pgaudit_sql_drop() FROM PUBLIC;
