import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CPFInput } from '../ui/cpf-input';

vi.mock('@/lib/utils', () => ({ cn: (...c: string[]) => c.filter(Boolean).join(' ') }));
vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} data-testid="cpf-input" />,
}));

describe('CPFInput', () => {
  it('renders with placeholder 000.000.000-00', () => {
    render(<CPFInput />);
    expect(screen.getByPlaceholderText('000.000.000-00')).toBeTruthy();
  });

  it('formats typed digits as CPF mask', () => {
    const onChange = vi.fn();
    render(<CPFInput onChange={onChange} />);
    const input = screen.getByTestId('cpf-input');
    fireEvent.change(input, { target: { value: '12345678909' } });
    expect(onChange).toHaveBeenCalledWith('12345678909');
  });

  it('calls onChange with raw digits (no punctuation)', () => {
    const onChange = vi.fn();
    render(<CPFInput onChange={onChange} />);
    fireEvent.change(screen.getByTestId('cpf-input'), { target: { value: '111.444.777-35' } });
    const raw = onChange.mock.calls[0][0];
    expect(/^\d+$/.test(raw)).toBe(true);
  });

  it('calls onValidate(true) for a valid CPF when 11 digits typed', () => {
    const onValidate = vi.fn();
    render(<CPFInput onValidate={onValidate} />);
    // Valid CPF: 111.444.777-35
    fireEvent.change(screen.getByTestId('cpf-input'), { target: { value: '11144477735' } });
    expect(onValidate).toHaveBeenCalledWith(true);
  });

  it('calls onValidate(false) for an invalid CPF', () => {
    const onValidate = vi.fn();
    render(<CPFInput onValidate={onValidate} />);
    // 111.111.111-11 — all same digits → invalid
    fireEvent.change(screen.getByTestId('cpf-input'), { target: { value: '11111111111' } });
    expect(onValidate).toHaveBeenCalledWith(false);
  });

  it('does not call onValidate when fewer than 11 digits', () => {
    const onValidate = vi.fn();
    render(<CPFInput onValidate={onValidate} />);
    fireEvent.change(screen.getByTestId('cpf-input'), { target: { value: '12345' } });
    expect(onValidate).not.toHaveBeenCalled();
  });

  it('initializes displayValue from controlled value', () => {
    render(<CPFInput value="11144477735" />);
    const input = screen.getByTestId('cpf-input') as HTMLInputElement;
    expect(input.value).toMatch(/111/);
  });

  it('is disabled when disabled prop is true', () => {
    render(<CPFInput disabled />);
    const input = screen.getByTestId('cpf-input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
