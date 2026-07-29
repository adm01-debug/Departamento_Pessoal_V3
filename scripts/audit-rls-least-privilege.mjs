#!/usr/bin/env node
/**
 * Gate de menor privilégio em RLS.
 *
 * O gate irmão (`audit:rls-pii`) responde "esta política correlaciona com
 * alguém?". Ele aprova `empresa_id IN (SELECT get_user_empresas(auth.uid()))`
 * — e com razão, porque isso de fato isola o tenant.
 *
 * O incidente que motivou ESTE gate é o degrau seguinte: correlacionar por
 * tenant e parar aí. Em 12 tabelas o predicado era exatamente esse, com
 * `FOR ALL`. Resultado: qualquer pessoa autenticada vinculada à empresa podia
 * ler E ESCREVER o contracheque, a conta bancária, o ASO (dado de saúde) e a
 * denúncia do canal de ética de todos os colegas. Não havia bug: o RLS
 * funcionava perfeitamente, isolando a empresa A da empresa B. Só que dentro
 * de uma mesma empresa não existia nenhuma fronteira entre o RH e o estagiário.
 *
 * A falha era invisível porque estava latente: só existiam vínculos
 * administrativos em `user_empresas`. O Portal do Colaborador, porém, foi
 * construído para dar login a funcionários comuns — no primeiro onboarding a
 * exposição se materializaria em massa, sem uma linha de código mudar.
 *
 * REGRA APLICADA
 * Sobre a lista de tabelas sensíveis abaixo, toda política que conceda
 * ESCRITA (ALL/INSERT/UPDATE/DELETE) precisa exigir papel — `pode_gerir_rh`,
 * `pode_gerir_pessoas`, `has_role` ou `is_admin`. Leitura pode ser
 * tenant-wide ou por auto-acesso (`sou_o_colaborador`), o que é decisão de
 * produto; escrita, não.
 *
 * Saída: 0 quando limpo, 1 quando há regressão. Banco indisponível encerra em
 * 0 avisando — um gate que não pôde rodar não reprova o build, mas também não
 * se declara aprovado em silêncio.
 */

import { execFileSync } from 'node:child_process';

/**
 * Tabelas onde um write indevido é dano concreto: dinheiro, saúde, sigilo
 * ou prova documental trabalhista. A lista é explícita — e não heurística por
 * nome de coluna — porque o critério aqui é a GRAVIDADE do write, que nenhum
 * nome de coluna revela.
 */
const TABELAS_SENSIVEIS = new Set([
  'colaboradores',
  'holerites',
  'folhas_pagamento',
  'contas_bancarias',
  'historico_salarial',
  'emprestimos_consignados',
  'adiantamentos_salariais',
  'documentos_colaborador',
  'dependentes',
  'asos',
  'afastamentos',
  'medidas_disciplinares',
  'canal_etica',
  'lgpd_solicitacoes',
  'desligamentos',
  'ferias',
  'user_roles',
  'user_empresas',
  // Adicionadas após a varredura de LEITURA: todas expunham dado de saúde,
  // documento pessoal digitalizado, valor de folha ou conta bancária a
  // qualquer autenticado do mesmo tenant.
  'exames',
  'documentos_pessoais_arquivos',
  'beneficiarios_plano',
  'contatos_emergencia',
  'formacoes_academicas',
  'anotacoes_colaborador',
  'folha_itens',
  'lancamentos_folha',
  'historico_rescisoes',
  'cnab_itens',
  'pix_itens',
]);

/**
 * Comandos auditados.
 *
 * SELECT ficou de fora da primeira versão deste gate — e essa omissão custou
 * 12 tabelas. A varredura seguinte encontrou exame médico, RG digitalizado,
 * item de folha e remessa bancária legíveis por qualquer autenticado do
 * tenant, sem que nenhuma política de ESCRITA estivesse errada. Ler o
 * contracheque do colega já é o vazamento; não é preciso alterá-lo.
 *
 * Um detalhe do modelo do Postgres torna a omissão especialmente traiçoeira:
 * políticas se combinam por OR. Uma única regra `SELECT` tenant-wide
 * sobrevivente anula silenciosamente três políticas restritivas corretas
 * criadas ao lado dela — foi exatamente o que ocorreu em `desligamentos`.
 */
const CMDS_AUDITADOS = new Set(['ALL', 'INSERT', 'UPDATE', 'DELETE', 'SELECT']);

/**
 * Predicados que comprovam verificação de PAPEL, não apenas de tenant.
 * `pertence_a_empresa` e `get_user_empresas` NÃO entram: são exatamente o
 * padrão que este gate existe para reprovar em caminhos de escrita.
 */
const VERIFICADORES_DE_PAPEL = [
  /\bpode_gerir_rh\b/i,
  /\bpode_gerir_pessoas\b/i,
  /\bhas_role\b/i,
  /\bis_admin\b/i,
  /\b_is_admin_bypass\b/i,
];

/**
 * Isenções, com justificativa obrigatória. Só entram políticas de
 * auto-serviço estreito, onde o próprio titular escreve o próprio dado.
 */
const ISENCOES = new Map([
  [
    'user_empresas:Usuários podem ver suas associações',
    'Somente leitura das próprias associações; não concede escrita.',
  ],
]);

const QUERY = `
SELECT
  p.tablename,
  p.policyname,
  p.cmd,
  array_to_string(p.roles, ','),
  replace(coalesce(p.qual, '') || ' | ' || coalesce(p.with_check, ''), E'\\n', ' ')
FROM pg_policies p
WHERE p.schemaname = 'public'
ORDER BY p.tablename, p.policyname;
`;

/** Corpo das funções de `public`, para enxergar papel atrás de um helper. */
const FUNCTIONS_QUERY = `
SELECT p.proname, replace(p.prosrc, E'\\n', ' ')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f';
`;

const MAX_DEPTH = 3;

function hasDatabase() {
  return Boolean(process.env.PGHOST || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
}

function runQuery(sql) {
  const args = ['-Atq', '-F', '\t', '-c', sql];
  const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!process.env.PGHOST && conn) args.unshift(conn);
  return execFileSync('psql', args, { encoding: 'utf8' });
}

function parseRows(output, arity) {
  return output
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split('\t'))
    .filter((cols) => cols.length >= arity);
}

/**
 * Inlina o corpo das funções chamadas no predicado. Sem isso, uma política
 * que delega toda a autorização a um helper pareceria vazia para o gate.
 */
function inlineFunctions(expression, bodies, depth = 0) {
  if (depth >= MAX_DEPTH) return expression;
  let expanded = expression;
  let changed = false;
  for (const [name, body] of bodies) {
    if (new RegExp(`\\b${name}\\s*\\(`, 'i').test(expanded) && !expanded.includes(`/*${name}*/`)) {
      expanded += ` /*${name}*/ ${body}`;
      changed = true;
    }
  }
  return changed ? inlineFunctions(expanded, bodies, depth + 1) : expanded;
}

function verificaPapel(expression) {
  return VERIFICADORES_DE_PAPEL.some((re) => re.test(expression));
}

function main() {
  if (!hasDatabase()) {
    console.warn('[rls-least-privilege] Banco indisponível neste ambiente — verificação ignorada.');
    console.warn('[rls-least-privilege] Defina PGHOST/PG* ou DATABASE_URL para habilitar o gate.');
    return 0;
  }

  let policyOutput;
  let functionOutput;
  try {
    policyOutput = runQuery(QUERY);
    functionOutput = runQuery(FUNCTIONS_QUERY);
  } catch (error) {
    const stderr = String(error.stderr || '');
    if (/^ERROR:/m.test(stderr)) {
      console.error('[rls-least-privilege] A consulta de auditoria falhou — gate reprovado.');
      console.error(stderr.trim());
      return 1;
    }
    console.warn(`[rls-least-privilege] Banco inacessível: ${error.message}`);
    return 0;
  }

  const bodies = parseRows(functionOutput, 2).map(([name, src]) => [name, src]);
  const violacoes = [];
  let inspecionadas = 0;

  for (const [tablename, policyname, cmd, roles, rawExpr] of parseRows(policyOutput, 5)) {
    if (!TABELAS_SENSIVEIS.has(tablename)) continue;
    if (!CMDS_DE_ESCRITA.has(cmd)) continue;
    if (ISENCOES.has(`${tablename}:${policyname}`)) continue;

    const roleList = roles.split(',').map((r) => r.trim()).filter(Boolean);
    // service_role opera fora do RLS por definição; exigir papel dele é ruído.
    if (roleList.length === 1 && roleList[0] === 'service_role') continue;

    inspecionadas += 1;
    const expanded = inlineFunctions(rawExpr, bodies);
    if (!verificaPapel(expanded)) {
      violacoes.push({ tablename, policyname, cmd, expr: rawExpr.slice(0, 200) });
    }
  }

  if (violacoes.length > 0) {
    console.error(
      `\n[rls-least-privilege] ${violacoes.length} política(s) de ESCRITA sem verificação de papel:\n`,
    );
    for (const v of violacoes) {
      console.error(`  ✗ ${v.tablename} :: "${v.policyname}" (${v.cmd})`);
      console.error(`      ${v.expr}`);
    }
    console.error(
      '\n  Isolar por empresa não basta em tabela sensível: dentro do mesmo tenant',
    );
    console.error(
      '  o estagiário e o RH ficam indistinguíveis. Exija pode_gerir_rh() /',
    );
    console.error('  pode_gerir_pessoas() / has_role() no caminho de escrita.\n');
    return 1;
  }

  console.log(
    `[rls-least-privilege] OK — ${inspecionadas} política(s) de escrita em tabela sensível exigem papel.`,
  );
  return 0;
}

process.exit(main());
