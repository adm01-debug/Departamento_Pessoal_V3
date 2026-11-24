import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useAdmissoes', () => ({
  useAdmissoes: vi.fn(() => ({
    criar: vi.fn(() => Promise.resolve()),
    atualizar: vi.fn(() => Promise.resolve()),
    admissoes: [],
    isLoading: false,
  })),
}));

// Radix em duble: o conteúdo agora só existe com `open` (como no navegador — o
// modal usa a MESMA montagem do popup "Pendências": Portal/Overlay/Content com
// `forceMount` + `AnimatePresence`). O duble evita focus-trap/portais no jsdom.
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children }: any) => <div>{children}</div>,
  Trigger: ({ children }: any) => <div>{children}</div>,
  Portal: ({ children }: any) => <div>{children}</div>,
  Overlay: ({ children }: any) => <div>{children}</div>,
  Content: ({ children }: any) => <div>{children}</div>,
  Close: ({ children }: any) => <button>{children}</button>,
  Title: ({ children }: any) => <h2>{children}</h2>,
  Description: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type }: any) => (
    <button onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

import { NovaAdmissaoDialog } from '../admissoes/NovaAdmissaoDialog';

/** Abre o diálogo (controlado) — o conteúdo só é montado com `open`. */
const renderAberto = () => render(<NovaAdmissaoDialog open onOpenChange={() => {}} />);

describe('NovaAdmissaoDialog', () => {
  it('renders Nova Admissão trigger button by default', () => {
    render(<NovaAdmissaoDialog />);
    expect(screen.getAllByText('Nova Admissão').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Nova Admissão dialog title', () => {
    renderAberto();
    expect(screen.getAllByText('Nova Admissão').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Nome completo label', () => {
    renderAberto();
    expect(screen.getByText(/Nome completo/i)).toBeInTheDocument();
  });

  it('renders Cargo label', () => {
    renderAberto();
    expect(screen.getByText(/^Cargo \*$/)).toBeInTheDocument();
  });

  it('renders Departamento label', () => {
    renderAberto();
    expect(screen.getByText(/Departamento/i)).toBeInTheDocument();
  });

  it('renders Salário proposto label', () => {
    renderAberto();
    expect(screen.getByText(/Salário proposto/i)).toBeInTheDocument();
  });

  it('renders Criar Admissão submit button', () => {
    renderAberto();
    expect(screen.getByText('Criar Admissão')).toBeInTheDocument();
  });

  it('renders Cancelar button', () => {
    renderAberto();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('renders RH department option', () => {
    renderAberto();
    expect(screen.getByText('RH')).toBeInTheDocument();
  });

  it('renders TI department option', () => {
    renderAberto();
    expect(screen.getByText('TI')).toBeInTheDocument();
  });

  it('renders custom children as trigger when provided', () => {
    render(
      <NovaAdmissaoDialog>
        <button>Custom Trigger</button>
      </NovaAdmissaoDialog>
    );
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });

  it('usa a MESMA coreografia do popup "Pendências" (cascade-motion)', () => {
    const { container } = renderAberto();
    // Véu: mesmas classes do AnimatedCascadeDialog.
    expect(container.querySelector('.backdrop-blur-sm')).toBeTruthy();
    expect(container.querySelector('.bg-black\\/60')).toBeTruthy();
    // Casca com `transform-origin: top center` (a caixa que nasce pequena e estica).
    const shell = container.querySelector('div[style*="transform-origin: top center"]') as HTMLElement;
    expect(shell).toBeTruthy();
    expect(shell.className).toContain('max-w-lg');
    // X igual ao da referência.
    expect(screen.getByText('Fechar')).toBeInTheDocument();
  });
});
