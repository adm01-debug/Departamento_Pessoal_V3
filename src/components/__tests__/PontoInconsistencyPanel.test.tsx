import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: () => {} },
}));

import { PontoInconsistencyPanel } from '../ponto/PontoInconsistencyPanel';

const SHORT_BREAK_REGISTROS = [
  {
    id: '1',
    colaborador_id: 'c1',
    data: '2024-07-01',
    colaborador: { nome_completo: 'Maria Santos' },
    entrada_1: '08:00',
    saida_1: '17:00',
    saida_intervalo: '12:00',
    retorno_intervalo: '12:30',
  },
];

describe('PontoInconsistencyPanel', () => {
  it('renders without crash when registros is empty', () => {
    const { container } = render(<PontoInconsistencyPanel registros={[]} />);
    expect(container).toBeInTheDocument();
  });

  it('shows Insights de Inteligência when inconsistency detected', () => {
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    expect(screen.getByText(/Insights de Inteligência/)).toBeInTheDocument();
  });

  it('shows Resolução Assistida Ativa badge when inconsistencies exist', () => {
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    expect(screen.getByText('Resolução Assistida Ativa')).toBeInTheDocument();
  });

  it('shows colaborador name in inconsistency card', () => {
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('shows short break description', () => {
    render(<PontoInconsistencyPanel registros={SHORT_BREAK_REGISTROS} />);
    expect(screen.getByText(/Intervalo curto/)).toBeInTheDocument();
  });
});
