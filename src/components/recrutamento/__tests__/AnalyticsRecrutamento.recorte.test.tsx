import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { criarCandidatura, criarVaga } from './candidatosFixture';

/**
 * Ligações da barra de recorte dentro da aba: os três controles existem e o
 * "Exportar" baixa o CSV do que está na tela. A matemática do recorte vive em
 * `analyticsFiltros.test.ts` (funções puras); aqui só se prova que a aba usa a
 * barra e o relatório — nenhuma interação com `Select` do Radix, que no jsdom
 * depende de APIs de ponteiro que o navegador real tem e o teste não.
 */
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="grafico">{children}</div>,
  ComposedChart: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import { AnalyticsRecrutamento } from '../AnalyticsRecrutamento';

const createObjectURL = vi.fn((_blob: Blob) => 'blob:fake');
const revokeObjectURL = vi.fn();

beforeAll(() => {
  Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterAll(() => {
  createObjectURL.mockClear();
});

function cenario() {
  const vaga = criarVaga({
    id: 'vaga-1',
    titulo: 'Desenvolvedor(a) Full Stack Sênior',
    status: 'aberta',
    data_abertura: '2026-08-01',
    created_at: '2026-08-01T12:00:00Z',
  });
  const triagem = criarCandidatura({
    id: 'candt-1',
    etapa: 'triagem',
    vaga_id: 'vaga-1',
    created_at: '2026-08-03T12:00:00Z',
    updated_at: '2026-08-03T12:00:00Z',
  });
  return {
    candidaturas: [triagem],
    vagas: [vaga],
    candidatos: [triagem.candidato!],
  };
}

describe('AnalyticsRecrutamento — barra de recorte', () => {
  it('mostra período, vaga e Exportar junto do título', () => {
    render(<AnalyticsRecrutamento {...cenario()} />);

    expect(screen.getByRole('combobox', { name: 'Período do recorte' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Vaga do recorte' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
    // Padrão do módulo: base inteira, todas as vagas.
    expect(document.body.textContent).toContain('Todo o período');
    expect(document.body.textContent).toContain('Todas as vagas');
  });

  it('não oferece recorte nem exportação quando a leitura falhou', () => {
    render(<AnalyticsRecrutamento {...cenario()} erro="Não foi possível consultar as candidaturas." />);

    expect(screen.queryByRole('button', { name: 'Exportar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Período do recorte' })).not.toBeInTheDocument();
  });

  it('Exportar baixa o CSV do recorte que está na tela', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<AnalyticsRecrutamento {...cenario()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    expect(click).toHaveBeenCalledTimes(1);
    const blob: Blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/csv;charset=utf-8;');
    const csv = await blob.text();
    expect(csv.replace(/\uFEFF/, '').split(/\r?\n/)[0]).toBe('Bloco,Indicador,Valor,Detalhe');
    expect(csv).toContain('Total de candidatos');
    click.mockRestore();
  });
});
