import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CurrencyInput } from '../ui/currency-input';

vi.mock('@/lib/utils', () => ({ cn: (...c: string[]) => c.filter(Boolean).join(' ') }));
vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} data-testid="currency-input" />,
}));

describe('CurrencyInput', () => {
  it('renders with default placeholder', () => {
    render(<CurrencyInput />);
    expect(screen.getByPlaceholderText('R$ 0,00')).toBeTruthy();
  });

  it('accepts custom placeholder', () => {
    render(<CurrencyInput placeholder="Valor" />);
    expect(screen.getByPlaceholderText('Valor')).toBeTruthy();
  });

  it('initializes displayValue from controlled value', () => {
    render(<CurrencyInput value={1500} />);
    const input = screen.getByTestId('currency-input') as HTMLInputElement;
    // Should display formatted BRL currency
    expect(input.value).toContain('1');
    expect(input.value).toContain('500');
  });

  it('calls onChange with numeric value when user types', () => {
    const onChange = vi.fn();
    render(<CurrencyInput onChange={onChange} />);
    fireEvent.change(screen.getByTestId('currency-input'), { target: { value: 'R$ 10,00' } });
    expect(onChange).toHaveBeenCalledWith(0.1);
  });

  it('calls onChange with 0 when input is empty', () => {
    const onChange = vi.fn();
    render(<CurrencyInput onChange={onChange} />);
    fireEvent.change(screen.getByTestId('currency-input'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('is disabled when disabled prop is true', () => {
    render(<CurrencyInput disabled />);
    const input = screen.getByTestId('currency-input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('parses large amounts correctly', () => {
    const onChange = vi.fn();
    render(<CurrencyInput onChange={onChange} />);
    // "1000000" digits → 10000.00
    fireEvent.change(screen.getByTestId('currency-input'), { target: { value: '1000000' } });
    expect(onChange).toHaveBeenCalledWith(10000);
  });
});
