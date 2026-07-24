// Simulação de centenas de cenários: engine correta (frontend, src/calculators/rescisao.ts)
// vs engine atual do edge (supabase/functions/calcular-rescisao/index.ts), replicadas fielmente
// aqui em JS puro para permitir comparação em lote sem depender do runtime Deno.
// Objetivo: quantificar divergências ANTES de corrigir (auditoria K2-K4).

function round2(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }

// ---- Engine CORRETA (espelha src/calculators/rescisao.ts) ----
function calcularAvosCorreto(inicio, fim) {
  if (fim < inicio) return 0;
  const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
  const dataReferencia = new Date(inicio.getFullYear(), inicio.getMonth() + meses, inicio.getDate());
  const diasRestantes = Math.floor((fim.getTime() - dataReferencia.getTime()) / 86400000);
  return diasRestantes >= 15 ? meses + 1 : meses;
}

function rescisaoCorreta({ salarioBase, admissao, desligamento, tipoRescisao }) {
  const avosTotal = calcularAvosCorreto(admissao, desligamento);
  const inicioAno = new Date(desligamento.getFullYear(), 0, 1);
  const baseInicio13 = admissao > inicioAno ? admissao : inicioAno;
  const meses13 = calcularAvosCorreto(baseInicio13, desligamento);
  const decimo13Prop = tipoRescisao !== 'com_justa_causa' ? round2((salarioBase / 12) * meses13) : 0;
  const mesesFeriasProp = avosTotal % 12 || (avosTotal > 0 ? 12 : 0);
  const feriasProp = tipoRescisao !== 'com_justa_causa' ? round2((salarioBase / 12) * mesesFeriasProp) : 0;
  return { decimo13Prop, feriasProp, meses13, mesesFeriasProp, avosTotal };
}

// ---- Engine ATUAL DO EDGE (espelha supabase/functions/calcular-rescisao/index.ts, PRE-fix) ----
function rescisaoEdgeAtual({ salarioBase, admissao, desligamento, tipoRescisao }) {
  const totalDias = Math.floor((desligamento.getTime() - admissao.getTime()) / 86400000);
  const totalMeses = Math.floor(totalDias / 30);
  const mesAtual = desligamento.getMonth() + 1;
  const podeReceber = tipoRescisao !== 'com_justa_causa' && tipoRescisao !== 'pedido_demissao';
  const d13 = podeReceber ? round2((salarioBase / 12) * mesAtual) : 0;
  const mfp = totalMeses % 12;
  const fp = podeReceber ? round2((salarioBase / 12) * mfp) : 0;
  return { decimo13Prop: d13, feriasProp: fp, mesAtual, totalMeses, mfp };
}

// ---- Geração de cenários ----
const salarios = [1518, 2000, 2793.88, 3500, 5000, 8157.41, 12000, 20000];
const tipos = ['sem_justa_causa', 'pedido_demissao', 'com_justa_causa', 'acordo_mutuo'];
const admissoesBase = [
  '2020-01-10', '2021-06-15', '2022-02-01', '2023-11-20', '2024-03-05',
  '2025-01-01', '2025-07-16', '2026-01-02', '2026-06-01',
];
// Desligamentos cobrindo virada de mês, dias 1/14/15/16/28/30/31, meses variados.
const desligamentosBase = [];
for (let m = 0; m < 12; m++) {
  for (const d of [1, 10, 14, 15, 16, 28]) {
    desligamentosBase.push(new Date(2026, m, d));
  }
}

let scenarios = 0;
let diverge13 = 0;
let divergeFerias = 0;
let impactoTotal13 = 0;
const exemplos = [];

for (const salarioBase of salarios) {
  for (const tipoRescisao of tipos) {
    for (const admStr of admissoesBase) {
      const admissao = new Date(admStr);
      for (const desligamento of desligamentosBase) {
        if (desligamento <= admissao) continue;
        scenarios++;
        const correto = rescisaoCorreta({ salarioBase, admissao, desligamento, tipoRescisao });
        const edge = rescisaoEdgeAtual({ salarioBase, admissao, desligamento, tipoRescisao });
        const diff13 = round2(edge.decimo13Prop - correto.decimo13Prop);
        const diffFerias = round2(edge.feriasProp - correto.feriasProp);
        if (Math.abs(diff13) > 0.01) {
          diverge13++;
          impactoTotal13 += Math.abs(diff13);
          if (exemplos.length < 15) {
            exemplos.push({
              salarioBase, tipoRescisao, admissao: admStr, desligamento: desligamento.toISOString().slice(0, 10),
              correto13: correto.decimo13Prop, edge13: edge.decimo13Prop, diff13,
            });
          }
        }
        if (Math.abs(diffFerias) > 0.01) divergeFerias++;
      }
    }
  }
}

console.log('=== SIMULAÇÃO DE CENÁRIOS — calcular-rescisao (edge) vs rescisao.ts (frontend correto) ===');
console.log(`Cenários simulados: ${scenarios}`);
console.log(`Divergência em 13º proporcional: ${diverge13} (${(100 * diverge13 / scenarios).toFixed(1)}%)`);
console.log(`Divergência em férias proporcionais: ${divergeFerias} (${(100 * divergeFerias / scenarios).toFixed(1)}%)`);
console.log(`Impacto monetário agregado (13º, |diff| somado): R$ ${impactoTotal13.toFixed(2)}`);
console.log('\n--- Exemplos de divergência (13º) ---');
for (const e of exemplos) {
  console.log(
    `salário=${e.salarioBase} tipo=${e.tipoRescisao} adm=${e.admissao} desl=${e.desligamento} ` +
    `| correto=R$${e.correto13} edge=R$${e.edge13} diff=R$${e.diff13}`
  );
}

// pedido_demissao: quantificar quantos cenários o edge zera indevidamente
let pedidoDemissaoZerado = 0;
let pedidoDemissaoTotal = 0;
for (const salarioBase of salarios) {
  for (const admStr of admissoesBase) {
    const admissao = new Date(admStr);
    for (const desligamento of desligamentosBase) {
      if (desligamento <= admissao) continue;
      pedidoDemissaoTotal++;
      const correto = rescisaoCorreta({ salarioBase, admissao, desligamento, tipoRescisao: 'pedido_demissao' });
      const edge = rescisaoEdgeAtual({ salarioBase, admissao, desligamento, tipoRescisao: 'pedido_demissao' });
      if (correto.decimo13Prop > 0 && edge.decimo13Prop === 0) pedidoDemissaoZerado++;
    }
  }
}
console.log(`\n--- pedido_demissao: cenários onde 13º/férias devidos foram zerados pelo edge: ${pedidoDemissaoZerado}/${pedidoDemissaoTotal} ---`);
