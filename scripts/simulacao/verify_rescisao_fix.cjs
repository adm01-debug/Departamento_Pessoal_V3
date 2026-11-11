// Regressão pós-correção (task 7 / achados K2-K4): compara os DOIS MOTORES
// REAIS do produto — src/utils/rescisaoCalc.ts::calcularRescisaoCore (front,
// fonte de verdade) e supabase/functions/calcular-rescisao/motor.ts::
// calcularRescisaoMotor (edge, espelho Deno portado manualmente — ver
// cabeçalho de motor.ts) — carregados via @swc/core (ts-require.cjs), não
// reimplementados em JS puro.
//
// Histórico: a versão original deste script reimplementava os dois lados à
// mão (INSS/IRRF com tabela 2025 fixa, sem art. 479/480/487§2º/477§8º/seguro-
// desemprego) — "divergência zero" só provava que as duas cópias concordavam
// entre si, não que espelhavam o produto. O front real importa
// @/calculators/auditHelper (assinatura de auditoria), que arrasta o cliente
// Supabase (exige env do Vite) — por isso o stub abaixo substitui só essa
// dependência periférica, nunca a lógica de cálculo sob teste.

process.env.TZ = 'UTC';

const path = require('path');
const { tsRequire } = require('./_lib/ts-require.cjs');
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const auditHelperPath = path.resolve(REPO_ROOT, 'src/calculators/auditHelper.ts');
const stubs = { [auditHelperPath]: { signCalculation: async () => 'stub-simulacao' } };

const { calcularRescisaoCore } = tsRequire(path.join(REPO_ROOT, 'src/utils/rescisaoCalc.ts'), stubs);
const { calcularRescisaoMotor } = tsRequire(path.join(REPO_ROOT, 'supabase/functions/calcular-rescisao/motor.ts'));

function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

// ---- Grid base (mesmo espírito de simulate_rescisao.cjs) ----
const salarios = [1518, 2000, 2793.88, 3500, 5000, 8157.41, 12000, 20000];
const tipos = ['sem_justa_causa', 'pedido_demissao', 'justa_causa', 'acordo_mutuo', 'culpa_reciproca'];
const admissoesBase = [
  '2020-01-10', '2021-06-15', '2022-02-01', '2023-11-20', '2024-03-05',
  '2025-01-01', '2025-07-16', '2026-01-02', '2026-06-01',
];
const desligamentosBase = [];
for (let m = 0; m < 12; m++) {
  for (const d of [1, 10, 14, 15, 16, 28]) {
    desligamentosBase.push(new Date(2026, m, d));
  }
}
const avisoTrabalhadoOpts = [false, true];
const feriasVencidasOpts = [false, true];
const dependentesOpts = [0, 2];

const CAMPOS = [
  'saldoSalario', 'avisoIndenizado', 'descontoAvisoPrevio', 'feriasVencidas',
  'feriasProporcionais', 'tercoFerias', 'decimoTerceiro', 'indenizacaoArt479',
  'indenizacaoArt480', 'multa477', 'multaFGTS', 'fgtsRescisao',
  'fgtsSaquePercentual', 'totalProventos', 'inss', 'irrf', 'totalDescontos',
  'totalLiquido', 'saldoDevedor', 'diasTrabalhados', 'mesesFerias', 'meses13',
  'diasAviso', 'diasAvisoNaoCumpridos',
];
const CAMPOS_SEGURO = ['elegivel', 'parcelas', 'valorParcela'];

let scenarios = 0;
let cenariosComDivergencia = 0;
const divergencias = Object.fromEntries([...CAMPOS, ...CAMPOS_SEGURO.map((c) => `seguroDesemprego.${c}`)].map((c) => [c, 0]));
const exemplos = [];

// mapFront=true: constrói os params no formato de RescisaoParams (campo
// `salario`); mapFront=false: no formato de RescisaoMotorParams (`salarioBase`).
function compararCenario(paramsBase) {
  scenarios++;
  let frontRes, edgeRes, frontErr, edgeErr;
  try {
    frontRes = calcularRescisaoCore({ ...paramsBase, salario: paramsBase.salario });
  } catch (e) {
    frontErr = e.message;
  }
  try {
    edgeRes = calcularRescisaoMotor({ ...paramsBase, salarioBase: paramsBase.salario });
  } catch (e) {
    edgeErr = e.message;
  }

  if (frontErr || edgeErr) {
    if (frontErr !== edgeErr) {
      cenariosComDivergencia++;
      if (exemplos.length < 10) exemplos.push({ ...paramsBase, frontErr, edgeErr });
    }
    return;
  }

  let divergiu = false;
  for (const campo of CAMPOS) {
    const diff = Math.abs(round2(edgeRes[campo] ?? 0) - round2(frontRes[campo] ?? 0));
    if (diff > 0.01) {
      divergencias[campo]++;
      divergiu = true;
      if (exemplos.length < 10) {
        exemplos.push({ ...paramsBase, campo, front: frontRes[campo], edge: edgeRes[campo] });
      }
    }
  }
  for (const campo of CAMPOS_SEGURO) {
    const f = frontRes.seguroDesemprego?.[campo];
    const e = edgeRes.seguroDesemprego?.[campo];
    const diff = typeof f === 'number' ? Math.abs(round2(e ?? 0) - round2(f ?? 0)) : f !== e ? 1 : 0;
    if (diff > 0.01) {
      divergencias[`seguroDesemprego.${campo}`]++;
      divergiu = true;
      if (exemplos.length < 10) {
        exemplos.push({ ...paramsBase, campo: `seguroDesemprego.${campo}`, front: f, edge: e });
      }
    }
  }
  if (divergiu) cenariosComDivergencia++;
}

// ---- 1. Grid base: tipos comuns × aviso × férias vencidas × dependentes ----
for (const salario of salarios) {
  for (const tipo of tipos) {
    for (const admStr of admissoesBase) {
      const admissao = new Date(admStr);
      for (const desligamento of desligamentosBase) {
        if (desligamento <= admissao) continue;
        for (const avisoTrabalhado of avisoTrabalhadoOpts) {
          for (const feriasVencidas of feriasVencidasOpts) {
            for (const dependentes of dependentesOpts) {
              compararCenario({
                salario,
                dataAdmissao: admStr,
                dataDesligamento: desligamento.toISOString().slice(0, 10),
                tipo,
                avisoTrabalhado,
                feriasVencidas,
                saldoFGTS: round2(salario * 3.2),
                dependentes,
              });
            }
          }
        }
      }
    }
  }
}

// ---- 2. pedido_demissao com diasAvisoNaoCumpridos variável (art. 487 §2º) ----
for (const salario of [1518, 5000, 12000]) {
  for (const diasAvisoNaoCumpridos of [0, 10, 30]) {
    for (const admStr of ['2022-02-01', '2025-01-01']) {
      compararCenario({
        salario,
        dataAdmissao: admStr,
        dataDesligamento: '2026-06-15',
        tipo: 'pedido_demissao',
        avisoTrabalhado: false,
        feriasVencidas: false,
        saldoFGTS: round2(salario * 3.2),
        dependentes: 0,
        diasAvisoNaoCumpridos,
      });
    }
  }
}

// ---- 3. termino_contrato (art. 479/480) — empregador, empregado, natural ----
for (const salario of [1518, 5000, 12000]) {
  for (const terminoIniciativa of ['empregador', 'empregado', 'natural']) {
    for (const dataFimContrato of ['2026-08-01', '2026-12-31']) {
      compararCenario({
        salario,
        dataAdmissao: '2025-01-10',
        dataDesligamento: '2026-06-15',
        tipo: 'termino_contrato',
        avisoTrabalhado: true,
        feriasVencidas: false,
        saldoFGTS: round2(salario * 3.2),
        dependentes: 0,
        dataFimContrato,
        terminoIniciativa,
      });
    }
  }
}

// ---- 4. dataPagamento tardia (multa art. 477 §8º) ----
for (const salario of [1518, 5000, 12000]) {
  for (const diasAtraso of [0, 5, 11, 30]) {
    const desl = new Date(2026, 5, 15);
    const pag = new Date(desl);
    pag.setDate(pag.getDate() + diasAtraso);
    compararCenario({
      salario,
      dataAdmissao: '2024-03-05',
      dataDesligamento: desl.toISOString().slice(0, 10),
      tipo: 'sem_justa_causa',
      avisoTrabalhado: false,
      feriasVencidas: false,
      saldoFGTS: round2(salario * 3.2),
      dependentes: 0,
      dataPagamento: pag.toISOString().slice(0, 10),
    });
  }
}

console.log(
  '=== VERIFICAÇÃO — rescisão: src/utils/rescisaoCalc.ts (front, canônico) vs supabase/functions/calcular-rescisao/motor.ts (edge) ===',
);
console.log(`Cenários: ${scenarios}`);
console.log(`Cenários com QUALQUER divergência (>R$0,01): ${cenariosComDivergencia} (${((100 * cenariosComDivergencia) / scenarios).toFixed(3)}%)`);
const camposComDivergencia = Object.entries(divergencias).filter(([, n]) => n > 0);
if (camposComDivergencia.length) {
  console.log('Divergências por campo:');
  for (const [campo, n] of camposComDivergencia) console.log(`  ${campo}: ${n}`);
}
if (exemplos.length) {
  console.log('\n--- Exemplos de divergência ---');
  for (const e of exemplos) console.log(JSON.stringify(e));
  process.exitCode = 1;
} else {
  console.log('\nOK — divergência ZERO entre os dois motores reais em todos os cenários simulados.');
}
