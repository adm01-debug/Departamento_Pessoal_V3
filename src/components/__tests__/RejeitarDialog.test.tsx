import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>{children}</button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder }: any) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

import { RejeitarDialog } from '../ferias/programacao/RejeitarDialog';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  onConfirm: vi.fn().mockResolvedValue(undefined),
};

describe('RejeitarDialog', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(<RejeitarDialog {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title "Rejeitar programação"', () => {
    render(<RejeitarDialog {...defaultProps} />);
    expect(screen.getByText('Rejeitar programação')).toBeTruthy();
  });

  it('renders "Motivo" label and textarea', () => {
    render(<RejeitarDialog {...defaultProps} />);
    expect(screen.getByText('Motivo')).toBeTruthy();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('Rejeitar button is disabled when motivo is empty', () => {
    render(<RejeitarDialog {...defaultProps} />);
    const btn = screen.getByText('Rejeitar') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('Rejeitar button is disabled when motivo has fewer than 3 chars', () => {
    render(<RejeitarDialog {...defaultProps} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ab' } });
    const btn = screen.getByText('Rejeitar') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('Rejeitar button enabled when motivo has at least 3 chars', () => {
    render(<RejeitarDialog {...defaultProps} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } });
    const btn = screen.getByText('Rejeitar') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('Cancelar button calls onOpenChange(false)', () => {
    const onOpenChange = vi.fn();
    render(<RejeitarDialog {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onConfirm with trimmed motivo when Rejeitar clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(<RejeitarDialog {...defaultProps} onConfirm={onConfirm} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  motivo de rejeição  ' } });
    fireEvent.click(screen.getByText('Rejeitar'));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('motivo de rejeição');
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Rejeitar button is disabled when isPending=true', () => {
    render(<RejeitarDialog {...defaultProps} isPending />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'motivo válido' } });
    const btn = screen.getByText('Rejeitar') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
