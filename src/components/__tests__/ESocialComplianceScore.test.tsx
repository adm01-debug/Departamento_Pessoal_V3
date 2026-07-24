import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    circle: (props: any) => <circle {...props} />,
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { ESocialComplianceScore } from '../esocial/ESocialComplianceScore';

describe('ESocialComplianceScore', () => {
  it('renders score percentage', () => {
    render(<ESocialComplianceScore stats={{ conformidade: 95, enviados: 150, erros: 2 }} />);
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('renders zero score when conformidade missing', () => {
    render(<ESocialComplianceScore stats={{ enviados: 0, erros: 0 }} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows "Ambiente Seguro" when score >= 95', () => {
    render(<ESocialComplianceScore stats={{ conformidade: 97, enviados: 100, erros: 0 }} />);
    expect(screen.getByText('Ambiente Seguro')).toBeInTheDocument();
  });

  it('shows "Riscos Detectados" when score < 95', () => {
    render(<ESocialComplianceScore stats={{ conformidade: 80, enviados: 100, erros: 10 }} />);
    expect(screen.getByText('Riscos Detectados')).toBeInTheDocument();
  });

  it('renders enviados count', () => {
    render(<ESocialComplianceScore stats={{ conformidade: 90, enviados: 200, erros: 5 }} />);
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('renders erros count', () => {
    render(<ESocialComplianceScore stats={{ conformidade: 90, enviados: 200, erros: 5 }} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders Score de Conformidade Fiscal title', () => {
    render(<ESocialComplianceScore stats={{ conformidade: 90, enviados: 0, erros: 0 }} />);
    expect(screen.getByText(/Score de Conformidade Fiscal/i)).toBeInTheDocument();
  });
});
