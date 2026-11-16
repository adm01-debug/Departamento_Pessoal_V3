-- ============================================================================
-- Repõe a revogação de EXECUTE em public.versao_consolidada_avaliacao.
--
-- POR QUE ESTA MIGRATION EXISTE
-- A 20261017090000_ninebox_aprovacao_gestor.sql:754 faz
--   grant execute on function public.versao_consolidada_avaliacao(uuid, uuid)
--   to authenticated;
-- e essa versão NÃO está no ledger canônico, então ela será executada quando o
-- lote NineBox for aplicado. Quem havia fechado esse privilégio foi a
-- 20261028130000_revoke_orphan_secdef_v2.sql, que já está no ledger e por isso
-- NÃO roda de novo. Nenhuma outra migration do lote revoga o grant depois.
--
-- Consequência sem esta migration, medida antes de escrever: hoje
-- has_function_privilege('authenticated', ..., 'EXECUTE') = false nas duas
-- funções cobertas pelo invariante. Aplicar o lote devolveria o EXECUTE a
-- `authenticated` numa função `security definer` (chamada direta permitiria
-- forjar/ler versão de consolidação sem passar pelos gatilhos), e o invariante
-- `orphan_secdef_revoked` (scripts/canonical-invariants.sql:335-346) ficaria
-- falso. O step "Verificar objetos e ledger" roda DEPOIS do COMMIT: o apply
-- terminaria vermelho com o privilégio já gravado.
--
-- ORDEM: o timestamp 20261115170000 é o último do lote de propósito -- esta
-- migration precisa rodar depois da 20261017090000 que reabre o grant.
-- ============================================================================

-- ── §0 · PRÉ-CONDIÇÃO (fail-closed) ────────────────────────────────────────
do $preflight$
begin
  if to_regprocedure('public.versao_consolidada_avaliacao(uuid, uuid)') is null then
    raise exception
      'pre-condicao: public.versao_consolidada_avaliacao(uuid, uuid) nao existe -- 20261017090000 precisa rodar antes desta migration';
  end if;
end
$preflight$;

-- ── §1 · REVOGAÇÃO ─────────────────────────────────────────────────────────
-- A consolidação é mantida exclusivamente pelos gatilhos/RPCs `security
-- definer`, executados como o dono. Nenhum papel de aplicação chama esta
-- função diretamente.
revoke all on function public.versao_consolidada_avaliacao(uuid, uuid)
  from public, anon, authenticated;

-- ── §2 · PÓS-CONDIÇÃO (fail-closed) ────────────────────────────────────────
do $posfixo$
declare
  v_anon boolean;
  v_auth boolean;
begin
  select has_function_privilege('anon', p.oid, 'EXECUTE'),
         has_function_privilege('authenticated', p.oid, 'EXECUTE')
    into v_anon, v_auth
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'versao_consolidada_avaliacao';

  if v_anon or v_auth then
    raise exception
      'pos-condicao falhou: public.versao_consolidada_avaliacao ainda executavel por anon=% / authenticated=% -- o invariante orphan_secdef_revoked reprovaria o apply', v_anon, v_auth;
  end if;
end
$posfixo$;
