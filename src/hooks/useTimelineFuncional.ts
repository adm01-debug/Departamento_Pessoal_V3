// PARTE K — Timeline Funcional (Dossiê do Colaborador). Agrega eventos de
// múltiplas tabelas já existentes numa lista única, ordenada do mais recente
// para o mais antigo. Não cria tabela nova; não mistura com a auditoria
// técnica (audit_log/ColaboradorHistory), que continua separada.
import { useQuery } from '@tanstack/react-query';
import { colaboradorService } from '@/services';
import * as service from '@/services/colaboradorDetalhesService';
import * as timelineService from '@/services/timelineService';
import { useHistoricoContratos } from './useHistoricoContratos';
import { useMedidasDisciplinaresColaborador } from './useNovasTabelas';
import { useTreinamentosColaborador, useFeedbacksColaborador, useOnboardingColaborador } from './useDesenvolvimentoColaborador';
import { useEmpresas } from './useEmpresas';
import { mockOr, getMockTimelineFuncional } from '@/mocks/colaboradoresMock';

export interface EventoTimeline {
  data: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  origem: string;
}

export function useTimelineFuncional(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const { data: colaborador, isLoading: isLoadingColaborador } = useQuery({
    queryKey: ['colaborador', colaboradorId],
    queryFn: () => colaboradorService.buscarPorId(colaboradorId),
    enabled: !!colaboradorId,
  });

  const { data: historicoSalarial, isLoading: isLoadingSalarial } = useQuery({
    queryKey: ['historico-salarial', colaboradorId, empresaId],
    queryFn: () => service.listarHistoricoSalarial(colaboradorId, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });

  const { historico: historicoContratos, isLoading: isLoadingContratos } = useHistoricoContratos(colaboradorId);

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

  const isLoading = isLoadingColaborador || isLoadingSalarial || isLoadingContratos || isLoadingCargo
    || isLoadingPromocoes || isLoadingTransferencias || isLoadingFerias || isLoadingAfastamentos
    || isLoadingTreinamentos || isLoadingFeedbacks || onboarding.isLoading || isLoadingMedidas || isLoadingDesligamentos;

  const eventos: EventoTimeline[] = [];

  const colab = colaborador as { data_admissao?: string } | null | undefined;
  if (colab?.data_admissao) {
    eventos.push({ data: colab.data_admissao, tipo: 'admissao', titulo: 'Admissão', origem: 'colaboradores' });
  }

  for (const h of (historicoSalarial as { data_vigencia: string; motivo: string }[] | undefined) || []) {
    eventos.push({ data: h.data_vigencia, tipo: 'salario', titulo: 'Alteração salarial', descricao: h.motivo, origem: 'historico_salarial' });
  }

  for (const c of (historicoContratos as { data_inicio: string; tipo_contrato?: string; motivo_alteracao?: string }[] | undefined) || []) {
    eventos.push({ data: c.data_inicio, tipo: 'contrato', titulo: `Alteração contratual (${c.tipo_contrato ?? '—'})`, descricao: c.motivo_alteracao, origem: 'historico_contratos' });
  }

  for (const c of (historicoCargo as { data_alteracao: string; cargo_anterior?: string; cargo_novo?: string; motivo?: string }[] | undefined) || []) {
    eventos.push({ data: c.data_alteracao, tipo: 'cargo', titulo: `Mudança de cargo: ${c.cargo_anterior ?? '—'} → ${c.cargo_novo ?? '—'}`, descricao: c.motivo, origem: 'historico_cargo' });
  }

  for (const p of (promocoes as { data_vigencia: string; motivo?: string }[] | undefined) || []) {
    eventos.push({ data: p.data_vigencia, tipo: 'promocao', titulo: 'Promoção', descricao: p.motivo, origem: 'promocoes' });
  }

  for (const t of (transferencias as { data_vigencia: string; motivo?: string }[] | undefined) || []) {
    eventos.push({ data: t.data_vigencia, tipo: 'transferencia', titulo: 'Transferência de departamento', descricao: t.motivo, origem: 'transferencias' });
  }

  for (const f of (ferias as { data_inicio: string; data_fim: string; status?: string }[] | undefined) || []) {
    eventos.push({ data: f.data_inicio, tipo: 'ferias', titulo: `Férias (${f.status})`, descricao: `${f.data_inicio} a ${f.data_fim}`, origem: 'ferias' });
  }

  for (const a of (afastamentos as { data_inicio: string; tipo: string; status?: string }[] | undefined) || []) {
    eventos.push({ data: a.data_inicio, tipo: 'afastamento', titulo: `Afastamento (${a.tipo})`, descricao: a.status, origem: 'afastamentos' });
  }

  for (const t of (treinamentos as { created_at: string; treinamento?: { nome?: string }; presente?: boolean }[] | undefined) || []) {
    if (t.presente) eventos.push({ data: t.created_at, tipo: 'treinamento', titulo: `Treinamento: ${t.treinamento?.nome ?? '—'}`, origem: 'treinamento_participantes' });
  }

  for (const f of (feedbacks as { created_at: string; performance?: string }[] | undefined) || []) {
    eventos.push({ data: f.created_at, tipo: 'avaliacao', titulo: `Feedback 360 (${f.performance ?? '—'})`, origem: 'feedbacks_360' });
  }

  for (const tarefa of onboarding.concluidas as { data_conclusao?: string; titulo?: string }[]) {
    if (tarefa.data_conclusao) eventos.push({ data: tarefa.data_conclusao, tipo: 'onboarding', titulo: `Onboarding: ${tarefa.titulo ?? 'tarefa concluída'}`, origem: 'onboarding_tarefas' });
  }

  // Mesmo nível de exposição já existente hoje (nenhum gate adicional/removido — ver PARTE 20).
  for (const m of (medidas as { data_ocorrencia: string; tipo: string; gravidade?: string }[] | undefined) || []) {
    eventos.push({ data: m.data_ocorrencia, tipo: 'medida_disciplinar', titulo: `Medida disciplinar: ${m.tipo}`, descricao: m.gravidade, origem: 'medidas_disciplinares' });
  }

  for (const d of (desligamentos as { data_desligamento: string; status?: string }[] | undefined) || []) {
    eventos.push({ data: d.data_desligamento, tipo: 'desligamento', titulo: 'Desligamento', descricao: d.status, origem: 'desligamentos' });
  }

  eventos.sort((a, b) => b.data.localeCompare(a.data));

  // Curto-circuito no retorno (não nas queries acima, por causa das Rules of
  // Hooks): em dev com VITE_COLABORADORES_MOCK=true, substitui o agregado
  // real pela timeline fictícia pronta, evitando esperar todas as 12+
  // sub-queries reais (a maioria delas já mockada individualmente).
  const mockEventos = mockOr(getMockTimelineFuncional(colaboradorId));
  if (mockEventos !== undefined) {
    return { eventos: mockEventos as unknown as EventoTimeline[], isLoading: false };
  }

  return { eventos, isLoading };
}
