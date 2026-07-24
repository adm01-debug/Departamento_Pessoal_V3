import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField } from '../forms/FormField';
import { FormSwitch } from '../forms/FormSwitch';

describe('FormField', () => {
  it('renders label when provided', () => {
    render(<FormField label="Nome" name="nome" />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
  });

  it('renders input', () => {
    render(<FormField name="email" placeholder="Digite o email" />);
    expect(screen.getByPlaceholderText('Digite o email')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<FormField label="CPF" name="cpf" error="CPF inválido" />);
    expect(screen.getByText('CPF inválido')).toBeInTheDocument();
  });

  it('renders description when no error', () => {
    render(<FormField name="cpf" description="Somente números" />);
    expect(screen.getByText('Somente números')).toBeInTheDocument();
  });

  it('hides description when error is present', () => {
    render(<FormField name="cpf" description="Somente números" error="Campo obrigatório" />);
    expect(screen.queryByText('Somente números')).toBeNull();
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  it('associates label with input via id', () => {
    render(<FormField label="Salário" name="salario" id="salario-field" />);
    const label = screen.getByText('Salário');
    expect(label).toHaveAttribute('for', 'salario-field');
  });

  it('uses name as id when no id provided', () => {
    render(<FormField label="Cargo" name="cargo" />);
    const label = screen.getByText('Cargo');
    expect(label).toHaveAttribute('for', 'cargo');
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<FormField name="test" defaultValue="" />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'João');
    expect(input).toHaveValue('João');
  });
});

describe('FormSwitch', () => {
  it('renders label', () => {
    render(<FormSwitch label="Ativo" />);
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<FormSwitch label="Ativo" description="Habilita o recurso" />);
    expect(screen.getByText('Habilita o recurso')).toBeInTheDocument();
  });

  it('renders switch element', () => {
    render(<FormSwitch label="Toggle" id="toggle" />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('reflects checked state', () => {
    render(<FormSwitch label="Ativo" checked={true} onCheckedChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
  });

  it('reflects unchecked state', () => {
    render(<FormSwitch label="Inativo" checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');
  });

  it('calls onCheckedChange when toggled', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<FormSwitch label="Toggle" checked={false} onCheckedChange={handler} />);
    await user.click(screen.getByRole('switch'));
    expect(handler).toHaveBeenCalledWith(true);
  });
});
