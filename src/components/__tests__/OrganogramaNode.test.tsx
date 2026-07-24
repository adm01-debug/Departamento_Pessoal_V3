import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { OrganogramaNode } from '../organograma/OrganogramaNode';

const LEAF_NODE = {
  id: '1',
  nome: 'Recursos Humanos',
  colaboradores: [
    { id: 'c1', nome_completo: 'Ana Lima', cargo: 'Analista', email: 'ana@example.com', foto_url: null },
  ],
  sub_departamentos: [],
};

const NODE_WITH_SUBS = {
  id: '2',
  nome: 'TI',
  colaboradores: [],
  sub_departamentos: [
    { id: '3', nome: 'Desenvolvimento', colaboradores: [], sub_departamentos: [] },
  ],
};

describe('OrganogramaNode', () => {
  it('renders department name', () => {
    render(<OrganogramaNode node={LEAF_NODE} />);
    expect(screen.getByText('Recursos Humanos')).toBeInTheDocument();
  });

  it('shows colaborador count badge', () => {
    render(<OrganogramaNode node={LEAF_NODE} />);
    expect(screen.getByText('1 colaboradores')).toBeInTheDocument();
  });

  it('shows colaborador name when expanded', () => {
    render(<OrganogramaNode node={LEAF_NODE} level={0} />);
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
  });

  it('shows sub-departamento badge', () => {
    render(<OrganogramaNode node={NODE_WITH_SUBS} level={0} />);
    expect(screen.getByText('1 sub-deptos')).toBeInTheDocument();
  });

  it('collapses when clicked', async () => {
    const user = userEvent.setup();
    render(<OrganogramaNode node={LEAF_NODE} level={0} />);
    // Click to collapse (starts expanded at level 0)
    await user.click(screen.getByText('Recursos Humanos'));
    // Ana Lima should no longer be visible
    expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument();
  });

  it('renders sub-departamento node name', () => {
    render(<OrganogramaNode node={NODE_WITH_SUBS} level={0} />);
    expect(screen.getByText('Desenvolvimento')).toBeInTheDocument();
  });
});
