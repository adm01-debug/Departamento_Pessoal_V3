import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { HistoricoFeedbackDialog } from '@/components/avaliacao/HistoricoFeedbackDialog';
import {
  eventosDemoDoFeedback,
  formatarDataHoraHistorico,
  normalizarHistorico,
  resumoCancelamento,
} from '@/components/avaliacao/historicoFeedback';
import { estadoRegistrosVazio, type EventoDemo } from '@/components/avaliacao/desempenhoDemoStore';
import type { FeedbackCanonico } from '@/components/avaliacao/feedbackCanonico';

const ITEM = {
  avaliado: 'Ana Souza',
  cicloNome: { estado: 'informado', valor: 'Ciclo S1 2026' },
} as unknown as FeedbackCanonico;

function evento(extra: Partial<EventoDemo> = {}): EventoDemo {
  return {
    em: '2026-10-01T12:00:00.000Z',
    entidade: 'feedbacks',
    operacao: 'status',
    id: 'demo-fb-1',
    descricao: 'Evento',
    dados: {},
    por: 'rh@exemplo.invalid',
    ...extra,
  };
}

describe('histórico — normalização e resumo', () => {
  it('ordena cronologicamente e descarta tipo desconhecido', () => {
    const eventos = normalizarHistorico([
      { id: '2', tipo: 'aprovado', ocorrido_em: '2026-10-02T12:00:00Z' },
      { id: 'x', tipo: 'inexistente', ocorrido_em: '2026-10-03T12:00:00Z' },
      { id: '1', tipo: 'criado', ocorrido_em: '2026-10-01T12:00:00Z' },
    ]);
    expect(eventos.map((e) => e.tipo)).toEqual(['criado', 'aprovado']);
  });

  it('resume o ÚLTIMO cancelamento sem inventar motivo/responsável', () => {
    const resumo = resumoCancelamento([
      {
        id: 'c1',
        tipo: 'cancelado',
        ocorridoEm: '2026-10-01T12:00:00Z',
        responsavelId: null,
        responsavelEmail: 'rh@exemplo.invalid',
        responsavelNome: null,
        justificativa: 'Motivo antigo',
        statusAnterior: 'pendente',
        statusPosterior: 'cancelado',
        detalhes: null,
      },
      {
        id: 'c2',
        tipo: 'cancelado',
        ocorridoEm: '2026-10-02T12:00:00Z',
        responsavelId: null,
        responsavelEmail: 'gestor@exemplo.invalid',
        responsavelNome: 'Gestor Regional',
        justificativa: null,
        statusAnterior: 'pendente',
        statusPosterior: 'cancelado',
        detalhes: null,
      },
    ]);
    expect(resumo.motivo).toBeNull();
    expect(resumo.responsavel).toBe('Gestor Regional');
    expect(formatarDataHoraHistorico(resumo.ocorridoEm)).toContain('02/10/2026');
    expect(formatarDataHoraHistorico(null)).toBe('Não registrado');
  });

  it('vitrine: mapeia criação, cancelamento, reabertura e aprovação local', () => {
    const estado = estadoRegistrosVazio();
    estado.historico = [
      evento({ operacao: 'criar', dados: { status: 'pendente' } }),
      evento({
        em: '2026-10-02T12:00:00.000Z',
        dados: { status: 'cancelado', motivo_cancelamento: 'Motivo integral do cancelamento' },
      }),
      evento({
        em: '2026-10-03T12:00:00.000Z',
        dados: { status: 'pendente', justificativa_reabertura: 'Reabertura autorizada' },
      }),
    ];

    const eventos = eventosDemoDoFeedback(
      { id: 'demo-fb-1', avaliado_id: 'c1', ciclo_id: 'k1', status: 'pendente' },
      estado,
      {
        historico: [
          {
            em: '2026-10-04T12:00:00.000Z',
            operacao: 'aprovar',
            colaboradorId: 'c1',
            cicloId: 'k1',
            versaoAvaliacao: 'v1',
            justificativa: null,
            por: 'gestor@exemplo.invalid',
          },
        ],
      }
    );

    expect(eventos.map((e) => e.tipo)).toEqual(['criado', 'cancelado', 'reaberto', 'aprovado']);
    expect(eventos[1].justificativa).toBe('Motivo integral do cancelamento');
    expect(eventos[3].statusPosterior).toBe('aprovada_gestor');
  });
});

describe('modal de histórico', () => {
  it('exibe eventos reais, autoria, data e justificativa longa com "Ver mais"', () => {
    const justificativa = 'J'.repeat(260);
    render(
      <HistoricoFeedbackDialog
        item={ITEM}
        aberto
        onOpenChange={() => {}}
        eventos={[
          {
            id: 'e1',
            tipo: 'cancelado',
            ocorridoEm: '2026-10-02T12:00:00Z',
            responsavelId: null,
            responsavelEmail: 'rh@exemplo.invalid',
            responsavelNome: 'RH Teste',
            justificativa,
            statusAnterior: 'pendente',
            statusPosterior: 'cancelado',
            detalhes: { revisao: 3 },
          },
        ]}
      />
    );

    expect(screen.getByText('Histórico da avaliação')).toBeInTheDocument();
    expect(screen.getByText('Feedback cancelado')).toBeInTheDocument();
    expect(screen.getByText(/Responsável: RH Teste/)).toBeInTheDocument();
    expect(screen.getByText(/Pendente → Cancelado/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver mais' })).toBeInTheDocument();
    expect(screen.getByText(/Revisão: 3/)).toBeInTheDocument();
  });

  it('não inventa evento quando a lista está vazia', () => {
    render(<HistoricoFeedbackDialog item={ITEM} aberto onOpenChange={() => {}} eventos={[]} />);
    expect(screen.getByText('Nenhum evento registrado para esta avaliação.')).toBeInTheDocument();
  });

  it('expande e recolhe o texto longo', () => {
    const justificativa = 'Motivo '.repeat(40);
    render(
      <HistoricoFeedbackDialog
        item={ITEM}
        aberto
        onOpenChange={() => {}}
        eventos={[
          {
            id: 'e1',
            tipo: 'cancelado',
            ocorridoEm: '2026-10-02T12:00:00Z',
            responsavelId: null,
            responsavelEmail: null,
            responsavelNome: null,
            justificativa,
            statusAnterior: null,
            statusPosterior: 'cancelado',
            detalhes: null,
          },
        ]}
      />
    );
    const botao = screen.getByRole('button', { name: 'Ver mais' });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(botao);
    expect(screen.getByRole('button', { name: 'Ver menos' })).toHaveAttribute('aria-expanded', 'true');
  });
});
