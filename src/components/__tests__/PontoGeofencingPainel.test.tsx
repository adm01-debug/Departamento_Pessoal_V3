import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

/**
 * O painel monta KPIs, mapa, conformidade, distribuição e tabela a partir de
 * UMA série de pontos. No teste, o mapa (Leaflet imperativo) é substituído por
 * um stub que apenas registra o que recebeu — o objetivo aqui é provar que os
 * números da tela saem da vitrine demonstrativa (27 batidas, 0 fora, 29 m,
 * 100% de conformidade) e que o perímetro do mapa usa o RAIO REAL da unidade.
 */
vi.mock('framer-motion', () => {
  const propsDom = ({ initial: _i, animate: _a, transition: _t, variants: _v, exit: _e, ...props }: any) => props;
  const motion = {
    div: ({ children, ...props }: any) => <div {...propsDom(props)}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...propsDom(props)}>{children}</tr>,
    span: ({ children, ...props }: any) => <span {...propsDom(props)}>{children}</span>,
    li: ({ children, ...props }: any) => <li {...propsDom(props)}>{children}</li>,
    create: (Componente: any) => Componente,
  };
  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    MotionConfig: ({ children }: any) => <>{children}</>,
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

/** Mapa stub: expõe em `data-*` o que o painel entregou ao componente real. */
vi.mock('@/components/ponto/PontoGeoMapa', () => ({
  PontoGeoMapa: ({ pontos, unidade, modo, camadas }: any) => (
    <div
      data-testid="mapa-stub"
      data-pontos={pontos.length}
      data-raio={unidade.raioMetros}
      data-unidade={unidade.nome}
      data-modo={modo}
      data-perimetro={String(camadas.perimetro)}
    />
  ),
}));

/** Vitrine ligada e banco vazio: é o caminho de demonstração do painel. */
vi.mock('@/mocks/pontoGeoMock', async () => {
  const real = await vi.importActual<typeof import('@/mocks/pontoGeoMock')>('@/mocks/pontoGeoMock');
  return { ...real, isPontoGeoMockEnabled: () => true };
});

vi.mock('@/hooks/usePontoGeofencing', () => ({
  usePontoGeofencing: () => ({
    unidades: [],
    unidade: null,
    raioMetros: 200,
    batidas: [],
    batidasAnteriores: [],
    carregando: false,
    erro: false,
    recarregar: () => {},
  }),
}));

import { PontoGeofencingPainel } from '../ponto/PontoGeofencingPainel';

function renderizarPainel() {
  return render(<PontoGeofencingPainel empresaId="empresa-teste" />);
}

describe('PontoGeofencingPainel · KPIs e conformidade', () => {
  it('mostra os quatro indicadores do período demonstrativo', () => {
    renderizarPainel();

    const kpiTotal = screen.getByText('Total de batidas').closest('.animate-squash') as HTMLElement;
    expect(within(kpiTotal).getByText('27')).toBeInTheDocument();

    const kpiDentro = screen.getByText('Dentro do perímetro').closest('.animate-squash') as HTMLElement;
    expect(within(kpiDentro).getByText('27')).toBeInTheDocument();
    expect(within(kpiDentro).getByText('100% do total')).toBeInTheDocument();

    const kpiFora = screen.getByText('Fora do perímetro').closest('.animate-squash') as HTMLElement;
    expect(within(kpiFora).getByText('0')).toBeInTheDocument();

    const kpiMedia = screen.getByText('Distância média').closest('.animate-squash') as HTMLElement;
    expect(within(kpiMedia).getByText('29 m')).toBeInTheDocument();
  });

  it('resume a conformidade com selo, percentual e contagens', () => {
    renderizarPainel();

    const cartao = screen.getByText('Conformidade Geográfica').closest('.animate-squash') as HTMLElement;

    expect(within(cartao).getByText('Registros dentro do perímetro autorizado')).toBeInTheDocument();
    expect(within(cartao).getByText('Regular')).toBeInTheDocument();
    expect(within(cartao).getByText('100%')).toBeInTheDocument();
    expect(within(cartao).getByText('27')).toBeInTheDocument();
    expect(within(cartao).getByText('registros conformes')).toBeInTheDocument();
    expect(within(cartao).getByText('0')).toBeInTheDocument();
    expect(within(cartao).getByText('irregularidades')).toBeInTheDocument();
  });

  it('sinaliza que a série é demonstrativa e entrega o raio real ao mapa', () => {
    renderizarPainel();

    expect(screen.getByText('Demonstração')).toBeInTheDocument();

    const mapa = screen.getByTestId('mapa-stub');
    expect(mapa).toHaveAttribute('data-pontos', '27');
    expect(mapa).toHaveAttribute('data-raio', '100');
    expect(mapa).toHaveAttribute('data-unidade', 'Unidade Matriz');
    expect(mapa).toHaveAttribute('data-perimetro', 'true');
    expect(mapa).toHaveAttribute('data-modo', 'mapa');
  });
});

describe('PontoGeofencingPainel · gráficos e tabela', () => {
  it('desenha as faixas de distância do raio configurado', () => {
    renderizarPainel();

    expect(screen.getByText('Distribuição por Distância')).toBeInTheDocument();
    ['0–20', '20–40', '40–60', '60–80', '80–100', '> 100'].forEach((rotulo) => {
      expect(screen.getByText(rotulo)).toBeInTheDocument();
    });
  });

  it('lista os registros mais recentes primeiro', () => {
    renderizarPainel();

    expect(screen.getByText('Registros Recentes')).toBeInTheDocument();
    const linhas = screen.getAllByRole('row');
    // 1 cabeçalho + 5 registros do card
    expect(linhas.length).toBe(6);
    expect(within(linhas[1]).getByText('Ana Martins')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('08:00')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('21 m')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('Dentro do raio')).toBeInTheDocument();
  });
});

describe('PontoGeofencingPainel · dica do gráfico de distância', () => {
  it('mostra a dica da coluna sob o ponteiro e troca o conteúdo ao mudar de coluna', () => {
    renderizarPainel();

    // Sem coluna ativa não existe dica aberta.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // O hover é da COLUNA (o pai do `[data-barra]`) — é ela que entrega a
    // geometria para a dica; o mouse é só o gatilho.
    const barras = Array.from(document.querySelectorAll('[data-barra]'));
    const colunaInicial = barras[0].parentElement as HTMLElement;
    const segundaColuna = barras[1].parentElement as HTMLElement;

    fireEvent.mouseEnter(colunaInicial);
    const dica = screen.getByRole('tooltip');
    expect(within(dica).getByText('0 – 20 m')).toBeInTheDocument();
    expect(within(dica).getByText('Registros')).toBeInTheDocument();
    expect(within(dica).getByText('Do total')).toBeInTheDocument();
    expect(within(dica).getByText(/^\d+%$/)).toBeInTheDocument();

    // Trocar de coluna troca o conteúdo no lugar (mesma caixa, sem remontar).
    fireEvent.mouseEnter(segundaColuna);
    expect(within(screen.getByRole('tooltip')).getByText('20 – 40 m')).toBeInTheDocument();
    expect(screen.queryByText('0 – 20 m')).not.toBeInTheDocument();

    // Saiu do gráfico: a dica fecha.
    fireEvent.mouseLeave(segundaColuna.parentElement as HTMLElement);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
