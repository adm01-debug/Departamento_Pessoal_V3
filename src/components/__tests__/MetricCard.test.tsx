import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';

vi.mock('framer-motion', () => ({
  motion: {
    create:
      (Component: React.ElementType) =>
      ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => (
        <Component {...rest}>{children}</Component>
      ),
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => (
      <span {...props}>{children}</span>
    ),
    polygon: (props: React.ComponentProps<'polygon'>) => <polygon {...props} />,
    polyline: (props: React.ComponentProps<'polyline'>) => <polyline {...props} />,
  },
  useInView: () => true,
}));

vi.mock('@/components/dashboard/AnimatedNumber', () => ({
  AnimatedNumber: ({
    value,
    format,
    decimals,
  }: {
    value?: number;
    format?: (v: number) => string;
    decimals?: number;
  }) => <span data-decimals={decimals}>{format ? format(value ?? 0) : String(value)}</span>,
}));

vi.mock('@/components/dashboard/MiniSparkline', () => ({
  MiniSparkline: () => <svg data-testid="mini-sparkline" />,
}));

import { MetricCard } from '../dashboard/MetricCard';

describe('MetricCard', () => {
  it('renders title', () => {
    render(<MetricCard title="Colaboradores Ativos" value="42" icon={Users} gradient="from-primary to-primary-glow" />);
    expect(screen.getByText('Colaboradores Ativos')).toBeInTheDocument();
  });

  it('renders string value directly', () => {
    render(<MetricCard title="Teste" value="R$ 1.000" icon={Users} gradient="from-primary to-primary-glow" />);
    expect(screen.getByText('R$ 1.000')).toBeInTheDocument();
  });

  it('renders AnimatedNumber when rawValue is provided', () => {
    render(
      <MetricCard
        title="Folha Mensal"
        value="150000"
        rawValue={150000}
        icon={Users}
        gradient="from-success to-success/70"
      />
    );
    expect(screen.getByText('150000')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(
      <MetricCard title="Teste" value="5" icon={Users} gradient="from-primary to-primary-glow" description="Este mês" />
    );
    expect(screen.getByText('Este mês')).toBeInTheDocument();
  });

  it('renders trend percentage', () => {
    render(
      <MetricCard
        title="Teste"
        value="5"
        icon={Users}
        gradient="from-primary to-primary-glow"
        trend={{ value: 12, label: 'vs mês anterior' }}
      />
    );
    expect(screen.getByText(/12%/)).toBeInTheDocument();
  });

  it('renders trend label', () => {
    render(
      <MetricCard
        title="Teste"
        value="5"
        icon={Users}
        gradient="from-primary to-primary-glow"
        trend={{ value: 12, label: 'vs mês anterior' }}
      />
    );
    expect(screen.getByText('vs mês anterior')).toBeInTheDocument();
  });

  it('renders sparkline when provided', () => {
    render(
      <MetricCard
        title="Teste"
        value="5"
        icon={Users}
        gradient="from-primary to-primary-glow"
        sparkline={[1, 2, 3, 4, 5]}
      />
    );
    expect(screen.getByTestId('mini-sparkline')).toBeInTheDocument();
  });

  it('renders without optional props without crashing', () => {
    const { container } = render(
      <MetricCard title="Minimal" value="0" icon={Users} gradient="from-primary to-primary-glow" />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  // ─── Props acrescentados no resgate da muri ───
  // `gradient` virou opcional e deprecado: os 69 call sites que ainda o passam
  // seguem compilando e a cor passa a vir de `tone`.
  it('aceita call site legado que ainda passa gradient, sem tone', () => {
    const { container } = render(
      <MetricCard title="Legado" value="7" icon={Users} gradient="from-primary to-primary-glow" />
    );
    // Tom padrao (primary) no chip do icone, nenhum gradiente aplicado.
    expect(container.querySelector('[class*="bg-primary/10"]')).not.toBeNull();
    expect(container.querySelector('[class*="bg-gradient-to-br"]')).toBeNull();
  });

  it('pinta o chip do icone pelo tone', () => {
    const { container } = render(<MetricCard title="Risco" value="3" icon={Users} tone="destructive" />);
    expect(container.querySelector('[class*="bg-destructive/10"]')).not.toBeNull();
  });

  it('vividRed usa a forma com valor arbitrario (o token curto nao existe no tema)', () => {
    // `--destructive-vivid` esta em src/index.css mas NAO em
    // tailwind.config.js: `text-destructive-vivid` nao geraria CSS nenhum.
    const { container } = render(<MetricCard title="Canceladas" value="2" icon={Users} tone="destructive" vividRed />);
    const html = container.innerHTML;
    expect(html).toContain('hsl(var(--destructive-vivid))');
    expect(html).not.toContain('text-destructive-vivid');
  });

  it('repassa decimals ao AnimatedNumber (KPI monetario com centavos)', () => {
    const { container } = render(
      <MetricCard title="Folha" value="R$ 1.234,56" rawValue={1234.56} icon={Users} decimals={2} />
    );
    expect(container.querySelector('[data-decimals]')?.getAttribute('data-decimals')).toBe('2');
  });

  it('mostra o tooltip do KPI quando recebe texto', () => {
    render(<MetricCard title="Headcount" value="10" icon={Users} tooltip="Colaboradores com vinculo ativo" />);
    expect(screen.getByText('Headcount')).toBeInTheDocument();
    // O InfoTooltip real renderiza um gatilho acessivel ao lado do titulo.
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('so fica clicavel quando ha destino (route ou titulo do mapa padrao)', () => {
    const { container: semRota } = render(<MetricCard title="Sem destino" value="1" icon={Users} />);
    expect(semRota.querySelector('.cursor-pointer')).toBeNull();

    const { container: comRota } = render(<MetricCard title="Com destino" value="1" icon={Users} route="/ponto" />);
    expect(comRota.querySelector('.cursor-pointer')).not.toBeNull();

    const { container: porTitulo } = render(<MetricCard title="Colaboradores Ativos" value="1" icon={Users} />);
    expect(porTitulo.querySelector('.cursor-pointer')).not.toBeNull();
  });

  it('dense encolhe a linha de apoio sem mexer no valor', () => {
    const { container } = render(
      <MetricCard title="Compacto" value="5" icon={Users} trend={{ value: 150, label: 'vs. periodo anterior' }} dense />
    );
    // A frase de apoio cai para 10px; o valor segue em `text-data`.
    expect(container.querySelector('[class*="text-[10px]"]')).not.toBeNull();
    expect(container.querySelector('.text-data')).not.toBeNull();
  });

  it('preserva centavos no formato monetario automatico quando decimals = 2', () => {
    render(<MetricCard title="Folha Mensal" value="R$ 19.079,93" rawValue={19079.93} decimals={2} icon={Users} />);
    // Sem o decimals na formatacao, o valor saia arredondado para R$ 19.080.
    expect(screen.getByText('R$ 19.079,93')).toBeInTheDocument();
  });

  it('mantem o valor monetario inteiro quando decimals nao e informado', () => {
    render(<MetricCard title="Folha Mensal" value="R$ 19.080" rawValue={19079.93} icon={Users} />);
    expect(screen.getByText('R$ 19.080')).toBeInTheDocument();
  });
});
