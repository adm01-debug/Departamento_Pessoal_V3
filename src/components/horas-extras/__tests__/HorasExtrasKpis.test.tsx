import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HorasExtrasKpis } from '../HorasExtrasKpis';
import type { ResumoDecisoes } from '../horasExtrasComum';

/** Rótulos dos QUATRO indicadores, na ordem definitiva aprovada. */
const ROTULOS = ['Solicitações pendentes', 'Horas aprovadas', 'Total de solicitações', 'Taxa de aprovação'] as const;

const decisoes = (over: Partial<ResumoDecisoes> = {}): ResumoDecisoes => ({
  aprovadas: 6,
  rejeitadas: 1,
  decididas: 7,
  taxa: 86,
  ...over,
});

function renderKpis(over: Partial<Parameters<typeof HorasExtrasKpis>[0]> = {}) {
  return render(
    <HorasExtrasKpis
      pendentes={8}
      horasPendentes={14.5}
      aprovadas={6}
      horasAprovadas={20.5}
      total={20}
      decisoes={decisoes()}
      {...over}
    />
  );
}

/** Títulos de card renderizados, na ordem em que estão no DOM. */
function rotulosNoDom(): string[] {
  return Array.from(document.querySelectorAll('[title]'))
    .map((el) => el.getAttribute('title') ?? '')
    .filter((t) => (ROTULOS as readonly string[]).includes(t));
}

describe('HorasExtrasKpis', () => {
  it('mostra EXATAMENTE os quatro indicadores, na ordem aprovada', () => {
    renderKpis();

    // Quatro — nem três, nem cinco: o período não ocupa mais posição de KPI.
    expect(rotulosNoDom()).toEqual([...ROTULOS]);
  });

  it('não deixa nenhum FILTRO dentro da faixa de indicadores', () => {
    renderKpis();

    // O controle de período desceu para o cabeçalho da fila de aprovação;
    // aqui só pode existir superfície de leitura.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('mantém a estrutura de cada card: valor, rótulo e descrição auxiliar', () => {
    renderKpis();

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('14h30 de horas solicitadas')).toBeInTheDocument();
    expect(screen.getByText('20h30')).toBeInTheDocument();
    expect(screen.getByText('em 6 solicitações')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('no período selecionado')).toBeInTheDocument();
  });

  it('calcula a taxa com os dados reais do período (nada de percentual fixo)', () => {
    renderKpis({ decisoes: decisoes({ aprovadas: 6, rejeitadas: 1, decididas: 7, taxa: 86 }) });

    expect(screen.getByText('86%')).toBeInTheDocument();
    expect(screen.getByText('6 de 7 solicitações decididas')).toBeInTheDocument();
  });

  it('acompanha a mudança de recorte: outras decisões, outra taxa', () => {
    renderKpis({ decisoes: decisoes({ aprovadas: 1, rejeitadas: 3, decididas: 4, taxa: 25 }) });

    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('1 de 4 solicitações decididas')).toBeInTheDocument();
  });

  it('sem decisão no período mostra "—" e explica o motivo', () => {
    renderKpis({ decisoes: decisoes({ aprovadas: 0, rejeitadas: 0, decididas: 0, taxa: null }) });

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma decisão no período')).toBeInTheDocument();
  });

  it('usa o singular quando só uma solicitação foi decidida', () => {
    renderKpis({ decisoes: decisoes({ aprovadas: 1, rejeitadas: 0, decididas: 1, taxa: 100 }) });

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('1 de 1 solicitação decidida')).toBeInTheDocument();
  });
});
