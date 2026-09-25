// Histórico do Colaborador — substitui useTimelineFuncional.ts. Agrega os
// MESMOS ~13 sub-recursos de antes (vínculos, histórico salarial, contratos,
// cargo, promoções, transferências, férias, afastamentos, treinamentos,
// feedbacks 360, onboarding, medidas disciplinares, desligamentos) MAIS o
// audit_log (antes isolado em ColaboradorHistory/aba "Auditoria") — tudo
// numa única lista normalizada de `TimelineEvent`, com os campos ricos de
// cada origem preservados (não achatados como antes). Nenhuma tabela nova,
// nenhuma mutation nova: só leitura reorganizada + as mesmas mutations de
// criação/exclusão que já existiam nas abas antigas (Histórico Salarial,
// Contratos), agora expostas por este hook.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { colaboradorService } from '@/services';
import * as service from '@/services/colaboradorDetalhesService';
import * as timelineService from '@/services/timelineService';
import { supabase } from '@/integrations/supabase/client';
import { useHistoricoContratos } from './useHistoricoContratos';
import { useCriarRegistroSalarial, useHistoricoSalarial } from './useColaboradorDetalhes';
import { useMedidasDisciplinaresColaborador } from './useNovasTabelas';
import { useTreinamentosColaborador, useFeedbacksColaborador, useOnboardingColaborador } from './useDesenvolvimentoColaborador';
import { useEmpresas } from './useEmpresas';
import { vinculoService } from '@/services/vinculoService';
import { mockOr, getMockTimelineFuncional, getMockAuditLog } from '@/mocks/colaboradoresMock';
import type { TimelineEvent } from '@/types/timelineEvent';

function formatCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function useHistoricoColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const { data: colaborador, isLoading: isLoadingColaborador } = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: () => colaboradorService.buscarPorId(colaboradorId),
    enabled: !!colaboradorId,
  });

  const { data: historicoSalarial, isLoading: isLoadingSalarial } = useHistoricoSalarial(colaboradorId);
  const criarSalarial = useCriarRegistroSalarial();

  const { historico: historicoContratos, isLoading: isLoadingContratos, criar: criarContrato, excluir: excluirContrato } = useHistoricoContratos(colaboradorId);

  const { data: historicoCargo, isLoading: isLoadingCargo } = useQuery({
    queryKey: ['historico-cargo-timeline', colaboradorId],
    queryFn: () => timelineService.listarHistoricoCargoTimeline(colaboradorId),
    enabled: !!colaboradorId,
  });

  const { data: promocoes, isLoading: isLoadingPromocoes } = useQuery({
    queryKey: ['promocoes-timeline', colaboradorId],
    queryFn: () => timelineService.listarPromocoesTimeline(colaboradorId),
    enabled: !!colaboradorId,
  });

  const { data: transferencias, isLoading: isLoadingTransferencias } = useQuery({
    queryKey: ['transferencias-timeline', colaboradorId],
    queryFn: () => timelineService.listarTransferenciasTimeline(colaboradorId),
    enabled: !!colaboradorId,
  });

  const { data: ferias, isLoading: isLoadingFerias } = useQuery({
    queryKey: ['ferias-resumo-colaborador', colaboradorId, empresaId],
    queryFn: () => service.listarFeriasColaborador(colaboradorId, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });

  const { data: afastamentos, isLoading: isLoadingAfastamentos } = useQuery({
    queryKey: ['afastamentos-timeline', colaboradorId, empresaId],
    queryFn: () => timelineService.listarAfastamentosTimeline(colaboradorId, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });

  const { data: treinamentos, isLoading: isLoadingTreinamentos } = useTreinamentosColaborador(colaboradorId);
  const { data: feedbacks, isLoading: isLoadingFeedbacks } = useFeedbacksColaborador(colaboradorId);
  const onboarding = useOnboardingColaborador(colaboradorId);
  const { data: medidas, isLoading: isLoadingMedidas } = useMedidasDisciplinaresColaborador(colaboradorId);

  const { data: desligamentos, isLoading: isLoadingDesligamentos } = useQuery({
    queryKey: ['desligamentos-timeline', colaboradorId, empresaId],
    queryFn: () => timelineService.listarDesligamentoTimeline(colaboradorId, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });

  const { data: vinculos, isLoading: isLoadingVinculos } = useQuery({
    queryKey: ['vinculos-colaborador', colaboradorId],
    queryFn: () => vinculoService.listarPorColaborador(colaboradorId),
    enabled: !!colaboradorId,
  });

  // Audit trail técnico (era a aba "Auditoria"/ColaboradorHistory, isolada).
  // Vira só mais um tipo de evento, filtrável, na mesma timeline.
  const { data: auditLogs, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['colaborador-history', colaboradorId],
    queryFn: async () => {
      const mock = mockOr(getMockAuditLog(colaboradorId));
      if (mock !== undefined) return mock;
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('registro_id', colaboradorId)
        .eq('tabela', 'colaboradores')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!colaboradorId,
  });

  const isLoading = isLoadingColaborador || isLoadingSalarial || isLoadingContratos || isLoadingCargo
    || isLoadingPromocoes || isLoadingTransferencias || isLoadingFerias || isLoadingAfastamentos
    || isLoadingTreinamentos || isLoadingFeedbacks || onboarding.isLoading || isLoadingMedidas
    || isLoadingDesligamentos || isLoadingVinculos || isLoadingAudit;

  const events = useMemo<TimelineEvent[]>(() => {
    const mockEventos = mockOr(getMockTimelineFuncional(colaboradorId));
    if (mockEventos !== undefined) {
      return (mockEventos as unknown as TimelineEvent[]).map((e) =>
        e.source === 'historico_contratos'
          ? { ...e, onDelete: () => { void excluirContrato(e.id.replace(/^contrato-/, '')); } }
          : e
      );
    }

    const out: TimelineEvent[] = [];

    const colab = colaborador as { data_admissao?: string } | null | undefined;
    const listaVinculos = (vinculos as { id: string; data_inicio: string; tipo?: string }[] | undefined) || [];
    if (listaVinculos.length > 0) {
      const cronologica = [...listaVinculos].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
      cronologica.forEach((v, i) => {
        out.push({
          id: `vinculo-${v.id}`,
          date: v.data_inicio,
          type: 'vinculo',
          title: i === 0 ? 'Admissão inicial' : `Recontratação (${i + 1}ª passagem)`,
          description: v.tipo || undefined,
          source: 'vinculos',
        });
      });
    } else if (colab?.data_admissao) {
      out.push({ id: 'admissao-legado', date: colab.data_admissao, type: 'vinculo', title: 'Admissão', source: 'colaboradores' });
    }

    for (const h of (historicoSalarial as { id: string; data_vigencia: string; motivo?: string; descricao?: string; salario_anterior?: number | null; salario_novo: number }[] | undefined) || []) {
      const valores = h.salario_anterior != null
        ? `De ${formatCurrency(h.salario_anterior)} para ${formatCurrency(h.salario_novo)}`
        : `Novo salário: ${formatCurrency(h.salario_novo)}`;
      const meta = [h.motivo, h.descricao].filter(Boolean).join(' — ');
      out.push({
        id: `salario-${h.id}`,
        date: h.data_vigencia,
        type: 'salario',
        title: 'Alteração salarial',
        description: valores,
        secondary: meta || undefined,
        source: 'historico_salarial',
      });
    }

    for (const c of (historicoContratos as { id: string; data_inicio: string; cargo?: string; departamento?: string; tipo_contrato?: string; salario?: number | null; carga_horaria_semanal?: number | null; motivo_alteracao?: string }[] | undefined) || []) {
      const secundario = [
        c.cargo && `Cargo: ${c.cargo}`,
        c.departamento && `Depto: ${c.departamento}`,
        c.carga_horaria_semanal ? `${c.carga_horaria_semanal}h/semana` : undefined,
        c.salario ? formatCurrency(c.salario) : undefined,
      ].filter(Boolean).join(' · ');
      out.push({
        id: `contrato-${c.id}`,
        date: c.data_inicio,
        type: 'contrato',
        title: `Alteração contratual (${c.tipo_contrato ?? '—'})`,
        description: c.motivo_alteracao || undefined,
        secondary: secundario || undefined,
        source: 'historico_contratos',
        onDelete: () => { void excluirContrato(c.id); },
      });
    }

    for (const c of (historicoCargo as { id: string; data_alteracao: string; cargo_anterior?: string; cargo_novo?: string; motivo?: string }[] | undefined) || []) {
      out.push({
        id: `cargo-${c.id}`,
        date: c.data_alteracao,
        type: 'cargo',
        title: `Mudança de cargo: ${c.cargo_anterior ?? '—'} → ${c.cargo_novo ?? '—'}`,
        description: c.motivo || undefined,
        source: 'historico_cargo',
      });
    }

    for (const p of (promocoes as { id: string; data_vigencia: string; motivo?: string; salario_anterior?: number | null; salario_novo?: number | null }[] | undefined) || []) {
      out.push({
        id: `promocao-${p.id}`,
        date: p.data_vigencia,
        type: 'promocao',
        title: 'Promoção',
        description: p.motivo || undefined,
        secondary: (p.salario_anterior != null && p.salario_novo != null) ? `De ${formatCurrency(p.salario_anterior)} para ${formatCurrency(p.salario_novo)}` : undefined,
        source: 'promocoes',
      });
    }

    for (const t of (transferencias as { id: string; data_vigencia: string; motivo?: string }[] | undefined) || []) {
      out.push({
        id: `transferencia-${t.id}`,
        date: t.data_vigencia,
        type: 'transferencia',
        title: 'Transferência de departamento',
        description: t.motivo || undefined,
        source: 'transferencias',
      });
    }

    for (const f of (ferias as { id: string; data_inicio: string; data_fim: string; dias_gozo?: number; status?: string }[] | undefined) || []) {
      out.push({
        id: `ferias-${f.id}`,
        date: f.data_inicio,
        type: 'ferias',
        title: `Férias (${f.status})`,
        description: `${formatDateBR(f.data_inicio)} a ${formatDateBR(f.data_fim)}${f.dias_gozo ? ` · ${f.dias_gozo} dias` : ''}`,
        source: 'ferias',
      });
    }

    for (const a of (afastamentos as { id: string; data_inicio: string; tipo: string; status?: string; data_fim_real?: string | null }[] | undefined) || []) {
      out.push({
        id: `afastamento-${a.id}`,
        date: a.data_inicio,
        type: 'afastamento',
        title: `Afastamento (${a.tipo})`,
        description: a.status || undefined,
        secondary: a.data_fim_real ? `Encerrado em ${formatDateBR(a.data_fim_real)}` : undefined,
        source: 'afastamentos',
      });
    }

    for (const t of (treinamentos as { id: string; created_at: string; treinamento?: { nome?: string; descricao?: string; carga_horaria?: number }; presente?: boolean }[] | undefined) || []) {
      if (!t.presente) continue;
      out.push({
        id: `treinamento-${t.id}`,
        date: t.created_at,
        type: 'treinamento',
        title: `Treinamento: ${t.treinamento?.nome ?? '—'}`,
        description: t.treinamento?.descricao || undefined,
        secondary: t.treinamento?.carga_horaria ? `Carga horária: ${t.treinamento.carga_horaria}h` : undefined,
        source: 'treinamento_participantes',
      });
    }

    for (const f of (feedbacks as { id: string; created_at: string; performance?: string | number; nota_geral?: number }[] | undefined) || []) {
      const notaLabel = f.nota_geral != null ? `Nota geral: ${f.nota_geral}` : undefined;
      out.push({
        id: `avaliacao-${f.id}`,
        date: f.created_at,
        type: 'avaliacao',
        title: 'Feedback 360 concluído',
        description: [notaLabel, f.performance != null ? String(f.performance) : undefined].filter(Boolean).join(' · ') || undefined,
        source: 'feedbacks_360',
      });
    }

    for (const tarefa of onboarding.concluidas as { id?: string; data_conclusao?: string; titulo?: string; categoria?: string }[]) {
      if (!tarefa.data_conclusao) continue;
      out.push({
        id: `onboarding-${tarefa.id ?? tarefa.data_conclusao}`,
        date: tarefa.data_conclusao,
        type: 'onboarding',
        title: `Onboarding: ${tarefa.titulo ?? 'tarefa concluída'}`,
        description: tarefa.categoria || undefined,
        source: 'onboarding_tarefas',
      });
    }

    for (const m of (medidas as { id: string; data_ocorrencia: string; tipo: string; gravidade?: string }[] | undefined) || []) {
      out.push({
        id: `medida-${m.id}`,
        date: m.data_ocorrencia,
        type: 'medida_disciplinar',
        title: `Medida disciplinar: ${m.tipo}`,
        description: m.gravidade || undefined,
        source: 'medidas_disciplinares',
      });
    }

    for (const d of (desligamentos as { id: string; data_desligamento: string; status?: string; motivo?: string }[] | undefined) || []) {
      out.push({
        id: `desligamento-${d.id}`,
        date: d.data_desligamento,
        type: 'desligamento',
        title: 'Desligamento',
        description: d.status || undefined,
        secondary: d.motivo || undefined,
        source: 'desligamentos',
      });
    }

    for (const log of (auditLogs as { id: string; acao: 'INSERT' | 'UPDATE' | 'DELETE'; user_email?: string; created_at: string; campos_alterados?: string[]; dados_anteriores?: Record<string, unknown> | null; dados_novos?: Record<string, unknown> | null }[] | undefined) || []) {
      const alteracoes = (log.campos_alterados || [])
        .map((campo) => ({ campo, de: log.dados_anteriores?.[campo], para: log.dados_novos?.[campo] }))
        .filter((c) => c.de !== c.para);
      out.push({
        id: `auditoria-${log.id}`,
        date: log.created_at,
        type: 'auditoria',
        title: log.acao === 'INSERT' ? 'Registro criado' : log.acao === 'UPDATE' ? 'Cadastro atualizado' : 'Registro excluído',
        description: log.acao === 'UPDATE' ? `${alteracoes.length} campo(s) alterado(s)` : undefined,
        secondary: log.user_email ? `Por ${log.user_email}` : undefined,
        source: 'audit_log',
        auditDetail: { acao: log.acao, userEmail: log.user_email, alteracoes },
      });
    }

    out.sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }, [colaboradorId, colaborador, vinculos, historicoSalarial, historicoContratos, historicoCargo, promocoes, transferencias, ferias, afastamentos, treinamentos, feedbacks, onboarding.concluidas, medidas, desligamentos, auditLogs, excluirContrato]);

  return {
    events,
    isLoading,
    colaborador: colaborador as { data_admissao?: string; status?: string; tipo_contrato?: string; empresa_id?: string } | null | undefined,
    criarSalario: criarSalarial.mutateAsync,
    criandoSalario: criarSalarial.isPending,
    criarContrato,
    excluirContrato,
  };
}
