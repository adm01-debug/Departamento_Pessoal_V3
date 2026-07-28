/**
 * @fileoverview Tipos do módulo PCS (Plano de Cargos e Salários).
 * Todos derivados do schema real — nada de `any`, nada de shape inventado.
 */
import type { Database, Json } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];
type Functions = Database['public']['Functions'];

export type PcsPlano = Tables['pcs_planos']['Row'];
export type PcsPlanoInsert = Tables['pcs_planos']['Insert'];
export type PcsPlanoUpdate = Tables['pcs_planos']['Update'];

export type PcsFator = Tables['pcs_fatores']['Row'];
export type PcsFatorInsert = Tables['pcs_fatores']['Insert'];

export type PcsAvaliacaoCargo = Tables['pcs_avaliacoes_cargo']['Row'];
export type PcsAvaliacaoCargoInsert = Tables['pcs_avaliacoes_cargo']['Insert'];

export type PcsGrade = Tables['pcs_grades']['Row'];

export type PcsPesquisaSalarial = Tables['pcs_pesquisa_salarial']['Row'];
export type PcsPesquisaSalarialInsert = Tables['pcs_pesquisa_salarial']['Insert'];

export type PcsEnquadramentoRow = Functions['pcs_enquadramento']['Returns'][number];

/** Status possíveis de um plano — espelha o CHECK do banco. */
export const PCS_STATUS = ['rascunho', 'em_avaliacao', 'ativo', 'arquivado'] as const;
export type PcsStatus = (typeof PCS_STATUS)[number];

export const PCS_STATUS_LABEL: Record<PcsStatus, string> = {
  rascunho: 'Rascunho',
  em_avaliacao: 'Em avaliação',
  ativo: 'Ativo',
  arquivado: 'Arquivado',
};

/** Situação do colaborador frente à faixa da sua grade. */
export type PcsSituacao = 'abaixo_faixa' | 'dentro_faixa' | 'acima_faixa';

export const PCS_SITUACAO_LABEL: Record<PcsSituacao, string> = {
  abaixo_faixa: 'Abaixo da faixa',
  dentro_faixa: 'Dentro da faixa',
  acima_faixa: 'Acima da faixa',
};

/**
 * Um grau de um fator de avaliação. Persistido em `pcs_fatores.graus` (jsonb),
 * por isso precisa de validação em runtime antes do uso.
 */
export interface PcsGrau {
  grau: number;
  rotulo: string;
  pontos: number;
}

/** Narrowing defensivo do jsonb `graus` — descarta entradas malformadas. */
export function parseGraus(raw: unknown): PcsGrau[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): PcsGrau[] => {
    if (typeof item !== 'object' || item === null) return [];
    const o = item as Record<string, unknown>;
    const grau = Number(o.grau);
    const pontos = Number(o.pontos);
    if (!Number.isFinite(grau) || !Number.isFinite(pontos)) return [];
    return [{ grau, pontos, rotulo: typeof o.rotulo === 'string' ? o.rotulo : `Grau ${grau}` }];
  });
}

/** Pontuações de um cargo: { [fatorId]: pontosDoGrau }. */
/**
 * Serializa graus para o formato `Json` aceito pelo cliente do banco.
 * Evita cast: reconstrói cada objeto com chaves conhecidas.
 */
export function grausToJson(graus: PcsGrau[]): Json {
  return graus.map((g) => ({ grau: g.grau, rotulo: g.rotulo, pontos: g.pontos }));
}

export type PcsPontuacoes = Record<string, number>;

export function parsePontuacoes(raw: unknown): PcsPontuacoes {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: PcsPontuacoes = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

/** Resultado agregado de `pcs_simular_impacto`. */
export interface PcsImpacto {
  colaboradores_enquadrados: number;
  abaixo_faixa: number;
  dentro_faixa: number;
  acima_faixa: number;
  folha_atual: number;
  ajuste_mensal: number;
  ajuste_com_encargos: number;
  impacto_anual: number;
  impacto_pct_folha: number | null;
  comparatio_medio: number | null;
  encargos_pct: number;
}

const IMPACTO_VAZIO: PcsImpacto = {
  colaboradores_enquadrados: 0,
  abaixo_faixa: 0,
  dentro_faixa: 0,
  acima_faixa: 0,
  folha_atual: 0,
  ajuste_mensal: 0,
  ajuste_com_encargos: 0,
  impacto_anual: 0,
  impacto_pct_folha: null,
  comparatio_medio: null,
  encargos_pct: 0,
};

/** A RPC devolve jsonb; convertemos com defaults para nunca quebrar a UI. */
export function parseImpacto(raw: unknown): PcsImpacto {
  if (typeof raw !== 'object' || raw === null) return IMPACTO_VAZIO;
  const o = raw as Record<string, unknown>;
  const num = (k: keyof PcsImpacto): number => {
    const n = Number(o[k]);
    return Number.isFinite(n) ? n : 0;
  };
  const numOrNull = (k: keyof PcsImpacto): number | null => {
    if (o[k] === null || o[k] === undefined) return null;
    const n = Number(o[k]);
    return Number.isFinite(n) ? n : null;
  };
  return {
    colaboradores_enquadrados: num('colaboradores_enquadrados'),
    abaixo_faixa: num('abaixo_faixa'),
    dentro_faixa: num('dentro_faixa'),
    acima_faixa: num('acima_faixa'),
    folha_atual: num('folha_atual'),
    ajuste_mensal: num('ajuste_mensal'),
    ajuste_com_encargos: num('ajuste_com_encargos'),
    impacto_anual: num('impacto_anual'),
    impacto_pct_folha: numOrNull('impacto_pct_folha'),
    comparatio_medio: numOrNull('comparatio_medio'),
    encargos_pct: num('encargos_pct'),
  };
}

/** Fatores sugeridos pela metodologia clássica de avaliação por pontos. */
export const PCS_FATORES_PADRAO: ReadonlyArray<{
  nome: string;
  descricao: string;
  peso: number;
  graus: PcsGrau[];
}> = [
  {
    nome: 'Formação e conhecimento',
    descricao: 'Escolaridade, certificações e conhecimento técnico exigidos pelo cargo.',
    peso: 2,
    graus: [
      { grau: 1, rotulo: 'Fundamental', pontos: 10 },
      { grau: 2, rotulo: 'Médio / técnico', pontos: 25 },
      { grau: 3, rotulo: 'Superior', pontos: 45 },
      { grau: 4, rotulo: 'Pós / especialização', pontos: 70 },
      { grau: 5, rotulo: 'Mestrado / doutorado', pontos: 100 },
    ],
  },
  {
    nome: 'Experiência',
    descricao: 'Tempo de vivência prática necessário para desempenhar o cargo com autonomia.',
    peso: 1.5,
    graus: [
      { grau: 1, rotulo: 'Até 1 ano', pontos: 10 },
      { grau: 2, rotulo: '1 a 3 anos', pontos: 30 },
      { grau: 3, rotulo: '3 a 6 anos', pontos: 55 },
      { grau: 4, rotulo: '6 a 10 anos', pontos: 80 },
      { grau: 5, rotulo: 'Acima de 10 anos', pontos: 100 },
    ],
  },
  {
    nome: 'Complexidade e resolução de problemas',
    descricao: 'Grau de abstração e criatividade exigido na solução de problemas.',
    peso: 2,
    graus: [
      { grau: 1, rotulo: 'Rotinas padronizadas', pontos: 10 },
      { grau: 2, rotulo: 'Problemas conhecidos', pontos: 30 },
      { grau: 3, rotulo: 'Análise de cenários', pontos: 60 },
      { grau: 4, rotulo: 'Soluções inéditas', pontos: 100 },
    ],
  },
  {
    nome: 'Autonomia e decisão',
    descricao: 'Nível de supervisão recebida e alçada de decisão.',
    peso: 1.5,
    graus: [
      { grau: 1, rotulo: 'Supervisão constante', pontos: 10 },
      { grau: 2, rotulo: 'Supervisão periódica', pontos: 35 },
      { grau: 3, rotulo: 'Autonomia tática', pontos: 65 },
      { grau: 4, rotulo: 'Autonomia estratégica', pontos: 100 },
    ],
  },
  {
    nome: 'Responsabilidade por pessoas',
    descricao: 'Amplitude de liderança direta e indireta.',
    peso: 1,
    graus: [
      { grau: 1, rotulo: 'Sem liderança', pontos: 5 },
      { grau: 2, rotulo: 'Liderança técnica', pontos: 30 },
      { grau: 3, rotulo: 'Equipe até 10', pontos: 60 },
      { grau: 4, rotulo: 'Equipe acima de 10', pontos: 100 },
    ],
  },
  {
    nome: 'Impacto nos resultados',
    descricao: 'Efeito das decisões do cargo sobre receita, custo e risco do negócio.',
    peso: 2,
    graus: [
      { grau: 1, rotulo: 'Impacto local', pontos: 10 },
      { grau: 2, rotulo: 'Impacto na área', pontos: 35 },
      { grau: 3, rotulo: 'Impacto multiárea', pontos: 70 },
      { grau: 4, rotulo: 'Impacto organizacional', pontos: 100 },
    ],
  },
];
