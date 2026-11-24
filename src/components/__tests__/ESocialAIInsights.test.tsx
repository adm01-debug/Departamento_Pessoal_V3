import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { ESocialAIInsights } from '../esocial/ESocialAIInsights';

describe('ESocialAIInsights', () => {
  it('renders Insights da IA Lovable title', () => {
    render(<ESocialAIInsights />);
    expect(screen.getByText('Insights da IA Lovable')).toBeInTheDocument();
  });

  it('renders Otimização de Rubricas insight', () => {
    render(<ESocialAIInsights />);
    expect(screen.getByText('Otimização de Rubricas')).toBeInTheDocument();
  });

  it('renders Aviso de Afastamento insight', () => {
    render(<ESocialAIInsights />);
    expect(screen.getByText('Aviso de Afastamento')).toBeInTheDocument();
  });

  it('renders Impacto Médio badge', () => {
    render(<ESocialAIInsights />);
    expect(screen.getByText('Impacto Médio')).toBeInTheDocument();
  });

  it('renders Impacto Alto badge', () => {
    render(<ESocialAIInsights />);
    expect(screen.getByText('Impacto Alto')).toBeInTheDocument();
  });

  it('renders VER RECOMENDAÇÃO links', () => {
    render(<ESocialAIInsights />);
    const links = screen.getAllByText('VER RECOMENDAÇÃO');
    expect(links.length).toBe(2);
  });

  it('renders Ver todos os insights button', () => {
    render(<ESocialAIInsights />);
    expect(screen.getByText(/Ver todos os insights/)).toBeInTheDocument();
  });
});
