import { supabase } from '@/integrations/supabase/client';
import { mockOr, getMockLotacoesCatalogo, getMockLotacaoPrincipal } from '@/mocks/colaboradoresMock';

export interface LotacaoCatalogo {
  id: string;
  nome: string;
  codigo: string | null;
  ativa: boolean | null;
}

/**
 * Opções para o Select "Unidade / Lotação principal" (aba Profissional) —
 * catálogo mestre da empresa atual, só lotações ativas (item 6 da task).
 */
async function listarCatalogo(empresaId: string): Promise<LotacaoCatalogo[]> {
  // getMockLotacoesCatalogo já faz o próprio gate (mockOr) internamente.
  const mock = getMockLotacoesCatalogo(empresaId);
  if (mock) return mock as LotacaoCatalogo[];

  const { data, error } = await supabase
    .from('lotacoes')
    .select('id, nome, codigo, ativa')
    .eq('empresa_id', empresaId)
    .eq('ativa', true)
    .order('nome');
  if (error) throw error;
  return (data as LotacaoCatalogo[]) ?? [];
}

/**
 * Lotação principal do colaborador — via `colaborador_lotacoes.principal =
 * true`, não mais a heurística "primeira ativa" antiga. Retorna a lotação
 * do catálogo já resolvida (join), no mesmo shape que o card espera.
 */
async function buscarPrincipal(colaboradorId: string, empresaId: string): Promise<LotacaoCatalogo | null> {
  // Mesmo padrão de getMockLotacoes/useColaboradorDetalhes.ts: o gate
  // (mockOr) fica no call site, não dentro do getter.
  const mock = mockOr(getMockLotacaoPrincipal(colaboradorId));
  if (mock) return mock as LotacaoCatalogo;

  const { data, error } = await supabase
    .from('colaborador_lotacoes')
    .select('lotacao:lotacoes(id, nome, codigo, ativa)')
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .eq('principal', true)
    .maybeSingle();
  if (error) throw error;
  return (data?.lotacao as unknown as LotacaoCatalogo | null) ?? null;
}

/**
 * Define `lotacaoId` como a lotação principal do colaborador — nunca cria
 * uma nova linha em `lotacoes` (o catálogo é gerenciado só por /lotacoes);
 * apenas grava/atualiza o vínculo em `colaborador_lotacoes`.
 *
 * Dois passos sequenciais, não uma transação (supabase-js client não expõe
 * transações multi-statement): 1) desmarca a principal atual, se houver —
 * o índice único parcial (`WHERE principal = true`) garante que nunca há
 * mais de uma linha com principal=true por colaborador, e como o passo 1
 * sempre roda antes do 2, não há instante em que duas linhas fiquem
 * `principal = true` simultaneamente. 2) upsert do vínculo escolhido como
 * principal (cria se ainda não existir, ou só marca como principal se já
 * existia desprincipalizado).
 */
async function definirPrincipal(colaboradorId: string, lotacaoId: string, empresaId: string): Promise<void> {
  const { error: unsetError } = await supabase
    .from('colaborador_lotacoes')
    .update({ principal: false })
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .eq('principal', true);
  if (unsetError) throw unsetError;

  const { error: upsertError } = await supabase
    .from('colaborador_lotacoes')
    .upsert(
      { empresa_id: empresaId, colaborador_id: colaboradorId, lotacao_id: lotacaoId, principal: true },
      { onConflict: 'colaborador_id,lotacao_id' }
    );
  if (upsertError) throw upsertError;
}

export const colaboradorLotacaoService = { listarCatalogo, buscarPrincipal, definirPrincipal };
