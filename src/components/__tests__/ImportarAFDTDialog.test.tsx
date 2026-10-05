import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => (
    <span>{placeholder ?? 'AFDT'}</span>
  ),
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: unknown) => String(e)),
}));

import { ImportarAFDTDialog } from '../ponto/ImportarAFDTDialog';

describe('ImportarAFDTDialog', () => {
  it('renders Importar AFDT/ACJEF trigger button', () => {
    render(<ImportarAFDTDialog />);
    expect(screen.getByRole('button', { name: /Importar AFDT/i })).toBeInTheDocument();
  });

  it('renders dialog title', () => {
    render(<ImportarAFDTDialog />);
    expect(screen.getByText('Importar arquivo legal de ponto')).toBeInTheDocument();
  });

  it('renders dialog description with Portaria MTP 671', () => {
    render(<ImportarAFDTDialog />);
    expect(screen.getByText(/Portaria MTP 671/i)).toBeInTheDocument();
  });

  it('renders Tipo de arquivo label', () => {
    render(<ImportarAFDTDialog />);
    expect(screen.getByText(/Tipo de arquivo/i)).toBeInTheDocument();
  });

  it('renders AFDT select option', () => {
    render(<ImportarAFDTDialog />);
    expect(screen.getByText(/AFDT.*Detalhado de Marca.*es/i)).toBeInTheDocument();
  });

  it('renders ACJEF select option', () => {
    render(<ImportarAFDTDialog />);
    expect(screen.getByText(/ACJEF.*Controle de Jornada/i)).toBeInTheDocument();
  });

  it('renders AEJ select option', () => {
    render(<ImportarAFDTDialog />);
    expect(screen.getByText(/AEJ.*Arquivo Eletr.*nico/i)).toBeInTheDocument();
  });

  it('renders file input for upload', () => {
    render(<ImportarAFDTDialog />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });
});
