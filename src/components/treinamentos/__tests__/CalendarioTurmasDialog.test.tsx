import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarioTurmasDialog } from '../CalendarioTurmasDialog';
import { montarTurmas, type CursoTurma } from '../turmasDerivacoes';

/**
 * CALENDÁRIO MENSAL — grade, mês inicial e abertura da turma existente.
 *
 * A fonte é a mesma da agenda (turmas já carregadas): nenhum serviço/consulta
 * é chamado pelo componente.
 */

const CURSOS: CursoTurma[] = [
  {
    id: 'curso-1',
    nome: 'NR-17 Ergonomia',
    categoria: 'Segurança do Trabalho',
    modalidade: 'presencial',
    carga_horaria: 4,
  },
  { id: 'curso-2', nome: 'Liderança e Gestão', categoria: 'Liderança', modalidade: 'online', carga_horaria: 12 },
];

const TURMAS = montarTurmas(
  [
    {
      id: 'inst-terca',
      curso_id: 'curso-1',
      data_inicio: '2026-09-15T11:00:00Z',
      data_fim: '2026-09-15T15:00:00Z',
      local_link: 'Sala 01',
      status: 'planejado',
    },
    {
      id: 'inst-quarta',
      curso_id: 'curso-2',
      data_inicio: '2026-09-16T09:00:00Z',
      local_link: 'Microsoft Teams',
      status: 'em_curso',
    },
    {
      id: 'inst-outubro',
      curso_id: 'curso-1',
      data_inicio: '2026-10-02T09:00:00Z',
      status: 'planejado',
    },
  ],
  CURSOS,
  [],
  new Date(2026, 8, 20)
);

function renderCalendario(onAbrirTurma = vi.fn()) {
  const resultado = render(
    <CalendarioTurmasDialog
      open
      onOpenChange={vi.fn()}
      mesInicial={new Date(2026, 8, 14)}
      turmas={TURMAS}
      onAbrirTurma={onAbrirTurma}
    />
  );
  return { ...resultado, onAbrirTurma, dialog: screen.getByRole('dialog') };
}

describe('CalendarioTurmasDialog', () => {
  it('abre no mês da semana exibida e distribui os dias da grade', () => {
    const { dialog } = renderCalendario();

    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();
    expect(dialog.querySelectorAll('[data-calendario-dia]')).toHaveLength(35);
    expect(screen.getAllByText('NR-17 Ergonomia').length).toBeGreaterThan(0);
    expect(dialog.querySelector('[data-calendario-lista-mes]')).toHaveTextContent('NR-17 Ergonomia');
  });

  it('navega entre os meses sem perder a fonte de dados', async () => {
    const { dialog } = renderCalendario();

    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('Outubro de 2026')).toBeInTheDocument();
    expect(dialog.querySelector('[data-calendario-turma="inst-outubro"]')).not.toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();
    expect(dialog.querySelector('[data-calendario-turma="inst-terca"]')).not.toBeNull();
  });

  it('abre a turma existente ao clicar no evento do dia', async () => {
    const { dialog, onAbrirTurma } = renderCalendario();

    const evento = dialog.querySelector('[data-calendario-turma="inst-terca"]');
    expect(evento).not.toBeNull();
    await userEvent.click(evento as HTMLElement);

    expect(onAbrirTurma).toHaveBeenCalledWith(expect.objectContaining({ id: 'inst-terca' }));
  });

  it('com três turmas no dia, o contador abre a lista completa e permite abrir a terceira', async () => {
    const cursos: CursoTurma[] = [
      { id: 'c1', nome: 'Curso A', categoria: 'Geral', modalidade: 'presencial', carga_horaria: 4 },
      { id: 'c2', nome: 'Curso B', categoria: 'Geral', modalidade: 'presencial', carga_horaria: 4 },
      {
        id: 'c3',
        nome: 'Treinamento de Segurança do Trabalho para Operações de Alta Complexidade',
        categoria: 'Segurança do Trabalho',
        modalidade: 'online',
        carga_horaria: 8,
      },
    ];
    const turmas = montarTurmas(
      [
        { id: 'a', curso_id: 'c1', data_inicio: '2026-09-15T09:00:00Z', status: 'planejado' },
        { id: 'b', curso_id: 'c2', data_inicio: '2026-09-15T11:00:00Z', status: 'em_curso' },
        { id: 'c', curso_id: 'c3', data_inicio: '2026-09-15T13:00:00Z', status: 'concluido' },
      ],
      cursos,
      [],
      new Date(2026, 8, 20)
    );
    const onAbrirTurma = vi.fn();
    render(
      <CalendarioTurmasDialog
        open
        onOpenChange={vi.fn()}
        mesInicial={new Date(2026, 8, 14)}
        turmas={turmas}
        onAbrirTurma={onAbrirTurma}
      />
    );

    const dialogo = screen.getByRole('dialog');
    const dia = [...dialogo.querySelectorAll('[data-calendario-dia]')].find((el) => {
      const data = new Date(el.getAttribute('data-calendario-dia') as string);
      return data.getFullYear() === 2026 && data.getMonth() === 8 && data.getDate() === 15;
    });
    expect(dia).not.toBeUndefined();
    expect(dia?.querySelectorAll('[data-calendario-turma]')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: /\+1 turma/i }));
    await waitFor(() => expect(document.querySelectorAll('[data-dia-popover-turma]')).toHaveLength(3));

    const lista = document.querySelector('[data-dia-popover-lista]') as HTMLElement;
    expect(lista.textContent).toContain('Planejado');
    expect(lista.textContent).toContain('Em andamento');
    expect(lista.textContent).toContain('Concluído');

    await userEvent.click(document.querySelector('[data-dia-popover-turma="c"]') as HTMLElement);
    expect(onAbrirTurma).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
  });

  it('explica o mês vazio sem inventar registros', () => {
    render(
      <CalendarioTurmasDialog
        open
        onOpenChange={vi.fn()}
        mesInicial={new Date(2026, 8, 14)}
        turmas={[]}
        onAbrirTurma={vi.fn()}
      />
    );

    expect(screen.getByText('Nenhuma turma neste mês.')).toBeInTheDocument();
    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();
  });
});
