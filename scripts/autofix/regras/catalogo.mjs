// Catálogo de regras de negócio verificáveis por máquina. Cada regra declara fonte legal, severidade e
// confiança, e um `run(ctx)` que EXECUTA os cálculos reais do sistema e compara com a referência.
// status: 'ok' | 'divergente' (o sistema contraria a norma/referência) | 'revisar' (motores divergem entre si
// ou a regra é discutível; exige decisão humana) | 'nao_verificavel'.
import { TABELAS, refINSS, refIRRF, refFGTS, refDiasAviso, consistenciaIRRF } from './referencia.mjs';

const TOL = 0.011;
const diff = (a, b) => Math.abs((a ?? NaN) - (b ?? NaN)) > TOL || Number.isNaN((a ?? NaN) - (b ?? NaN));
const brl = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));

function resultado(falhas, total, base = {}) {
  return { status: falhas.length ? 'divergente' : 'ok', resumo: `${total - falhas.length}/${total} casos conferem`, exemplos: falhas.slice(0, 6), ...base };
}

const ADMISSOES = [
  ['2025-03-10', '2026-08-20'],
  ['2020-01-02', '2026-11-15'],
  ['2024-11-01', '2026-02-28'],
  ['2023-05-31', '2026-01-31'],
  ['2025-12-01', '2026-12-20'],
];

const asyncResc = (e, p) => e.rescisaoAsync.calcularRescisao({ avisoTrabalhado: false, feriasVencidas: false, saldoFGTS: 15000, dependentes: 0, ...p });
const syncResc = (e, p) => e.rescisaoSync.calcularRescisao(p);

export const regras = [
  // ------------------------------------------------------------------ INSS
  {
    id: 'CALC-INSS-001', area: 'INSS', titulo: 'Contribuição do empregado conforme a tabela progressiva de 2026',
    fonte: TABELAS.inss2026.fonte, confianca: TABELAS.inss2026.confianca, severidade: 'critica',
    run({ eng }) {
      const falhas = [];
      const grid = [800, 1621, 1621.01, 2000, 2902.84, 3500, 4354.27, 5000, 8475.55, 12000];
      for (const b of grid) {
        const got = eng.impostos.calcularINSS(b);
        const exp = refINSS(b);
        if (diff(got, exp)) falhas.push(`bruto ${brl(b)}: sistema ${brl(got)} x norma ${brl(exp)}`);
      }
      const t = eng.tabelas;
      if (diff(t.TETO_INSS_2026, TABELAS.inss2026.teto)) falhas.push(`teto: sistema ${t.TETO_INSS_2026} x norma ${TABELAS.inss2026.teto}`);
      TABELAS.inss2026.faixas.forEach(([lim, aliq], i) => {
        const f = t.FAIXAS_INSS_2026[i];
        if (!f || diff(f.limite, lim) || Math.abs(f.aliquota - aliq) > 1e-9) falhas.push(`faixa ${i + 1}: sistema ${f?.limite}/${f?.aliquota} x norma ${lim}/${aliq}`);
      });
      return resultado(falhas, grid.length + 1 + TABELAS.inss2026.faixas.length);
    },
  },

  // ------------------------------------------------------------------ IRRF
  {
    id: 'CALC-IRRF-001', area: 'IRRF', titulo: 'Tabela progressiva mensal (faixas, parcela a deduzir, dependente, simplificado)',
    fonte: TABELAS.irrf2026.fonte, confianca: TABELAS.irrf2026.confianca, severidade: 'critica',
    acao: 'Atualizar FAIXAS_IRRF_2026, DEDUCAO_SIMPLIFICADA_IRRF_2026 e testes que fixam os valores antigos (mudança de cálculo de imposto: revisar com o DP).',
    run({ eng }) {
      const falhas = [];
      const inconsist = consistenciaIRRF();
      if (inconsist.length) return { status: 'nao_verificavel', resumo: `a referência está inconsistente: ${inconsist.join('; ')}` };
      const t = eng.tabelas;
      TABELAS.irrf2026.faixas.forEach(([lim, aliq, ded], i) => {
        const f = t.FAIXAS_IRRF_2026[i];
        if (!f) return falhas.push(`faixa ${i + 1} ausente`);
        if (Number.isFinite(lim) && diff(f.limite, lim)) falhas.push(`faixa ${i + 1} limite: sistema ${f.limite} x norma ${lim}`);
        if (Math.abs(f.aliquota - aliq) > 1e-9) falhas.push(`faixa ${i + 1} alíquota: sistema ${f.aliquota} x norma ${aliq}`);
        if (diff(f.deducao, ded)) falhas.push(`faixa ${i + 1} parcela a deduzir: sistema ${f.deducao} x norma ${ded}`);
      });
      if (diff(t.DEDUCAO_SIMPLIFICADA_IRRF_2026, TABELAS.irrf2026.descontoSimplificado)) falhas.push(`desconto simplificado: sistema ${t.DEDUCAO_SIMPLIFICADA_IRRF_2026} x norma ${TABELAS.irrf2026.descontoSimplificado}`);
      if (diff(t.DEDUCAO_DEPENDENTE_IRRF, TABELAS.irrf2026.deducaoDependente)) falhas.push(`dedução por dependente: sistema ${t.DEDUCAO_DEPENDENTE_IRRF} x norma ${TABELAS.irrf2026.deducaoDependente}`);
      return resultado(falhas, TABELAS.irrf2026.faixas.length * 3 + 2);
    },
  },
  {
    id: 'CALC-IRRF-002', area: 'IRRF', titulo: 'Isenção até R$ 5.000 e redutor até R$ 7.350 (Lei 15.270/2025)',
    fonte: TABELAS.irrf2026.fonte, confianca: TABELAS.irrf2026.confianca, severidade: 'critica',
    acao: 'Implementar o redutor em calcularIRRF (src/calculators/impostos.ts) com testes; mudança de cálculo de imposto, exige revisão humana.',
    run({ eng }) {
      const grid = [2500, 3000, 4000, 4664.68, 5000, 5300, 5583, 6000, 7000, 7350, 9000];
      const falhas = [];
      let maxDelta = 0;
      for (const b of grid) {
        const got = eng.impostos.calcularIRRF(b, 0, 0);
        const exp = refIRRF({ bruto: b, inss: refINSS(b) });
        if (diff(got, exp)) {
          falhas.push(`bruto ${brl(b)}: sistema retém ${brl(got)} x devido ${brl(exp)} (${got > exp ? 'RETENÇÃO A MAIOR' : 'retenção a menor'} de ${brl(Math.abs(got - exp))})`);
          maxDelta = Math.max(maxDelta, Math.abs(got - exp));
        }
      }
      return resultado(falhas, grid.length, { impactoMaximoMensal: maxDelta });
    },
  },

  // ------------------------------------------------------------------ FGTS
  {
    id: 'CALC-FGTS-001', area: 'FGTS', titulo: 'Depósito de 8% sobre a remuneração',
    fonte: TABELAS.fgts.fonte, confianca: 'alta', severidade: 'alta',
    run({ eng }) {
      const grid = [1621, 2500.55, 5000, 8475.55, 15000];
      const falhas = grid.filter((b) => diff(eng.impostos.calcularFGTS(b), refFGTS(b))).map((b) => `bruto ${brl(b)}: sistema ${brl(eng.impostos.calcularFGTS(b))} x ${brl(refFGTS(b))}`);
      return resultado(falhas, grid.length);
    },
  },

  // ------------------------------------------------------------------ Rescisão
  {
    id: 'CALC-RESC-001', area: 'Rescisão', titulo: 'Aviso prévio proporcional: 30 dias + 3 por ano completo, máx. 90',
    fonte: TABELAS.avisoPrevio.fonte, confianca: 'alta', severidade: 'critica',
    acao: 'Calcular anos completos por calendário (anos/meses/dias), não por divisão por 365,25 dias.',
    async run({ eng }) {
      const falhas = [];
      let total = 0;
      const casos = [];
      for (let anos = 0; anos <= 22; anos++) {
        casos.push({ adm: `${2026 - anos}-06-15`, desl: '2026-06-15', anos }); // aniversário exato
        if (anos >= 1) casos.push({ adm: `${2026 - anos}-06-15`, desl: '2026-06-14', anos: anos - 1 }); // véspera
      }
      for (const c of casos) {
        total += 2;
        const exp = refDiasAviso(c.anos);
        const a = await asyncResc(eng, { salario: 3000, dataAdmissao: c.adm, dataDesligamento: c.desl, tipo: 'sem_justa_causa' });
        if (a.diasAviso !== exp) falhas.push(`[utils/rescisaoCalc] adm ${c.adm} desl ${c.desl}: ${a.diasAviso} dias x ${exp} (${c.anos} anos completos)`);
        const s = syncResc(eng, { salarioBase: 3000, dataAdmissao: c.adm, dataDesligamento: c.desl, tipoRescisao: 'sem_justa_causa' });
        if (s.diasAvisoPrevio !== exp) falhas.push(`[calculators/rescisao] adm ${c.adm} desl ${c.desl}: ${s.diasAvisoPrevio} dias x ${exp} (${c.anos} anos completos)`);
      }
      return resultado(falhas, total);
    },
  },
  {
    id: 'CALC-RESC-002', area: 'Rescisão', titulo: 'Férias vencidas são devidas em qualquer modalidade, inclusive justa causa',
    fonte: 'CLT art. 146 (caput) e Súmula 171 TST (só as proporcionais são excluídas na justa causa)', confianca: 'alta', severidade: 'alta',
    acao: 'Não zerar feriasVencidas (nem o 1/3) quando tipo = justa_causa em src/utils/rescisaoCalc.ts.',
    async run({ eng }) {
      const falhas = [];
      const a = await asyncResc(eng, { salario: 3000, dataAdmissao: '2023-02-01', dataDesligamento: '2026-06-10', tipo: 'justa_causa', feriasVencidas: true });
      if (diff(a.feriasVencidas, 3000)) falhas.push(`[utils/rescisaoCalc] justa causa com férias vencidas: paga ${brl(a.feriasVencidas)} x devido 3000.00`);
      const s = syncResc(eng, { salarioBase: 3000, dataAdmissao: '2023-02-01', dataDesligamento: '2026-06-10', tipoRescisao: 'com_justa_causa', feriasVencidas: true });
      if (diff(s.feriasVencidas, 3000)) falhas.push(`[calculators/rescisao] justa causa com férias vencidas: paga ${brl(s.feriasVencidas)} x devido 3000.00`);
      return resultado(falhas, 2);
    },
  },
  {
    id: 'CALC-RESC-003', area: 'Rescisão', titulo: 'Justa causa e pedido de demissão: sem aviso indenizado nem multa do FGTS; justa causa sem 13º/férias proporcionais',
    fonte: 'CLT arts. 482, 487; Lei 4.090/62 art. 3º; Súmula 171 TST', confianca: 'alta', severidade: 'alta',
    async run({ eng }) {
      const falhas = [];
      const base = { salario: 3000, dataAdmissao: '2024-03-10', dataDesligamento: '2026-08-20' };
      const j = await asyncResc(eng, { ...base, tipo: 'justa_causa' });
      for (const [k, v] of Object.entries({ avisoIndenizado: j.avisoIndenizado, multaFGTS: j.multaFGTS, decimoTerceiro: j.decimoTerceiro, feriasProporcionais: j.feriasProporcionais })) if (v !== 0) falhas.push(`[utils] justa causa: ${k} = ${brl(v)} (esperado 0)`);
      const p = await asyncResc(eng, { ...base, tipo: 'pedido_demissao' });
      if (p.avisoIndenizado !== 0 || p.multaFGTS !== 0) falhas.push(`[utils] pedido de demissão: aviso ${brl(p.avisoIndenizado)} / multa ${brl(p.multaFGTS)} (esperado 0)`);
      if (!(p.decimoTerceiro > 0)) falhas.push('[utils] pedido de demissão: 13º proporcional não calculado');
      const sj = syncResc(eng, { salarioBase: 3000, dataAdmissao: base.dataAdmissao, dataDesligamento: base.dataDesligamento, tipoRescisao: 'com_justa_causa', saldoFGTS: 15000 });
      for (const [k, v] of Object.entries({ avisoPrevio: sj.avisoPrevio, multaFGTS: sj.multaFGTS, decimo13Proporcional: sj.decimo13Proporcional, feriasProporcional: sj.feriasProporcional })) if (v !== 0) falhas.push(`[calculators] justa causa: ${k} = ${brl(v)} (esperado 0)`);
      return resultado(falhas, 11);
    },
  },
  {
    id: 'CALC-RESC-004', area: 'Rescisão', titulo: 'Multa do FGTS: 40% (sem justa causa) e 20% (acordo, art. 484-A); aviso do acordo pela metade',
    fonte: `${TABELAS.fgts.fonte}`, confianca: 'alta', severidade: 'alta',
    async run({ eng }) {
      const falhas = [];
      const base = { salario: 4000, dataAdmissao: '2022-04-10', dataDesligamento: '2026-09-18', saldoFGTS: 20000 };
      const sjc = await asyncResc(eng, { ...base, tipo: 'sem_justa_causa' });
      const esp40 = Math.trunc((20000 + sjc.fgtsRescisao) * 0.4 * 100) / 100;
      if (diff(sjc.multaFGTS, esp40)) falhas.push(`[utils] sem justa causa: multa ${brl(sjc.multaFGTS)} x 40% de (saldo+depósito da rescisão) ${brl(esp40)}`);
      const ac = await asyncResc(eng, { ...base, tipo: 'acordo_mutuo' });
      const esp20 = Math.trunc((20000 + ac.fgtsRescisao) * 0.2 * 100) / 100;
      if (diff(ac.multaFGTS, esp20)) falhas.push(`[utils] acordo: multa ${brl(ac.multaFGTS)} x 20% ${brl(esp20)}`);
      const aviso30 = Math.trunc((4000 / 30) * ac.diasAviso * 0.5 * 100) / 100;
      if (diff(ac.avisoIndenizado, aviso30)) falhas.push(`[utils] acordo: aviso indenizado ${brl(ac.avisoIndenizado)} x 50% ${brl(aviso30)}`);
      const s = syncResc(eng, { salarioBase: 4000, dataAdmissao: base.dataAdmissao, dataDesligamento: base.dataDesligamento, tipoRescisao: 'sem_justa_causa', saldoFGTS: 20000 });
      if (diff(s.multaFGTS, 8000)) falhas.push(`[calculators] sem justa causa: multa ${brl(s.multaFGTS)} x 40% de 20000 = 8000.00`);
      return resultado(falhas, 4);
    },
  },
  {
    id: 'CALC-RESC-005', area: 'Rescisão', titulo: 'Os dois motores de rescisão devem produzir o mesmo resultado',
    fonte: 'Consistência interna (src/utils/rescisaoCalc.ts x src/calculators/rescisao.ts)', confianca: 'alta', severidade: 'alta',
    acao: 'Eleger um motor canônico e fazer o outro delegar a ele; decidir caso a caso quem está certo (ver divergências por campo).',
    async run({ eng }) {
      const mapa = { sem_justa_causa: 'sem_justa_causa', justa_causa: 'com_justa_causa', pedido_demissao: 'pedido_demissao', acordo_mutuo: 'acordo_mutuo' };
      const campos = [
        ['saldoSalario', 'saldoSalario'], ['aviso', (a) => a.avisoIndenizado, (s) => s.avisoPrevio],
        ['feriasProporcionais', 'feriasProporcionais', 'feriasProporcional'], ['feriasVencidas', 'feriasVencidas'],
        ['tercoFerias', (a) => a.tercoFerias, (s) => s.tercoFeriasProporcional + s.tercoFeriasVencidas],
        ['decimoTerceiro', 'decimoTerceiro', 'decimo13Proporcional'], ['multaFGTS', 'multaFGTS'],
        ['inss', 'inss'], ['irrf', 'irrf'],
        ['liquido (sem multa)', (a) => a.totalLiquido - a.multaFGTS, (s) => s.totalLiquido],
      ];
      const porCampo = new Map();
      let cenarios = 0;
      for (const tipo of Object.keys(mapa)) for (const salario of [2500, 5000]) for (const [adm, desl] of ADMISSOES) for (const fv of [false, true]) {
        cenarios++;
        const a = await asyncResc(eng, { salario, dataAdmissao: adm, dataDesligamento: desl, tipo, feriasVencidas: fv });
        const s = syncResc(eng, { salarioBase: salario, dataAdmissao: adm, dataDesligamento: desl, tipoRescisao: mapa[tipo], saldoFGTS: 15000, feriasVencidas: fv });
        for (const [nome, fa, fs = fa] of campos) {
          const va = typeof fa === 'function' ? fa(a) : a[fa];
          const vs = typeof fs === 'function' ? fs(s) : s[fs];
          if (diff(va, vs)) {
            const e = porCampo.get(nome) ?? { n: 0, ex: [] };
            e.n++;
            if (e.ex.length < 2) e.ex.push(`${tipo} sal ${salario} ${adm}→${desl} férias vencidas=${fv}: utils ${brl(va)} x calculators ${brl(vs)}`);
            porCampo.set(nome, e);
          }
        }
      }
      const exemplos = [...porCampo].map(([nome, e]) => `${nome}: diverge em ${e.n}/${cenarios} cenários — ${e.ex[0]}`);
      return { status: exemplos.length ? 'revisar' : 'ok', resumo: `${porCampo.size} de ${campos.length} campos divergem entre os motores (${cenarios} cenários)`, exemplos };
    },
  },

  // ------------------------------------------------------------------ Férias, 13º, horas extras
  {
    id: 'CALC-FER-001', area: 'Férias', titulo: 'Férias: 1/3 constitucional; abono pecuniário de até 10 dias com 1/3',
    fonte: 'CF art. 7º XVII; CLT arts. 143 e 130', confianca: 'alta', severidade: 'alta',
    run({ eng }) {
      const falhas = [];
      const f = eng.beneficios.calcularFerias(3000, 20, 10, 0);
      const exp = { valorFerias: 2000, tercoConstitucional: 666.66, valorAbono: 1000, tercoAbono: 333.33 };
      for (const [k, v] of Object.entries(exp)) if (diff(f[k], v)) falhas.push(`${k}: sistema ${brl(f[k])} x ${brl(v)}`);
      const w = eng.calculoFerias.calcular({ salarioBase: 3000, diasFerias: 20, diasAbono: 15 });
      if (diff(w.valorAbono, 1000)) falhas.push(`abono limitado a 10 dias: sistema ${brl(w.valorAbono)} x 1000.00`);
      return resultado(falhas, 5);
    },
  },
  {
    id: 'CALC-13-001', area: '13º', titulo: '13º: 1ª parcela = 50% sem descontos; 2ª parcela com INSS/IRRF sobre o total',
    fonte: 'Lei 4.090/62; Lei 4.749/65', confianca: 'alta', severidade: 'alta',
    run({ eng }) {
      const falhas = [];
      const p1 = eng.beneficios.calcularDecimo13({ salarioBase: 3000, mesesTrabalhados: 12, parcela: 1 });
      if (diff(p1.bruto, 1500) || p1.inss !== 0 || p1.irrf !== 0) falhas.push(`1ª parcela: bruto ${brl(p1.bruto)} inss ${p1.inss} irrf ${p1.irrf} x 1500.00 sem descontos`);
      const p2 = eng.beneficios.calcularDecimo13({ salarioBase: 3000, mesesTrabalhados: 12, parcela: 2 });
      const inssEsp = refINSS(3000);
      if (diff(p2.inss, inssEsp)) falhas.push(`2ª parcela: INSS sobre o 13º total ${brl(p2.inss)} x ${brl(inssEsp)}`);
      if (diff(eng.base.calcular13Salario(3000, 6, 2), 1500)) falhas.push('calcular13Salario(3000, 6 meses) != 1500.00');
      return resultado(falhas, 4);
    },
  },
  {
    id: 'CALC-HE-001', area: 'Horas extras', titulo: 'Horas extras 50%/100% e DSR; as duas implementações devem concordar',
    fonte: 'CF art. 7º XVI; CLT art. 59; Lei 605/49 (DSR)', confianca: 'alta', severidade: 'media',
    run({ eng }) {
      const falhas = [];
      const he50 = eng.base.calcularHorasExtras(3000, 220, 10, 0.5);
      const exp = Math.trunc((3000 / 220) * 1.5 * 10 * 100) / 100;
      if (diff(he50, exp)) falhas.push(`HE 50%: ${brl(he50)} x ${brl(exp)}`);
      const alt = eng.beneficios.calcularHorasExtras(3000, 10, 5, 220);
      const he100 = eng.base.calcularHorasExtras(3000, 220, 5, 1.0);
      if (diff(alt.valor100, he100)) falhas.push(`HE 100%: beneficios ${brl(alt.valor100)} x trabalhista-base ${brl(he100)}`);
      const dsr = eng.base.calcularDSR(1000, 26, 4);
      if (diff(dsr, Math.trunc((1000 / 26) * 4 * 100) / 100)) falhas.push(`DSR: ${brl(dsr)}`);
      return resultado(falhas, 3);
    },
  },
];
