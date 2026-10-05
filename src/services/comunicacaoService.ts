import { supabase } from '@/integrations/supabase/client';
import type { Insertable, Tables, Updatable } from '@/integrations/supabase/database.types';
import { validateTablePayload } from '@/schemas/validate';

export const comunicacaoService = {
  async listarComunicados(empresaId: string): Promise<Tables<'comunicados'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('comunicados')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async criarComunicado(d: Insertable<'comunicados'>): Promise<Tables<'comunicados'>> {
    const { data, error } = await supabase
      .from('comunicados')
      .insert(validateTablePayload('comunicados', d, 'comunicacaoService:comunicados'))
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de comunicado foi retornado.');
    return data;
  },

  async atualizarComunicado(
    id: string,
    d: Updatable<'comunicados'>,
    empresaId: string
  ): Promise<Tables<'comunicados'>> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('comunicados')
      .update(validateTablePayload('comunicados', d, 'comunicacaoService:comunicados'))
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de comunicado foi retornado.');
    return data;
  },

  async excluirComunicado(id: string, empresaId: string): Promise<void> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { error } = await supabase.from('comunicados').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  async marcarLido(comunicadoId: string, usuarioId: string): Promise<Tables<'comunicados_leituras'>> {
    const { data, error } = await supabase
      .from('comunicados_leituras')
      .insert(
        validateTablePayload(
          'comunicados_leituras',
          { comunicado_id: comunicadoId, usuario_id: usuarioId },
          'comunicacaoService:comunicados_leituras'
        )
      )
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de leitura foi retornado.');
    return data;
  },

  async listarDenuncias(empresaId: string): Promise<Tables<'canal_etica'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('canal_etica')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async criarDenuncia(d: Insertable<'canal_etica'>): Promise<Tables<'canal_etica'>> {
    const { data, error } = await supabase
      .from('canal_etica')
      .insert(validateTablePayload('canal_etica', d, 'comunicacaoService:canal_etica'))
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de denúncia foi retornado.');
    return data;
  },

  async atualizarDenuncia(id: string, d: Updatable<'canal_etica'>, empresaId: string): Promise<Tables<'canal_etica'>> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('canal_etica')
      .update(validateTablePayload('canal_etica', d, 'comunicacaoService:canal_etica'))
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Nenhum registro de denúncia foi retornado.');
    return data;
  },
};
