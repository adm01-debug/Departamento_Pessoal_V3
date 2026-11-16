import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrigemHomologacao } from '../avaliacao/OrigemHomologacao';

const FEEDBACKS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    avaliado_id: 'colab-real',
    ciclo_id: 'ciclo-1',
    tipo: 'gestor',
    status: 'pendente',
  },
  {
    id: 'mock-feedback-1',
    avaliado_id: 'colab-demo',
    ciclo_id: 'ciclo-1',
    tipo: 'par',
    status: 'concluido',
  },
];

const BASE = {
  visivel: true,
  feedbacks: FEEDBACKS,
  colaboradores: [
    { id: 'colab-real', nome_completo: 'Pessoa Real' },
    { id: 'colab-demo', nome_completo: 'Pessoa Demo' },
  ],
  ciclos: [{ id: 'ciclo-1', nome: 'Ciclo de homologação' }],
  cicloId: 'ciclo-1',
};

afterEach(() => vi.unstubAllEnvs());

describe('OrigemHomologacao', () => {
  it('lista UUID REAL e mock DEMONSTRAÇÃO, com status e ID visíveis', () => {
    vi.stubEnv('VITE_HOMOLOG_ORIGEM', 'true');
    render(<OrigemHomologacao {...BASE} />);

    expect(screen.getByTestId('homolog-origem')).toBeInTheDocument();
    expect(screen.getByText('REAL')).toBeInTheDocument();
    expect(screen.getByText('DEMONSTRAÇÃO')).toBeInTheDocument();
    expect(screen.getByText(/1 REAL\(is\) pendente/)).toBeInTheDocument();
    expect(screen.getByText('11111111-1111-4111-8111-111111111111')).toBeInTheDocument();
    expect(screen.getByText('mock-feedback-1')).toBeInTheDocument();
  });

  it('fora do flag de homologação não renderiza nada', () => {
    vi.stubEnv('VITE_HOMOLOG_ORIGEM', 'false');
    render(<OrigemHomologacao {...BASE} />);
    expect(screen.queryByTestId('homolog-origem')).toBeNull();
  });

  it('não renderiza fora da aba Feedbacks', () => {
    vi.stubEnv('VITE_HOMOLOG_ORIGEM', 'true');
    render(<OrigemHomologacao {...BASE} visivel={false} />);
    expect(screen.queryByTestId('homolog-origem')).toBeNull();
  });
});
