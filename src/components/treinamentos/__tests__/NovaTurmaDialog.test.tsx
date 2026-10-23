import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NovaTurmaDialog } from '../NovaTurmaDialog';
import type { CursoTurma } from '../turmasDerivacoes';
import { todayLocalISO } from '@/utils/dateLocal';

beforeAll(() => {
  // Radix Select usa Pointer Capture no jsdom, que não implementa a API.
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  });
});

function preencher(input: HTMLElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const CURSOS: CursoTurma[] = [
  { id: 'curso-1', nome: 'NR-17 Ergonomia', categoria: 'Segurança do Trabalho', modalidade: 'presencial' },
  { id: 'curso-2', nome: 'Liderança e Gestão de Equipes', categoria: 'Liderança', modalidade: 'hibrido' },
];

describe('NovaTurmaDialog — criação real', () => {
  it('mantém Salvar desabilitado sem curso/data/horário', () => {
    render(<NovaTurmaDialog cursos={CURSOS} colaboradores={[]} onOpenChange={vi.fn()} onCriar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('não cria nada ao apenas abrir ou cancelar', async () => {
    const criar = vi.fn();
    const fechar = vi.fn();
    render(<NovaTurmaDialog cursos={CURSOS} colaboradores={[]} onOpenChange={fechar} onCriar={criar} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(fechar).toHaveBeenCalledWith(false);
    expect(criar).not.toHaveBeenCalled();
  });

  it('valida capacidade e envia o payload real ao salvar', async () => {
    const criar = vi.fn();
    render(<NovaTurmaDialog cursos={CURSOS} colaboradores={[]} onOpenChange={vi.fn()} onCriar={criar} />);

    await userEvent.click(screen.getByLabelText('Curso da nova turma'));
    await userEvent.click(await screen.findByRole('option', { name: 'NR-17 Ergonomia' }));
    await waitFor(() => expect(screen.getByLabelText('Curso da nova turma')).toHaveTextContent('NR-17 Ergonomia'));

    await userEvent.click(screen.getByLabelText(/Data de início/i));
    await userEvent.click(await screen.findByRole('button', { name: 'Hoje' }));

    preencher(document.getElementById('nova-turma-hora') as HTMLElement, '09:00');
    preencher(document.getElementById('nova-turma-capacidade') as HTMLElement, '20');

    const salvar = screen.getByRole('button', { name: 'Salvar' });
    await waitFor(() => expect(salvar).toBeEnabled());
    await userEvent.click(salvar);

    expect(criar).toHaveBeenCalledWith({
      curso_id: 'curso-1',
      instrutor_id: null,
      data_inicio: new Date(`${todayLocalISO()}T09:00:00`).toISOString(),
      local_link: null,
      capacidade_maxima: 20,
    });
  });

  it('bloqueia capacidade zero', () => {
    render(<NovaTurmaDialog cursos={CURSOS} colaboradores={[]} onOpenChange={vi.fn()} onCriar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Capacidade/i), { target: { value: '0' } });
    expect(screen.getByText(/maior que zero/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });
});
