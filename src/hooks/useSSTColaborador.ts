// PARTE H — Dossiê do Colaborador, aba SST & Saúde Ocupacional.
// Hooks finos de leitura por colaborador_id. Nenhum deles seleciona campos
// de diagnóstico/CID/descrição narrativa — só status/data/tipo (ver PARTE 20).
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from './useEmpresas';
import { mockOr, getMockSstIncidentes, getMockSstCat, getMockSstRiscos } from '@/mocks/colaboradoresMock';

async function listarIncidentesColaborador(colaboradorId: string, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('sst_incidentes')
    .select('id, data_hora, tipo, gravidade, status')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('data_hora', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function listarCatColaborador(colaboradorId: string, empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('sst_cat')
    .select('id, data_acidente, tipo_acidente, tipo_cat, status_esocial')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('data_acidente', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Sem empresa_id na tabela (RLS isola via join com colaboradores.empresa_id).
async function listarRiscosColaborador(colaboradorId: string) {
  const { data, error } = await supabase
    .from('sst_exposicao_riscos')
    .select('id, agente_nocivo_codigo, epi_eficaz, status_esocial, data_inicio_exposicao, data_fim_exposicao')
    .eq('colaborador_id', colaboradorId)
    .order('data_inicio_exposicao', { ascending: false });
  if (error) throw error;
  return data || [];
}

export function useIncidentesColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['sst-incidentes-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () => mockOr(getMockSstIncidentes(colaboradorId)) ?? listarIncidentesColaborador(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useCatColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery({
    queryKey: ['sst-cat-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () => mockOr(getMockSstCat(colaboradorId)) ?? listarCatColaborador(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useRiscosColaborador(colaboradorId: string) {
  return useQuery({
    queryKey: ['sst-riscos-colaborador', colaboradorId],
    queryFn: async () => mockOr(getMockSstRiscos(colaboradorId)) ?? listarRiscosColaborador(colaboradorId),
    enabled: !!colaboradorId,
  });
}
