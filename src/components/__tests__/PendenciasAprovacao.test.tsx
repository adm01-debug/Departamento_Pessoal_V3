/**
 * ============================================================================
 * CARD DA FILA "AGUARDANDO GESTOR" — conjunto de controles padronizado.
 *
 * O que esta suíte fixa (regra de 19/10/2026, ajustada em 20/10/2026):
 *   • Ver existe sempre; Devolver/Aprovar existem para o gestor (mesmo quando
 *     bloqueados, com o motivo no `title`);
 *   • RH/admin NÃO recebem Aprovar/Devolver — a etapa do gestor é somente leitura;
 *   • a autorização real continua no servidor: desabilitado ≠ liberado;
 *   • ENVIAR (RH/admin) aparece para quem tem o papel — também com estado
 *     desabilitado quando fora da etapa.
 *   • A aprovação do gestor é a decisão final; o controle legado de validação
 *     do RH não é oferecido no fluxo novo.
 * ============================================================================
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { PendenciasAprovacao } from '../avaliacao/PendenciasAprovacao';
import { estadoAprovacao, type PendenciaAprovacao } from '../avaliacao/aprovacaoGestor';

/** Linha da fila como a derivação a entrega (campos completos). */
function linha(over: Partial<PendenciaAprovacao> = {}): PendenciaAprovacao {
  const base: PendenciaAprovacao = {
    id: 'ciclo-1::colab-1',
    origem: 'real',
    colaboradorId: 'colab-1',
    colaborador: 'Ana Souza',
    cargo: 'Analista',
    departamento: 'RH',
    cicloId: 'ciclo-1',
    cicloNome: 'Ciclo S2 2026',
    gestorResponsavel: 'Bruno Lima',
    gestorResponsavelId: 'colab-2',
    gestorResponsavelUserId: 'u-bruno',
    responsavel: true,
    fontes: { gestor: 1, par: 1, auto: 1, subordinado: 0 },
    avaliacaoGestorValida: true,
    motivoBloqueioAprovacao: null,
    aprovacaoInvalidada: false,
    impedimentoEnvio: null,
    feedbackId: 'fb-real-1',
    feedback: {
      avaliado_id: 'colab-1',
      ciclo_id: 'ciclo-1',
      tipo: 'gestor',
      status: 'concluido',
      nota_geral: 4,
      potencial: 5,
    },
    versaoAvaliacao: 'v1',
    desempenho: 4,
    potencial: 5,
    enviadoEm: '2026-10-10T10:00:00.000Z',
    justificativa: null,
    decididoEm: null,
    status: 'aguardando_gestor',
    estado: estadoAprovacao({ versaoGestor: 'v1', decisao: null, validada: false, responsavel: true }),
    quadrante: null,
    motivoNaoClassificado: null,
  };
  return { ...base, ...over };
}

function renderizar(p: PendenciaAprovacao, papeis: string[] = ['gestor']) {
  return render(
    <PendenciasAprovacao pendencias={[p]} papel={papeis[0]} papeis={papeis} acoesHabilitadas modo="real" />
  );
}

const rotulos = () => screen.getAllByRole('button').map((b) => b.textContent?.trim() ?? '');
const botao = (nome: string) => screen.getByRole('button', { name: nome });
const consulta = (nome: string) => screen.queryByRole('button', { name: nome });

describe('fila de aprovação — controles padronizados por vínculo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registro REAL com vínculo provado: Ver, Devolver e Aprovar habilitados (nesta ordem)', () => {
    renderizar(linha());
    expect(rotulos()).toEqual(['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação']);
    expect(botao('Devolver para correção')).toBeEnabled();
    expect(botao('Aprovar avaliação')).toBeEnabled();
  });

  it('registro REAL SEM o vínculo: os controles continuam VISÍVEIS, porém desabilitados', () => {
    renderizar(linha({ responsavel: false }));
    expect(rotulos()).toEqual(['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação']);
    expect(botao('Aprovar avaliação')).toBeDisabled();
    expect(botao('Devolver para correção')).toBeDisabled();
    expect(botao('Aprovar avaliação')).toHaveAttribute('title', expect.stringContaining('gestor responsável'));
  });

  it('registro REAL com vínculo não avaliável (`null`): falha fechado (desabilitado, não oculto)', () => {
    renderizar(linha({ responsavel: null }));
    expect(rotulos()).toEqual(['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação']);
    expect(botao('Aprovar avaliação')).toBeDisabled();
  });

  it('registro DEMONSTRATIVO (`mock-*`) mantém a leitura por PAPEL (vitrine preservada)', () => {
    renderizar(linha({ feedbackId: 'mock-fb-1', responsavel: null }), ['gestor']);
    expect(rotulos()).toEqual(['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação']);
    expect(botao('Aprovar avaliação')).toBeEnabled();
  });

  it('registro criado na vitrine (`demo-*`) segue a MESMA régua do `mock-*`', () => {
    renderizar(linha({ feedbackId: 'demo-feedback-1', responsavel: null }), ['gestor']);
    expect(rotulos()).toEqual(['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação']);
    expect(botao('Aprovar avaliação')).toBeEnabled();
  });

  it('registro DEMONSTRATIVO com vínculo DESMENTIDO: visível e desabilitado', () => {
    renderizar(linha({ feedbackId: 'mock-fb-1', responsavel: false }), ['gestor']);
    expect(rotulos()).toEqual(['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação']);
    expect(botao('Aprovar avaliação')).toBeDisabled();
  });
});

describe('fila de aprovação — ações por papel e por etapa', () => {
  beforeEach(() => vi.clearAllMocks());

  it('o RH NÃO vê aprovar nem devolver (decisão exclusiva do gestor responsável)', () => {
    renderizar(linha(), ['rh']);
    // Encaminhamento é AUTOMÁTICO nesta etapa: "Enviar" não ocupa a linha.
    expect(rotulos()).toEqual(['Ver avaliação']);
    expect(consulta('Devolver para correção')).toBeNull();
    expect(consulta('Aprovar avaliação')).toBeNull();
  });

  it('RH com o gestor identificado pode ENVIAR ao gestor', () => {
    renderizar(
      linha({
        status: 'em_preparacao',
        versaoAvaliacao: null,
        estado: estadoAprovacao({ versaoGestor: null, decisao: null, validada: false, responsavel: true }),
      }),
      ['rh']
    );
    expect(botao('Enviar ao gestor')).toBeEnabled();
    expect(consulta('Aprovar avaliação')).toBeNull();
  });

  it('sem gestor identificado o RH NÃO envia (impedimento explícito no title)', () => {
    renderizar(
      linha({
        status: 'em_preparacao',
        versaoAvaliacao: null,
        gestorResponsavel: 'Não identificado',
        gestorResponsavelId: null,
        gestorResponsavelUserId: null,
        impedimentoEnvio: 'Gestor responsável não identificado (colaborador sem supervisor_id)',
      }),
      ['rh']
    );
    expect(botao('Enviar ao gestor')).toBeDisabled();
    expect(botao('Enviar ao gestor')).toHaveAttribute('title', expect.stringContaining('não identificado'));
  });

  it('aprovada pelo gestor: NÃO existe terceira validação do RH', () => {
    renderizar(
      linha({
        status: 'aprovada_gestor',
        estado: estadoAprovacao({
          versaoGestor: 'v1',
          decisao: { decisao: 'aprovado', versao_avaliacao: 'v1' },
          validada: false,
        }),
      }),
      ['rh']
    );
    expect(consulta('Validar Potencial')).toBeNull();
    expect(consulta('Aprovar avaliação')).toBeNull();
  });

  it('T10: sem a avaliação do Gestor a pendência aparece e a decisão fica BLOQUEADA', () => {
    renderizar(
      linha({
        avaliacaoGestorValida: false,
        motivoBloqueioAprovacao: null,
        estado: estadoAprovacao({
          versaoGestor: 'v1',
          decisao: null,
          validada: false,
          responsavel: true,
          avaliacaoGestorValida: false,
        }),
      })
    );

    expect(rotulos()).toEqual(['Ver avaliação', 'Devolver para correção', 'Aprovar avaliação']);
    expect(botao('Aprovar avaliação')).toBeDisabled();
    expect(botao('Devolver para correção')).toBeDisabled();
    expect(botao('Aprovar avaliação')).toHaveAttribute('title', expect.stringMatching(/Desempenho e Potencial/i));
  });

  it('`sem_gestor`: a aprovação é bloqueada para QUALQUER papel (inclusive RH/admin)', () => {
    renderizar(
      linha({
        status: 'sem_gestor',
        gestorResponsavelId: null,
        gestorResponsavelUserId: null,
        gestorResponsavel: 'Não identificado',
        avaliacaoGestorValida: false,
        impedimentoEnvio: 'Gestor responsável não identificado (colaborador sem supervisor_id)',
        estado: estadoAprovacao({
          versaoGestor: 'v1',
          decisao: null,
          validada: false,
          responsavel: false,
          gestorIdentificado: false,
        }),
      }),
      ['rh']
    );
    expect(rotulos()).toEqual(['Ver avaliação']);
    // O status identifica a pendência de ATRIBUIÇÃO…
    expect(screen.getByText(/Gestor não atribuído/i)).toBeInTheDocument();
    // …e a decisão não é oferecida ao RH (exclusiva do gestor).
    expect(consulta('Devolver para correção')).toBeNull();
    expect(consulta('Aprovar avaliação')).toBeNull();
  });

  it('`sem_gestor` + gestor fora de escopo (sem vínculo): bloqueado com motivo', () => {
    renderizar(
      linha({
        status: 'sem_gestor',
        gestorResponsavelId: null,
        gestorResponsavelUserId: null,
        gestorResponsavel: 'Não identificado',
        avaliacaoGestorValida: false,
        estado: estadoAprovacao({
          versaoGestor: 'v1',
          decisao: null,
          validada: false,
          responsavel: false,
          gestorIdentificado: false,
        }),
      }),
      ['gestor']
    );
    expect(botao('Devolver para correção')).toBeDisabled();
    expect(botao('Aprovar avaliação')).toBeDisabled();
    expect(botao('Aprovar avaliação')).toHaveAttribute('title', expect.stringMatching(/Gestor responsável não/i));
  });

  it('"Enviar ao gestor" só existe nas etapas em que o envio manual faz sentido', () => {
    const { unmount } = renderizar(linha({ status: 'em_preparacao', versaoAvaliacao: null }), ['rh']);
    expect(consulta('Enviar ao gestor')).not.toBeNull();
    unmount();

    renderizar(linha(), ['rh']); // aguardando_gestor (envio automático)
    expect(consulta('Enviar ao gestor')).toBeNull();
  });

  it('mostra a prévia dos textos da AVALIAÇÃO DO GESTOR na fila', () => {
    renderizar(
      linha({
        feedback: {
          id: 'fb-real-1',
          avaliado_id: 'colab-1',
          ciclo_id: 'ciclo-1',
          tipo: 'gestor',
          status: 'concluido',
          nota_geral: 4,
          potencial: 5,
          pontos_fortes: 'Entrega consistente',
          pontos_melhoria: 'Delegar mais',
          comentarios: 'Ciclo fechado no prazo',
        },
      })
    );

    expect(screen.getByText('Fortes:')).toBeInTheDocument();
    expect(screen.getByText('Entrega consistente')).toBeInTheDocument();
    expect(screen.getByText('Melhoria:')).toBeInTheDocument();
    expect(screen.getByText('Delegar mais')).toBeInTheDocument();
    expect(screen.getByText('Comentários:')).toBeInTheDocument();
    expect(screen.getByText('Ciclo fechado no prazo')).toBeInTheDocument();
  });

  it('expõe os três campos de Par/Auto/Subordinado na fila (sem filtro por tipo)', () => {
    renderizar(
      linha({
        feedback: {
          id: 'fb-par-1',
          avaliado_id: 'colab-1',
          ciclo_id: 'ciclo-1',
          tipo: 'par',
          status: 'concluido',
          nota_geral: 4,
          potencial: 4,
          pontos_fortes: 'Relato do par: entrega',
          pontos_melhoria: 'Relato do par: delegação',
          comentarios: 'Relato do par: comentário',
        },
      })
    );

    expect(screen.getByText('Fortes:')).toBeInTheDocument();
    expect(screen.getByText('Relato do par: entrega')).toBeInTheDocument();
    expect(screen.getByText('Melhoria:')).toBeInTheDocument();
    expect(screen.getByText('Relato do par: delegação')).toBeInTheDocument();
    expect(screen.getByText('Comentários:')).toBeInTheDocument();
    expect(screen.getByText('Relato do par: comentário')).toBeInTheDocument();
  });

  it('campos vazios continuam com os três rótulos e usam "Não informado"', () => {
    renderizar(
      linha({
        feedback: {
          id: 'fb-vazio-1',
          avaliado_id: 'colab-1',
          ciclo_id: 'ciclo-1',
          tipo: 'auto',
          status: 'pendente',
          nota_geral: 0,
          potencial: 0,
          pontos_fortes: '',
          pontos_melhoria: null,
          comentarios: undefined,
        },
      })
    );

    expect(screen.getByText('Fortes:')).toBeInTheDocument();
    expect(screen.getByText('Melhoria:')).toBeInTheDocument();
    expect(screen.getByText('Comentários:')).toBeInTheDocument();
    expect(screen.getAllByText('Não informado').length).toBeGreaterThanOrEqual(3);
  });

  it('vários relatos preservam autoria e não são misturados nem reduzidos ao último', () => {
    renderizar(
      linha({
        feedback: {
          id: 'fb-gestor-1',
          avaliado_id: 'colab-1',
          ciclo_id: 'ciclo-1',
          tipo: 'gestor',
          status: 'concluido',
          nota_geral: 4,
          potencial: 5,
        },
        relatos: [
          {
            id: 'fb-gestor-1',
            tipo: 'gestor',
            tipoRotulo: 'Gestor',
            avaliador: 'Bruno Lima',
            pontos_fortes: 'Gestor: forte A',
            pontos_melhoria: 'Gestor: melhoria A',
            comentarios: 'Gestor: comentário A',
          },
          {
            id: 'fb-par-1',
            tipo: 'par',
            tipoRotulo: 'Par',
            avaliador: 'Carla Souza',
            pontos_fortes: 'Par: forte B',
            pontos_melhoria: 'Par: melhoria B',
            comentarios: 'Par: comentário B',
          },
        ],
      })
    );

    expect(screen.getByText('Gestor · Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('Par · Carla Souza')).toBeInTheDocument();
    expect(screen.getByText('Gestor: forte A')).toBeInTheDocument();
    expect(screen.getByText('Par: forte B')).toBeInTheDocument();
    expect(screen.getByText('Gestor: comentário A')).toBeInTheDocument();
    expect(screen.getByText('Par: comentário B')).toBeInTheDocument();
    expect(screen.queryByText('Gestor: forte A Par: forte B')).toBeNull();
  });

  it('texto longo mantém o valor completo no title (tooltip) sem estourar o card', () => {
    const longo = `Fortes ${'muito '.repeat(60)}`.trim();
    renderizar(
      linha({
        feedback: {
          id: 'fb-longo-1',
          avaliado_id: 'colab-1',
          ciclo_id: 'ciclo-1',
          tipo: 'gestor',
          status: 'concluido',
          nota_geral: 4,
          potencial: 5,
          pontos_fortes: longo,
          pontos_melhoria: 'Curta',
          comentarios: 'Curto',
        },
      })
    );
    expect(screen.getByTitle(longo)).toBeInTheDocument();
  });
  it('nenhum botão obrigatório desaparece quando muda o status', () => {
    ['aguardando_gestor', 'aprovada_gestor', 'devolvida', 'em_preparacao', 'sem_gestor'].forEach((status) => {
      const { unmount } = renderizar(linha({ status: status as PendenciaAprovacao['status'] }));
      expect(consulta('Ver avaliação')).not.toBeNull();
      expect(consulta('Devolver para correção')).not.toBeNull();
      expect(consulta('Aprovar avaliação')).not.toBeNull();
      unmount();
    });
  });
});
