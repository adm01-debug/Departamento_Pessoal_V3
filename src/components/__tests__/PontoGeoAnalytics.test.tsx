import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ScatterChart: ({ children }: any) => <div>{children}</div>,
  Scatter: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ZAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

import { PontoGeoAnalytics } from '../ponto/PontoGeoAnalytics';

const MOCK_BATIDAS = [
  {
    id: 'bat-001',
    dentro_raio: true,
    latitude: -23.5505,
    longitude: -46.6333,
    distancia_local_metros: 50,
    hora: '08:00',
    colaborador: { nome_completo: 'João Silva' },
  },
  {
    id: 'bat-002',
    dentro_raio: false,
    latitude: -23.5510,
    longitude: -46.6340,
    distancia_local_metros: 250,
    hora: '17:30',
    colaborador: { nome_completo: 'Maria Souza' },
  },
  {
    id: 'bat-003',
    dentro_raio: true,
    latitude: -23.5500,
    longitude: -46.6330,
    distancia_local_metros: 30,
    hora: '09:00',
    colaborador: { nome_completo: 'Carlos Lima' },
  },
];

describe('PontoGeoAnalytics', () => {
  it('returns null when batidas is empty', () => {
    const { container } = render(<PontoGeoAnalytics batidas={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Distribuição Geográfica de Batidas title when data provided', () => {
    render(<PontoGeoAnalytics batidas={MOCK_BATIDAS} />);
    expect(screen.getByText(/Distribui.*o Geogr.*fica de Batidas/i)).toBeInTheDocument();
  });

  it('renders compliance KPI section when data provided', () => {
    render(<PontoGeoAnalytics batidas={MOCK_BATIDAS} />);
    expect(screen.getByText(/Dentro do Raio/i)).toBeInTheDocument();
  });

  it('renders Fora do Raio section when data provided', () => {
    render(<PontoGeoAnalytics batidas={MOCK_BATIDAS} />);
    expect(screen.getByText(/Fora do Raio/i)).toBeInTheDocument();
  });

  it('renders EM CONFORMIDADE label when data provided', () => {
    render(<PontoGeoAnalytics batidas={MOCK_BATIDAS} />);
    expect(screen.getByText('EM CONFORMIDADE')).toBeInTheDocument();
  });

  it('renders DENTRO label when data provided', () => {
    render(<PontoGeoAnalytics batidas={MOCK_BATIDAS} />);
    expect(screen.getByText('DENTRO')).toBeInTheDocument();
  });

  it('renders grid layout when data provided', () => {
    const { container } = render(<PontoGeoAnalytics batidas={MOCK_BATIDAS} />);
    expect(container.querySelector('.grid')).toBeInTheDocument();
  });

  it('renders card with rounded-2xl when data provided', () => {
    const { container } = render(<PontoGeoAnalytics batidas={MOCK_BATIDAS} />);
    expect(container.querySelector('[class*="rounded-2xl"]')).toBeInTheDocument();
  });
});
