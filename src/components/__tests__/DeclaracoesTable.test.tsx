import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DctfTable, SefipTable } from '../obrigacoes/DeclaracoesTable';

const DCTF_DATA = [
  { id: '1', competencia: '2024-06', status: 'paga', data_envio: '2024-06-30T00:00:00', valor_total: 5000 },
  { id: '2', competencia: '2024-07', status: 'pendente', data_envio: null, valor_total: null },
];

const SEFIP_DATA = [
  { id: '1', competencia: '2024-06', status: 'enviada', arquivo_url: 'https://example.com/sefip.txt' },
  { id: '2', competencia: '2024-07', status: 'pendente', arquivo_url: null },
];

describe('DctfTable', () => {
  it('renders table headers', () => {
    render(<DctfTable data={DCTF_DATA} />);
    expect(screen.getByText('Competência')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Valor Total')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<DctfTable data={[]} />);
    expect(screen.getByText('Nenhuma declaração DCTFWeb')).toBeInTheDocument();
  });

  it('renders competencias', () => {
    render(<DctfTable data={DCTF_DATA} />);
    expect(screen.getByText('2024-06')).toBeInTheDocument();
    expect(screen.getByText('2024-07')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(<DctfTable data={DCTF_DATA} />);
    expect(screen.getByText('paga')).toBeInTheDocument();
    expect(screen.getByText('pendente')).toBeInTheDocument();
  });

  it('shows — when data_envio is null', () => {
    render(<DctfTable data={DCTF_DATA} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});

describe('SefipTable', () => {
  it('renders table headers', () => {
    render(<SefipTable data={SEFIP_DATA} />);
    expect(screen.getByText('Competência')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Arquivo')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<SefipTable data={[]} />);
    expect(screen.getByText('Nenhum arquivo SEFIP')).toBeInTheDocument();
  });

  it('renders competencias', () => {
    render(<SefipTable data={SEFIP_DATA} />);
    expect(screen.getByText('2024-06')).toBeInTheDocument();
  });

  it('shows disponível icon for records with arquivo_url', () => {
    render(<SefipTable data={SEFIP_DATA} />);
    expect(screen.getByText('✅ Disponível')).toBeInTheDocument();
  });

  it('shows Baixar button when arquivo_url present', () => {
    render(<SefipTable data={SEFIP_DATA} />);
    expect(screen.getByText('Baixar')).toBeInTheDocument();
  });
});
