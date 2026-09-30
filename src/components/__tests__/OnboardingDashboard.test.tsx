import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  // Mock completo: o dashboard reaproveita `MetricCard`, `MiniSparkline` e
  // `DonutChart` (src/components/dashboard), que usam `motion.create`, `useInView`
  // e elementos SVG (`polygon`/`polyline`/`circle`) além do `motion.div`.
  // Os elementos só rendem `children` (sem repassar props de animação ao DOM).
  motion: {
    create:
      (Component: any) =>
      ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>,
    div: ({ children }: any) => <div>{children}</div>,
    span: ({ children }: any) => <span>{children}</span>,
    li: ({ children }: any) => <li>{children}</li>,
    circle: () => <circle />,
    polygon: () => <polygon />,
    polyline: () => <polyline />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useInView: () => true,
  useReducedMotion: () => false,
}));

vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
  // O gráfico de tempo médio virou área (linha + degradê), então o container
  // testado é `AreaChart`/`Area` em vez de `LineChart`/`Line`.
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

// O `MiniSparkline` é mockado (com testid) só para provar que os KPI Cards de
// Admissões NÃO o renderizam: o prop `sparkline` continua existindo no
// `MetricCard` compartilhado, mas esta tela não o passa — então não há micro
// gráfico decorativo no canto direito do card.
vi.mock('@/components/dashboard/MiniSparkline', () => ({
  MiniSparkline: () => <svg data-testid="mini-sparkline" />,
}));

import { OnboardingDashboard } from '../admissoes/OnboardingDashboard';

const MOCK_ADMISSOES = [
  { id: '1', etapa: 'documentos' },
  { id: '2', etapa: 'documentos' },
  { id: '3', etapa: 'concluida' },
  { id: '4', etapa: 'cancelada' },
];

/**
 * Fixture com data prevista: sem `data_prevista` válida a lista de "Próximas
 * Admissões" cai no estado vazio (`PanelEmpty`) e não chega a montar o
 * container com scroll interno.
 */
const MOCK_ADMISSOES_COM_DATA = [
  { id: '1', nome: 'Ana Souza', etapa: 'documentos', data_prevista: '2026-12-01' },
  { id: '2', nome: 'Bruno Lima', etapa: 'exame', data_prevista: '2026-12-02' },
];

describe('OnboardingDashboard', () => {
  it('renders Total Iniciadas KPI', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('Total Iniciadas')).toBeInTheDocument();
  });

  it('renders Em Andamento KPI', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
  });

  it('renders Finalizadas KPI', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('Finalizadas')).toBeInTheDocument();
  });

  it('renders Canceladas KPI', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('Canceladas')).toBeInTheDocument();
  });

  it('shows correct total count', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    const totalCard = screen.getByText('Total Iniciadas').closest('div');
    expect(totalCard?.textContent).toContain('4');
  });

  it('shows Tempo Médio de Admissão chart title', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText(/Tempo Médio de Admissão/i)).toBeInTheDocument();
  });

  it('renders charts', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('handles empty admissoes array', () => {
    render(<OnboardingDashboard admissoes={[]} />);
    expect(screen.getByText('Total Iniciadas')).toBeInTheDocument();
  });

  it('não renderiza micro gráfico nos KPI cards', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.queryAllByTestId('mini-sparkline')).toHaveLength(0);
  });

  // A linha de apoio (indicador + frase) é renderizada sem `truncate`: o texto
  // sai por inteiro no DOM, sem depender de largura disponível.
  it('mostra a frase de apoio completa de cada KPI', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    expect(screen.getByText('processos no período')).toBeInTheDocument();
    expect(screen.getByText('em pipeline agora')).toBeInTheDocument();
    expect(screen.getByText('concluídas no período')).toBeInTheDocument();
    expect(screen.getByText('processos encerrados no período')).toBeInTheDocument();
  });

  // ─── Scroll interno (cabeçalho fixo, lista rolando dentro do card) ───────
  // As 3 listas são os ÚNICOS containers com `overflow-y-auto` +
  // `scroll-interno` + ALTURA EXPLÍCITA (`ALTURA_LISTA_WIDGET` = `h-[136px]`).
  // O cabeçalho (título/subtítulo) fica FORA dele e — no "SLA & Alertas" — o
  // bloco "Taxa de conclusão" fica DENTRO, como último filho: é ele que faz o
  // conteúdo passar da viewport e a barra existir de verdade.
  it('dá overflow próprio a exatamente 3 listas, e não ao resto do dashboard', () => {
    // Fixture com data prevista: é ela que faz a 3ª lista ("Próximas
    // Admissões") sair do estado vazio e montar o container com scroll.
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES_COM_DATA} />);
    const regioes = document.querySelectorAll('.scroll-interno');
    expect(regioes).toHaveLength(3);
    regioes.forEach((regiao) => {
      expect(regiao).toHaveClass('overflow-y-auto');
      // Altura explícita: com `flex-1` o container esticava até o miolo do card
      // (164px) e, como o conteúdo real cabe ali (150/155px), a viewport ficava
      // maior que a lista — `scrollHeight === clientHeight`, barra nenhuma.
      expect(regiao).toHaveClass('h-[136px]');
      expect(regiao).not.toHaveClass('flex-1');
    });
    // O card "Distribuição por Área" (o donut) não entra no scroll interno.
    expect(screen.getByText('Distribuição por Área').closest('.scroll-interno')).toBeNull();
  });

  it('rola a lista de ações prioritárias sem o título do card dentro do scroll', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    const regiao = screen.getByText('documentos pendentes').closest('.scroll-interno');
    expect(regiao).not.toBeNull();
    expect(regiao!.textContent).not.toContain('Ações Prioritárias');
    expect(regiao!.textContent).not.toContain('Itens que precisam da sua atenção');
  });

  it('rola a lista de próximas admissões com o selo de etapa dentro da linha', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES_COM_DATA} />);
    const regiao = screen.getByText('Ana Souza').closest('.scroll-interno');
    expect(regiao).not.toBeNull();
    // O selo faz parte da linha que rola: nunca sobra para ele sair do card.
    expect(regiao!.textContent).toContain('Docs Pendentes');
    expect(regiao!.textContent).toContain('Bruno Lima');
  });

  it('rola o SLA & Alertas com o rodapé "Taxa de conclusão" dentro do scroll', () => {
    render(<OnboardingDashboard admissoes={MOCK_ADMISSOES} />);
    const regiao = screen.getByText('Dentro do SLA').closest('.scroll-interno');
    expect(regiao).not.toBeNull();
    // Os três indicadores rolam junto com o bloco final…
    expect(regiao!.textContent).toContain('Em risco');
    expect(regiao!.textContent).toContain('Atrasadas');
    // …e o bloco final faz parte da MESMA área rolável: 3 linhas + rodapé dão
    // ~155px de conteúdo para uma viewport de 136px — é esse excedente que
    // garante a barra de rolagem no card.
    expect(regiao!.textContent).toContain('Taxa de conclusão');
    expect(screen.getByText('Taxa de conclusão').closest('.scroll-interno')).toBe(regiao);
  });
});
