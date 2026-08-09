import { todayLocalISO } from '@/utils/dateLocal';
import { supabase } from '@/integrations/supabase/client';
import { auditLogger } from '@/utils/auditLogger';
import type { Database, Tables, TablesInsert } from '@/integrations/supabase/types';
import type { PostgrestFilterBuilder } from '@supabase/supabase-js';

type BeneficioRow = Tables<'beneficios'>;

// Contrato usado por este serviço: o types.ts (Database) está defasado para
// algumas colunas/joins usados em runtime — estes tipos estendem as Rows
// oficiais do Supabase sem alterar comportamento.
type BeneficioColaboradorRow = Tables<'beneficios_colaborador'> & {
  beneficio?: (BeneficioRow & { empresa_id?: string | null }) | null;
  beneficio_id?: string | null;
  empresa_id?: string | null;
  quantidade_diaria?: number | null;
  valor_empresa?: number | null;
};

type BeneficiarioPlanoRow = Tables<'beneficiarios_plano'> & {
  dependente?: Tables<'dependentes'> | null;
  dependente_id?: string | null;
  mes_referencia?: string | null;
  valor_coparticipacao?: number | null;
};

type DependenteRow = Tables<'dependentes'> & { empresa_id?: string | null };

type QBuilder<R extends Record<string, unknown>> = PostgrestFilterBuilder<
  never,
  Database['public'],
  R,
  R[],
  string,
  unknown,
  unknown,
  false
>;

const fromBeneficiosColaborador = () =>
  supabase.from('beneficios_colaborador') as unknown as QBuilder<BeneficioColaboradorRow>;

const fromBeneficiariosPlano = () =>
  supabase.from('beneficiarios_plano') as unknown as QBuilder<BeneficiarioPlanoRow>;

const fromDependentes = () =>
  supabase.from('dependentes') as unknown as QBuilder<DependenteRow>;

export const valeTransporteService = {
  /**
   * Calcula o custo de VT considerando o limite de 6% do salário base (Lei 7.418/85)
   * Integração com Portaria 671 MTP para controle de dias úteis
   */
  async calcularCustoMensal(colaboradorId: string, diasUteis: number = 22) {
    const { data: colab, error: colabError } = await supabase
      .from('colaboradores')
      .select('salario_base')
      .eq('id', colaboradorId)
      .single();
    
    if (colabError) throw colabError;
    const salario = colab?.salario_base || 0;
    const descontoMaximo = salario * 0.06;

    const { data: rotas, error: rotasError } = await (fromBeneficiosColaborador()
      .select('*, beneficio:beneficios(*)') as unknown as QBuilder<BeneficioColaboradorRow>)
      .eq('colaborador_id', colaboradorId)
      .eq('status_vinculo', 'ativo');

    if (rotasError) throw rotasError;

    const rotasTransporte = (rotas || []).filter((r: BeneficioColaboradorRow) => r.beneficio?.tipo === 'transporte');

    const custoTotal = rotasTransporte.reduce((acc: number, r: BeneficioColaboradorRow) => {
      const valorDiario = r.beneficio?.valor || 0;
      const passagensDia = r.quantidade_diaria || 2;
      return acc + (valorDiario * passagensDia * diasUteis);
    }, 0);

    const descontoEfetivo = Math.min(custoTotal, descontoMaximo);
    const custoEmpresa = Math.max(0, custoTotal - descontoEfetivo);

    return {
      custoTotal,
      descontoColaborador: descontoEfetivo,
      custoEmpresa,
      diasUteis,
      aliquotaDesconto: 0.06,
      baseLegal: 'Lei 7.418/85'
    };
  }
};

export const valeAlimentacaoService = {
  /**
   * Calcula crédito proporcional aos dias trabalhados (PAT - Portaria 671/MTP)
   */
  async calcularCredito(beneficioId: string, diasTrabalhados: number = 22) {
    const { data: beneficio, error } = await supabase
      .from('beneficios')
      .select('valor, tipo')
      .eq('id', beneficioId)
      .single();

    if (error) throw error;
    const valor = beneficio?.valor || 0;
    
    // Se for mensal (valor alto), retorna o valor cheio, senão calcula proporcional
    if (valor < 100) {
      return valor * diasTrabalhados;
    }
    
    return valor;
  },

  async registrarRecarga(dados: { colaborador_id: string, vale_id?: string, valor: number, mes_referencia: string, origem_recurso?: string }) {
    const { data, error } = await supabase.from('recargas_vale').insert({
      ...dados,
      data_recarga: todayLocalISO(),
      status: 'processado'
    }).select().single();

    if (error) throw error;

    await auditLogger.log({
      tabela: 'recargas_vale',
      registro_id: data.id,
      acao: 'INSERT',
      dados_novos: data
    });

    return data;
  }
};

export const planoSaudeService = {
  /**
   * Calcula coparticipação retida em folha
   * Compliance com ANS e regras de retenção 2026
   */
  async calcularCoparticipacao(colaboradorId: string, mesReferencia: string) {
    const { data, error } = await (fromBeneficiariosPlano()
      .select('valor_coparticipacao') as unknown as QBuilder<BeneficiarioPlanoRow>)
      .eq('colaborador_id', colaboradorId)
      .eq('mes_referencia', mesReferencia)
      .neq('status', 'excluido');

    if (error) throw error;
    
    return (data || []).reduce((acc: number, item: BeneficiarioPlanoRow) => acc + (Number(item.valor_coparticipacao) || 0), 0);
  },
  
  async listarDependentesNoPlano(colaboradorId: string) {
    const { data, error } = await (fromBeneficiariosPlano()
      .select('*, dependente:dependentes(*)') as unknown as QBuilder<BeneficiarioPlanoRow>)
      .eq('colaborador_id', colaboradorId)
      .not('dependente_id', 'is', null)
      .neq('status', 'excluido');
    
    if (error) throw error;
    return data || [];
  },

  async calcularCustosEmpresa(empresaId: string, mesReferencia: string) {
    const { data, error } = await (fromBeneficiosColaborador()
      .select(`
        id,
        valor_empresa,
        beneficio:beneficios!inner (tipo, empresa_id)
      `) as unknown as QBuilder<BeneficioColaboradorRow>)
      .eq('beneficio.empresa_id', empresaId)
      .eq('beneficio.tipo', 'saude')
      .eq('status_vinculo', 'ativo');

    if (error) throw error;
    return (data || []).reduce((acc: number, item: BeneficioColaboradorRow) => acc + (Number(item.valor_empresa) || 0), 0);
  }
};

export const seguroVidaService = {
  /**
   * Monitoramento de apólices e prêmio médio por capital segurado
   */
  async calcularPremioMedio(empresaId: string) {
    const { data, error } = await supabase
      .from('beneficios')
      .select('id, valor, tipo')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'vida');
    
    if (error) throw error;
    if (!data || data.length === 0) return 0;

    let totalPremiums = 0;
    let totalParticipants = 0;

    for (const beneficio of data) {
    const { count, error: countError } = await (supabase
        .from('beneficios_colaborador')
        .select('*', { count: 'exact', head: true }) as unknown as QBuilder<BeneficioColaboradorRow>)
      .eq('beneficio_id', beneficio.id)
      .eq('status_vinculo', 'ativo');
      
      if (!countError && count !== null) {
        totalPremiums += (beneficio.valor || 0) * count;
        totalParticipants += count;
      }
    }
    
    return totalParticipants > 0 ? totalPremiums / totalParticipants : 0;
  }
};

export const dependentesService = {
  /**
   * Gestão de dependentes para IRRF e Salário Família
   */
  async listarPorColaborador(colaboradorId: string, empresaId: string) {
    if (!empresaId) throw new Error('empresa_id obrigatório para isolamento de tenant');
    const { data, error } = await fromDependentes()
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .order('nome');

    if (error) throw error;
    return data || [];
  },

  async criar(dados: TablesInsert<'dependentes'>) {
    const { data, error } = await supabase
      .from('dependentes')
      .insert({
        ...dados,
        data_inicio_vigencia: dados.data_inicio_vigencia || todayLocalISO()
      })
      .select()
      .single();
    
    if (error) throw error;

    await auditLogger.log({
      tabela: 'dependentes',
      registro_id: data.id,
      acao: 'INSERT',
      dados_novos: data
    });

    return data;
  }
};