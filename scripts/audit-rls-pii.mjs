#!/usr/bin/env node
/**
 * Gate de regressão de RLS: políticas sobre tabelas com PII precisam
 * correlacionar com o usuário (`auth.uid()`) ou com o escopo de empresa.
 *
 * Contexto dos incidentes que motivaram este gate:
 * - 19 tabelas com política `USING (true)` expondo PII e dados bancários;
 * - políticas legadas atribuídas à role `public` (que inclui `anon`) em
 *   `vagas`, `cnab_remessas` e `audit_log`;
 * - predicados que "pareciam" seguros mas testavam claim do próprio JWT
 *   (`auth.jwt() ->> 'role' = 'service_role'`), controlada por quem emite o token.
 *
 * Nenhum desses casos é acusado pelo Postgres nem pelo typecheck: a política
 * é sintaticamente válida e o app funciona. Só um leitor humano — ou este
 * gate — percebe que o predicado não isola ninguém.
 *
 * ESTRATÉGIA
 * 1. Identifica tabelas com PII por heurística de nome de coluna (CPF, PIS,
 *    salário, conta bancária, endereço, biometria, token, ...).
 * 2. Expande o predicado da política inlineando o corpo das funções `public`
 *    que ele invoca. Isso é essencial: `pcs_pode_ver_plano(plano_id)` parece
 *    opaco, mas seu corpo correlaciona por empresa — reprovar isso seria
 *    ruído que leva o time a desligar o gate.
 * 3. Reprova quando, após a expansão, o predicado não contém NENHUM
 *    correlacionador de tenant/usuário, ou quando a política alcança `anon`.
 *
 * A profundidade de inlining é limitada (MAX_DEPTH) para evitar recursão
 * infinita em funções mutuamente recursivas.
 *
 * Saída: 0 quando limpo, 1 quando há regressão. Sem banco acessível encerra
 * em 0 avisando — um gate que não pôde rodar não deve reprovar o build, mas
 * também não deve se declarar aprovado em silêncio.
 */

import { execFileSync } from 'node:child_process';

/** Profundidade máxima de inlining de funções dentro de um predicado. */
const MAX_DEPTH = 3;

/**
 * Colunas que caracterizam PII / dado sensível sob LGPD e sigilo bancário.
 * Deliberadamente amplo: um falso positivo custa uma linha de allowlist,
 * um falso negativo custa um vazamento.
 */
const PII_COLUMN_RE =
  '(cpf|^rg$|rg_numero|pis|pasep|ctps|salario|remuneracao|vencimento_liquido|' +
  'conta_bancaria|numero_conta|agencia|chave_pix|iban|email|telefone|celular|' +
  'endereco|logradouro|cep|data_nascimento|nome_mae|nome_pai|passaporte|' +
  'titulo_eleitor|cnh|biometri|senha|password|token|secret)';

/**
 * Expressões que comprovam correlação com o solicitante.
 * `empresa_id` sozinho NÃO entra aqui: `empresa_id IS NOT NULL` correlaciona
 * com nada. Exigimos o vínculo com o usuário autenticado.
 */
const TENANT_CORRELATORS = [
  /auth\.uid\s*\(\s*\)/i,
  /\bget_user_empresas\b/i,
  /\bpertence_a_empresa\b/i,
  /\bhas_role\b/i,
  /\bis_admin\b/i,
];

/**
 * Anti-padrão: derivar o tenant de uma claim arbitrária do próprio JWT.
 * A claim é escrita por quem emite/edita o token (user_metadata é editável
 * pelo próprio usuário via API de auth), então o predicado só "parece"
 * isolar. `auth.uid()` é a única parte do token verificada pelo banco.
 * Detectado ANTES dos correlacionadores, porque uma política pode conter
 * `auth.uid()` num ramo e a claim forjável em outro, unidos por OR.
 */
const FORGEABLE_CLAIM_RE =
  /auth\.jwt\s*\(\s*\)\s*(->>?|#>>?)|current_setting\s*\(\s*'request\.jwt/i;

/** Claims do JWT que o banco valida e que, portanto, não são forjáveis. */
const TRUSTED_CLAIM_RE = /->>\s*'(sub|aud|exp|iat|iss)'/i;


/**
 * Tabelas isentas, com justificativa obrigatória.
 * Regra de manutenção: só entram tabelas de REFERÊNCIA compartilhada, cujo
 * conteúdo é institucional e não descreve nenhuma pessoa natural. Nunca
 * adicione aqui uma tabela para "silenciar" o gate.
 */
const ALLOWLIST = new Map([
  [
    'sindicatos',
    'Cadastro institucional de sindicatos (CNPJ, telefone e e-mail da entidade). ' +
      'Dado público de contato da pessoa jurídica, compartilhado entre tenants — não é PII de colaborador.',
  ],
  [
    'cid10',
    'Tabela de referência da CID-10 (OMS). Conteúdo público e imutável, sem vínculo com pessoa.',
  ],
  [
    'nacionalidades',
    'Domínio de referência do eSocial. Lista fechada de códigos, sem vínculo com pessoa.',
  ],
  [
    'etnias',
    'Domínio de referência do eSocial. Lista fechada de códigos, sem vínculo com pessoa.',
  ],
]);

const QUERY = `
WITH pii_tables AS (
  SELECT DISTINCT c.table_name
  FROM information_schema.columns c
  JOIN pg_class pc ON pc.relname = c.table_name
  JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
  WHERE c.table_schema = 'public'
    AND pc.relkind = 'r'
    AND c.column_name ~* '${PII_COLUMN_RE}'
)
SELECT
  p.tablename,
  p.policyname,
  p.cmd,
  array_to_string(p.roles, ','),
  replace(coalesce(p.qual, '') || ' | ' || coalesce(p.with_check, ''), E'\\n', ' ')
FROM pg_policies p
JOIN pii_tables t ON t.table_name = p.tablename
WHERE p.schemaname = 'public'
ORDER BY p.tablename, p.policyname;
`;

/** Corpo de todas as funções de `public`, para inlining dos predicados. */
const FUNCTIONS_QUERY = `
SELECT p.proname, replace(p.prosrc, E'\\n', ' ')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f';
`;

function hasDatabase() {
  return Boolean(process.env.PGHOST || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
}

function runQuery(sql) {
  const args = ['-Atq', '-F', '\t', '-c', sql];
  const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  // Sem PGHOST o psql cairia num socket local inexistente; nesse caso a URL
  // explícita é a única forma de conexão.
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
 * Substitui chamadas a funções de `public` pelo respectivo corpo, para que a
 * checagem enxergue a correlação real por trás de um helper.
 */
function inlineFunctions(expression, bodies, depth = 0) {
  if (depth >= MAX_DEPTH) return expression;
  let expanded = expression;
  let changed = false;
  for (const [name, body] of bodies) {
    const call = new RegExp(`\\b${name}\\s*\\(`, 'i');
    if (call.test(expanded)) {
      expanded += ` /*${name}*/ ${body}`;
      changed = true;
    }
  }
  return changed ? inlineFunctions(expanded, bodies, depth + 1) : expanded;
}

function isCorrelated(expression) {
  return TENANT_CORRELATORS.some((re) => re.test(expression));
}

function usesForgeableClaim(expression) {
  if (!FORGEABLE_CLAIM_RE.test(expression)) return false;
  // `auth.jwt() ->> 'sub'` é equivalente a auth.uid() e é verificado pelo
  // banco; só as claims livres (empresa_id, role, tenant, ...) são o problema.
  return !TRUSTED_CLAIM_RE.test(expression);
}

function main() {
  if (!hasDatabase()) {
    console.warn('[rls-pii] Banco indisponível neste ambiente — verificação ignorada.');
    console.warn('[rls-pii] Defina PGHOST/PG* ou DATABASE_URL para habilitar o gate.');
    return 0;
  }

  let policyOutput;
  let functionOutput;
  try {
    policyOutput = runQuery(QUERY);
    functionOutput = runQuery(FUNCTIONS_QUERY);
  } catch (error) {
    // Distinção deliberada: banco fora do ar é ambiente, mas erro do próprio
    // SQL é defeito do gate. Tratar os dois como "passou" transformaria uma
    // consulta quebrada num selo verde permanente.
    const stderr = String(error.stderr || '');
    if (/^ERROR:/m.test(stderr)) {
      console.error('[rls-pii] A consulta de auditoria falhou — gate reprovado.');
      console.error(stderr.trim());
      return 1;
    }
    console.warn(`[rls-pii] Banco inacessível: ${error.message}`);
    return 0;
  }

  const bodies = parseRows(functionOutput, 2).map(([name, src]) => [name, src]);

  /** Reprovam o build: a PII fica de fato acessível a quem não deveria. */
  const violations = [];
  /** Não reprovam: higiene de política, sem exposição comprovada. */
  const warnings = [];
  let inspected = 0;

  for (const [tablename, policyname, cmd, roles, rawExpr] of parseRows(policyOutput, 5)) {
    if (ALLOWLIST.has(tablename)) continue;
    inspected += 1;

    const roleList = roles.split(',').map((r) => r.trim()).filter(Boolean);
    const reachesAnon = roleList.includes('anon') || roleList.includes('public');

    // INSERT não tem USING; o predicado relevante é o WITH CHECK. A expressão
    // concatenada já cobre os dois casos.
    const expanded = inlineFunctions(rawExpr, bodies);
    const correlated = isCorrelated(expanded);
    const entry = { tablename, policyname, cmd, expr: rawExpr };

    if (usesForgeableClaim(expanded)) {
      violations.push({
        ...entry,
        reason:
          'deriva o tenant de uma claim livre do JWT (auth.jwt() / request.jwt) — ' +
          'essa claim não é verificada pelo banco e é influenciável pelo próprio usuário',
      });
      continue;
    }

    if (!correlated) {
      violations.push({
        ...entry,
        reason: 'predicado não correlaciona com auth.uid() nem com o escopo de empresa',
      });
      continue;
    }

    // Predicado correlacionado + role `public`: `anon` tem auth.uid() nulo, então
    // o predicado já retorna falso e NÃO há exposição. Fica como aviso porque
    // `TO authenticated` é defesa em profundidade e evita que uma edição futura
    // do predicado transforme isso em vazamento silencioso.
    if (reachesAnon) {
      warnings.push({
        ...entry,
        reason: `atribuída à role "${roleList.join(', ')}" (inclui anon); restrinja para "authenticated"`,
      });
    }
  }

  for (const w of warnings) {
    console.warn(`[rls-pii] aviso — ${w.tablename}."${w.policyname}" (${w.cmd}): ${w.reason}`);
  }

  if (violations.length === 0) {
    console.log(
      `[rls-pii] OK — ${inspected} política(s) sobre tabelas com PII, todas correlacionadas ` +
        `(${warnings.length} aviso(s) não bloqueante(s)).`,
    );
    return 0;
  }

  console.error(
    `\n[rls-pii] ${violations.length} política(s) sobre PII sem isolamento comprovado:\n`,
  );
  for (const v of violations) {
    console.error(`  ✖ ${v.tablename}."${v.policyname}" (${v.cmd})`);
    console.error(`      ${v.reason}`);
    console.error(`      predicado: ${v.expr.trim().slice(0, 200)}`);
  }
  console.error(
    '\n  Correção: escope a política com public.pertence_a_empresa(empresa_id) ou\n' +
      '  com auth.uid(), e restrinja a role para "authenticated".\n' +
      '  Tabela de referência sem PII de pessoa? Justifique na ALLOWLIST de scripts/audit-rls-pii.mjs.\n',
  );
  return 1;
}


process.exit(main());
