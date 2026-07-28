/**
 * @fileoverview Serviço do módulo PCS (Plano de Cargos e Salários).
 *
 * Toda a matemática sensível (pontuação, geração de grades, enquadramento e
 * impacto financeiro) vive no banco em RPCs `SECURITY DEFINER` com checagem de
 * permissão interna. O front apenas orquestra — nunca recalcula faixa salarial.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  parseImpacto,
  type PcsAvaliacaoCargo,
  type PcsEnquadramentoRow,
  type PcsFator,
  type PcsFatorInsert,
  type PcsGrade,
  type PcsImpacto,
  type PcsPesquisaSalarial,
  type PcsPesquisaSalarialInsert,
  type PcsPlano,
  type PcsPlanoInsert,
  type PcsPlanoUpdate,
  type PcsPontuacoes,
} from '@/types/pcs';

/** Limite defensivo — nenhuma listagem do módulo deve varrer a tabela inteira. */
const MAX_ROWS = 500;

export const pcsService = {
  async listarPlanos(empresaId: string): Promise<PcsPlano[]> {
    const { data, error } = await supabase
      .from('pcs_planos')
      .select('*')
      .eq('empresa_id', empresaId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS);
    if (error) throw error;
    return data ?? [];
  },

  async criarPlano(payload: PcsPlanoInsert): Promise<PcsPlano> {
    const { data, error } = await supabase.from('pcs_planos').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async atualizarPlano(id: string, patch: PcsPlanoUpdate): Promise<void> {
    const { error } = await supabase
      .from('pcs_planos')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // ---------------------------------------------------------------- fatores
  async listarFatores(planoId: string): Promise<PcsFator[]> {
    const { data, error } = await supabase
      .from('pcs_fatores')
      .select('*')
      .eq('plano_id', planoId)
      .order('ordem', { ascending: true })
      .limit(MAX_ROWS);
    if (error) throw error;
    return data ?? [];
  },

  async criarFatores(fatores: PcsFatorInsert[]): Promise<void> {
    if (fatores.length === 0) return;
    const { error } = await supabase.from('pcs_fatores').insert(fatores);
    if (error) throw error;
  },

  async excluirFator(id: string): Promise<void> {
    const { error } = await supabase.from('pcs_fatores').delete().eq('id', id);
    if (error) throw error;
  },

  // ------------------------------------------------------------- avaliações
  async listarAvaliacoes(planoId: string): Promise<PcsAvaliacaoCargo[]> {
    const { data, error } = await supabase
      .from('pcs_avaliacoes_cargo')
      .select('*')
      .eq('plano_id', planoId)
      .order('pontos_total', { ascending: false })
      .limit(MAX_ROWS);
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Upsert da avaliação de um cargo. `pontos_total` NÃO é enviado: quem calcula
   * é o trigger `pcs_recalc_pontos`, para que a pontuação não dependa do cliente.
   */
  async salvarAvaliacao(params: {
    planoId: string;
    cargoId: string;
    pontuacoes: PcsPontuacoes;
    justificativa?: string | null;
    avaliadoPor?: string | null;
  }): Promise<void> {
    const { error } = await supabase.from('pcs_avaliacoes_cargo').upsert(
      {
        plano_id: params.planoId,
        cargo_id: params.cargoId,
        pontuacoes: params.pontuacoes,
        justificativa: params.justificativa ?? null,
        avaliado_por: params.avaliadoPor ?? null,
        avaliado_em: new Date().toISOString(),
      },
      { onConflict: 'plano_id,cargo_id' },
    );
    if (error) throw error;
  },

  // ----------------------------------------------------------------- grades
  async listarGrades(planoId: string): Promise<PcsGrade[]> {
    const { data, error } = await supabase
      .from('pcs_grades')
      .select('*')
      .eq('plano_id', planoId)
      .order('ordem', { ascending: true })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  },

  async gerarGrades(planoId: string, numGrades: number, salarioBaseMenor?: number | null): Promise<PcsGrade[]> {
    const { data, error } = await supabase.rpc('pcs_gerar_grades', {
      p_plano_id: planoId,
      p_num_grades: numGrades,
      p_salario_base_menor: salarioBaseMenor ?? undefined,
    });
    if (error) throw error;
    return data ?? [];
  },

  /** Faixas da matriz confrontadas com o P50 mais recente das pesquisas salariais. */
  async gradesMercado(planoId: string): Promise<PcsGradeMercadoRow[]> {
    const { data, error } = await supabase.rpc('pcs_grades_mercado', { p_plano_id: planoId });
    if (error) throw error;
    return data ?? [];
  },


  // ------------------------------------------------------- equidade/impacto
  async enquadramento(planoId: string): Promise<PcsEnquadramentoRow[]> {
    const { data, error } = await supabase.rpc('pcs_enquadramento', { p_plano_id: planoId });
    if (error) throw error;
    return data ?? [];
  },

  async simularImpacto(planoId: string, encargosPct: number): Promise<PcsImpacto> {
    const { data, error } = await supabase.rpc('pcs_simular_impacto', {
      p_plano_id: planoId,
      p_encargos_pct: encargosPct,
    });
    if (error) throw error;
    return parseImpacto(data);
  },

  // -------------------------------------------------------------- benchmark
  async listarPesquisas(empresaId: string): Promise<PcsPesquisaSalarial[]> {
    const { data, error } = await supabase
      .from('pcs_pesquisa_salarial')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_referencia', { ascending: false })
      .limit(MAX_ROWS);
    if (error) throw error;
    return data ?? [];
  },

  async criarPesquisa(payload: PcsPesquisaSalarialInsert): Promise<void> {
    const { error } = await supabase.from('pcs_pesquisa_salarial').insert(payload);
    if (error) throw error;
  },

  async excluirPesquisa(id: string, empresaId: string): Promise<void> {
    const { error } = await supabase
      .from('pcs_pesquisa_salarial')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);
    if (error) throw error;
  },
};
