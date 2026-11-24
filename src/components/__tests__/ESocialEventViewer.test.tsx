import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../esocial/S1200Remuneracao', () => ({
  S1200Remuneracao: ({ dados }: any) => <div data-testid="s1200">{JSON.stringify(dados)}</div>,
}));
vi.mock('../esocial/S2200Admissao', () => ({
  S2200Admissao: ({ dados }: any) => <div data-testid="s2200">{JSON.stringify(dados)}</div>,
}));
vi.mock('../esocial/S2299Desligamento', () => ({
  S2299Desligamento: ({ dados }: any) => <div data-testid="s2299">{JSON.stringify(dados)}</div>,
}));
vi.mock('../esocial/S1210Pagamentos', () => ({ S1210Pagamentos: () => <div /> }));
vi.mock('../esocial/S2205AlteracaoCadastral', () => ({ S2205AlteracaoCadastral: () => <div /> }));
vi.mock('../esocial/S2206AlteracaoContratual', () => ({ S2206AlteracaoContratual: () => <div /> }));
vi.mock('../esocial/S2210SST', () => ({ S2210SST: () => <div /> }));
vi.mock('../esocial/S2230Afastamento', () => ({ S2230Afastamento: () => <div /> }));
vi.mock('../esocial/S2300TSVInicio', () => ({ S2300TSVInicio: () => <div /> }));
vi.mock('../esocial/S2306TSVAlteracao', () => ({ S2306TSVAlteracao: () => <div /> }));
vi.mock('../esocial/S2399TSVTermino', () => ({ S2399TSVTermino: () => <div /> }));
vi.mock('../esocial/S2400CDP', () => ({ S2400CDP: () => <div /> }));
vi.mock('../esocial/SSTEvents', () => ({
  S2220ASO: () => <div />,
  S2240AgentesNocivos: () => <div />,
}));

import { ESocialEventViewer } from '../esocial/ESocialEventViewer';

describe('ESocialEventViewer', () => {
  it('renders specialized component for known type S-1200', () => {
    render(<ESocialEventViewer tipo="S-1200" dados={{ competencia: '2024-07' }} />);
    expect(screen.getByTestId('s1200')).toBeInTheDocument();
  });

  it('renders specialized component for S-2200', () => {
    render(<ESocialEventViewer tipo="S-2200" dados={{ nome: 'Test' }} />);
    expect(screen.getByTestId('s2200')).toBeInTheDocument();
  });

  it('renders specialized component for S-2299', () => {
    render(<ESocialEventViewer tipo="S-2299" dados={{}} />);
    expect(screen.getByTestId('s2299')).toBeInTheDocument();
  });

  it('shows fallback message for unknown type', () => {
    render(<ESocialEventViewer tipo="S-9999" dados={{}} />);
    expect(screen.getByText(/Visualizador especializado não disponível para S-9999/)).toBeInTheDocument();
  });

  it('shows raw data hint for unknown type', () => {
    render(<ESocialEventViewer tipo="S-UNKNOWN" dados={{}} />);
    expect(screen.getByText(/Exibindo dados brutos abaixo/i)).toBeInTheDocument();
  });
});
