// Regressão pós-correção (task 7 / achado K1): compara os DOIS MOTORES REAIS
// do produto — src/calculators/impostos.ts::calcularIRRF (front) e
// supabase/functions/_shared/irrf.ts::calcIRRF (edge, hoje importado
// diretamente por calcular-folha/index.ts) — carregados via @swc/core
// (scripts/simulacao/_lib/ts-require.cjs), não reimplementados em JS puro.
//
// Histórico: a versão original deste script (pré-refactor) reimplementava os
// dois lados com uma tabela única (TETO_INSS=8157.41, sem seleção por ano, sem
// a redução da Lei 15.270/2025) — "divergência zero" não provava nada sobre o
// produto atual, que hoje seleciona tabela por ano-calendário e aplica a
// redução de 2026. Auditoria (sessão 2026-11-10): com tabelas 2025 fixas,
// 1700/1850 cenários de 2026-10 e 341/1850 de 2025-06 divergiam.

const path = require('path');
const { tsRequire } = require('./_lib/ts-require.cjs');
// Caminho absoluto a partir de __dirname (não do cwd): este script precisa
// rodar igual chamado como `node scripts/simulacao/verify_irrf_fix.cjs` da
// raiz do repo ou de dentro de scripts/simulacao/.
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { calcularIRRF } = tsRequire(path.join(REPO_ROOT, 'src/calculators/impostos.ts'));
const { calcIRRF } = tsRequire(path.join(REPO_ROOT, 'supabase/functions/_shared/irrf.ts'));

function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

const salarios = [];
for (let s = 1518; s <= 20000; s += 50) salarios.push(round2(s));
const dependentesOptions = [0, 1, 2, 3, 4];
const anos = [2025, 2026];

let scenarios = 0;
let diverge = 0;
const exemplos = [];

for (const ano of anos) {
  // Mês central (06) evita ambiguidade de borda de ano-fiscal; os dois
  // motores selecionam a tabela pelo mesmo ano-calendário nesse caso.
  const competencia = `${ano}-06`;
  for (const bruto of salarios) {
    for (const dependentes of dependentesOptions) {
      scenarios++;
      const front = calcularIRRF(bruto, dependentes, 0, false, ano);
      const edge = calcIRRF(bruto, dependentes, competencia, 0);
      const diff = round2(edge - front);
      if (Math.abs(diff) > 0.01) {
        diverge++;
        if (exemplos.length < 10) exemplos.push({ ano, bruto, dependentes, front, edge, diff });
      }
    }
  }
}

console.log('=== VERIFICAÇÃO — IRRF: src/calculators/impostos.ts (front) vs supabase/functions/_shared/irrf.ts (edge) ===');
console.log(`Cenários: ${scenarios} (salário 1518..20000 passo 50 × 0-4 dependentes × anos ${anos.join('/')})`);
console.log(`Divergência: ${diverge} (${((100 * diverge) / scenarios).toFixed(3)}%)`);
if (exemplos.length) {
  console.log('\n--- Exemplos de divergência ---');
  for (const e of exemplos) console.log(JSON.stringify(e));
  process.exitCode = 1;
} else {
  console.log('OK — divergência ZERO entre os dois motores reais em todos os cenários simulados.');
}
