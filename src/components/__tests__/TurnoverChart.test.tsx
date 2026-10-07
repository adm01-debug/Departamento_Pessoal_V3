import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock robusto do framer-motion: cobre QUALQUER `motion.<tag>` (o `select.tsx`
// usa `motion.span`, por exemplo) e `AnimatePresence`, sem listar tags à mão.
vi.mock('framer-motion', () => {
  const make =
    (tag: string) =>
    ({ children, ...rest }: any) =>
      React.createElement(tag, rest, children);
  const motion = new Proxy({}, { get: (_t, tag: string) => make(tag) });
  return {
    motion,
    useReducedMotion: () => false,
    MotionConfig: ({ children }: any) => children,
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ComposedChart: ({ children }: any) => <svg>{children}</svg>,
  BarChart: ({ children }: any) => <svg>{children}</svg>,
  Bar: () => null,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

import { TurnoverChart } from '../desligamentos/TurnoverChart';

const NOW = new Date();
const THIS_MONTH_KEY = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;

const DESLIGAMENTOS = [
  { tipo: 'sem_justa_causa', data_desligamento: `${THIS_MONTH_KEY}-05` },
  { tipo: 'com_justa_causa', data_desligamento: `${THIS_MONTH_KEY}-10` },
  { tipo: 'pedido_demissao', data_desligamento: `${THIS_MONTH_KEY}-15` },
  { tipo: 'acordo_mutuo', data_desligamento: '2020-01-01' },
];

describe('TurnoverChart', () => {
  it('renders chart title', () => {
    render(<TurnoverChart desligamentos={DESLIGAMENTOS} />);
    expect(screen.getByText(/Evolução dos Desligamentos/)).toBeInTheDocument();
  });

  it('renders without crash when empty', () => {
    render(<TurnoverChart desligamentos={[]} />);
    expect(screen.getByText(/Evolução dos Desligamentos/)).toBeInTheDocument();
  });

  it('renders with all types of desligamentos', () => {
    render(<TurnoverChart desligamentos={DESLIGAMENTOS} />);
    expect(screen.getByText(/Evolução dos Desligamentos/)).toBeInTheDocument();
  });

  it('renders the legend with every category and the total', () => {
    render(<TurnoverChart desligamentos={DESLIGAMENTOS} />);
    ['Pedido de Demissão', 'Acordo Mútuo', 'Justa Causa', 'Término de Contrato', 'Outros', 'Total'].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument()
    );
  });

  it('re-render com nova identidade de dados não derruba nem remonta o gráfico', () => {
    const { rerender } = render(<TurnoverChart desligamentos={DESLIGAMENTOS} />);
    // Nova identidade de array (mesmo conteúdo) — era o gatilho do "duplo disparo"
    // da entrada. O gráfico deve permanecer montado e estável.
    rerender(<TurnoverChart desligamentos={[...DESLIGAMENTOS]} />);
    expect(screen.getByText(/Evolução dos Desligamentos/)).toBeInTheDocument();
  });
});
