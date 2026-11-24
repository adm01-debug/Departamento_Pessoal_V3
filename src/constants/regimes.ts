/**
 * Constantes e helpers para regimes tributários brasileiros.
 *
 * Fonte legal:
 *  - Simples Nacional: LC 123/2006 (alíquotas variáveis por faixa de receita)
 *  - Lucro Presumido: Lei 9.249/1995
 *  - Lucro Real: Lei 8.981/1995
 *  - MEI: LC 128/2008
 *
 * Para encargos patronais sobre folha:
 *  - Simples Nacional: NÃO recolhe INSS patronal (20%) — incluso no DAS.
 *    FGTS 8% segue obrigatório.
 *  - Lucro Real/Presumido: INSS 20% + RAT (1-3%) × FAP + Terceiros (~5,8%) + FGTS 8%.
 *  - MEI: apenas FGTS 8% (sem INSS patronal).
 */

export type RegimeTributario =
  | 'simples_nacional'
  | 'lucro_presumido'
  | 'lucro_real'
  | 'mei';

export interface RegimeInfo {
  readonly value: RegimeTributario;
  readonly label: string;
  readonly labelCurto: string;
  readonly descricao: string;
  readonly cor: string; // token semântico de Tailwind/HSL
  readonly recolheINSSPatronal: boolean;
}

export const REGIMES_TRIBUTARIOS: Readonly<Record<RegimeTributario, RegimeInfo>> = {
  simples_nacional: {
    value: 'simples_nacional',
    label: 'Simples Nacional',
    labelCurto: 'Simples',
    descricao: 'INSS patronal incluso no DAS; FGTS 8% obrigatório.',
    cor: 'hsl(142 76% 36%)',
    recolheINSSPatronal: false,
  },
  lucro_presumido: {
    value: 'lucro_presumido',
    label: 'Lucro Presumido',
    labelCurto: 'Presumido',
    descricao: 'INSS 20% + RAT×FAP + Terceiros + FGTS 8%.',
    cor: 'hsl(217 91% 60%)',
    recolheINSSPatronal: true,
  },
  lucro_real: {
    value: 'lucro_real',
    label: 'Lucro Real',
    labelCurto: 'Real',
    descricao: 'INSS 20% + RAT×FAP + Terceiros + FGTS 8%.',
    cor: 'hsl(262 83% 58%)',
    recolheINSSPatronal: true,
  },
  mei: {
    value: 'mei',
    label: 'MEI',
    labelCurto: 'MEI',
    descricao: 'Microempreendedor — apenas FGTS 8%.',
    cor: 'hsl(38 92% 50%)',
    recolheINSSPatronal: false,
  },
} as const;

export const REGIMES_OPTIONS: readonly RegimeInfo[] = Object.values(REGIMES_TRIBUTARIOS);

export function getRegimeInfo(regime: RegimeTributario | null | undefined): RegimeInfo {
  if (regime && regime in REGIMES_TRIBUTARIOS) {
    return REGIMES_TRIBUTARIOS[regime];
  }
  return REGIMES_TRIBUTARIOS.lucro_real;
}
