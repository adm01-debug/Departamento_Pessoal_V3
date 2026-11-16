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
import { auditoriaService } from '@/services/auditoriaService';
import { statusCanonico } from '@/components/avaliacao/feedbackCanonico';
import { dataLocalDoEvento } from '@/components/colaborador-detalhes/historico/eventDate';
import { useHistoricoContratos } from './useHistoricoContratos';
import { useCriarRegistroSalarial, useHistoricoSalarial } from './useColaboradorDetalhes';
import { useMedidasDisciplinaresColaborador } from './useNovasTabelas';
import {
  useTreinamentosColaborador,
  useFeedbacksColaborador,
  useOnboardingColaborador,
} from './useDesenvolvimentoColaborador';
import { useEmpresas } from './useEmpresas';
import { vinculoService } from '@/services/vinculoService';
import { catalogoCursoService } from '@/services/catalogoCursoService';
// EVENTOS DA JORNADA (FASE 10) — derivados do domínio canônico do onboarding.
import {
  eventosLegiveisDaJornada,
  type JornadaCompat,
  type TarefaJornadaCompat,
} from '@/services/onboardingJornadaService';
import { mockOr, getMockTimelineFuncional, getMockAuditLog } from '@/mocks/colaboradoresMock';
import type { TimelineEvent } from '@/types/timelineEvent';

function formatCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  // Formata pelo dia LOCAL. Antes era `iso.slice(0, 10)`, que devolve o dia em
  // UTC: seguro para coluna `date`, errado para `timestamptz`. Em vez de
  // auditar a origem de cada chamada, o formatador passou a ser robusto aos
  // dois — data sem horário continua com o mesmo resultado.
  const data = dataLocalDoEvento(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(data);
}

export function useHistoricoColaborador(colaboradorId: string) {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const {
    data: colaborador,
    isLoading: isLoadingColaborador,
    isError: isErroColaborador,
  } = useQuery({
    // Mesma ordem de argumentos que a casca usa em ColaboradorDetalhesPage
    // ('colaborador', id, empresaId): chave diferente criaria um segundo cache
    // para o MESMO registro, duplicando a leitura e separando as invalidações.
    queryKey: ['colaborador', colaboradorId, empresaId],
    queryFn: () => colaboradorService.buscarPorId(colaboradorId, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });

  const {
    data: historicoSalarial,
    isLoading: isLoadingSalarial,
    isError: isErroSalarial,
  } = useHistoricoSalarial(colaboradorId);
  const criarSalarial = useCriarRegistroSalarial();

  const {
    historico: historicoContratos,
    isLoading: isLoadingContratos,
    isError: isErroContratos,
    criar: criarContrato,
    excluir: excluirContrato,
  } = useHistoricoContratos(colaboradorId);

  const {
    data: historicoCargo,
    isLoading: isLoadingCargo,
    isError: isErroCargo,
  } = useQuery({
    // Sem família a reusar: nenhuma mutation do app escreve em historico_cargo
    // (grep por invalidateQueries não acha), então não há invalidação para
    // acompanhar. Se um dia houver escrita, esta chave entra na família dela.
    queryKey: ['historico-cargo-timeline', colaboradorId],
    queryFn: () => timelineService.listarHistoricoCargoTimeline(colaboradorId),
    enabled: !!colaboradorId,
  });

  const {
    data: promocoes,
    isLoading: isLoadingPromocoes,
    isError: isErroPromocoes,
  } = useQuery({
    // Chave DENTRO da família 'promocoes': o React Query casa por prefixo, então
    // a invalidação de [promocoes] que MovimentacoesPage já faz alcança esta
    // leitura sem precisar listá-la lá. Chave irmã
    // ('promocoes-timeline') ficaria fora de QUALQUER invalidação existente e
    // serviria dado velho por 5 min (staleTime de queryClient.ts).
    queryKey: ['promocoes', 'timeline', colaboradorId],
    queryFn: () => timelineService.listarPromocoesTimeline(colaboradorId),
    enabled: !!colaboradorId,
  });

  const {
    data: transferencias,
    isLoading: isLoadingTransferencias,
    isError: isErroTransferencias,
  } = useQuery({
    queryKey: ['transferencias', 'timeline', colaboradorId],
    queryFn: () => timelineService.listarTransferenciasTimeline(colaboradorId),
    enabled: !!colaboradorId,
  });

  const {
    data: ferias,
    isLoading: isLoadingFerias,
    isError: isErroFerias,
  } = useQuery({
    queryKey: ['ferias-resumo-colaborador', colaboradorId, empresaId],
    queryFn: () => service.listarFeriasColaborador(colaboradorId, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });

  const {
    data: afastamentos,
    isLoading: isLoadingAfastamentos,
    isError: isErroAfastamentos,
  } = useQuery({
    queryKey: ['afastamentos', 'timeline', colaboradorId, empresaId],
    queryFn: () => timelineService.listarAfastamentosTimeline(colaboradorId, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });

  const {
    data: treinamentos,
    isLoading: isLoadingTreinamentos,
    isError: isErroTreinamentos,
  } = useTreinamentosColaborador(colaboradorId);
  const {
    data: feedbacks,
    isLoading: isLoadingFeedbacks,
    isError: isErroFeedbacks,
  } = useFeedbacksColaborador(colaboradorId);
  const onboarding = useOnboardingColaborador(colaboradorId);
  // Campos da jornada lidos DENTRO do useMemo, extraídos aqui de propósito:
  // (a) o objeto devolvido por useOnboardingColaborador troca de identidade a
  //     cada render, então depender dele anularia o memo;
  // (b) o cast inline impedia o eslint de rastrear `onboarding.onboarding`, e a
  //     lista de dependências citava `onboarding.concluidas` — resíduo do laço
  //     antigo, que o memo nem lê mais. Resultado: os eventos de onboarding não
  //     recalculavam quando a jornada ou as tarefas terminavam de carregar.
  const registroJornada = (onboarding as { onboarding?: unknown }).onboarding as JornadaCompat | null | undefined;
  const tarefasJornada = onboarding.tarefas as TarefaJornadaCompat[];
  const {
    data: medidas,
    isLoading: isLoadingMedidas,
    isError: isErroMedidas,
  } = useMedidasDisciplinaresColaborador(colaboradorId);

  const {
    data: desligamentos,
    isLoading: isLoadingDesligamentos,
    isError: isErroDesligamentos,
  } = useQuery({
    queryKey: ['desligamentos', 'timeline', colaboradorId, empresaId],
    queryFn: () => timelineService.listarDesligamentoTimeline(colaboradorId, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });

  // CAPACITACOES - fonte REAL. `treinamento_participantes` (lido por
  // useTreinamentosColaborador) nao tem nenhum writer no app e esta com 0
  // linhas em producao; o fluxo operacional da aba Inscricoes grava em
  // `inscricoes_cursos` (2 linhas hoje). Sem esta leitura os eventos de
  // treinamento da Timeline eram garantidamente vazios.
  // Chave dentro da familia ['inscricoes_cursos'], que TreinamentosPage ja
  // invalida em 3 pontos.
  const {
    data: inscricoesCursos,
    isLoading: isLoadingCursos,
    isError: isErroCursos,
  } = useQuery({
    queryKey: ['inscricoes_cursos', 'colaborador', colaboradorId, empresaId],
    queryFn: () => catalogoCursoService.listarInscricoesPorColaborador(colaboradorId, empresaId!),
    enabled: !!colaboradorId && !!empresaId,
  });

  const {
    data: vinculos,
    isLoading: isLoadingVinculos,
    isError: isErroVinculos,
  } = useQuery({
    queryKey: ['vinculos-colaborador', colaboradorId],
    queryFn: () => vinculoService.listarPorColaborador(colaboradorId),
    enabled: !!colaboradorId,
  });

  // Audit trail técnico (era a aba "Auditoria"/ColaboradorHistory, isolada).
  // Vira só mais um tipo de evento, filtrável, na mesma timeline.
  const {
    data: auditLogs,
    isLoading: isLoadingAudit,
    isError: isErroAudit,
  } = useQuery({
    // A trilha vem pela RPC `get_audit_trail`, e NÃO por leitura direta da
    // tabela de auditoria: ela está no TABLE_DENYLIST da bridge e fora do
    // TABLE_ALLOWLIST (403 TABLE_NOT_CATALOGED), enquanto a RPC está liberada e
    // faz o recorte por empresa dentro do banco. O gate
    // `audit-bridge-frontend-contract` proíbe essa leitura direta no frontend —
    // é por isso que este comentário descreve a chamada em vez de citá-la.
    // `empresaId` entra na chave para o cache não vazar entre empresas.
    queryKey: ['colaborador-history', empresaId, colaboradorId],
    queryFn: async () => {
      const mock = mockOr(getMockAuditLog(colaboradorId));
      if (mock !== undefined) return mock;
      return auditoriaService.listarTrilha({
        empresa_id: empresaId!,
        tabela: 'colaboradores',
        registro_id: colaboradorId,
        // MESMO limite da aba Histórico (ColaboradorHistory.tsx), que usa esta
        // mesma queryKey: o React Query compartilha o resultado pela chave e
        // ignora o limite, então um valor menor aqui truncaria aquela aba.
        limite: 200,
      });
    },
    enabled: !!colaboradorId && !!empresaId,
  });

  const isLoading =
    isLoadingColaborador ||
    isLoadingSalarial ||
    isLoadingContratos ||
    isLoadingCargo ||
    isLoadingPromocoes ||
    isLoadingTransferencias ||
    isLoadingFerias ||
    isLoadingAfastamentos ||
    isLoadingTreinamentos ||
    isLoadingFeedbacks ||
    onboarding.isLoading ||
    isLoadingMedidas ||
    isLoadingDesligamentos ||
    isLoadingVinculos ||
    isLoadingCursos ||
    isLoadingAudit;

  // A Timeline agrega 15 consultas independentes. Sem agregar o erro, uma fonte
  // que falha (bridge fora, RPC de auditoria sem permissão) virava lista vazia
  // via `|| []` e, passadas as tentativas do React Query, `isLoading` ficava
  // falso: o RH veria um histórico PARCIAL como se estivesse completo, com
  // contagens erradas ou "nenhum evento". AGENTS.md §3 exige estado de erro.
  const isError =
    isErroColaborador ||
    isErroSalarial ||
    isErroContratos ||
    isErroCargo ||
    isErroPromocoes ||
    isErroTransferencias ||
    isErroFerias ||
    isErroAfastamentos ||
    isErroTreinamentos ||
    isErroFeedbacks ||
    onboarding.isError ||
    isErroMedidas ||
    isErroDesligamentos ||
    isErroVinculos ||
    isErroCursos ||
    isErroAudit;

  const events = useMemo<TimelineEvent[]>(() => {
    const mockEventos = mockOr(getMockTimelineFuncional(colaboradorId));
    if (mockEventos !== undefined) {
      return (mockEventos as unknown as TimelineEvent[]).map((e) =>
        e.source === 'historico_contratos'
          ? {
              ...e,
              onDelete: () => {
                void excluirContrato(e.id.replace(/^contrato-/, ''));
              },
            }
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
      out.push({
        id: 'admissao-legado',
        date: colab.data_admissao,
        type: 'vinculo',
        title: 'Admissão',
        source: 'colaboradores',
      });
    }

    for (const h of (historicoSalarial as
      | {
          id: string;
          data_vigencia: string;
          motivo?: string;
          descricao?: string;
          salario_anterior?: number | null;
          salario_novo: number;
        }[]
      | undefined) || []) {
      const valores =
        h.salario_anterior != null
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

    for (const c of (historicoContratos as
      | {
          id: string;
          data_inicio: string;
          cargo?: string;
          departamento?: string;
          tipo_contrato?: string;
          salario?: number | null;
          carga_horaria_semanal?: number | null;
          motivo_alteracao?: string;
        }[]
      | undefined) || []) {
      const secundario = [
        c.cargo && `Cargo: ${c.cargo}`,
        c.departamento && `Depto: ${c.departamento}`,
        c.carga_horaria_semanal ? `${c.carga_horaria_semanal}h/semana` : undefined,
        c.salario ? formatCurrency(c.salario) : undefined,
      ]
        .filter(Boolean)
        .join(' · ');
      out.push({
        id: `contrato-${c.id}`,
        date: c.data_inicio,
        type: 'contrato',
        title: `Alteração contratual (${c.tipo_contrato ?? '—'})`,
        description: c.motivo_alteracao || undefined,
        secondary: secundario || undefined,
        source: 'historico_contratos',
        onDelete: () => {
          void excluirContrato(c.id);
        },
      });
    }

    for (const c of (historicoCargo as
      | { id: string; data_alteracao: string; cargo_anterior?: string; cargo_novo?: string; motivo?: string }[]
      | undefined) || []) {
      out.push({
        id: `cargo-${c.id}`,
        date: c.data_alteracao,
        type: 'cargo',
        title: `Mudança de cargo: ${c.cargo_anterior ?? '—'} → ${c.cargo_novo ?? '—'}`,
        description: c.motivo || undefined,
        source: 'historico_cargo',
      });
    }

    for (const p of (promocoes as
      | {
          id: string;
          data_vigencia: string;
          motivo?: string;
          salario_anterior?: number | null;
          salario_novo?: number | null;
        }[]
      | undefined) || []) {
      out.push({
        id: `promocao-${p.id}`,
        date: p.data_vigencia,
        type: 'promocao',
        title: 'Promoção',
        description: p.motivo || undefined,
        secondary:
          p.salario_anterior != null && p.salario_novo != null
            ? `De ${formatCurrency(p.salario_anterior)} para ${formatCurrency(p.salario_novo)}`
            : undefined,
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

    for (const f of (ferias as
      { id: string; data_inicio: string; data_fim: string; dias_gozo?: number; status?: string }[] | undefined) || []) {
      out.push({
        id: `ferias-${f.id}`,
        date: f.data_inicio,
        type: 'ferias',
        title: `Férias (${f.status})`,
        description: `${formatDateBR(f.data_inicio)} a ${formatDateBR(f.data_fim)}${f.dias_gozo ? ` · ${f.dias_gozo} dias` : ''}`,
        source: 'ferias',
      });
    }

    for (const a of (afastamentos as
      | { id: string; data_inicio: string; tipo: string; status?: string; data_fim_real?: string | null }[]
      | undefined) || []) {
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

    for (const t of (treinamentos as
      | {
          id: string;
          created_at: string;
          treinamento?: { nome?: string; descricao?: string; data?: string; carga_horaria?: number };
          presente?: boolean;
        }[]
      | undefined) || []) {
      if (!t.presente) continue;
      out.push({
        id: `treinamento-${t.id}`,
        // Data da REALIZAÇÃO do treinamento, não da inscrição: `created_at` é da
        // linha de participação e não muda quando a presença é registrada, o que
        // jogava o curso para o dia (e às vezes o ano) da inscrição.
        date: t.treinamento?.data || t.created_at,
        type: 'treinamento',
        title: `Treinamento: ${t.treinamento?.nome ?? '—'}`,
        description: t.treinamento?.descricao || undefined,
        secondary: t.treinamento?.carga_horaria ? `Carga horária: ${t.treinamento.carga_horaria}h` : undefined,
        source: 'treinamento_participantes',
      });
    }

    // Capacitacoes registradas pela aba Inscricoes. So as CONCLUIDAS entram
    // como evento, datadas pela conclusao; inscricao em andamento nao e um
    // fato da vida do colaborador ainda. O status e TEXT livre, entao a
    // comparacao normaliza caixa e acento.
    for (const i of (inscricoesCursos as
      | {
          id: string;
          status?: string | null;
          data_conclusao?: string | null;
          nota?: number | null;
          curso?: { nome?: string | null; carga_horaria?: number | null } | null;
        }[]
      | undefined) || []) {
      const chave = String(i.status ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (chave !== 'concluido' && chave !== 'concluida') continue;
      if (!i.data_conclusao) continue;
      out.push({
        id: `curso-${i.id}`,
        date: i.data_conclusao,
        type: 'treinamento',
        title: `Curso concluido: ${i.curso?.nome ?? '-'}`,
        description: i.nota != null ? `Nota: ${i.nota}` : undefined,
        secondary: i.curso?.carga_horaria ? `Carga horaria: ${i.curso.carga_horaria}h` : undefined,
        source: 'inscricoes_cursos',
      });
    }

    for (const f of (feedbacks as
      | { id: string; created_at: string; performance?: string | number; nota_geral?: number; status?: string }[]
      | undefined) || []) {
      const notaLabel = f.nota_geral != null ? `Nota geral: ${f.nota_geral}` : undefined;
      // `listarFeedbacks` NÃO filtra status e `feedbacks_360.status` é TEXT
      // livre (default 'pendente'), então rotular tudo como "concluído"
      // mostrava avaliação recém-criada como finalizada. O rótulo vem de
      // `statusCanonico`, o MESMO normalizador que a área de Avaliações usa:
      // ele reconhece as 7 variações de conclusão ('finalizado', 'aprovada',
      // 'validado'...), as de revisão e cancelamento, e preserva o texto
      // original quando o status é desconhecido, em vez de inventar um estado.
      // Normalizar aqui por conta própria faria a Timeline contradizer a tela
      // de Avaliações para o MESMO registro.
      const tituloFeedback = `Feedback 360 — ${statusCanonico(f.status).rotulo}`;
      out.push({
        id: `avaliacao-${f.id}`,
        date: f.created_at,
        type: 'avaliacao',
        title: tituloFeedback,
        description:
          [notaLabel, f.performance != null ? String(f.performance) : undefined].filter(Boolean).join(' · ') ||
          undefined,
        source: 'feedbacks_360',
      });
    }

    // EVENTOS DA JORNADA DE ONBOARDING (FASE 10) — "jornada iniciada",
    // "tarefa concluída" e "jornada concluída" DERIVADOS do modelo canônico.
    // Substitui o laço antigo que listava apenas as tarefas concluídas do
    // MODELO B: agora o início e o fechamento da jornada também aparecem, sem
    // nenhum evento duplicado (1 ação = 1 evento lógico). A trilha técnica
    // campo-a-campo continua em `public.audit_log`.
    for (const evento of eventosLegiveisDaJornada(registroJornada, tarefasJornada)) {
      out.push({
        id: evento.id,
        date: evento.date,
        type: 'onboarding',
        title: evento.title,
        description: evento.description,
        source: evento.source,
      });
    }

    for (const m of (medidas as
      { id: string; data_ocorrencia: string; tipo: string; gravidade?: string }[] | undefined) || []) {
      out.push({
        id: `medida-${m.id}`,
        date: m.data_ocorrencia,
        type: 'medida_disciplinar',
        title: `Medida disciplinar: ${m.tipo}`,
        description: m.gravidade || undefined,
        source: 'medidas_disciplinares',
      });
    }

    for (const d of (desligamentos as
      { id: string; data_desligamento: string; status?: string; motivo?: string }[] | undefined) || []) {
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

    for (const log of (auditLogs as
      | {
          id: string;
          acao: string;
          user_email?: string;
          created_at: string;
          campos_alterados?: string[];
          dados_anteriores?: Record<string, unknown> | null;
          dados_novos?: Record<string, unknown> | null;
        }[]
      | undefined) || []) {
      // `get_audit_trail` devolve também os acessos gravados por
      // `useDataAccessLog` (acao 'VISUALIZACAO', mesma tabela e registro_id) —
      // em produção já existem 8 desses em audit_log para 'colaboradores'. Eles
      // não são eventos da vida do colaborador, e o mapeamento anterior tratava
      // tudo que não fosse INSERT/UPDATE como exclusão: abrir o dossiê passava a
      // exibir "Registro excluído". Só as três ações de mudança entram aqui.
      const acao = String(log.acao ?? '').toUpperCase();
      if (acao !== 'INSERT' && acao !== 'UPDATE' && acao !== 'DELETE') continue;
      const alteracoes = (log.campos_alterados || [])
        .map((campo) => ({ campo, de: log.dados_anteriores?.[campo], para: log.dados_novos?.[campo] }))
        .filter((c) => c.de !== c.para);
      out.push({
        id: `auditoria-${log.id}`,
        date: log.created_at,
        type: 'auditoria',
        title: acao === 'INSERT' ? 'Registro criado' : acao === 'UPDATE' ? 'Cadastro atualizado' : 'Registro excluído',
        description: acao === 'UPDATE' ? `${alteracoes.length} campo(s) alterado(s)` : undefined,
        secondary: log.user_email ? `Por ${log.user_email}` : undefined,
        source: 'audit_log',
        auditDetail: { acao, userEmail: log.user_email, alteracoes },
      });
    }

    // Ordena pelo INSTANTE, nao pela string: a lista mistura datas sem horario
    // (`2026-11-17`) e timestamps UTC (`2026-11-17T01:00:00+00:00`). Em
    // America/Sao_Paulo o segundo e 16/11 as 22h, ou seja ANTERIOR ao primeiro,
    // mas vinha na frente na comparacao textual. Alem de desordenar as linhas,
    // isso fazia a sidebar — que usa `allEvents[0]` — apontar o evento errado
    // como ultima atualizacao.
    out.sort((a, b) => dataLocalDoEvento(b.date).getTime() - dataLocalDoEvento(a.date).getTime());
    return out;
  }, [
    colaboradorId,
    colaborador,
    vinculos,
    historicoSalarial,
    historicoContratos,
    historicoCargo,
    promocoes,
    transferencias,
    ferias,
    afastamentos,
    treinamentos,
    inscricoesCursos,
    feedbacks,
    registroJornada,
    tarefasJornada,
    medidas,
    desligamentos,
    auditLogs,
    excluirContrato,
  ]);

  return {
    events,
    isLoading,
    isError,
    colaborador: colaborador as
      { data_admissao?: string; status?: string; tipo_contrato?: string; empresa_id?: string } | null | undefined,
    criarSalario: criarSalarial.mutateAsync,
    criandoSalario: criarSalarial.isPending,
    criarContrato,
    excluirContrato,
  };
}
