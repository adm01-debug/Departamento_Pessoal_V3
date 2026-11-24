/**
 * ============================================================================
 * PADRONIZAÇÃO DA INTERFACE — card e modal em TODOS os ciclos/tipos/estados.
 *
 * A matriz cobre o que efetivamente existe no projeto:
 *   • ciclo antigo (encerrado) × ciclo novo × status pendente/concluído;
 *   • gestor / par / auto / subordinado;
 *   • conteúdo completo × parcialmente preenchido;
 *   • gestor atribuído × sem gestor.
 * O que se verifica é a ESTRUTURA (regiões e controles), não o conteúdo — este
 * muda com o dado, aquela não.
 * ============================================================================
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'uid-gestor', roles: ['gestor'] },
    isAdmin: false,
    hasRole: (role: string) => role === 'gestor',
  }),
}));

vi.mock('@/services/avaliacaoService', () => ({
  avaliacaoService: {
    finalizarFeedback: vi.fn(),
    validarPotencialAvaliacao: vi.fn(),
    listarValidacoesPotencial: vi.fn().mockResolvedValue([]),
    listarVersoesAvaliacao: vi.fn().mockResolvedValue([]),
    listarVinculos: vi.fn().mockResolvedValue([]),
    decidirAprovacaoGestor: vi.fn(),
  },
}));

import { FeedbackCard } from '@/components/avaliacao/FeedbackCard';
import { FeedbackDetalheDialog } from '@/components/avaliacao/FeedbackDetalheDialog';
import { derivarFeedbacks } from '@/components/avaliacao/feedbacksComum';
import { normalizarFeedback, type FeedbackCanonico } from '@/components/avaliacao/feedbackCanonico';
import type { PendenciaAprovacao } from '@/components/avaliacao/aprovacaoGestor';

/** Registro no formato real. */
function bruto(extra: Record<string, unknown> = {}) {
  return {
    id: 'f1',
    empresa_id: 'emp-1',
    ciclo_id: 'ciclo-1',
    avaliado_id: 'colab-1',
    avaliador_id: 'colab-2',
    tipo: 'gestor',
    nota_geral: 4,
    potencial: 5,
    status: 'concluido',
    pontos_fortes: 'Entrega consistente',
    pontos_melhoria: 'Delegação',
    comentarios: 'Ciclo fechado no prazo',
    avaliado: { nome_completo: 'Ana Souza' },
    avaliador: { nome_completo: 'Bruno Lima' },
    created_at: '2026-10-01T12:00:00.000Z',
    ...extra,
  };
}

function linha(extra: Partial<PendenciaAprovacao> = {}): PendenciaAprovacao {
  return {
    id: 'ciclo-1::colab-1',
    origem: 'real',
    colaboradorId: 'colab-1',
    colaborador: 'Ana Souza',
    cargo: 'Analista',
    departamento: 'RH',
    cicloId: 'ciclo-1',
    cicloNome: 'Ciclo S1 2026',
    gestorResponsavel: 'Bruno Lima',
    gestorResponsavelId: 'colab-2',
    gestorResponsavelUserId: 'u-bruno',
    responsavel: true,
    fontes: { gestor: 1, par: 0, auto: 0, subordinado: 0 },
    avaliacaoGestorValida: true,
    motivoBloqueioAprovacao: null,
    aprovacaoInvalidada: false,
    impedimentoEnvio: null,
    feedbackId: 'f1',
    feedback: bruto(),
    versaoAvaliacao: 'v1',
    desempenho: 4,
    potencial: 5,
    enviadoEm: null,
    justificativa: null,
    decididoEm: null,
    status: 'aguardando_gestor',
    estado: {
      pendente: true,
      status: 'aguardando_gestor',
      versaoAvaliacao: 'v1',
      rotulo: 'Aguardando gestor',
      tom: 'border-warning/45 bg-warning/20 text-warning',
      iniciada: true,
      justificativa: null,
      decididoEm: null,
      gestorIdentificado: true,
      avaliacaoGestorValida: true,
      aprovacaoPermitida: true,
      motivoBloqueio: null,
      aprovacaoInvalidada: false,
      podeValidarPotencial: false,
      elegivelNineBox: false,
      podeDecidir: true,
    },
    quadrante: null,
    motivoNaoClassificado: null,
    ...extra,
  };
}

function canonico(
  extra: Record<string, unknown> = {},
  pendenciaExtra: Partial<PendenciaAprovacao> = {}
): FeedbackCanonico {
  const p = linha({ feedback: bruto(extra), ...pendenciaExtra });
  const derivado = derivarFeedbacks([p.feedback], {
    colaboradores: [{ id: 'colab-1', nome_completo: 'Ana Souza', cargo: 'Analista', departamento: 'RH' }],
    ciclos: [{ id: 'ciclo-1', nome: p.cicloNome, data_fim: '2026-06-30' }],
  })[0];
  return normalizarFeedback(derivado, {
    cicloNome: p.cicloNome,
    pendencia: p,
    papeis: ['gestor'],
    acoesHabilitadas: true,
    podeVerColaborador: true,
  });
}

const REGIOES = ['Gestor responsável', 'Avaliado por', 'Desempenho', 'Potencial'];
const ACOES_LISTA = ['Editar feedback'];
const ACOES_PROIBIDAS_NA_LISTA = ['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação', 'Enviar ao gestor'];

describe('card canônico — mesma estrutura em qualquer ciclo/tipo/status', () => {
  const cenarios: { nome: string; item: FeedbackCanonico }[] = [
    {
      nome: 'ciclo antigo encerrado · gestor · concluído',
      item: canonico({ ciclo_id: 'ciclo-0', tipo: 'gestor', status: 'concluido' }, { cicloNome: 'Ciclo 2024' }),
    },
    {
      nome: 'ciclo atual · par · concluído',
      item: canonico({ tipo: 'par', status: 'concluido' }),
    },
    {
      nome: 'ciclo novo · autoavaliação · pendente',
      item: canonico({ tipo: 'auto', status: 'pendente' }),
    },
    {
      nome: 'subordinado · em revisão',
      item: canonico({ tipo: 'subordinado', status: 'em revisao' }),
    },
    {
      nome: 'sem gestor atribuído',
      item: canonico({}, { gestorResponsavel: 'Não identificado', gestorResponsavelId: null, status: 'sem_gestor' }),
    },
    {
      nome: 'conteúdo parcialmente preenchido',
      item: canonico({ pontos_fortes: '', pontos_melhoria: null, comentarios: '', potencial: 0 }),
    },
  ];

  cenarios.forEach(({ nome, item }) => {
    it(`mantém regiões e controles — ${nome}`, () => {
      render(
        <FeedbackCard item={item} onEditar={() => {}} onFiltrarAvaliado={() => {}} onFiltrarAvaliador={() => {}} />
      );

      REGIOES.forEach((rotulo) => expect(screen.getByText(rotulo)).toBeInTheDocument());
      ACOES_LISTA.forEach((rotulo) => expect(screen.getByRole('button', { name: rotulo })).toBeInTheDocument());
      // NENHUM controle de aprovação nos filtros normais.
      ACOES_PROIBIDAS_NA_LISTA.forEach((rotulo) => expect(screen.queryByRole('button', { name: rotulo })).toBeNull());
      expect(screen.getByText('Ana Souza')).toBeInTheDocument();
      expect(screen.getAllByText('Bruno Lima').length).toBeGreaterThan(0);
    });
  });

  it('sem gestor: mostra "Não identificado" no gestor e mantém o AVALIADOR separado', () => {
    render(
      <FeedbackCard
        item={canonico({}, { gestorResponsavel: 'Não identificado', gestorResponsavelId: null })}
        onEditar={() => {}}
      />
    );
    expect(screen.getByText('Não identificado')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
  });

  it('conteúdo vazio não quebra o card e usa o texto padronizado', () => {
    render(
      <FeedbackCard
        item={canonico({ comentarios: '', pontos_fortes: '', nota_geral: 0, potencial: 0 })}
        onEditar={() => {}}
      />
    );
    expect(screen.getByText(/Sem texto registrado\./)).toBeInTheDocument();
    expect(screen.getByText('Sem nota')).toBeInTheDocument();
    expect(screen.getByText('Não atribuído')).toBeInTheDocument();
  });
});

describe('modal canônico — mesmos campos para registro antigo e novo', () => {
  function abrir(item: FeedbackCanonico) {
    return render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <FeedbackDetalheDialog item={item} aberto onOpenChange={() => {}} onFiltrarAvaliado={() => {}} />
      </QueryClientProvider>
    );
  }

  it('registro histórico VAZIO mantém as três seções, com "Não informado"', () => {
    abrir(canonico({ pontos_fortes: '', pontos_melhoria: '', comentarios: '', potencial: 0 }));

    ['Pontos fortes', 'Pontos de melhoria', 'Comentários'].forEach((titulo) => {
      expect(screen.getByText(titulo)).toBeInTheDocument();
    });
    expect(screen.getAllByText('Não informado').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/Informações complementares/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver só deste colaborador/ })).toBeInTheDocument();
  });

  it('registro completo mostra o conteúdo e NÃO exibe aprovação no contexto de listagem', () => {
    abrir(canonico());

    expect(screen.getByText('Entrega consistente')).toBeInTheDocument();
    expect(screen.getByText('Delegação')).toBeInTheDocument();
    expect(screen.getByText('Ciclo fechado no prazo')).toBeInTheDocument();
    // O modal é compartilhado, mas a etapa `avaliacoes` não oferece decisão.
    expect(screen.queryByRole('button', { name: 'Aprovar avaliação' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Devolver para correção' })).toBeNull();
  });

  it('gestor responsável e avaliador aparecem em caixas distintas', () => {
    abrir(canonico({}, { gestorResponsavel: 'Mariana Oliveira' }));

    expect(screen.getByText('Avaliado por')).toBeInTheDocument();
    expect(screen.getByText('Gestor responsável')).toBeInTheDocument();
    expect(screen.getByText('Mariana Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
  });
});
