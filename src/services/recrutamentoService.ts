import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { VagaRow, CandidatoRow, CandidaturaRow, CandidaturaComRelacoes } from '@/types/recrutamento';
import { validateInput, validateTablePayload } from '@/schemas/validate';
import { vagaSchema, candidatoSchema, candidaturaSchema } from '@/schemas/recrutamento';

type Tables = Database['public']['Tables'];

export const recrutamentoService = {
  // ===== VAGAS =====
  async listarVagas(empresaId: string): Promise<VagaRow[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('vagas').select('*').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async criarVaga(d: Record<string, unknown>): Promise<VagaRow> {
    validateInput(vagaSchema, d, 'recrutamento.criarVaga');

    const { data, error } = await supabase
      .from('vagas')
      .insert(validateTablePayload('vagas', d as Tables['vagas']['Insert'], 'recrutamentoService:vagas'))
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de vaga foi retornado.');
    return data;
  },

  async atualizarVaga(id: string, d: Record<string, unknown>, empresaId: string): Promise<VagaRow> {
    validateInput(vagaSchema, d, 'recrutamento.atualizarVaga');
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('vagas')
      .update(validateTablePayload('vagas', d as Tables['vagas']['Update'], 'recrutamentoService:vagas'))
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de vaga foi retornado.');
    return data;
  },

  async excluirVaga(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('vagas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // ===== CANDIDATOS =====
  async listarCandidatos(empresaId: string): Promise<CandidatoRow[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');

    let q = supabase.from('candidatos').select('*').order('created_at', { ascending: false });
    q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async criarCandidato(d: Record<string, unknown>): Promise<CandidatoRow> {
    validateInput(candidatoSchema, d, 'recrutamento.criarCandidato');

    const { data, error } = await supabase
      .from('candidatos')
      .insert(validateTablePayload('candidatos', d as Tables['candidatos']['Insert'], 'recrutamentoService:candidatos'))
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de candidato foi retornado.');
    return data;
  },

  async atualizarCandidato(id: string, d: Record<string, unknown>, empresaId: string): Promise<CandidatoRow> {
    validateInput(candidatoSchema, d, 'recrutamento.atualizarCandidato');
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('candidatos')
      .update(validateTablePayload('candidatos', d as Tables['candidatos']['Update'], 'recrutamentoService:candidatos'))
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de candidato foi retornado.');
    return data;
  },

  async excluirCandidato(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('candidatos').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // ===== CANDIDATURAS =====
  async listarCandidaturas(empresaId: string, vagaId?: string): Promise<CandidaturaComRelacoes[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    let q = supabase
      .from('candidaturas')
      .select('*, candidato:candidatos(*), vaga:vagas(titulo, departamento)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (vagaId) q = q.eq('vaga_id', vagaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as unknown as CandidaturaComRelacoes[];
  },

  async criarCandidatura(d: Record<string, unknown>): Promise<CandidaturaRow> {
    validateInput(candidaturaSchema, d, 'recrutamento.criarCandidatura');

    const { data, error } = await supabase
      .from('candidaturas')
      .insert(
        validateTablePayload('candidaturas', d as Tables['candidaturas']['Insert'], 'recrutamentoService:candidaturas')
      )
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de candidatura foi retornado.');
    return data;
  },

  async atualizarCandidatura(id: string, d: Record<string, unknown>, empresaId: string): Promise<CandidaturaRow> {
    validateInput(candidaturaSchema, d, 'recrutamento.atualizarCandidatura');
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('candidaturas')
      .update(
        validateTablePayload('candidaturas', d as Tables['candidaturas']['Update'], 'recrutamentoService:candidaturas')
      )
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de candidatura foi retornado.');
    return data;
  },

  async excluirCandidatura(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('candidaturas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  // ===== TESTES E ENTREVISTAS =====
  async agendarEntrevista(d: Record<string, unknown>): Promise<Tables['recrutamento_entrevistas']['Row'] | null> {
    const { data, error } = await supabase
      .from('recrutamento_entrevistas')
      .insert(
        validateTablePayload(
          'recrutamento_entrevistas',
          d as Tables['recrutamento_entrevistas']['Insert'],
          'recrutamentoService:recrutamento_entrevistas'
        )
      )
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async registrarTeste(d: Record<string, unknown>): Promise<Tables['recrutamento_testes']['Row'] | null> {
    const { data, error } = await supabase
      .from('recrutamento_testes')
      .insert(
        validateTablePayload(
          'recrutamento_testes',
          d as Tables['recrutamento_testes']['Insert'],
          'recrutamentoService:recrutamento_testes'
        )
      )
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async adicionarAnotacao(d: Record<string, unknown>): Promise<Tables['recrutamento_anotacoes']['Row'] | null> {
    const { data, error } = await supabase
      .from('recrutamento_anotacoes')
      .insert(
        validateTablePayload(
          'recrutamento_anotacoes',
          d as Tables['recrutamento_anotacoes']['Insert'],
          'recrutamentoService:recrutamento_anotacoes'
        )
      )
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};
