import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/database.types';

/** Item do catálogo de lotações da empresa, para escolher a principal. */
export type LotacaoCatalogo = Pick<Tables<'lotacoes'>, 'id' | 'nome' | 'codigo'>;

/** Vínculo colaborador × lotação, com a lotação já embutida. */
export interface ColaboradorLotacao {
  id: string;
  colaborador_id: string;
  lotacao_id: string;
  principal: boolean;
  lotacao: LotacaoCatalogo | null;
}

const SELECT_VINCULO = 'id, colaborador_id, lotacao_id, principal, lotacao:lotacoes(id, nome, codigo)';

/**
 * `lotacoes.ativa` é nullable: registro antigo sem o flag continua sendo uma
 * lotação válida. Por isso o filtro exclui só o `false` explícito — `.neq()`
 * descartaria as linhas com NULL (em SQL, `NULL <> false` é NULL).
 */
const FILTRO_ATIVA = 'ativa.eq.true,ativa.is.null';

async function listarCatalogo(empresaId: string): Promise<LotacaoCatalogo[]> {
  const { data, error } = await supabase
    .from('lotacoes')
    .select('id, nome, codigo')
    .eq('empresa_id', empresaId)
    .or(FILTRO_ATIVA)
    .order('nome');
  if (error) throw error;
  return data ?? [];
}

async function listarPorColaborador(colaboradorId: string, empresaId: string): Promise<ColaboradorLotacao[]> {
  const { data, error } = await supabase
    .from('colaborador_lotacoes')
    .select(SELECT_VINCULO)
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .order('principal', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ColaboradorLotacao[];
}

async function buscarPrincipal(colaboradorId: string, empresaId: string): Promise<ColaboradorLotacao | null> {
  const { data, error } = await supabase
    .from('colaborador_lotacoes')
    .select(SELECT_VINCULO)
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .eq('principal', true)
    .maybeSingle();
  if (error) throw error;
  return (data as ColaboradorLotacao | null) ?? null;
}

/**
 * Troca a lotação principal do colaborador.
 *
 * São dois statements, nesta ordem obrigatória: o índice único parcial
 * `colaborador_lotacoes_principal_unica` (ON colaborador_id WHERE principal)
 * rejeitaria a segunda principal se o upsert viesse antes do desmarque.
 *
 * Não é atômico: falha entre os dois passos deixa o colaborador com ZERO
 * principal — estado válido no banco e corrigível repetindo a operação, nunca
 * duas principais. Atomicidade exigiria uma RPC, que é mudança de banco.
 */
async function definirPrincipal(colaboradorId: string, lotacaoId: string, empresaId: string): Promise<void> {
  const { error: erroDesmarcar } = await supabase
    .from('colaborador_lotacoes')
    .update({ principal: false })
    .eq('colaborador_id', colaboradorId)
    .eq('empresa_id', empresaId)
    .eq('principal', true)
    .neq('lotacao_id', lotacaoId);
  if (erroDesmarcar) throw erroDesmarcar;

  const { error } = await supabase
    .from('colaborador_lotacoes')
    .upsert(
      { empresa_id: empresaId, colaborador_id: colaboradorId, lotacao_id: lotacaoId, principal: true },
      { onConflict: 'colaborador_id,lotacao_id' }
    );
  if (error) throw error;
}

export const colaboradorLotacaoService = {
  listarCatalogo,
  listarPorColaborador,
  buscarPrincipal,
  definirPrincipal,
};
