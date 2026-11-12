import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: () => {} },
}));

import { PontoInconsistencyPanel } from '../ponto/PontoInconsistencyPanel';
import type { RegistroComColaborador } from '../ponto/PontoInconsistencyPanel';

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
] as unknown as RegistroComColaborador[];

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

  it('"Ver lista completa" mostra todas as inconsistências além das 6 primeiras', () => {
    const muitos = Array.from({ length: 8 }, (_, i) => ({
      ...SHORT_BREAK_REGISTROS[0],
      id: String(i + 1),
      colaborador: { nome_completo: `Colab ${i + 1}` },
    })) as unknown as RegistroComColaborador[];
    render(<PontoInconsistencyPanel registros={muitos} />);
    expect(screen.queryByText('Colab 8')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Ver lista completa'));
    expect(screen.getByText('Colab 7')).toBeInTheDocument();
    expect(screen.getByText('Colab 8')).toBeInTheDocument();
    expect(screen.queryByText('Ver lista completa')).not.toBeInTheDocument();
  });
});
