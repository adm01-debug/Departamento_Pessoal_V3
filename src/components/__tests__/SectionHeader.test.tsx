import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { Users } from 'lucide-react';
import { SectionHeader } from '../dashboard/SectionHeader';

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Colaboradores" icon={Users} />);
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<SectionHeader title="Colaboradores" subtitle="Gestão da equipe" icon={Users} />);
    expect(screen.getByText('Gestão da equipe')).toBeInTheDocument();
  });

  it('does not render subtitle when absent', () => {
    render(<SectionHeader title="Colaboradores" icon={Users} />);
    expect(screen.queryByText('Gestão da equipe')).toBeNull();
  });

  it('renders action slot', () => {
    render(
      <SectionHeader
        title="Colaboradores"
        icon={Users}
        action={<button>Adicionar</button>}
      />
    );
    expect(screen.getByRole('button', { name: /Adicionar/i })).toBeInTheDocument();
  });

  it('renders h2 heading element', () => {
    render(<SectionHeader title="Equipe" icon={Users} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SectionHeader title="Equipe" icon={Users} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders icon wrapper with rounded-xl', () => {
    const { container } = render(<SectionHeader title="Equipe" icon={Users} />);
    expect(container.querySelector('.rounded-xl')).toBeInTheDocument();
  });

  it('renders no action buttons by default', () => {
    render(<SectionHeader title="Equipe" icon={Users} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
