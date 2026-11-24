import { supabase } from '@/integrations/supabase/client';
import { parsePgIntervalToHours } from '@/utils/pgInterval';

export const bancoHorasService = {
  async listarPorColaborador(colaboradorId: string, empresaId: string): Promise<any[]> {
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
   * Saldo em horas decimais. A coluna `horas` é do tipo `interval` no Postgres —
   * o valor chega como texto ("1 day 02:00:00"), nunca como número, por isso o
   * parsing dedicado. Tipos desconhecidos são tratados como débito (conservador).
   */
  /**
   * Leitura da TELA de Banco de Horas: todos os lançamentos da empresa com o
   * colaborador embutido (`nome_completo`, `departamento`, `cargo`, `foto_url`).
   *
   * Serve tanto ao extrato quanto às agregações da página (saldo atual por
   * colaborador, créditos × débitos do período, série de evolução), por isso a
   * consulta NÃO recorta por data aqui: o recorte é do usuário e acontece em
   * `bancoHorasComum.recortarPorPeriodo`. A ordenação desce por `data` e, no
   * mesmo dia, por `created_at` — é o que torna determinístico o "último
   * `saldo_atual`" usado como foto do saldo de cada pessoa.
   *
   * O cliente Supabase é tipado: o join precisa apontar para a relação real
   * (`colaboradores`), como na consulta anterior desta mesma tela.
   */
  async listarDaEmpresa(empresaId: string, limite = 2000): Promise<any[]> {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase
      .from('banco_horas')
      .select('*, colaborador:colaboradores(nome_completo, departamento, cargo, foto_url)')
      .eq('empresa_id', empresaId)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data || [];
  },

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
      const horas = parsePgIntervalToHours((item as any).horas);
      return (item as any).tipo === 'credito' ? saldo + horas : saldo - horas;
    }, 0);
  },


  async registrar(d: any): Promise<any> {
    if (!d.empresa_id) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await supabase.from('banco_horas').insert(d).select().maybeSingle();
    if (error) throw error;
    return data;
  },
};
