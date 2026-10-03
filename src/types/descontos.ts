import type { Tables } from '@/integrations/supabase/database.types';

/** Empréstimo consignado com o join `colaborador` retornado pelas queries da página. */
export type EmprestimoComColaborador = Tables<'emprestimos_consignados'> & {
  colaborador?: { nome_completo: string | null } | null;
};

/** Adiantamento salarial com o join `colaborador`. */
export type AdiantamentoComColaborador = Tables<'adiantamentos_salariais'> & {
  colaborador?: { nome_completo: string | null } | null;
};

/** Payload emitido por `NewLoanDialog` (valores já convertidos para número). */
export interface NovoEmprestimoInput {
  colaborador_id: string;
  instituicao_financeira: string;
  valor_total: number;
  numero_parcelas: number;
  valor_parcela: number;
  data_inicio: string;
}

/** Payload emitido por `NewAdvanceDialog` (valor ainda como string do input). */
export interface NovoAdiantamentoInput {
  colaborador_id: string;
  valor_solicitado: string;
  competencia_desconto: string;
  motivo: string;
}

/** Subconjunto de colaborador usado nos selects de vínculo. */
export type ColaboradorResumoBasico = Pick<Tables<'colaboradores'>, 'id' | 'nome_completo'>;

/** Shape de exibição usado por EmprestimosTable/AdiantamentosTable (subconjunto estrutural da linha completa). */
export type EmprestimoItem = Pick<
  EmprestimoComColaborador,
  | 'id'
  | 'colaborador'
  | 'instituicao_financeira'
  | 'valor_total'
  | 'valor_parcela'
  | 'numero_parcelas'
  | 'parcelas_pagas'
  | 'status'
>;

export type AdiantamentoItem = Pick<
  AdiantamentoComColaborador,
  'id' | 'colaborador' | 'data_solicitacao' | 'valor_solicitado' | 'competencia_desconto' | 'status'
>;
