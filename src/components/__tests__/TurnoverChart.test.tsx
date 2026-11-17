import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    // `create` entra porque o cartao do grafico passou a usar o MotionCard de
    // entradaCards.tsx (mesma animacao de entrada dos outros cartoes da area).
    create:
      (Component: React.ElementType) =>
      ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => (
        <Component {...rest}>{children}</Component>
      ),
    div: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <div {...rest}>{children}</div>,
    span: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => (
      <span {...rest}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  useInView: () => true,
  useReducedMotion: () => false,
  MotionConfig: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  ComposedChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
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
import type { DesligamentoComColaborador } from '@/services/desligamentoService';

const NOW = new Date();
const THIS_MONTH_KEY = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;

const DESLIGAMENTOS: Pick<DesligamentoComColaborador, 'tipo' | 'data_desligamento'>[] = [
  { tipo: 'sem_justa_causa', data_desligamento: `${THIS_MONTH_KEY}-05` },
  { tipo: 'justa_causa', data_desligamento: `${THIS_MONTH_KEY}-10` },
  { tipo: 'pedido_demissao', data_desligamento: `${THIS_MONTH_KEY}-15` },
  { tipo: 'acordo', data_desligamento: '2020-01-01' },
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

  // A faixa 'Sem Justa Causa' e o ganho central desta correcao: o tipo mais
  // comum do enum caia em 'Outros' porque a derivacao comparava com
  // `com_justa_causa`/`acordo_mutuo`/`termino_contrato`, que nao existem.
  it('tem faixa propria para Sem Justa Causa e rotulos do enum real', () => {
    render(<TurnoverChart desligamentos={DESLIGAMENTOS} />);
    expect(screen.getByText('Sem Justa Causa')).toBeInTheDocument();
    expect(screen.getByText('Justa Causa')).toBeInTheDocument();
    expect(screen.getByText('Acordo')).toBeInTheDocument();
    expect(screen.getByText('Fim de Contrato')).toBeInTheDocument();
    // Os rotulos das chaves inventadas sairam da legenda.
    expect(screen.queryByText('Acordo Mútuo')).not.toBeInTheDocument();
    expect(screen.queryByText('Término de Contrato')).not.toBeInTheDocument();
  });
});
