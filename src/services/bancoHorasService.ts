import { supabase } from '@/integrations/supabase/client';
import { parsePgIntervalToHours } from '@/utils/pgInterval';
import type { Tables, Insertable } from '@/integrations/supabase/database.types';
import { validateTablePayload } from '@/schemas/validate';

/**
 * Lançamento da empresa com o cabeçalho do colaborador embutido — o extrato e os
 * agregados da tela de Banco de Horas precisam de nome/departamento/cargo/foto
 * sem uma segunda consulta por linha.
 */
export type RegistroBancoHorasDaEmpresa = Tables<'banco_horas'> & {
  colaborador: Pick<Tables<'colaboradores'>, 'nome_completo' | 'departamento' | 'cargo' | 'foto_url'> | null;
};

export const bancoHorasService = {
  async listarPorColaborador(colaboradorId: string, empresaId: string): Promise<Tables<'banco_horas'>[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('banco_horas')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /**
   * Lançamentos da empresa (com o colaborador embutido), para o extrato e os
   * agregados da tela de Banco de Horas. `limite` é teto de segurança da
   * consulta: a tela recorta por período em memória, sobre a base carregada.
   * Ordenação: `data` desc (ordem de leitura do extrato) e `created_at` desc como
   * desempate — é o que torna determinístico o "último `saldo_atual`" usado como
   * foto do saldo de cada pessoa.
   */
  async listarDaEmpresa(empresaId: string, limite = 2000): Promise<RegistroBancoHorasDaEmpresa[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('banco_horas')
      .select('*, colaborador:colaboradores(nome_completo, departamento, cargo, foto_url)')
      .eq('empresa_id', empresaId)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return (data || []) as unknown as RegistroBancoHorasDaEmpresa[];
  },

  /**
   * Saldo em horas decimais. A coluna `horas` é do tipo `interval` no Postgres —
   * o valor chega como texto ("1 day 02:00:00"), nunca como número, por isso o
   * parsing dedicado. Tipos desconhecidos são tratados como débito (conservador).
   */
  async getSaldo(colaboradorId: string, empresaId: string): Promise<number> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('banco_horas')
      .select('tipo, horas')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId);
    if (error) throw error;
    if (!data) return 0;
    return data.reduce((saldo, item) => {
      const horas = parsePgIntervalToHours(item.horas);
      return item.tipo === 'credito' ? saldo + horas : saldo - horas;
    }, 0);
  },

  async registrar(d: Insertable<'banco_horas'>): Promise<Tables<'banco_horas'> | null> {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('banco_horas')
      .insert(validateTablePayload('banco_horas', d, 'bancoHorasService:banco_horas'))
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};
