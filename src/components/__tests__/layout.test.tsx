import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from '../layout/PageHeader';
import { SectionHeader } from '../layout/SectionHeader';
import { BackButton } from '../layout/BackButton';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as object;
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Colaboradores" />);
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<PageHeader title="Folha" description="Gestão de folha de pagamento" />);
    expect(screen.getByText('Gestão de folha de pagamento')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.queryByRole('paragraph')).toBeNull();
  });

  it('renders actions slot', () => {
    render(<PageHeader title="Cargos" actions={<button>Adicionar</button>} />);
    expect(screen.getByText('Adicionar')).toBeInTheDocument();
  });
});

describe('SectionHeader', () => {
  it('renders title as h2', () => {
    render(<SectionHeader title="Dados Pessoais" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Dados Pessoais');
  });

  it('renders description when provided', () => {
    render(<SectionHeader title="FGTS" description="Informações do fundo" />);
    expect(screen.getByText('Informações do fundo')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(<SectionHeader title="Benefícios" actions={<button>Editar</button>} />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });
});

describe('BackButton', () => {
  it('does not render on root paths', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BackButton />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders on non-root paths', () => {
    render(
      <MemoryRouter initialEntries={['/colaboradores/123']}>
        <BackButton />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
  });

  it('navigates back when clicked', async () => {
    const user = userEvent.setup();
    // simulate history.length > 2
    Object.defineProperty(window, 'history', {
      value: { length: 5 },
      configurable: true,
    });
    render(
      <MemoryRouter initialEntries={['/colaboradores/novo']}>
        <BackButton />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /voltar/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('navigates to fallback when history is short', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'history', {
      value: { length: 1 },
      configurable: true,
    });
    render(
      <MemoryRouter initialEntries={['/folha/calcular']}>
        <BackButton fallbackPath="/dashboard" />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /voltar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
