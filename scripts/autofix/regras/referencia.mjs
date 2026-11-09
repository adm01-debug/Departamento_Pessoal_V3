// Implementação de REFERÊNCIA das regras trabalhistas/tributárias, escrita a partir das fontes legais
// e independente do código do sistema. É o "gabarito" contra o qual o verificador compara o sistema.
//
// Cada tabela traz fonte e confiança. Atualizar uma tabela = editar ESTE arquivo (uma vez por ano).
// confianca: 'alta'  = norma oficial conferida; valores internamente consistentes.
//            'media' = confirmada em fontes secundárias (softhouses/contábeis); conferir no texto oficial.

export const TABELAS = {
  salarioMinimo2026: { valor: 1621.0, confianca: 'alta', fonte: 'Decreto do salário mínimo 2026' },

  inss2026: {
    fonte: 'Portaria Interministerial MPS/MF nº 13, de 09/01/2026',
    confianca: 'alta',
    // [limite superior da faixa, alíquota]; incidência progressiva sobre a parcela dentro de cada faixa
    faixas: [
      [1621.0, 0.075],
      [2902.84, 0.09],
      [4354.27, 0.12],
      [8475.55, 0.14],
    ],
    teto: 8475.55,
  },

  irrf2026: {
    fonte: 'Lei 15.270/2025 (vigência 01/01/2026) + tabela progressiva mensal vigente desde 05/2025',
    confianca: 'media',
    nota:
      'Tabela progressiva mantida; parcelas a deduzir são consistentes com as faixas (validado em TABELAS_CONSISTENTES). ' +
      'O redutor e a base "rendimento tributável" (bruto) vêm do exemplo da Senior/Alterdata: conferir na IN RFB.',
    // [limite superior, alíquota, parcela a deduzir]
    faixas: [
      [2428.8, 0, 0],
      [2826.65, 0.075, 182.16],
      [3751.05, 0.15, 394.16],
      [4664.68, 0.225, 675.49],
      [Infinity, 0.275, 908.73],
    ],
    deducaoDependente: 189.59,
    descontoSimplificado: 607.2, // 25% do limite de isenção (2.428,80)
    redutor: { isencaoAte: 5000.0, reducaoAte: 7350.0, a: 978.62, b: 0.133145 },
  },

  fgts: { aliquota: 0.08, multaSemJustaCausa: 0.4, multaAcordo: 0.2, fonte: 'Lei 8.036/90 art. 15 e 18; CLT art. 484-A', confianca: 'alta' },
  avisoPrevio: { base: 30, porAno: 3, maximo: 90, fonte: 'Lei 12.506/2011', confianca: 'alta' },
};

const trunc2 = (v) => Math.trunc(Math.round(v * 1e6) / 1e4) / 100;

export function refINSS(bruto) {
  if (!(bruto > 0)) return 0;
  const { faixas, teto } = TABELAS.inss2026;
  let base = Math.min(bruto, teto);
  let ant = 0;
  let total = 0;
  for (const [lim, aliq] of faixas) {
    const parte = Math.min(base, lim - ant);
    if (parte <= 0) break;
    total += parte * aliq;
    base -= parte;
    ant = lim;
  }
  return trunc2(total);
}

/** Imposto pela tabela progressiva (método da parcela a deduzir). */
export function refIRRFTabela(base) {
  if (!(base > 0)) return 0;
  for (const [lim, aliq, ded] of TABELAS.irrf2026.faixas) {
    if (base <= lim) return Math.max(0, trunc2(base * aliq - ded));
  }
  return 0;
}

export function refIRRF({ bruto, inss, dependentes = 0, outras = 0 }) {
  const t = TABELAS.irrf2026;
  const baseLegal = bruto - inss - dependentes * t.deducaoDependente - outras;
  const baseSimpl = bruto - t.descontoSimplificado;
  const base = Math.max(0, Math.min(baseLegal, baseSimpl));
  let imposto = refIRRFTabela(base);
  const r = t.redutor;
  if (bruto <= r.isencaoAte) imposto = 0;
  else if (bruto <= r.reducaoAte) imposto = Math.max(0, trunc2(imposto - Math.max(0, r.a - r.b * bruto)));
  return imposto;
}

export const refFGTS = (b) => trunc2(b * TABELAS.fgts.aliquota);
export const refDiasAviso = (anosCompletos) => {
  const t = TABELAS.avisoPrevio;
  return Math.min(t.maximo, t.base + t.porAno * Math.max(0, anosCompletos));
};

/** A tabela progressiva é internamente consistente? (parcela a deduzir = soma das diferenças de alíquota.) */
export function consistenciaIRRF() {
  const f = TABELAS.irrf2026.faixas;
  const erros = [];
  let ded = 0;
  for (let i = 1; i < f.length; i++) {
    const lim = f[i - 1][0];
    ded += lim * (f[i][1] - f[i - 1][1]);
    if (Math.abs(ded - f[i][2]) > 0.02) erros.push(`faixa ${i + 1}: dedução ${f[i][2]} != ${ded.toFixed(2)} (derivada)`);
  }
  const simpl = f[0][0] * 0.25;
  if (Math.abs(simpl - TABELAS.irrf2026.descontoSimplificado) > 0.01) erros.push(`simplificado ${TABELAS.irrf2026.descontoSimplificado} != 25% de ${f[0][0]}`);
  return erros;
}
