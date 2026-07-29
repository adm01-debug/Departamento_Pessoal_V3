#!/usr/bin/env node
/**
 * Gate de CI — autorização nas Edge Functions.
 *
 * PROBLEMA QUE ESTE GATE RESOLVE
 * ------------------------------
 * Edge Functions usam SERVICE_ROLE_KEY e portanto **atravessam o RLS**.
 * Toda a separação de papéis do banco é inerte aqui. O erro recorrente é
 * tratar vínculo com a empresa como se fosse permissão:
 *
 *     user_belongs_to_empresa(...)   // "trabalha aqui?" -> true p/ estagiário
 *
 * Uma função que manipula folha, PII ou remessa bancária e se contenta com
 * esse check deixa o quadro salarial inteiro legível por qualquer pessoa
 * autenticada do tenant. Este gate falha o build nesse caso.
 *
 * Uso:  node scripts/audit-edge-authz.mjs
 * Saída: exit 0 (ok) | exit 1 (violação) | exit 2 (erro de execução)
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'supabase/functions';

/**
 * Funções que operam sobre folha, PII, dinheiro ou documentos de terceiros.
 * Para estas, vínculo com a empresa NUNCA basta: exige-se papel (RH/admin)
 * ou amarração explícita ao titular do dado.
 */
const SENSIVEIS = new Set([
  'calcular-folha', 'calcular-13-salario', 'calcular-ferias', 'calcular-provisoes',
  'calcular-rescisao', 'fechar-folha', 'reabrir-folha', 'folha-metrics',
  'gerar-holerite', 'distribuir-holerites', 'gerar-guias', 'gerar-aej',
  'exportacao', 'importacao', 'enviar-relatorio', 'enviar-esocial',
  'cnab-remessa', 'pix-lote', 'adiantamento-salarial', 'emprestimo-consignado',
  'dctfweb', 'fgts-digital', 'gerar-contrato-pdf', 'gerar-medida-disciplinar-pdf',
  'auditoria', 'backup', 'backup-automatico',
]);

/** Evidência de verificação de PAPEL (não apenas de tenant). */
const TEM_PAPEL = [
  /\brequireRh\b/, /\brequireSelfOrRh\b/, /\bpodeGerirRh\b/, /\bpodeGerirPessoas\b/,
  /pode_gerir_rh_para/, /pode_gerir_pessoas_para/,
  /\bis_admin\b/, /\bhas_role\b/,
];

/** Check que parece autorização mas é só tenant. */
const APENAS_TENANT = /user_belongs_to_empresa|from\(\s*['"]user_empresas['"]\s*\)/;

/** Exige autenticação de fato. */
const TEM_AUTH = [/auth\.getUser\s*\(/, /getClaims\s*\(/, /requireAuth\s*\(/];

function lerFuncoes() {
  if (!existsSync(DIR)) {
    console.error(`[edge-authz] diretório ausente: ${DIR}`);
    process.exit(2);
  }
  return readdirSync(DIR)
    .filter((d) => d !== '_shared' && statSync(join(DIR, d)).isDirectory())
    .filter((d) => existsSync(join(DIR, d, 'index.ts')))
    .map((d) => ({ nome: d, src: readFileSync(join(DIR, d, 'index.ts'), 'utf8') }));
}

function main() {
  const funcoes = lerFuncoes();
  const violacoes = [];
  let auditadas = 0;

  for (const { nome, src } of funcoes) {
    if (!/SERVICE_ROLE/.test(src)) continue; // sem service_role, o RLS já protege
    if (!SENSIVEIS.has(nome)) continue;
    auditadas++;

    const temAuth = TEM_AUTH.some((r) => r.test(src));
    const temPapel = TEM_PAPEL.some((r) => r.test(src));
    const soTenant = APENAS_TENANT.test(src);

    if (!temAuth) {
      violacoes.push({ nome, motivo: 'usa service_role sem autenticar o chamador' });
      continue;
    }
    if (!temPapel) {
      violacoes.push({
        nome,
        motivo: soTenant
          ? 'verifica apenas vínculo com a empresa (user_belongs_to_empresa) — isso é tenant, não papel'
          : 'não verifica papel algum (RH/admin) apesar de manipular folha, PII ou valores',
      });
    }
  }

  if (violacoes.length) {
    console.error(`\n[edge-authz] ${violacoes.length} função(ões) sensível(is) sem separação de papéis:\n`);
    for (const v of violacoes) console.error(`  ✗ ${v.nome}\n      ${v.motivo}`);
    console.error(`
  Edge Functions com service_role ATRAVESSAM o RLS: a separação de papéis
  feita no banco não vale aqui e precisa ser repetida em código.
  Use os helpers de supabase/functions/_shared/authz.ts:

      const authz = await requireRh(admin, userId, empresaId);
      if (authz.denied) return authz.denied;

  Para dado que o próprio titular pode ver (holerite, ponto):

      const authz = await requireSelfOrRh(admin, userId, donoUserId, empresaId);
`);
    process.exit(1);
  }

  console.log(`[edge-authz] OK — ${auditadas} função(ões) sensível(is) com service_role verificam papel do chamador.`);
}

try {
  main();
} catch (err) {
  console.error('[edge-authz] falha ao executar:', err?.message ?? err);
  process.exit(2);
}
