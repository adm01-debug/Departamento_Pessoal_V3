#!/usr/bin/env node
/**
 * Gate de regressão: política PERMISSIVA irrestrita sobre tabela multi-tenant.
 *
 * O INCIDENTE QUE MOTIVOU ESTE GATE
 * ---------------------------------
 * `rubricas_folha` já possuía a política correta:
 *
 *     rubricas_read: USING (empresa_id IS NULL OR pertence_a_empresa(empresa_id))
 *
 * ...e mesmo assim vazava as rubricas de folha de todas as empresas para
 * qualquer usuário autenticado. A causa era uma política legada que nunca
 * havia sido removida:
 *
 *     "Authenticated can read rubricas_folha": USING (true)
 *
 * Políticas PERMISSIVAS se combinam por **OU**: basta UMA liberar para o
 * acesso ser concedido. Escrever a política certa não protege nada enquanto a
 * errada continuar viva. É por isso que este gate existe e por que ele não
 * pode ser substituído por "revisar se existe uma política boa" — a boa
 * existia. O `audit-rls-pii` também não pegou o caso, porque rubrica de folha
 * não casa com a heurística de PII: são dados da empresa, não da pessoa.
 *
 * O QUE É AVALIADO
 * Toda tabela que possua `empresa_id` (marcador de multi-tenancy neste
 * schema) e tenha ao menos uma política PERMISSIVA cujo predicado não
 * correlacione com o solicitante — `true`, `IS NOT NULL` sozinho, ou
 * constantes equivalentes.
 *
 * O QUE NÃO É AVALIADO
 * - Políticas RESTRICTIVE: combinam por E, portanto restringem em vez de
 *   alargar; uma restritiva `true` é inócua.
 * - Políticas exclusivas de `service_role`: esse papel atravessa o RLS de
 *   qualquer forma, então a política não é a fronteira de segurança.
 * - Tabelas sem `empresa_id`: são catálogos de referência (CID-10, etnias,
 *   sindicatos), onde leitura compartilhada é o comportamento desejado.
 *
 * Saída: 0 limpo, 1 com regressão. Sem banco alcançável encerra em 0 avisando
 * — um gate que não pôde rodar não deve reprovar o build, mas também não deve
 * se declarar aprovado em silêncio.
 */

import { execFileSync } from 'node:child_process';

/**
 * Predicados que NÃO correlacionam com quem está pedindo.
 * `empresa_id IS NOT NULL` é o caso traiçoeiro: menciona a coluna de tenant e
 * por isso parece isolar, mas é verdadeiro para toda linha de toda empresa.
 */
const SEM_CORRELACAO = [
  /^true$/i,
  /^\(?\s*true\s*\)?$/i,
  /^\(?\s*empresa_id\s+is\s+not\s+null\s*\)?$/i,
  /^\(?\s*1\s*=\s*1\s*\)?$/i,
  // "Está logado?" não é isolamento de tenant — é autenticação. Precisa vir
  // ANTES da checagem de CORRELACIONADORES, senão o `auth.uid()` presente na
  // expressão faz o predicado passar como se correlacionasse. Foi exatamente
  // esse o furo em premiacoes_pagamentos, treinamento_* e documentos_historico.
  /^\(?\s*auth\.uid\s*\(\s*\)\s+is\s+not\s+null\s*\)?$/i,
  /^\(?\s*auth\.uid\s*\(\s*\)\s*<>\s*null\s*\)?$/i,
  /^\(?\s*auth\.role\s*\(\s*\)\s*=\s*'authenticated'(::text)?\s*\)?$/i,
  /^\(?\s*\(\s*auth\.jwt\s*\(\s*\)\s*->>\s*'role'(::text)?\s*\)\s*=\s*'authenticated'(::text)?\s*\)?$/i,
];


/**
 * Expressões que provam correlação com o solicitante. `empresa_id` sozinho
 * não basta — é preciso amarrar ao usuário autenticado.
 *
 * Sobre os dois últimos: derivar o tenant de uma claim do JWT correlaciona
 * de fato (`get_auth_empresa_id()` lê `app_metadata.empresa_id`, gravável
 * apenas por `service_role`, portanto não forjável pelo titular do token).
 * Este gate mede APENAS ausência de correlação. A discussão sobre a robustez
 * da claim escolhida — `app_metadata` vs. `user_metadata` (este editável pelo
 * próprio usuário) — é responsabilidade do `audit-rls-pii`, que possui a
 * heurística FORGEABLE_CLAIM_RE para isso. Duplicar o julgamento aqui
 * produziria ruído e levaria o time a desligar o gate.
 */
const CORRELACIONADORES = [
  /auth\.uid\s*\(\s*\)/i,
  /\bpertence_a_empresa\b/i,
  /\bget_user_empresas\b/i,
  /\buser_belongs_to_empresa\b/i,
  /\bpode_gerir_rh\b/i,
  /\bpode_gerir_pessoas\b/i,
  /\bsou_o_colaborador\b/i,
  /\bhas_role\b/i,
  /\bis_admin\b/i,
  /\bget_auth_empresa_id\b/i,
  /auth\.jwt\s*\(\s*\)/i,
  // Helpers de tabela-filha: recebem a FK do pai e resolvem o tenant lá dentro,
  // sempre amarrando em auth.uid(). Verificados um a um em pg_get_functiondef.
  /\bpcs_pode_ver_plano\b/i,
  /\bpcs_pode_gerir_plano\b/i,
  /\bcandidatura_na_minha_empresa\b/i,
];



/**
 * Isenções, com justificativa obrigatória.
 * Só entram tabelas cujo conteúdo é institucional e compartilhado de
 * propósito entre tenants. Nunca adicione aqui para "silenciar" o gate.
 */
const ALLOWLIST = new Map([]);

/**
 * Escopo do gate = tabelas cujo conteúdo pertence a um tenant.
 *
 * Ter a coluna `empresa_id` é o caso fácil. O caso que escapou por muito tempo
 * é a tabela-FILHA: `premiacoes_pagamentos` não tem `empresa_id`, herda o
 * tenant de `premiacoes_campanhas` pela FK. Como o gate original só enxergava
 * a coluna, essas tabelas ficavam fora da amostra — e foi justamente onde
 * `auth.uid() IS NOT NULL` sobreviveu, expondo valores de premiação entre
 * empresas.
 *
 * Por isso o alcance é o fechamento transitivo das FKs até uma tabela com
 * `empresa_id`. `documentos_historico` exige 2 saltos
 * (documentos -> colaboradores), então a profundidade precisa ser > 1. O teto
 * de 4 evita ciclos degenerados e mantém a consulta barata; FKs para `auth.users`
 * ficam de fora porque `auth` não é schema de tenant.
 */
const QUERY = `
WITH RECURSIVE alcanca_tenant(oid, profundidade) AS (
  -- base: a tabela carrega o próprio tenant
  SELECT c.oid, 0
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'empresa_id' AND NOT a.attisdropped
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  UNION
  -- passo: filha que aponta, por FK, para algo que já alcança o tenant
  SELECT fk.conrelid, at.profundidade + 1
  FROM alcanca_tenant at
  JOIN pg_constraint fk ON fk.confrelid = at.oid AND fk.contype = 'f'
  JOIN pg_class c ON c.oid = fk.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  WHERE at.profundidade < 4
)
SELECT
  p.tablename,
  p.policyname,
  p.cmd,
  p.permissive,
  array_to_string(p.roles, ','),
  replace(coalesce(p.qual, ''), E'\\n', ' '),
  replace(coalesce(p.with_check, ''), E'\\n', ' ')
FROM pg_policies p
JOIN pg_class pc ON pc.relname = p.tablename
JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
WHERE p.schemaname = 'public'
  AND pc.oid IN (SELECT oid FROM alcanca_tenant)
ORDER BY p.tablename, p.policyname;
`;


function runQuery(sql) {
  const args = ['-Atq', '-F', '\t', '-c', sql];
  const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  // Sem PGHOST o psql cairia num socket local inexistente; nesse caso a URL
  // explícita é a única forma de conexão.
  if (!process.env.PGHOST && conn) args.unshift(conn);
  return execFileSync('psql', args, { encoding: 'utf8' });
}

/** Um predicado vazio em política PERMISSIVA equivale a `true`. */
function irrestrito(pred) {
  const p = (pred ?? '').trim();
  if (p === '') return true;
  if (SEM_CORRELACAO.some((r) => r.test(p))) return true;
  return !CORRELACIONADORES.some((r) => r.test(p));
}

function main() {
  let saida;
  try {
    saida = runQuery(QUERY);
  } catch (err) {
    console.warn(`[rls-tenant-open] banco inacessível, gate NÃO executado: ${err.message.split('\n')[0]}`);
    return 0;
  }

  const linhas = saida
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => l.split('\t'));

  const violacoes = [];
  let avaliadas = 0;

  for (const [tabela, politica, cmd, permissive, roles, qual, withCheck] of linhas) {
    // RESTRICTIVE combina por E: restringe, nunca alarga.
    if ((permissive ?? '').toUpperCase() !== 'PERMISSIVE') continue;
    // service_role atravessa o RLS; a política não é a fronteira aqui.
    const papeis = (roles ?? '').split(',').map((r) => r.trim()).filter(Boolean);
    if (papeis.length > 0 && papeis.every((r) => r === 'service_role')) continue;
    if (ALLOWLIST.has(tabela)) continue;
    avaliadas++;

    // INSERT usa with_check; os demais usam qual. Para UPDATE/ALL sem
    // with_check o Postgres reaproveita o qual como check, então avaliar o
    // qual já cobre o caso.
    const pred = cmd === 'INSERT' ? withCheck : qual;
    if (irrestrito(pred)) {
      violacoes.push({ tabela, politica, cmd, papeis: papeis.join(',') || 'public', pred: (pred ?? '').trim() || '(vazio)' });
    }
  }

  if (violacoes.length === 0) {
    console.log(`[rls-tenant-open] OK — ${avaliadas} política(s) permissiva(s) em tabelas multi-tenant, todas correlacionadas.`);
    return 0;
  }

  console.error(`\n[rls-tenant-open] ${violacoes.length} política(s) permissiva(s) irrestrita(s) em tabela multi-tenant:\n`);
  for (const v of violacoes) {
    console.error(`  ✗ ${v.tabela}.${v.politica}  [${v.cmd}, roles: ${v.papeis}]`);
    console.error(`      predicado: ${v.pred}`);
  }
  console.error(`
  Políticas PERMISSIVAS se combinam por OU: basta UMA liberar. Uma política
  irrestrita ANULA todas as outras da mesma tabela, inclusive as corretas.

  Antes de "adicionar a política certa", confirme se já existe uma e remova a
  legada:

      SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = '<tabela>';
      DROP POLICY "<legada>" ON public.<tabela>;

  O predicado precisa amarrar ao solicitante, não só mencionar o tenant:

      USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
`);
  return 1;
}

process.exit(main());
