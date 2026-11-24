import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

/**
 * ============================================================================
 * OS TRÊS CAMINHOS DE FECHAMENTO DO "NOVO DESLIGAMENTO" CONTINUAM VÁLIDOS.
 *
 * Trocar a moldura (`DialogContent` → `CascadeDialogFrame`) não pode mexer no
 * comportamento de fechar: o X superior, o `Esc` e o clique fora (véu) seguem
 * sendo do Radix e precisam chamar `onClose` (o `open` é controlado pela página).
 *
 * Aqui o Radix é o REAL — sem duble — porque é ele quem despacha o fechamento.
 * ============================================================================
 */

vi.mock('@/components/ui/dialog', async () => {
  const DialogPrimitive = await import('@radix-ui/react-dialog');
  return {
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <DialogPrimitive.Title>{children}</DialogPrimitive.Title>,
    DialogDescription: ({ children }: any) => <DialogPrimitive.Description>{children}</DialogPrimitive.Description>,
  };
});

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/services/desligamentoService', () => ({
  desligamentoService: { criar: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked }: any) => <input type="checkbox" readOnly checked={!!checked} />,
}));

vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((_e: any, d: string) => d) }));

import { NovoDesligamentoDialog } from '../desligamentos/NovoDesligamentoDialog';

describe('NovoDesligamentoDialog — fechamento (Radix real)', () => {
  it('o X superior chama onClose', async () => {
    const onClose = vi.fn();
    render(<NovoDesligamentoDialog open onClose={onClose} />);

    const fechar = await screen.findByRole('button', { name: 'Fechar' });
    fireEvent.click(fechar);
    expect(onClose).toHaveBeenCalled();
  });

  it('o Esc chama onClose', async () => {
    const onClose = vi.fn();
    render(<NovoDesligamentoDialog open onClose={onClose} />);

    await screen.findByText('Novo Desligamento');
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('o clique fora (véu) chama onClose', async () => {
    const onClose = vi.fn();
    render(<NovoDesligamentoDialog open onClose={onClose} />);

    await screen.findByText('Novo Desligamento');
    // O véu mora no PORTAL do Radix (document.body), não no container do render.
    const veu = document.querySelector<HTMLElement>('.backdrop-blur-sm');
    expect(veu).not.toBeNull();
    // O `pointerdown` do Radix precisa se declarar primário (`isPrimary`) e não
    // pode vir de toque; em modal o fechamento é adiado (`deferPointerDownOutside`)
    // e só é despachado no `click` que segue o `pointerdown` — daí os dois eventos.
    fireEvent.pointerDown(veu!, { isPrimary: true, pointerType: 'mouse', button: 0 });
    fireEvent.click(veu!);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
