/**
 * Hook e tipo do briefing matinal, extraidos de MorningBriefing.tsx.
 *
 * Motivo da extracao: o Resumo Operacional e o Proximas Atividades (resgatados
 * da branch `muri`) precisam do mesmo `briefing`, e exportar o hook do arquivo
 * do componente viola react-refresh/only-export-components — a propria regra
 * manda usar arquivo novo para compartilhar funcao entre componentes.
 *
 * A queryKey ['morning-briefing', empresaId] e a mesma de antes, entao quem
 * chama o hook mais de uma vez na arvore nao gera requisicao extra.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';

export interface BriefingData {
  aniversariantes: { nome: string; dia: number }[];
  feriasPeriodo: { nome: string; inicio: string; fim: string }[];
  afastadosHoje: { nome: string; tipo: string }[];
  admissoesHoje: { nome: string; cargo: string }[];
  vencimentosHoje: { descricao: string; tipo: string }[];
  totalAtivos: number;
  pontosRegistradosHoje: number;
  esocialHealth: number | null;
}

export function useMorningBriefing(empresaId?: string) {
  return useQuery<BriefingData>({
    queryKey: ['morning-briefing', empresaId],
    enabled: Boolean(empresaId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!empresaId) throw new Error('Selecione uma empresa para carregar o briefing.');
      const hoje = new Date();
      const hojeStr = format(hoje, 'yyyy-MM-dd');
      const mesAtual = hoje.getMonth() + 1;
      const em7Dias = format(new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      // Fire ALL queries in parallel
      const responses = await Promise.all([
        supabase
          .from('colaboradores')
          .select('nome_completo, data_nascimento')
          .eq('empresa_id', empresaId)
          .eq('status', 'ativo')
          .not('data_nascimento', 'is', null),
        supabase
          .from('ferias')
          .select('data_inicio, data_fim, colaboradores!ferias_colaborador_id_fkey(nome_completo)')
          .eq('empresa_id', empresaId)
          .in('status', ['aprovada', 'em_andamento'])
          .lte('data_inicio', hojeStr)
          .gte('data_fim', hojeStr),
        supabase
          .from('afastamentos')
          .select('tipo, colaboradores!afastamentos_colaborador_id_fkey(nome_completo)')
          .eq('empresa_id', empresaId)
          .eq('status', 'ativo')
          .lte('data_inicio', hojeStr)
          .gte('data_fim_prevista', hojeStr),
        supabase.from('admissoes').select('nome, cargo').eq('empresa_id', empresaId).eq('data_prevista', hojeStr),
        supabase
          .from('exames')
          .select('data_validade, tipo, colaboradores!inner(nome_completo)')
          .eq('colaboradores.empresa_id', empresaId)
          .gte('data_validade', hojeStr)
          .lte('data_validade', em7Dias),
        supabase
          .from('colaboradores')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .eq('status', 'ativo'),
        supabase
          .from('batidas_ponto')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .eq('data', hojeStr),
        supabase.from('esocial_eventos').select('status').eq('empresa_id', empresaId),
      ]);

      const failed = responses.find((response) => response.error);
      if (failed?.error) throw failed.error;

      const [
        { data: colabs },
        { data: feriasData },
        { data: afastData },
        { data: admData },
        { data: asoData },
        { count: totalAtivos },
        { count: pontosHoje },
        { data: esocialData },
      ] = responses;

      const esocialEventos = esocialData || [];
      const esocialTotal = esocialEventos.length;
      const esocialErros = esocialEventos.filter((evento) => evento.status === 'erro').length;
      const esocialHealth = esocialTotal > 0 ? Math.round(((esocialTotal - esocialErros) / esocialTotal) * 100) : null;

      const aniversariantes = (colabs || [])
        .filter((c) => {
          if (!c.data_nascimento) return false;
          const d = parseISO(c.data_nascimento);
          return d.getMonth() + 1 === mesAtual;
        })
        .map((c) => ({ nome: c.nome_completo, dia: parseISO(c.data_nascimento!).getDate() }))
        .sort((a, b) => a.dia - b.dia);

      const feriasPeriodo = (feriasData || []).map((f) => ({
        nome: f.colaboradores?.nome_completo || 'Colaborador',
        inicio: f.data_inicio,
        fim: f.data_fim,
      }));
      const afastadosHoje = (afastData || []).map((a) => ({
        nome: a.colaboradores?.nome_completo || 'Colaborador',
        tipo: a.tipo,
      }));
      const admissoesHoje = (admData || []).map((a) => ({ nome: a.nome, cargo: a.cargo }));
      const vencimentosHoje = (asoData || []).map((a) => ({
        descricao: `Exame ${a.tipo} de ${a.colaboradores?.nome_completo || 'Colaborador'} - ${a.data_validade ? format(parseISO(a.data_validade), 'dd/MM') : '—'}`,
        tipo: 'exame',
      }));

      return {
        aniversariantes,
        feriasPeriodo,
        afastadosHoje,
        admissoesHoje,
        vencimentosHoje,
        totalAtivos: totalAtivos || 0,
        pontosRegistradosHoje: pontosHoje || 0,
        esocialHealth,
      };
    },
  });
}
