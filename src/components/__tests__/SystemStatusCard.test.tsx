import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Este cartão veio da branch `muri` lendo `success_rate` e `avg_latency`, campos
// que a main renomeou para `success_rate_pct` e `avg_latency_ms`. Os casos abaixo
// travam os nomes NOVOS: se alguém reintroduzir os antigos, o valor vira
// `undefined` e o teste cai.

const saude = vi.hoisted(() => ({
  valor: {
    latency: 42,
    status: 'online' as string,
    metrics: null as { success_rate_pct: number | null; avg_latency_ms: number | null; recent_failures: number } | null,
  },
}));

vi.mock('@/hooks/useSystemHealth', () => ({ useSystemHealth: () => saude.valor }));
vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresaStore: (seletor: (s: { empresaAtualId: string | null }) => unknown) =>
    seletor({ empresaAtualId: 'empresa-1' }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/services/edgeFunctionsService', () => ({ edgeFunctionsService: {} }));

const { SystemStatusCard } = await import('@/components/dashboard/SystemStatusCard');

describe('SystemStatusCard — contratos do useSystemHealth', () => {
  it('lê avg_latency_ms (o nome novo) para a latência da API', () => {
    saude.valor.metrics = { success_rate_pct: 99, avg_latency_ms: 123.4, recent_failures: 0 };
    render(<SystemStatusCard />);
    expect(screen.getByText('123ms')).toBeInTheDocument();
  });

  it('lê success_rate_pct (o nome novo) para a taxa de sucesso', () => {
    saude.valor.metrics = { success_rate_pct: 97, avg_latency_ms: 10, recent_failures: 0 };
    render(<SystemStatusCard />);
    expect(screen.getByText('97%')).toBeInTheDocument();
  });

  it('abaixo de 90% a taxa de sucesso é sinalizada como alerta', () => {
    saude.valor.metrics = { success_rate_pct: 80, avg_latency_ms: 10, recent_failures: 3 };
    render(<SystemStatusCard />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  // Sem métrica o cartão mostra travessão. É o que garante que, sem o mock de
  // ambiente que eu removi, ele não inventa número nenhum.
  it('sem métricas, mostra travessão em vez de valor fabricado', () => {
    saude.valor.metrics = null;
    render(<SystemStatusCard />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('campo nulo não vira NaN nem 0 — continua travessão', () => {
    saude.valor.metrics = { success_rate_pct: null, avg_latency_ms: null, recent_failures: 0 };
    render(<SystemStatusCard />);
    expect(screen.queryByText('NaN%')).not.toBeInTheDocument();
    expect(screen.queryByText('NaNms')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
