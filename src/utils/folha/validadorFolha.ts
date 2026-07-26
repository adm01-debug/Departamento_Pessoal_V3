import { supabase } from '@/integrations/supabase/client';

export interface AlertaConsistencia {
  colaboradorId: string;
  nome: string;
  tipo: 'variacao_salarial' | 'desconto_excessivo' | 'liquido_negativo' | 'falta_informacao' | 'divergencia_esocial';
  mensagem: string;
  gravidade: 'alta' | 'media' | 'baixa';
}

export const validadorFolha = {
  /**
   * Valida a consistência de uma folha já calculada (itens)
   */
  validarFolha: async (folhaId: string): Promise<AlertaConsistencia[]> => {
    const alertas: AlertaConsistencia[] = [];

    // 1. Busca os itens da folha atual e histórico (para variação)
    const { data: itens, error } = await supabase
      .from('folha_itens')
      .select(`
        *, 
        colaborador:colaboradores(
          id, 
          nome_completo, 
          salario_base, 
          status,
          empresa_id
        )
      `)
      .eq('folha_id', folhaId);

    if (error || !itens) return [];

    // Busca rubricas da empresa para validação de eSocial
    const { data: rubricas } = await supabase
      .from('rubricas_folha')
      .select('*')
      .eq('empresa_id', (itens[0]?.colaborador as any)?.empresa_id);

    // 2. Regras de validação
    for (const item of itens) {
      const colab = item.colaborador as any;
      const totalProventos = Number(item.total_proventos);
      const totalDescontos = Number(item.total_descontos);
      const totalLiquido = Number(item.total_liquido);
      const detalhes = item.detalhes as any;

      // Regra 1: Líquido negativo ou zero
      if (totalLiquido <= 0) {
        alertas.push({
          colaboradorId: item.colaborador_id,
          nome: colab.nome_completo,
          tipo: 'liquido_negativo',
          mensagem: 'Salário líquido é zero ou negativo.',
          gravidade: 'alta'
        });
      }

      // Regra 2: Descontos > 30% do bruto (limite prudencial para empréstimos/retenções)
      // Nota: O limite legal de descontos totais é maior, mas 70% é um alerta de erro crítico
      if (totalDescontos > (totalProventos * 0.7)) {
        alertas.push({
          colaboradorId: item.colaborador_id,
          nome: colab.nome_completo,
          tipo: 'desconto_excessivo',
          mensagem: `Descontos críticos: ${( (totalDescontos/totalProventos)*100 ).toFixed(1)}% do bruto.`,
          gravidade: 'alta'
        });
      }

      // Regra 3: Variação contra Salário Base
      const salarioBase = Number(colab.salario_base);
      if (totalProventos > (salarioBase * 2.0)) {
        alertas.push({
          colaboradorId: item.colaborador_id,
          nome: colab.nome_completo,
          tipo: 'variacao_salarial',
          mensagem: 'Total bruto excede 100% do salário base. Verifique bonificações/extras.',
          gravidade: 'media'
        });
      }

      // Regra 4: Validação de Rubricas do Cálculo vs Rubricas do eSocial
      if (detalhes?.detalheEventos && rubricas) {
        for (const evento of detalhes.detalheEventos) {
          const rubricaConfig = rubricas.find(r => r.codigo === evento.codigo);
          if (!rubricaConfig) {
            alertas.push({
              colaboradorId: item.colaborador_id,
              nome: colab.nome_completo,
              tipo: 'divergencia_esocial',
              mensagem: `Evento ${evento.codigo} não possui rubrica correspondente configurada.`,
              gravidade: 'media'
            });
          }
        }
      }

      // Regra 5: Validação de Salário Mínimo (2026)
      const { SALARIO_MINIMO_2026 } = await import('@/calculators/tabelas');
      if (totalProventos < SALARIO_MINIMO_2026 && colab.status === 'ativo') {
        alertas.push({
          colaboradorId: item.colaborador_id,
          nome: colab.nome_completo,
          tipo: 'falta_informacao',
          mensagem: `Total bruto abaixo do salário mínimo nacional (R$ ${SALARIO_MINIMO_2026}).`,
          gravidade: 'alta'
        });
      }

      // Regra 6: Alerta de IRRF Retido sem Dependente (Verificação de otimização fiscal)
      const irrfValor = Number(item.irrf_mes);
      const dependentesCount = detalhes?.dependentes || 0;
      
      if (irrfValor > 500 && !dependentesCount) {
         alertas.push({
          colaboradorId: item.colaborador_id,
          nome: colab.nome_completo,
          tipo: 'falta_informacao',
          mensagem: `Retenção de IRRF elevada (${formatCurrency(irrfValor)}). Verifique se há dependentes não cadastrados.`,
          gravidade: 'baixa'
        });
      }

      // Regra 7: Verificação de Salário Base Zero
      if (salarioBase === 0) {
        alertas.push({
          colaboradorId: item.colaborador_id,
          nome: colab.nome_completo,
          tipo: 'falta_informacao',
          mensagem: 'Salário base não configurado no cadastro do colaborador.',
          gravidade: 'alta'
        });
      }

      // Regra 8: Verificação de Rubricas sem Incidência (Auditável eSocial)
      if (detalhes?.detalheEventos) {
        const eventosSemIncidencia = detalhes.detalheEventos.filter((ev: any) => 
          ['1000', '1001', '1002'].includes(ev.codigo) && ev.valor > 0 && !rubricas?.find(r => r.codigo === ev.codigo)?.incide_inss
        );
        
        if (eventosSemIncidencia.length > 0) {
          alertas.push({
            colaboradorId: item.colaborador_id,
            nome: colab.nome_completo,
            tipo: 'divergencia_esocial',
            mensagem: `Verbas salariais (Base/HE) detectadas sem incidência de INSS. Risco de multa eSocial.`,
            gravidade: 'alta'
          });
        }
      }
    }

    return alertas;
  }
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
