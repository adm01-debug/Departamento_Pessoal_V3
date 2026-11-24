import type { ReactNode } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Prova do limite de vencimento do card "Prazos e Alertas".
 *
 * A data de validade é uma coluna `date` (`yyyy-MM-dd`). Lida com
 * `new Date(string)` ela vira meia-noite UTC: em America/Sao_Paulo (UTC-3)
 * o documento que vence HOJE passava a contar -1 dia e aparecia como
 * "Vencido". O relógio é congelado porque o bug só aparece em fuso negativo
 * e perto da virada do dia — nunca no CI, que roda em UTC.
 */
vi.mock('@/hooks', () => ({
  useDocumentosPessoais: vi.fn(() => ({ data: DOCS_PESSOAIS, isLoading: false })),
  useDocumentos: vi.fn(() => ({ documentos: [], isLoading: false })),
}));

vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));
vi.mock('@/components/colaborador-detalhes/documentos/PrazosAlertasDialog', () => ({
  PrazosAlertasDialog: () => null,
}));

const DOCS_PESSOAIS = [
  { id: 'hoje', tipo_documento: 'CNH', data_validade: '2026-03-15' },
  { id: 'ontem', tipo_documento: 'RG', data_validade: '2026-03-14' },
  { id: 'em30', tipo_documento: 'Passaporte', data_validade: '2026-04-14' },
];

const PrazosAlertasCard = (await import('@/components/colaborador-detalhes/documentos/PrazosAlertasCard'))
  .PrazosAlertasCard;

// 15/03/2026 às 21:00 local (UTC-3) = 16/03 00:00 UTC: o pior instante do dia
// para quem lê a data em UTC.
const AGORA = new Date(2026, 2, 15, 21, 0, 0);

describe('PrazosAlertasCard — limite de vencimento no fuso local', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AGORA);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('não marca como vencido o documento que vence hoje', () => {
    render((<PrazosAlertasCard colaboradorId="col-1" />) as ReactNode);
    expect(screen.getByText(/Vence em 0 dias \(15\/03\/2026\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Venceu em 15\/03\/2026/)).toBeNull();
  });

  it('marca como vencido o documento de ontem e formata a data em pt-BR', () => {
    render((<PrazosAlertasCard colaboradorId="col-1" />) as ReactNode);
    expect(screen.getByText('Venceu em 14/03/2026')).toBeInTheDocument();
  });

  it('conta os dias restantes pela data local, não pelo instante UTC', () => {
    render((<PrazosAlertasCard colaboradorId="col-1" />) as ReactNode);
    expect(screen.getByText(/Vence em 30 dias \(14\/04\/2026\)/)).toBeInTheDocument();
  });
});
