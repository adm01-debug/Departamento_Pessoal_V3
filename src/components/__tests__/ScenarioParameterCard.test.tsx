import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, 'aria-label': ariaLabel }: any) => (
    <input
      type="range"
      aria-label={ariaLabel}
      value={value?.[0] ?? 0}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
    />
  ),
}));

import { ScenarioParameterCard, type ScenarioParameterUnit } from '../premiacoes/ScenarioParameterCard';

function Harness({
  unit,
  inicial,
  min,
  max,
  onChange,
}: {
  unit: ScenarioParameterUnit;
  inicial: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <ScenarioParameterCard
      label="Parâmetro"
      description="Descrição"
      value={valor}
      min={min}
      max={max}
      step={1}
      unit={unit}
      icon={<span />}
      onChange={(v) => {
        onChange(v);
        setValor(v);
      }}
    />
  );
}

const campo = () => screen.getByRole('textbox', { name: 'Parâmetro' });

function digitar(texto: string, tecla?: 'Enter' | 'Escape') {
  const input = campo() as HTMLInputElement;
  act(() => input.focus());
  fireEvent.change(input, { target: { value: texto } });
  if (tecla) fireEvent.keyDown(input, { key: tecla });
}

describe('ScenarioParameterCard', () => {
  it('confirma moeda no formato brasileiro e atualiza o pai', () => {
    const onChange = vi.fn();
    render(<Harness unit="currency" inicial={4500} min={1500} max={30000} onChange={onChange} />);
    expect(campo()).toHaveValue('4.500,00');
    digitar('7500', 'Enter');
    expect(onChange).toHaveBeenCalledWith(7500);
    expect(campo()).toHaveValue('7.500,00');
  });

  it('confirma percentual decimal', () => {
    const onChange = vi.fn();
    render(<Harness unit="percentage" inicial={5} min={0} max={20} onChange={onChange} />);
    digitar('8,5', 'Enter');
    expect(onChange).toHaveBeenCalledWith(8.5);
    expect(campo()).toHaveValue('8,5');
  });

  it('arredonda inteiro e não aceita acima do máximo', () => {
    const onChange = vi.fn();
    render(<Harness unit="integer" inicial={50} min={0} max={1000} onChange={onChange} />);
    digitar('99999', 'Enter');
    expect(onChange).not.toHaveBeenCalled();
    expect(campo()).toHaveValue('50');
    digitar('150', 'Enter');
    expect(onChange).toHaveBeenCalledWith(150);
    expect(campo()).toHaveValue('150');
  });

  it('Escape restaura o último valor confirmado', () => {
    const onChange = vi.fn();
    render(<Harness unit="currency" inicial={4500} min={1500} max={30000} onChange={onChange} />);
    digitar('999', 'Escape');
    expect(onChange).not.toHaveBeenCalled();
    expect(campo()).toHaveValue('4.500,00');
  });

  it('bloqueia texto não numérico e campo vazio não confirma', () => {
    const onChange = vi.fn();
    render(<Harness unit="percentage" inicial={10} min={0} max={100} onChange={onChange} />);
    digitar('abc');
    expect(campo()).toHaveValue('');
    fireEvent.keyDown(campo(), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(campo()).toHaveValue('10');
  });
});
