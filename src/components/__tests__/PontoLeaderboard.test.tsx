import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

import { PontoLeaderboard } from '../ponto/PontoLeaderboard';

describe('PontoLeaderboard', () => {
  it('renders Ranking de Assiduidade title', () => {
    render(<PontoLeaderboard />);
    expect(screen.getByText('Ranking de Assiduidade')).toBeInTheDocument();
  });

  it('shows MÊS ATUAL badge', () => {
    render(<PontoLeaderboard />);
    expect(screen.getByText('MÊS ATUAL')).toBeInTheDocument();
  });

  it('renders Gamificação Ativa label', () => {
    render(<PontoLeaderboard />);
    expect(screen.getByText('Gamificação Ativa')).toBeInTheDocument();
  });

  it('renders Ana Silva as top player', () => {
    render(<PontoLeaderboard />);
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
  });

  it('renders all 5 mock players', () => {
    render(<PontoLeaderboard />);
    expect(screen.getByText('João Santos')).toBeInTheDocument();
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Ricardo Costa')).toBeInTheDocument();
    expect(screen.getByText('Luciana Lima')).toBeInTheDocument();
  });

  it('shows streak info for players', () => {
    render(<PontoLeaderboard />);
    expect(screen.getByText('12 dias de streak')).toBeInTheDocument();
  });
});
