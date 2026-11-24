import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];

export type AfastamentoRow = Tables['afastamentos']['Row'];
export type AfastamentoInsert = Tables['afastamentos']['Insert'];
export type AfastamentoUpdate = Tables['afastamentos']['Update'];

export type ConfigAfastamentoRow = Tables['config_afastamentos']['Row'];
export type DocumentoAfastamentoRow = Tables['documentos_afastamento']['Row'];
export type ProrrogacaoAfastamentoRow = Tables['prorrogacoes_afastamento']['Row'];
export type ProrrogacaoAfastamentoInsert = Tables['prorrogacoes_afastamento']['Insert'];
export type Cid10Row = Tables['cid10']['Row'];

export type TipoAfastamento = Database['public']['Enums']['tipo_afastamento'];
export type StatusAfastamento = Database['public']['Enums']['status_afastamento'];

/** Resumo do colaborador embutido nas consultas de afastamento. */
export interface ColaboradorResumo {
  nome_completo: string | null;
  departamento: string | null;
}

/** Linha de afastamento com o colaborador relacionado (join do `listar`). */
export interface AfastamentoComColaborador extends AfastamentoRow {
  colaborador: ColaboradorResumo | null;
}

/** Prorrogação com o afastamento pai e o colaborador (join do `listarProrrogacoes`). */
export interface ProrrogacaoComAfastamento extends ProrrogacaoAfastamentoRow {
  afastamento:
    | (AfastamentoRow & { colaborador: { nome_completo: string | null } | null })
    | null;
}

/** Filtros aceitos pela listagem/exportação de afastamentos. */
export interface AfastamentoFiltros {
  status?: StatusAfastamento;
  tipo?: TipoAfastamento;
  empresa_id?: string;
}

/** Divisão de dias entre responsabilidade da empresa e do INSS. */
export interface DistribuicaoDias {
  empresa: number;
  inss: number;
}
