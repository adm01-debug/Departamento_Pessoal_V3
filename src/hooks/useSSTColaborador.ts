// PARTE H — Dossiê do Colaborador, aba SST & Saúde Ocupacional.
// Hooks finos de leitura por colaborador_id. Nenhum deles seleciona campos
// de diagnóstico/CID/descrição narrativa — só status/data/tipo (ver PARTE 20).
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/database.types';
import { useEmpresas } from './useEmpresas';
import { mockOr, getMockSstIncidentes, getMockSstCat, getMockSstRiscos } from '@/mocks/colaboradoresMock';

/** Colunas lidas de `sst_incidentes` — sem `descricao`/`medidas_tomadas` (PII narrativa). */
export type IncidenteSSTColaborador = Pick<
  Tables<'sst_incidentes'>,
  'id' | 'data_hora' | 'tipo' | 'gravidade' | 'status'
>;

/** Colunas lidas de `sst_cat` — sem `cid_principal`/`cid_secundarios` (dado de saúde). */
export type CatSSTColaborador = Pick<
  Tables<'sst_cat'>,
  'id' | 'data_acidente' | 'tipo_acidente' | 'tipo_cat' | 'status_esocial'
>;

/** Colunas lidas de `sst_exposicao_riscos`. */
export type RiscoSSTColaborador = Pick<
  Tables<'sst_exposicao_riscos'>,
  'id' | 'agente_nocivo_codigo' | 'epi_eficaz' | 'status_esocial' | 'data_inicio_exposicao' | 'data_fim_exposicao'
>;

/**
 * ⚠️ O filtro `empresa_id` daqui é a ÚNICA barreira de tenant desta leitura: a
 * policy de `sst_incidentes` ("Gestores e RH gerenciam incidentes") recorta por
 * PAPEL (admin/rh/gestor), não por empresa. Removê-lo vaza incidentes de outras
 * empresas para qualquer usuário com um desses papéis.
 */
async function listarIncidentesColaborador(
  colaboradorId: string,
  empresaId: string
): Promise<IncidenteSSTColaborador[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('sst_incidentes')
    .select('id, data_hora, tipo, gravidade, status')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('data_hora', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function listarCatColaborador(colaboradorId: string, empresaId: string): Promise<CatSSTColaborador[]> {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
  const { data, error } = await supabase
    .from('sst_cat')
    .select('id, data_acidente, tipo_acidente, tipo_cat, status_esocial')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('data_acidente', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Sem `empresa_id` na tabela (conferido nos tipos gerados): o isolamento vem da
 * policy `Gestores de RH podem ver Riscos`, que faz o join
 * `colaboradores.empresa_id` → `pertence_a_empresa(...)`. Não há coluna para
 * filtrar no cliente.
 */
async function listarRiscosColaborador(colaboradorId: string): Promise<RiscoSSTColaborador[]> {
  const { data, error } = await supabase
    .from('sst_exposicao_riscos')
    .select('id, agente_nocivo_codigo, epi_eficaz, status_esocial, data_inicio_exposicao, data_fim_exposicao')
    .eq('colaborador_id', colaboradorId)
    .order('data_inicio_exposicao', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// REGRA DE CACHE DESTE ARQUIVO: a leitura vive DENTRO da família que o writer
// do app já invalida (o React Query casa por PREFIXO). `SSTPage.tsx` registra
// incidente (:56) e invalida `['sst_incidentes']` (:73) — uma chave irmã
// ('sst-incidentes-colaborador') ficaria FORA dessa invalidação e serviria dado
// velho por 5 min (staleTime de queryClient.ts, com refetchOnWindowFocus off).
// `sst_cat` e `sst_exposicao_riscos` não têm família: AdminCatPage.tsx atualiza
// por `refetch()` da própria query (:129) e nada no app escreve em
// `sst_exposicao_riscos` — não há invalidação para acompanhar.
export function useIncidentesColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery<IncidenteSSTColaborador[]>({
    queryKey: ['sst_incidentes', 'colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () =>
      (mockOr(getMockSstIncidentes(colaboradorId)) as IncidenteSSTColaborador[] | undefined) ??
      listarIncidentesColaborador(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useCatColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  return useQuery<CatSSTColaborador[]>({
    queryKey: ['sst-cat-colaborador', colaboradorId, empresaAtual?.id],
    queryFn: async () =>
      (mockOr(getMockSstCat(colaboradorId)) as CatSSTColaborador[] | undefined) ??
      listarCatColaborador(colaboradorId, empresaAtual!.id),
    enabled: !!colaboradorId && !!empresaAtual?.id,
  });
}

export function useRiscosColaborador(colaboradorId: string) {
  return useQuery<RiscoSSTColaborador[]>({
    queryKey: ['sst-riscos-colaborador', colaboradorId],
    queryFn: async () =>
      (mockOr(getMockSstRiscos(colaboradorId)) as RiscoSSTColaborador[] | undefined) ??
      listarRiscosColaborador(colaboradorId),
    enabled: !!colaboradorId,
  });
}
