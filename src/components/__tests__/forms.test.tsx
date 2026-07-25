import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField } from '../forms/FormField';
import { FormSwitch } from '../forms/FormSwitch';
import { FormSection, FormDivider, FormActions } from '../forms/FormSection';
import { FormSelect } from '../forms/FormSelect';

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

describe('FormSection', () => {
  it('renders title when provided', () => {
    render(<FormSection title="Dados Pessoais"><div /></FormSection>);
    expect(screen.getByText('Dados Pessoais')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<FormSection title="Contato" description="Informações de contato"><div /></FormSection>);
    expect(screen.getByText('Informações de contato')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(<FormSection><span>Filho</span></FormSection>);
    expect(screen.getByText('Filho')).toBeInTheDocument();
  });

  it('does not render header block when no title or description', () => {
    const { container } = render(<FormSection><div>content</div></FormSection>);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('FormDivider renders a divider element', () => {
    const { container } = render(<FormDivider />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('FormActions renders children', () => {
    render(<FormActions><button>Salvar</button></FormActions>);
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });
});

describe('FormSelect', () => {
  const OPTIONS = [
    { value: 'rh', label: 'RH' },
    { value: 'ti', label: 'TI' },
    { value: 'fin', label: 'Financeiro', disabled: true },
  ];

  it('renders label when provided', () => {
    render(<FormSelect label="Departamento" options={OPTIONS} />);
    expect(screen.getByText('Departamento')).toBeInTheDocument();
  });

  it('renders select trigger element', () => {
    const { container } = render(<FormSelect options={OPTIONS} />);
    expect(container.querySelector('button')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<FormSelect options={OPTIONS} error="Campo obrigatório" />);
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });

  it('renders description when no error', () => {
    render(<FormSelect options={OPTIONS} description="Escolha o departamento" />);
    expect(screen.getByText('Escolha o departamento')).toBeInTheDocument();
  });

  it('hides description when error present', () => {
    render(<FormSelect options={OPTIONS} description="Ajuda" error="Erro" />);
    expect(screen.queryByText('Ajuda')).toBeNull();
  });

  it('renders with empty options without error', () => {
    expect(() => render(<FormSelect options={[]} />)).not.toThrow();
  });
});
