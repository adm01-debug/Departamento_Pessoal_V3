import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

/**
 * Coletores do relógio de ponto (Henry + Ponto AtecSoft) e envios recebidos.
 * Leitura: RLS de `ponto_rep_*` libera admin/RH da própria empresa.
 * Escrita: só pelas RPCs `gerar_token_coletor_ponto` / `revogar_coletor_ponto`
 * (admin da empresa). `token_hash` nunca é lido pelo navegador (sem GRANT).
 */

/** Colunas liberadas por GRANT de coluna em `ponto_rep_dispositivos` — sem `token_hash`. */
export const COLUNAS_COLETOR =
  'id, empresa_id, nome, unidade, token_prefixo, ativo, revogado_em, ultimo_contato_em, ultima_marcacao_em, versao_coletor, created_at, updated_at';

export type ColetorPonto = Omit<Tables<'ponto_rep_dispositivos'>, 'token_hash' | 'criado_por'>;

export type LoteColetor = Tables<'ponto_rep_lotes'> & {
  dispositivo: Pick<ColetorPonto, 'unidade' | 'nome'> | null;
};

export interface TokenGerado {
  dispositivo_id: string;
  token: string;
}

export const LIMITE_LOTES = 50;

function exigirEmpresa(empresaId: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
}

export const coletoresService = {
  async listarColetores(empresaId: string): Promise<ColetorPonto[]> {
    exigirEmpresa(empresaId);
    const { data, error } = await supabase
      .from('ponto_rep_dispositivos')
      .select(COLUNAS_COLETOR)
      .eq('empresa_id', empresaId)
      .order('unidade');
    if (error) throw error;
    return (data || []) as unknown as ColetorPonto[];
  },

  async listarLotes(empresaId: string): Promise<LoteColetor[]> {
    exigirEmpresa(empresaId);
    const { data, error } = await supabase
      .from('ponto_rep_lotes')
      .select('*, dispositivo:ponto_rep_dispositivos!ponto_rep_lotes_dispositivo_id_fkey(unidade, nome)')
      .eq('empresa_id', empresaId)
      .order('recebido_em', { ascending: false })
      .limit(LIMITE_LOTES);
    if (error) throw error;
    return (data || []) as unknown as LoteColetor[];
  },

  /** Cria o coletor da unidade ou rotaciona o token dele. O token volta em claro UMA vez. */
  async gerarToken(empresaId: string, unidade: string, nome: string): Promise<TokenGerado> {
    exigirEmpresa(empresaId);
    const { data, error } = await supabase.rpc('gerar_token_coletor_ponto', {
      _empresa_id: empresaId,
      _unidade: unidade.trim(),
      _nome: nome.trim(),
    });
    if (error) throw error;
    const linha = Array.isArray(data) ? data[0] : null;
    if (!linha?.token) throw new Error('O banco não devolveu o token do coletor.');
    return { dispositivo_id: linha.dispositivo_id, token: linha.token };
  },

  async revogar(dispositivoId: string): Promise<void> {
    const { error } = await supabase.rpc('revogar_coletor_ponto', { _dispositivo_id: dispositivoId });
    if (error) throw error;
  },
};
