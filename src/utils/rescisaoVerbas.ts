/**
 * Itemização das verbas rescisórias.
 *
 * O motor (`rescisaoCalc.ts`) devolve totais fechados; a tabela
 * `verbas_rescisorias` (migration 20260512194353) guarda o detalhamento por
 * rubrica, com incidência de INSS/IRRF/FGTS por linha. Até aqui ninguém
 * preenchia essa tabela: o TRCT só existia como jsonb em
 * `desligamentos.detalhes_calculo` e a folha não conseguia consumir a rescisão
 * como um conjunto de rubricas.
 *
 * Regra de ouro: a soma das linhas de provento tem de fechar EXATAMENTE com
 * `resultado.totalProventos` e a das linhas de desconto com
 * `resultado.totalDescontos`. `multaFGTS` fica de fora porque é depósito na
 * conta vinculada (GRRF), não verba do TRCT — o motor também a exclui do
 * líquido (`rescisaoCalc.ts:339-351`).
 *
 * As flags de incidência seguem o que o motor de fato reteve
 * (`rescisaoCalc.ts:379-386`): INSS e IRRF incidem apenas sobre saldo de
 * salário e 13º; o FGTS da rescisão é calculado sobre saldo + aviso
 * indenizado + 13º (`rescisaoCalc.ts:341`).
 */

import type { RescisaoResult } from './rescisaoCalc';

export type TipoVerbaRescisoria = 'provento' | 'desconto';

export interface VerbaRescisoria {
  codigo: string;
  descricao: string;
  tipo: TipoVerbaRescisoria;
  valor: number;
  incide_inss: boolean;
  incide_irrf: boolean;
  incide_fgts: boolean;
}

type LinhaDef = Omit<VerbaRescisoria, 'valor'> & { campo: keyof RescisaoResult };

const LINHAS_PROVENTO: LinhaDef[] = [
  {
    campo: 'saldoSalario',
    codigo: 'SALDO_SALARIO',
    descricao: 'Saldo de salário',
    tipo: 'provento',
    incide_inss: true,
    incide_irrf: true,
    incide_fgts: true,
  },
  {
    campo: 'avisoIndenizado',
    codigo: 'AVISO_INDENIZADO',
    descricao: 'Aviso prévio indenizado',
    tipo: 'provento',
    incide_inss: false,
    incide_irrf: false,
    // Súmula 305 do TST: o aviso indenizado integra a base do FGTS.
    incide_fgts: true,
  },
  {
    campo: 'feriasVencidas',
    codigo: 'FERIAS_VENCIDAS',
    descricao: 'Férias vencidas',
    tipo: 'provento',
    incide_inss: false,
    incide_irrf: false,
    incide_fgts: false,
  },
  {
    campo: 'feriasProporcionais',
    codigo: 'FERIAS_PROPORCIONAIS',
    descricao: 'Férias proporcionais',
    tipo: 'provento',
    incide_inss: false,
    incide_irrf: false,
    incide_fgts: false,
  },
  {
    campo: 'tercoFerias',
    codigo: 'TERCO_CONSTITUCIONAL',
    descricao: '1/3 constitucional das férias',
    tipo: 'provento',
    incide_inss: false,
    incide_irrf: false,
    incide_fgts: false,
  },
  {
    campo: 'decimoTerceiro',
    codigo: 'DECIMO_TERCEIRO',
    descricao: '13º salário proporcional',
    tipo: 'provento',
    incide_inss: true,
    incide_irrf: true,
    incide_fgts: true,
  },
  {
    campo: 'indenizacaoArt479',
    codigo: 'INDENIZACAO_ART_479',
    descricao: 'Indenização do art. 479 da CLT',
    tipo: 'provento',
    incide_inss: false,
    incide_irrf: false,
    incide_fgts: false,
  },
  {
    campo: 'multa477',
    codigo: 'MULTA_ART_477',
    descricao: 'Multa do art. 477 §8º da CLT',
    tipo: 'provento',
    incide_inss: false,
    incide_irrf: false,
    incide_fgts: false,
  },
];

const LINHAS_DESCONTO: LinhaDef[] = [
  {
    campo: 'inss',
    codigo: 'INSS',
    descricao: 'INSS retido',
    tipo: 'desconto',
    incide_inss: false,
    incide_irrf: false,
    incide_fgts: false,
  },
  {
    campo: 'irrf',
    codigo: 'IRRF',
    descricao: 'IRRF retido',
    tipo: 'desconto',
    incide_inss: false,
    incide_irrf: false,
    incide_fgts: false,
  },
  {
    campo: 'descontoAvisoPrevio',
    codigo: 'DESCONTO_AVISO_PREVIO',
    descricao: 'Aviso prévio não cumprido (art. 487 §2º)',
    tipo: 'desconto',
    incide_inss: false,
    incide_irrf: false,
    incide_fgts: false,
  },
  {
    campo: 'indenizacaoArt480',
    codigo: 'INDENIZACAO_ART_480',
    descricao: 'Indenização do art. 480 da CLT',
    tipo: 'desconto',
    incide_inss: false,
    incide_irrf: false,
    incide_fgts: false,
  },
];

function montar(defs: LinhaDef[], resultado: Pick<RescisaoResult, keyof RescisaoResult>): VerbaRescisoria[] {
  return defs
    .map(({ campo, ...resto }) => ({ ...resto, valor: Number(resultado[campo] ?? 0) }))
    .filter((linha) => linha.valor > 0);
}

/** Soma em centavos inteiros — evita drift IEEE754 ao comparar com os totais. */
export function somarVerbas(linhas: VerbaRescisoria[], tipo: TipoVerbaRescisoria): number {
  return linhas.filter((linha) => linha.tipo === tipo).reduce((acc, linha) => acc + Math.round(linha.valor * 100), 0);
}

/**
 * Reancora as linhas no total oficial do motor.
 *
 * O motor trunca os totais (`trunc2` em `rescisaoCalc.ts:38`), então a soma
 * das parcelas pode divergir do total em 1 centavo — ruído de IEEE754 no
 * truncamento. Sem reancorar, o TRCT itemizado não fecharia com o líquido
 * exibido. A diferença vai para a maior linha do tipo, onde o desvio
 * percentual é menor.
 */
function fecharComTotal(linhas: VerbaRescisoria[], tipo: TipoVerbaRescisoria, total: number): VerbaRescisoria[] {
  const diff = Math.round(Number(total ?? 0) * 100) - somarVerbas(linhas, tipo);
  if (diff === 0) return linhas;
  const doTipo = linhas.filter((linha) => linha.tipo === tipo);
  if (doTipo.length === 0) return linhas;
  const maior = doTipo.reduce((a, b) => (b.valor > a.valor ? b : a));
  return linhas.map((linha) =>
    linha === maior ? { ...linha, valor: (Math.round(linha.valor * 100) + diff) / 100 } : linha
  );
}

/**
 * Decompõe o resultado do motor em linhas de verba. Linhas com valor zero são
 * omitidas (o TRCT não lista rubrica zerada) e o conjunto é reancorado em
 * `totalProventos`/`totalDescontos`, de modo que a soma das linhas fecha
 * exatamente com os totais do motor.
 */
export function itemizarVerbasRescisorias(
  resultado: Pick<RescisaoResult, keyof RescisaoResult> | RescisaoResult
): VerbaRescisoria[] {
  const linhas = [...montar(LINHAS_PROVENTO, resultado), ...montar(LINHAS_DESCONTO, resultado)];
  return fecharComTotal(
    fecharComTotal(linhas, 'provento', resultado.totalProventos),
    'desconto',
    resultado.totalDescontos
  );
}
