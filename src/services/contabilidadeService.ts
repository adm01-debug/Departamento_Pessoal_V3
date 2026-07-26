import { todayLocalISO } from '@/utils/dateLocal';
import { supabase } from '@/integrations/supabase/client';
export const contabilidadeService = {
  async listLancamentos(empresaId: string): Promise<any[]> {
    
    const { data, error } = await supabase
      .from('lancamentos_contabeis')
      .select('*, conta_debito:plano_contas!lancamentos_contabeis_conta_debito_id_fkey(*), conta_credito:plano_contas!lancamentos_contabeis_conta_credito_id_fkey(*)')
      .eq('empresa_id', empresaId)
      .order('data_lancamento', { ascending: false });
    
    if (error) throw error;
    return data || [];
  
  },

  async listPlanoContas(empresaId: string): Promise<any[]> {
    
    const { data, error } = await supabase
      .from('plano_contas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('codigo');
    
    if (error) throw error;
    return data || [];
  
  },

  async gerarLancamentosFolha(empresaId: string, folhaId: string): Promise<void> {
    try {
      // Fetch folha summary
      const { data: folha, error: fError } = await supabase
        .from('folhas_pagamento')
        .select('*')
        .eq('id', folhaId)
        .single();
      
      if (fError) throw fError;

      // Fetch plano de contas
      const { data: plano, error: pError } = await supabase
        .from('plano_contas')
        .select('*')
        .eq('empresa_id', empresaId);
      
      if (pError) throw pError;

      const contaSalariosPagar = plano?.find(c => c.codigo === '2.1.01.001');
      const contaDespesaSalarios = plano?.find(c => c.codigo === '3.1.01.001');

      if (!contaSalariosPagar || !contaDespesaSalarios) {
        throw new Error('Plano de contas incompleto. Certifique-se de que as contas padrões existem.');
      }

      const lancamentos = [
        {
          empresa_id: empresaId,
          folha_id: folhaId,
          data_lancamento: todayLocalISO(),
          descricao: `Provisão de Folha de Pagamento - Competência ${folha.competencia}`,
          valor: folha.total_liquido,
          conta_debito_id: contaDespesaSalarios.id,
          conta_credito_id: contaSalariosPagar.id,
          origem: 'folha',
          status: 'pendente'
        }
      ];

      const { error: lError } = await supabase
        .from('lancamentos_contabeis')
        .insert(lancamentos as any);
      
      if (lError) throw lError;
      return (undefined);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Falha ao gerar lançamentos contábeis', { cause: e });
    }
  },

  async exportarSPED(empresaId: string): Promise<string> {
    try {
      const result = await this.listLancamentos(empresaId);
      const lancamentos = result;
      
      let sped = '|0000|LECD|...|SPED CONTABIL|\r\n';
      lancamentos.forEach((l: any) => {
        sped += `|I200|${l.id}|${l.data_lancamento}|${l.valor}|N|\r\n`;
        sped += `|I250|${l.conta_debito?.codigo}|...|D|${l.valor}|...|\r\n`;
        sped += `|I250|${l.conta_credito?.codigo}|...|C|${l.valor}|...|\r\n`;
      });
      sped += '|9999|...|END|\r\n';

      return (sped);
    } catch (e) {
      throw new Error('Falha ao exportar SPED', { cause: e });
    }
  }
};

