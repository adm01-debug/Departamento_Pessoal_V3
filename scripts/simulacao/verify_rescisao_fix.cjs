// Regressão pós-correção (task 7 / achados K2-K4, H(K)4): reimplementa em JS puro
// (a) o motor canônico src/utils/rescisaoCalc.ts (usado pelo botão "Calcular Local")
// (b) o NOVO cálculo de supabase/functions/calcular-rescisao/index.ts (pós-fix)
// e compara os dois em lote, no mesmo grid de cenários de simulate_rescisao.cjs,
// para confirmar divergência zero (objetivo da unificação da engine).

function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

const TETO_INSS = 8157.41;
const DEDUCAO_SIMPLIFICADA_IRRF = 564.8;
const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const FAIXAS_INSS = [
  { l: 1518.0, a: 0.075 },
  { l: 2793.88, a: 0.09 },
  { l: 4190.83, a: 0.12 },
  { l: 8157.41, a: 0.14 },
];
const FAIXAS_IRRF = [
  { l: 2259.2, a: 0, d: 0 },
  { l: 2826.65, a: 0.075, d: 169.44 },
  { l: 3751.05, a: 0.15, d: 381.44 },
  { l: 4664.68, a: 0.225, d: 662.77 },
  { l: Infinity, a: 0.275, d: 896.0 },
];

function calcINSS(sal) {
  if (!Number.isFinite(sal) || sal <= 0) return 0;
  const base = Math.min(sal, TETO_INSS);
  let desc = 0,
    rest = base;
  for (let i = 0; i < FAIXAS_INSS.length; i++) {
    const la = i === 0 ? 0 : FAIXAS_INSS[i - 1].l;
    const f = Math.min(rest, FAIXAS_INSS[i].l - la);
    if (f <= 0) break;
    desc += f * FAIXAS_INSS[i].a;
    rest -= f;
  }
  return round2(desc);
}

function calcIRRF(bruto, dependentes = 0) {
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const inss = calcINSS(bruto);
  const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE_IRRF;
  const baseSimplificada = bruto - DEDUCAO_SIMPLIFICADA_IRRF;
  const base = Math.max(0, Math.min(baseLegal, baseSimplificada));
  if (base <= 0) return 0;
  for (const f of FAIXAS_IRRF) {
    if (base <= f.l) return Math.max(0, round2(base * f.a - f.d));
  }
  return 0;
}

// ---- (a) motor canônico: src/utils/rescisaoCalc.ts ----
function calcularAvosCanonico(inicio, fim) {
  if (fim < inicio) return 0;
  let meses = (fim.getFullYear() - inicio.getFullYear()) * 12;
  meses += fim.getMonth() - inicio.getMonth();
  const diaInicio = inicio.getDate();
  const diaFim = fim.getDate();
  if (diaFim < diaInicio - 1) meses--;
  const dataReferencia = new Date(inicio.getFullYear(), inicio.getMonth() + meses, inicio.getDate());
  const diffTime = fim.getTime() - dataReferencia.getTime();
  const diasRestantes = Math.floor(diffTime / 86400000);
  return diasRestantes >= 15 ? meses + 1 : meses;
}

function rescisaoCanonica({
  salario,
  admissao,
  desligamento,
  tipo,
  avisoTrabalhado,
  feriasVencidas,
  saldoFGTS,
  dependentes = 0,
}) {
  const diasNoMes = new Date(desligamento.getFullYear(), desligamento.getMonth() + 1, 0).getDate();
  const diasTrabalhados = desligamento.getDate();
  const saldoSalario = round2((salario / diasNoMes) * diasTrabalhados);

  const diffAnos = Math.floor((desligamento.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const diasAviso = Math.min(90, 30 + Math.max(0, diffAnos) * 3);

  const dataFimProjetada = new Date(desligamento);
  if (tipo === 'sem_justa_causa' || tipo === 'acordo_mutuo') {
    dataFimProjetada.setDate(dataFimProjetada.getDate() + diasAviso);
  }

  let avisoIndenizado = 0;
  if (tipo === 'sem_justa_causa' && !avisoTrabalhado) {
    avisoIndenizado = round2((salario / 30) * diasAviso);
  } else if (tipo === 'acordo_mutuo' && !avisoTrabalhado) {
    avisoIndenizado = round2((salario / 30) * (diasAviso / 2));
  }

  const mesesFerias = calcularAvosCanonico(admissao, dataFimProjetada);
  let feriasProporcionaisVal = 0;
  if (tipo !== 'justa_causa') {
    feriasProporcionaisVal = round2((salario / 12) * (mesesFerias % 12 || (mesesFerias > 0 ? 12 : 0)));
  }
  const feriasVencidasVal = feriasVencidas && tipo !== 'justa_causa' ? salario : 0;
  const tercoFerias = round2((feriasProporcionaisVal + feriasVencidasVal) / 3);

  const inicioAno = new Date(desligamento.getFullYear(), 0, 1);
  const dataBase13 = admissao > inicioAno ? admissao : inicioAno;
  const meses13 = calcularAvosCanonico(dataBase13, dataFimProjetada);
  let decimoTerceiro = 0;
  if (tipo !== 'justa_causa' && tipo !== 'culpa_reciproca') {
    decimoTerceiro = round2((salario / 12) * meses13);
  } else if (tipo === 'culpa_reciproca') {
    decimoTerceiro = round2(((salario / 12) * meses13) / 2);
  }

  const fgtsRescisao = round2((saldoSalario + avisoIndenizado + decimoTerceiro) * 0.08);
  let multaFGTS = 0;
  if (tipo === 'sem_justa_causa') {
    multaFGTS = round2((saldoFGTS + fgtsRescisao) * 0.4);
  } else if (tipo === 'acordo_mutuo') {
    multaFGTS = round2((saldoFGTS + fgtsRescisao) * 0.2);
  }

  const totalProventos = round2(
    saldoSalario + avisoIndenizado + feriasVencidasVal + feriasProporcionaisVal + tercoFerias + decimoTerceiro
  );
  const inssSaldo = calcINSS(saldoSalario);
  const inss13 = calcINSS(decimoTerceiro);
  const inss = round2(inssSaldo + inss13);
  const irrfSaldo = calcIRRF(saldoSalario, dependentes);
  const irrf13 = calcIRRF(decimoTerceiro, 0);
  const irrf = round2(irrfSaldo + irrf13);
  const totalDescontos = round2(inss + irrf);
  const totalLiquido = round2(totalProventos - totalDescontos + multaFGTS);

  return {
    saldoSalario,
    avisoIndenizado,
    feriasVencidas: feriasVencidasVal,
    feriasProporcionais: feriasProporcionaisVal,
    tercoFerias,
    decimoTerceiro,
    multaFGTS,
    fgtsRescisao,
    totalProventos,
    inss,
    irrf,
    totalDescontos,
    totalLiquido,
    diasTrabalhados,
    mesesFerias,
    meses13,
    diasAviso,
  };
}

// ---- (b) NOVO cálculo do edge (pós-fix) — espelha supabase/functions/calcular-rescisao/index.ts ----
function rescisaoEdgeNovo({
  salario_base,
  data_admissao,
  data_desligamento,
  tipo_rescisao,
  aviso_previo,
  saldo_fgts,
  ferias_vencidas,
  dependentes_irrf,
}) {
  const adm = new Date(data_admissao);
  const desl = new Date(data_desligamento);
  const tipo = tipo_rescisao === 'com_justa_causa' ? 'justa_causa' : tipo_rescisao;

  const diasNoMes = new Date(desl.getFullYear(), desl.getMonth() + 1, 0).getDate();
  const diasTrabalhados = desl.getDate();
  const saldoSalario = round2((salario_base / diasNoMes) * diasTrabalhados);

  const diffAnos = Math.floor((desl.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const diasAviso = Math.min(90, 30 + Math.max(0, diffAnos) * 3);

  const dataFimProjetada = new Date(desl);
  if (tipo === 'sem_justa_causa' || tipo === 'acordo_mutuo') {
    dataFimProjetada.setDate(dataFimProjetada.getDate() + diasAviso);
  }

  let avisoIndenizado = 0;
  if (tipo === 'sem_justa_causa' && aviso_previo !== 'trabalhado') {
    avisoIndenizado = round2((salario_base / 30) * diasAviso);
  } else if (tipo === 'acordo_mutuo' && aviso_previo !== 'trabalhado') {
    avisoIndenizado = round2((salario_base / 30) * (diasAviso / 2));
  }

  const mesesFerias = calcularAvosCanonico(adm, dataFimProjetada);
  let feriasProporcional = 0;
  if (tipo !== 'justa_causa') {
    feriasProporcional = round2((salario_base / 12) * (mesesFerias % 12 || (mesesFerias > 0 ? 12 : 0)));
  }
  const feriasVencidasValor = ferias_vencidas && tipo !== 'justa_causa' ? salario_base : 0;
  const tercoFerias = round2((feriasProporcional + feriasVencidasValor) / 3);

  const inicioAno = new Date(desl.getFullYear(), 0, 1);
  const dataBase13 = adm > inicioAno ? adm : inicioAno;
  const meses13 = calcularAvosCanonico(dataBase13, dataFimProjetada);
  let decimoTerceiro = 0;
  if (tipo !== 'justa_causa' && tipo !== 'culpa_reciproca') {
    decimoTerceiro = round2((salario_base / 12) * meses13);
  } else if (tipo === 'culpa_reciproca') {
    decimoTerceiro = round2(((salario_base / 12) * meses13) / 2);
  }

  const fgtsRescisao = round2((saldoSalario + avisoIndenizado + decimoTerceiro) * 0.08);
  let multaFGTS = 0;
  if (tipo === 'sem_justa_causa') {
    multaFGTS = round2((saldo_fgts + fgtsRescisao) * 0.4);
  } else if (tipo === 'acordo_mutuo') {
    multaFGTS = round2((saldo_fgts + fgtsRescisao) * 0.2);
  }

  const totalProventos = round2(
    saldoSalario + avisoIndenizado + feriasVencidasValor + feriasProporcional + tercoFerias + decimoTerceiro
  );
  const inss = round2(calcINSS(saldoSalario) + calcINSS(decimoTerceiro));
  const irrf = round2(calcIRRF(saldoSalario, dependentes_irrf) + calcIRRF(decimoTerceiro, 0));
  const totalDescontos = round2(inss + irrf);
  const totalLiquido = round2(totalProventos - totalDescontos + multaFGTS);

  return {
    saldoSalario,
    avisoIndenizado,
    feriasVencidas: feriasVencidasValor,
    feriasProporcionais: feriasProporcional,
    tercoFerias,
    decimoTerceiro,
    multaFGTS,
    fgtsRescisao,
    totalProventos,
    inss,
    irrf,
    totalDescontos,
    totalLiquido,
    diasTrabalhados,
    mesesFerias,
    meses13,
    diasAviso,
  };
}

// ---- Grid de cenários (mesmo espírito de simulate_rescisao.cjs, ampliado com aviso/férias/dependentes) ----
const salarios = [1518, 2000, 2793.88, 3500, 5000, 8157.41, 12000, 20000];
const tipos = [
  'sem_justa_causa',
  'pedido_demissao',
  'justa_causa',
  'acordo_mutuo',
  'culpa_reciproca',
  'termino_contrato',
];
const admissoesBase = [
  '2020-01-10',
  '2021-06-15',
  '2022-02-01',
  '2023-11-20',
  '2024-03-05',
  '2025-01-01',
  '2025-07-16',
  '2026-01-02',
  '2026-06-01',
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

let scenarios = 0;
const CAMPOS = [
  'saldoSalario',
  'avisoIndenizado',
  'feriasVencidas',
  'feriasProporcionais',
  'tercoFerias',
  'decimoTerceiro',
  'multaFGTS',
  'fgtsRescisao',
  'totalProventos',
  'inss',
  'irrf',
  'totalDescontos',
  'totalLiquido',
];
const divergencias = Object.fromEntries(CAMPOS.map((c) => [c, 0]));
let cenariosComDivergencia = 0;
const exemplos = [];

for (const salario of salarios) {
  for (const tipo of tipos) {
    for (const admStr of admissoesBase) {
      const admissao = new Date(admStr);
      for (const desligamento of desligamentosBase) {
        if (desligamento <= admissao) continue;
        for (const avisoTrabalhado of avisoTrabalhadoOpts) {
          for (const feriasVencidas of feriasVencidasOpts) {
            for (const dependentes of dependentesOpts) {
              scenarios++;
              const saldoFGTS = round2(salario * 3.2);
              const canonico = rescisaoCanonica({
                salario,
                admissao,
                desligamento,
                tipo,
                avisoTrabalhado,
                feriasVencidas,
                saldoFGTS,
                dependentes,
              });
              const edge = rescisaoEdgeNovo({
                salario_base: salario,
                data_admissao: admStr,
                data_desligamento: desligamento.toISOString().slice(0, 10),
                tipo_rescisao: tipo,
                aviso_previo: avisoTrabalhado ? 'trabalhado' : 'indenizado',
                saldo_fgts: saldoFGTS,
                ferias_vencidas: feriasVencidas,
                dependentes_irrf: dependentes,
              });

              let divergiu = false;
              for (const campo of CAMPOS) {
                const diff = Math.abs((edge[campo] ?? 0) - (canonico[campo] ?? 0));
                if (diff > 0.01) {
                  divergencias[campo]++;
                  divergiu = true;
                  if (exemplos.length < 10) {
                    exemplos.push({
                      salario,
                      tipo,
                      admStr,
                      desl: desligamento.toISOString().slice(0, 10),
                      avisoTrabalhado,
                      feriasVencidas,
                      dependentes,
                      campo,
                      canonico: canonico[campo],
                      edge: edge[campo],
                    });
                  }
                }
              }
              if (divergiu) cenariosComDivergencia++;
            }
          }
        }
      }
    }
  }
}

console.log(
  '=== VERIFICAÇÃO PÓS-CORREÇÃO — calcular-rescisao (edge, pós-fix) vs utils/rescisaoCalc.ts (motor canônico) ==='
);
console.log(`Cenários simulados: ${scenarios}`);
console.log(
  `Cenários com QUALQUER divergência (>R$0,01): ${cenariosComDivergencia} (${((100 * cenariosComDivergencia) / scenarios).toFixed(3)}%)`
);
console.log('Divergências por campo:');
for (const campo of CAMPOS) {
  console.log(`  ${campo}: ${divergencias[campo]}`);
}
if (exemplos.length) {
  console.log('\n--- Exemplos de divergência ---');
  for (const e of exemplos) console.log(JSON.stringify(e));
  process.exitCode = 1;
} else {
  console.log('\nOK — divergência ZERO em todos os campos, em todos os cenários simulados.');
}
