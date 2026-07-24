// Regressão pós-correção (task 7 / achado K1): reimplementa em JS puro
// (a) o motor canônico src/calculators/impostos.ts::calcularIRRF
// (b) o NOVO calcIRRF de supabase/functions/calcular-folha/index.ts (pós-fix)
// e compara os dois no mesmo grid de simulate_irrf.cjs, para confirmar
// divergência zero (objetivo da unificação da engine).

function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

const TETO_INSS = 8157.41;
const DEDUCAO_SIMPLIFICADA_IRRF = 564.8;
const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const FAIXAS_INSS = [
  { limite: 1518.0, aliquota: 0.075 },
  { limite: 2793.88, aliquota: 0.09 },
  { limite: 4190.83, aliquota: 0.12 },
  { limite: 8157.41, aliquota: 0.14 },
];
const FAIXAS_IRRF = [
  { limite: 2259.2, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.0 },
];

// ---- (a) motor canônico: src/calculators/impostos.ts ----
function calcularINSS(salarioBruto) {
  if (!(salarioBruto > 0)) return 0;
  let descontoTotal = 0;
  let baseRestante = Math.min(salarioBruto, TETO_INSS);
  for (let i = 0; i < FAIXAS_INSS.length; i++) {
    const faixa = FAIXAS_INSS[i];
    const limiteAnterior = i === 0 ? 0 : FAIXAS_INSS[i - 1].limite;
    const faixaCalculo = Math.min(baseRestante, faixa.limite - limiteAnterior);
    if (faixaCalculo <= 0) break;
    descontoTotal += faixaCalculo * faixa.aliquota;
    baseRestante -= faixaCalculo;
  }
  return round2(descontoTotal);
}

function calcularIRRFCanonico(salarioBruto, dependentes = 0) {
  if (!(salarioBruto > 0)) return 0;
  const descontoINSS = calcularINSS(salarioBruto);
  const baseCalculoLegal = salarioBruto - descontoINSS - dependentes * DEDUCAO_DEPENDENTE_IRRF;
  const baseCalculoSimplificado = salarioBruto - DEDUCAO_SIMPLIFICADA_IRRF;
  const baseCalculo = Math.max(0, Math.min(baseCalculoLegal, baseCalculoSimplificado));
  if (baseCalculo <= 0) return 0;
  let impostoTotal = 0;
  for (let i = 0; i < FAIXAS_IRRF.length; i++) {
    const faixa = FAIXAS_IRRF[i];
    const limiteAnterior = i === 0 ? 0 : FAIXAS_IRRF[i - 1].limite;
    const baseNaFaixa = Math.min(
      Math.max(0, baseCalculo - limiteAnterior),
      (faixa.limite || Infinity) - limiteAnterior
    );
    if (baseNaFaixa <= 0) break;
    impostoTotal += baseNaFaixa * faixa.aliquota;
  }
  return Math.max(0, round2(impostoTotal));
}

// ---- (b) NOVO calcIRRF do edge (calcular-folha/index.ts, pós-fix) ----
function calcINSSEdge(salario) {
  if (!Number.isFinite(salario) || salario <= 0) return 0;
  let desc = 0;
  const baseCalculo = Math.min(salario, TETO_INSS);
  let rest = baseCalculo;
  for (let i = 0; i < FAIXAS_INSS.length; i++) {
    const limAnt = i === 0 ? 0 : FAIXAS_INSS[i - 1].limite;
    const f = Math.min(rest, FAIXAS_INSS[i].limite - limAnt);
    if (f <= 0) break;
    desc += f * FAIXAS_INSS[i].aliquota;
    rest -= f;
  }
  return round2(desc);
}

function calcIRRFEdgeNovo(bruto, dependentes = 0) {
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const inss = calcINSSEdge(bruto);
  const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF;
  const baseSimplificada = bruto - DEDUCAO_SIMPLIFICADA_IRRF;
  const base = Math.max(0, Math.min(baseLegal, baseSimplificada));
  if (base <= 0) return 0;
  for (const f of FAIXAS_IRRF) {
    if (base <= f.limite) return Math.max(0, round2(base * f.aliquota - f.deducao));
  }
  return 0;
}

const salarios = [];
for (let s = 1518; s <= 20000; s += 50) salarios.push(round2(s));
const dependentesOptions = [0, 1, 2, 3, 4];

let scenarios = 0;
let diverge = 0;
const exemplos = [];

for (const bruto of salarios) {
  for (const dependentes of dependentesOptions) {
    scenarios++;
    const canonico = calcularIRRFCanonico(bruto, dependentes);
    const edge = calcIRRFEdgeNovo(bruto, dependentes);
    const diff = round2(edge - canonico);
    if (Math.abs(diff) > 0.01) {
      diverge++;
      if (exemplos.length < 10) exemplos.push({ bruto, dependentes, canonico, edge, diff });
    }
  }
}

console.log('=== VERIFICAÇÃO PÓS-CORREÇÃO — IRRF calcular-folha (edge, pós-fix) vs impostos.ts (motor canônico) ===');
console.log(`Cenários: ${scenarios} (salário 1518..20000 passo 50 × 0-4 dependentes)`);
console.log(`Divergência: ${diverge} (${((100 * diverge) / scenarios).toFixed(3)}%)`);
if (exemplos.length) {
  console.log('\n--- Exemplos de divergência ---');
  for (const e of exemplos) console.log(JSON.stringify(e));
  process.exitCode = 1;
} else {
  console.log('OK — divergência ZERO em todos os cenários simulados.');
}
