import { useQuery } from '@tanstack/react-query';
import { supabaseBase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function useExecutiveKPIs(empresaId?: string, periodo: string = '6') {
  return useQuery({
    queryKey: ['executive-kpis', empresaId, periodo],
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const meses = parseInt(periodo);
      const hoje = new Date();
      const mesAtual = format(hoje, 'yyyy-MM');
      const mesAnterior = format(subMonths(hoje, 1), 'yyyy-MM');

      const monthRanges = Array.from({ length: meses }, (_, i) => {
        const mesRef = subMonths(hoje, meses - 1 - i);
        return {
          inicio: format(startOfMonth(mesRef), 'yyyy-MM-dd'),
          fim: format(endOfMonth(mesRef), 'yyyy-MM-dd'),
          label: format(mesRef, 'MMM/yy', { locale: ptBR }),
          comp: format(mesRef, 'yyyy-MM'),
        };
      });

      const [
        { count: totalAtivos },
        colabs,
        { data: folhaAtual },
        { data: folhaAnterior },
        { count: feriasPendentes },
        { count: afastamentosAtivos },
        { data: absenteismoRow },
        { count: pontoPendentes },
        ...monthResults
      ] = await Promise.all([
        supabaseBase.from('colaboradores').select('*', { count: 'exact', head: true }).eq('status', 'ativo').eq('empresa_id', empresaId!),
        supabaseBase.from('colaboradores').select('departamento').eq('status', 'ativo').eq('empresa_id', empresaId!),
        supabaseBase.from('folhas_pagamento').select('total_liquido').eq('competencia', mesAtual).eq('empresa_id', empresaId!),
        supabaseBase.from('folhas_pagamento').select('total_liquido').eq('competencia', mesAnterior).eq('empresa_id', empresaId!),
        supabaseBase.from('ferias').select('*', { count: 'exact', head: true }).eq('status', 'pendente').eq('empresa_id', empresaId!),
        supabaseBase.from('afastamentos').select('*', { count: 'exact', head: true }).in('status', ['ativo', 'prorrogado']).eq('empresa_id', empresaId!),
        supabaseBase.from('faltas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId!).eq('tipo', 'injustificada').gte('data', inicioMes),
        supabaseBase.from('solicitacoes_ajuste_ponto').select('*', { count: 'exact', head: true }).eq('status', 'enviado').eq('empresa_id', empresaId!),
        ...monthRanges.flatMap(m => [
          supabaseBase.from('colaboradores').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId!).gte('data_admissao', m.inicio).lte('data_admissao', m.fim),
          supabaseBase.from('desligamentos').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId!).gte('data_desligamento', m.inicio).lte('data_desligamento', m.fim),
          supabaseBase.from('folhas_pagamento').select('total_proventos, total_liquido, total_descontos').eq('competencia', m.comp).eq('empresa_id', empresaId!),
        ]),
      ]);

      const evolucao = monthRanges.map((m, i) => {
        const admissoes = (monthResults[i * 3] as any)?.count || 0;
        const demissoes = (monthResults[i * 3 + 1] as any)?.count || 0;
        return { mes: m.label, admissoes, demissoes, saldo: admissoes - demissoes };
      });

      const custosMensal = monthRanges.map((m, i) => {
        const fl = (monthResults[i * 3 + 2] as any)?.data || [];
        return {
          mes: m.label,
          bruto: fl.reduce((s: number, f: any) => s + (f.total_proventos || 0), 0),
          liquido: fl.reduce((s: number, f: any) => s + (f.total_liquido || 0), 0),
          descontos: fl.reduce((s: number, f: any) => s + (f.total_descontos || 0), 0),
        };
      });

      // Custo real por departamento: itens da folha da competência atual (escopo da empresa via folha_id)
      const folhaIds = (folhaAtual ?? []).map((f) => f.id);
      const itensFolha = folhaIds.length
        ? await fetchAllPages((from, to) =>
            supabase
              .from('folha_itens')
              .select('id, colaborador_id, total_liquido')
              .in('folha_id', folhaIds)
              .order('id')
              .range(from, to)
          )
        : [];

      const deptMap: Record<string, number> = {};
      colabs?.forEach((c: any) => { deptMap[c.departamento] = (deptMap[c.departamento] || 0) + 1; });
      const departamentos = Object.entries(deptMap).map(([nome, value]) => ({ nome, value })).sort((a, b) => b.value - a.value).slice(0, 8);

      const totalFolhaAtual = folhaAtual?.reduce((s, f) => s + (f.total_liquido || 0), 0) || 0;
      const totalFolhaAnterior = folhaAnterior?.reduce((s, f) => s + (f.total_liquido || 0), 0) || 0;
      const variacaoFolha = totalFolhaAnterior > 0 ? ((totalFolhaAtual - totalFolhaAnterior) / totalFolhaAnterior * 100) : 0;
      const custoMedio = totalAtivos && totalAtivos > 0 ? totalFolhaAtual / totalAtivos : 0;
      const headcountPorMes = reconstruirHeadcountPorMes(evolucao, totalAtivos || 0);
      const variacaoHeadcount = variacaoUltimoMes(headcountPorMes);

      const demissoesPeriodo = evolucao.reduce((s, e) => s + e.demissoes, 0);
      const turnover = totalAtivos && totalAtivos > 0 ? (demissoesPeriodo / totalAtivos * 100) : 0;
      const absenteismo = totalAtivos && totalAtivos > 0 ? ((diasFalta || 0) / (totalAtivos * 22) * 100) : 0;

      return {
        totalAtivos: totalAtivos || 0, evolucao, departamentos, custosMensal,
        totalFolhaAtual, variacaoFolha, feriasPendentes: feriasPendentes || 0,
        afastamentosAtivos: afastamentosAtivos || 0, custoMedio, turnover, absenteismo,
        pontoPendentes: pontoPendentes || 0,
      };
    },
  });
}

export function useStrategicFinancials(empresaId?: string) {
  return useQuery({
    queryKey: ['strategic-financials', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data: projections } = await supabaseBase.rpc('get_personnel_cost_projection', {
        p_empresa_id: empresaId!,
        p_months: 6,
      });
      const { data: budgets } = await supabaseBase
        .from('personnel_budget')
        .select('*')
        .eq('empresa_id', empresaId!)
        .eq('ano', new Date().getFullYear());
      const { data: actuals } = await supabaseBase
        .from('folhas_pagamento')
        .select('total_proventos, total_liquido, total_descontos')
        .eq('empresa_id', empresaId!)
        .order('competencia', { ascending: false })
        .limit(1);

      return {
        projections: projections || [],
        budgets: budgets || [],
        actuals: actuals?.[0] || null,
      };
    },
  });
}
