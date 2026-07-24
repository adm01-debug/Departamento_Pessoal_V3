// Simulação: IRRF correto (frontend impostos.ts) vs IRRF do calcular-folha (edge, PRE-fix).
function round2(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }

const FAIXAS_INSS = [
  { limite: 1518.00, aliquota: 0.075 },
  { limite: 2793.88, aliquota: 0.09 },
  { limite: 4190.83, aliquota: 0.12 },
  { limite: 8157.41, aliquota: 0.14 },
];
const FAIXAS_IRRF = [
  { limite: 2259.20, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
];
const DEDUCAO_SIMPLIFICADA = 564.80;
const DEDUCAO_DEPENDENTE = 189.59;

function calcularINSS(salario) {
  if (salario <= 0) return 0;
  const teto = FAIXAS_INSS[FAIXAS_INSS.length - 1].limite;
  const base = Math.min(salario, teto);
  let inss = 0;
  let limiteAnterior = 0;
  for (const faixa of FAIXAS_INSS) {
    if (base > limiteAnterior) {
      const baseFaixa = Math.min(base, faixa.limite) - limiteAnterior;
      inss += baseFaixa * faixa.aliquota;
    }
    limiteAnterior = faixa.limite;
  }
  return round2(inss);
}

function faixaIRRF(base) {
  for (const f of FAIXAS_IRRF) if (base <= f.limite) return f;
  return FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
}

// CORRETO: usa o menor entre dedução legal (dependentes) e simplificada.
function calcularIRRFCorreto(baseTributavel, dependentes = 0) {
  if (baseTributavel <= 0) return 0;
  const deducaoLegal = dependentes * DEDUCAO_DEPENDENTE;
  const baseLegal = Math.max(0, baseTributavel - deducaoLegal);
  const fLegal = faixaIRRF(baseLegal);
  const irrfLegal = Math.max(0, baseLegal * fLegal.aliquota - fLegal.deducao);

  const baseSimplificada = Math.max(0, baseTributavel - DEDUCAO_SIMPLIFICADA);
  const fSimp = faixaIRRF(baseSimplificada);
  const irrfSimplificado = Math.max(0, baseSimplificada * fSimp.aliquota - fSimp.deducao);

  return round2(Math.min(irrfLegal, irrfSimplificado));
}

// EDGE ATUAL (calcular-folha/index.ts, PRE-fix): só tabela + dedução legal, dependentes=0, sem simplificada.
function calcularIRRFEdgeAtual(base) {
  if (!Number.isFinite(base) || base <= 0) return 0;
  const f = faixaIRRF(base);
  return Math.max(0, round2(base * f.aliquota - f.deducao));
}

const salarios = [];
for (let s = 1518; s <= 20000; s += 50) salarios.push(round2(s));
const dependentesOptions = [0, 1, 2, 3, 4];

let scenarios = 0;
let diverge = 0;
let overWithheldTotal = 0;
const exemplos = [];

for (const bruto of salarios) {
  const inss = calcularINSS(bruto);
  const baseTributavel = round2(bruto - inss);
  for (const dependentes of dependentesOptions) {
    scenarios++;
    const correto = calcularIRRFCorreto(baseTributavel, dependentes);
    // edge ignora dependentes e usa só a base bruto-inss (sem simplificada) — para dependentes=0 ainda diverge por não usar simplificada
    const edge = calcularIRRFEdgeAtual(baseTributavel);
    const diff = round2(edge - correto);
    if (Math.abs(diff) > 0.01) {
      diverge++;
      overWithheldTotal += diff;
      if (exemplos.length < 20 && dependentes > 0 && exemplos.filter(e => e.dependentes === dependentes).length < 4) {
        exemplos.push({ bruto, dependentes, correto, edge, diff });
      }
    }
  }
}

console.log('=== SIMULAÇÃO — IRRF calcular-folha (edge) vs impostos.ts (frontend correto) ===');
console.log(`Cenários: ${scenarios} (salário 1518..20000 passo 50 × 0-4 dependentes)`);
console.log(`Divergência: ${diverge} (${(100 * diverge / scenarios).toFixed(1)}%)`);
console.log(`Retenção a maior agregada (soma dos diffs positivos aprox.): R$ ${overWithheldTotal.toFixed(2)}`);
console.log('\n--- Exemplos ---');
for (const e of exemplos) {
  console.log(`bruto=${e.bruto} dependentes=${e.dependentes} | correto=R$${e.correto} edge=R$${e.edge} diff=R$${e.diff}`);
}
