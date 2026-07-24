import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { SSTEPIsTab } from '../sst/SSTEPIsTab';

const MOCK_EPIS = [
  { id: 'epi-001', nome: 'Capacete de Segurança', ca: 'CA-12345', categoria: 'Proteção da Cabeça', validade_meses: 24 },
  { id: 'epi-002', nome: 'Luva de Proteção', ca: 'CA-67890', categoria: 'Proteção das Mãos', validade_meses: 12 },
];

const MOCK_ENTREGAS = [
  {
    id: 'ent-001',
    data_entrega: '2026-01-10',
    quantidade: 2,
    colaborador: { nome_completo: 'João Silva' },
    epi: { nome: 'Capacete de Segurança', ca: 'CA-12345' },
  },
];

describe('SSTEPIsTab', () => {
  it('shows empty state when no EPIs', () => {
    render(<SSTEPIsTab epis={[]} entregas={[]} />);
    expect(screen.getByText('Nenhum EPI cadastrado')).toBeInTheDocument();
  });

  it('renders EPI nome when EPIs provided', () => {
    render(<SSTEPIsTab epis={MOCK_EPIS} entregas={[]} />);
    expect(screen.getByText('Capacete de Segurança')).toBeInTheDocument();
  });

  it('renders EPI CA number', () => {
    render(<SSTEPIsTab epis={MOCK_EPIS} entregas={[]} />);
    expect(screen.getByText('CA: CA-12345')).toBeInTheDocument();
  });

  it('renders EPI categoria badge', () => {
    render(<SSTEPIsTab epis={MOCK_EPIS} entregas={[]} />);
    expect(screen.getByText('Proteção da Cabeça')).toBeInTheDocument();
  });

  it('renders multiple EPI cards', () => {
    render(<SSTEPIsTab epis={MOCK_EPIS} entregas={[]} />);
    expect(screen.getByText('Luva de Proteção')).toBeInTheDocument();
  });

  it('renders Últimas Entregas section when entregas provided', () => {
    render(<SSTEPIsTab epis={MOCK_EPIS} entregas={MOCK_ENTREGAS} />);
    expect(screen.getByText('Últimas Entregas')).toBeInTheDocument();
  });

  it('renders colaborador name in entregas table', () => {
    render(<SSTEPIsTab epis={MOCK_EPIS} entregas={MOCK_ENTREGAS} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('does not render Últimas Entregas section when entregas is empty', () => {
    render(<SSTEPIsTab epis={MOCK_EPIS} entregas={[]} />);
    expect(screen.queryByText('Últimas Entregas')).not.toBeInTheDocument();
  });
});
