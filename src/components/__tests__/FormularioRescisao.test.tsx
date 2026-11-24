import { describe, it, expect, vi, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormularioRescisao } from '../calculadoraRescisao/FormularioRescisao';
import type { RescisaoFormState } from '../calculadoraRescisao/rescisaoView';

// jsdom não implementa `scrollIntoView` (o cmdk chama ao montar a lista).
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const FORM: RescisaoFormState = {
  nomeColaborador: '',
  cpf: '',
  cargo: '',
  departamento: '',
  salario: '',
  dataAdmissao: '',
  dataDesligamento: '',
  tipo: 'sem_justa_causa',
  avisoTrabalhado: false,
  feriasVencidas: false,
  saldoFGTS: '',
  motivoDesligamento: '',
  observacoes: '',
};

function montar() {
  return render(
    <FormularioRescisao
      form={FORM}
      onChange={vi.fn()}
      colaboradores={[{ id: 'c1', nome_completo: 'Ana Beatriz Souza', cpf: '111.111.111-11', matricula: 'MAT001' }]}
      colaborador={null}
      loadingColab={false}
      onSelectColaborador={vi.fn()}
      onLimparColaborador={vi.fn()}
      mecanismo="local"
      onMecanismoChange={vi.fn()}
      onCalcular={vi.fn()}
      calculando={false}
    />
  );
}

function abrirComboboxColaborador() {
  const trigger = screen
    .getAllByRole('combobox')
    .find((el) => /Busque por nome, CPF ou matrícula/i.test(el.textContent ?? ''));
  expect(trigger).toBeTruthy();
  fireEvent.click(trigger as HTMLElement);
}

/**
 * O campo de busca interna do combobox (Popover + Command/cmdk) tinha o anel de
 * foco (lime, `ring-2 ring-ring` do `:focus-visible` global em `index.css`)
 * aplicado SÓ ao `<input>` interno — então o contorno começava DEPOIS da lupa.
 * O ajuste move o foco para o WRAPPER `[cmdk-input-wrapper]` (lupa + input) via
 * `:focus-within`, sem tocar no `ui/command.tsx` compartilhado. Estes testes
 * travam esse contrato.
 */
describe('FormularioRescisao — foco do campo de busca do combobox', () => {
  it('tira o anel de foco do input interno (o contorno não começa depois da lupa)', () => {
    montar();
    abrirComboboxColaborador();

    const input = screen.getByPlaceholderText('Buscar colaborador ativo...');
    // O input cancela o próprio `:focus-visible`; o destaque fica no wrapper.
    expect(input.className).toContain('focus-visible:ring-0');
    // O espaçamento antigo (`my-2`) do input saiu — o respiro vive no wrapper.
    expect(input.className).not.toContain('my-2');
  });

  it('aplica o destaque de foco ao wrapper que contém lupa + input', () => {
    montar();
    abrirComboboxColaborador();

    const input = screen.getByPlaceholderText('Buscar colaborador ativo...');
    const wrapper = input.parentElement as HTMLElement;
    expect(wrapper.getAttribute('cmdk-input-wrapper')).not.toBeNull();
    // A lupa é IRMÃ do input dentro do wrapper — o contorno precisa envolvê-los.
    expect(wrapper.querySelector('svg')).not.toBeNull();

    // O `Command` (ancestral) é quem dirige o `:focus-within` no
    // `[cmdk-input-wrapper]`, no call site — sem tocar no `ui/command.tsx`.
    const command = wrapper.parentElement as HTMLElement;
    expect(command.className).toContain('[&_[cmdk-input-wrapper]:focus-within]:border-primary');
    expect(command.className).toContain('[&_[cmdk-input-wrapper]:focus-within]:ring-1');
  });

  it('mantém o wrapper do input sem clipping (só padding horizontal)', () => {
    montar();
    abrirComboboxColaborador();

    const input = screen.getByPlaceholderText('Buscar colaborador ativo...');
    const wrapper = input.parentElement as HTMLElement;
    expect(wrapper.getAttribute('cmdk-input-wrapper')).not.toBeNull();
    expect(wrapper.className).toContain('px-3');
    // Nada de `overflow-hidden` no pai direto: o anel nunca é recortado aqui.
    expect(wrapper.className).not.toContain('overflow-hidden');
    expect(wrapper.className).not.toContain('overflow-clip');
  });

  it('continua listando e selecionando colaboradores (busca/seleção intactas)', () => {
    const onSelect = vi.fn();
    render(
      <FormularioRescisao
        form={FORM}
        onChange={vi.fn()}
        colaboradores={[{ id: 'c1', nome_completo: 'Ana Beatriz Souza', cpf: '111.111.111-11', matricula: 'MAT001' }]}
        colaborador={null}
        loadingColab={false}
        onSelectColaborador={onSelect}
        onLimparColaborador={vi.fn()}
        mecanismo="local"
        onMecanismoChange={vi.fn()}
        onCalcular={vi.fn()}
        calculando={false}
      />
    );

    abrirComboboxColaborador();

    const item = screen.getByText('Ana Beatriz Souza');
    expect(item).toBeInTheDocument();
    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledWith('c1');
  });
});
