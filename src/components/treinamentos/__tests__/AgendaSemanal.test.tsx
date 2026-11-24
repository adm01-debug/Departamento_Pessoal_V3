import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaSemanal } from '../AgendaSemanal';
import { montarTurmas, type CursoTurma } from '../turmasDerivacoes';

/**
 * AGENDA DA SEMANA — minicards de evento e dias vazios.
 *
 * Fonte única: `data_inicio` real das turmas. O teste fixa a data de referência
 * e a semana inicial para não depender do relógio da máquina.
 */

const CURSOS: CursoTurma[] = [
  {
    id: 'curso-1',
    nome: 'NR-17 Ergonomia',
    categoria: 'Segurança do Trabalho',
    modalidade: 'presencial',
    carga_horaria: 4,
  },
];

const TURMAS = montarTurmas(
  [
    {
      id: 'inst-terca',
      curso_id: 'curso-1',
      instrutor_id: null,
      data_inicio: '2026-09-15T11:00:00Z',
      data_fim: '2026-09-15T15:00:00Z',
      local_link: 'Sala 01',
      capacidade_maxima: 20,
      status: 'planejado',
    },
  ],
  CURSOS,
  [],
  new Date(2026, 8, 20)
);

describe('AgendaSemanal — minicards', () => {
  it('renderiza o evento da semana como minicard com horário e local', () => {
    render(<AgendaSemanal turmas={TURMAS} semanaInicial={new Date(2026, 8, 14)} onAbrir={vi.fn()} />);
    const evento = document.querySelector('[data-agenda-evento="inst-terca"]');
    expect(evento).not.toBeNull();
    expect(evento?.textContent).toContain('NR-17 Ergonomia');
    expect(evento?.textContent).toMatch(/\d{2}:\d{2} – \d{2}:\d{2} · Sala 01/);
  });

  it('mostra os dias sem turma com texto discreto e não cria navegação fictícia', () => {
    render(<AgendaSemanal turmas={TURMAS} semanaInicial={new Date(2026, 8, 14)} onAbrir={vi.fn()} />);
    expect(screen.getAllByText('Nenhuma turma agendada para este dia.')).toHaveLength(6);
    expect(screen.queryByText(/ver calendário completo/i)).not.toBeInTheDocument();
  });

  it('abre o calendário no mês correspondente ao evento da semana exibida', async () => {
    const onVerCalendarioCompleto = vi.fn();
    render(
      <AgendaSemanal
        turmas={TURMAS}
        semanaInicial={new Date(2026, 8, 14)}
        onAbrir={vi.fn()}
        onVerCalendarioCompleto={onVerCalendarioCompleto}
      />
    );

    const botao = screen.getByRole('button', { name: /ver calendário completo/i });
    expect(botao).toHaveClass('w-full');
    expect(botao.parentElement).toHaveClass('mt-2', 'shrink-0');

    await userEvent.click(botao);
    expect(onVerCalendarioCompleto).toHaveBeenCalledTimes(1);
    // O evento está em 15/09; o calendário deve abrir em setembro.
    expect(onVerCalendarioCompleto).toHaveBeenCalledWith(new Date(2026, 8, 15));

    await userEvent.click(screen.getByRole('button', { name: 'Próxima semana' }));
    await userEvent.click(screen.getByRole('button', { name: /ver calendário completo/i }));
    // Sem eventos na semana seguinte, usa a segunda-feira exibida.
    expect(onVerCalendarioCompleto).toHaveBeenLastCalledWith(new Date(2026, 8, 21));
  });

  it('abre o calendário no mês do evento quando a semana começa no mês anterior', async () => {
    const turmas = montarTurmas(
      [{ id: 'agosto', curso_id: 'curso-1', data_inicio: '2026-08-01T09:00:00Z', status: 'planejado' }],
      CURSOS,
      [],
      new Date(2026, 8, 20)
    );
    const onVerCalendarioCompleto = vi.fn();
    render(
      <AgendaSemanal
        turmas={turmas}
        semanaInicial={new Date(2026, 6, 27)}
        onAbrir={vi.fn()}
        onVerCalendarioCompleto={onVerCalendarioCompleto}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /ver calendário completo/i }));
    // Segunda 27/07, evento sábado 01/08 → referência do calendário é 01/08.
    expect(onVerCalendarioCompleto).toHaveBeenCalledWith(new Date(2026, 7, 1));
  });

  it('abre a turma existente ao clicar no minicard', async () => {
    const onAbrir = vi.fn();
    render(<AgendaSemanal turmas={TURMAS} semanaInicial={new Date(2026, 8, 14)} onAbrir={onAbrir} />);
    await userEvent.click(screen.getByRole('button', { name: /NR-17 Ergonomia/i }));
    expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: 'inst-terca' }));
  });

  it('distribui os sete dias no espaço restante, com cabeçalho fixo no topo', () => {
    const { container } = render(
      <AgendaSemanal turmas={TURMAS} semanaInicial={new Date(2026, 8, 14)} onAbrir={vi.fn()} />
    );

    const painel = container.querySelector('[data-turmas-agenda]');
    expect(painel).toHaveClass('flex', 'flex-1', 'flex-col');
    expect(painel).not.toHaveClass('min-h-0');
    expect(painel?.firstElementChild).toHaveClass('shrink-0');

    const lista = container.querySelector('[data-agenda-lista]');
    expect(lista).toHaveClass('grid', 'min-h-0', 'flex-1', 'grid-rows-[repeat(7,minmax(auto,1fr))]');

    const dias = container.querySelectorAll('[data-agenda-dia]');
    expect(dias).toHaveLength(7);
    dias.forEach((dia) => {
      expect(dia).toHaveClass('items-center');
      expect(dia).not.toHaveClass('flex-1', 'h-full', 'min-h-0');
    });
  });

  it('renderiza os sete dias mesmo sem nenhuma turma na semana', () => {
    const { container } = render(<AgendaSemanal turmas={[]} semanaInicial={new Date(2026, 8, 14)} onAbrir={vi.fn()} />);
    expect(container.querySelectorAll('[data-agenda-dia]')).toHaveLength(7);
    expect(screen.getAllByText('Nenhuma turma agendada para este dia.')).toHaveLength(7);
  });

  it('com três turmas no dia, o contador +1 abre a lista completa e abre a turma escolhida', async () => {
    const onAbrir = vi.fn();
    const turmasDoMesmoDia = montarTurmas(
      [
        { id: 'a', curso_id: 'curso-1', data_inicio: '2026-09-15T09:00:00Z', status: 'planejado' },
        { id: 'b', curso_id: 'curso-1', data_inicio: '2026-09-15T11:00:00Z', status: 'planejado' },
        { id: 'c', curso_id: 'curso-1', data_inicio: '2026-09-15T13:00:00Z', status: 'planejado' },
      ],
      CURSOS,
      [],
      new Date(2026, 8, 20)
    );
    const { container } = render(
      <AgendaSemanal turmas={turmasDoMesmoDia} semanaInicial={new Date(2026, 8, 14)} onAbrir={onAbrir} />
    );

    expect(container.querySelectorAll('[data-agenda-evento]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-agenda-dia]')).toHaveLength(7);

    const gatilho = screen.getByRole('button', { name: /\+1 outra turma/i });
    await userEvent.click(gatilho);
    await waitFor(() => expect(document.querySelectorAll('[data-dia-popover-turma]')).toHaveLength(3));
    expect(document.querySelector('[data-dia-popover-lista]')?.textContent).toContain('Planejado');

    await userEvent.click(document.querySelector('[data-dia-popover-turma="c"]') as HTMLElement);
    expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
  });

  it('com cinco turmas e horários coincidentes, todas ficam acessíveis e os nomes longos truncam', async () => {
    const nomeLongo = 'Treinamento de Segurança do Trabalho para Operações de Alta Complexidade';
    const cursos: CursoTurma[] = [
      { id: 'c1', nome: 'Curso A', categoria: 'Geral', modalidade: 'presencial', carga_horaria: 4 },
      { id: 'c2', nome: 'Curso B', categoria: 'Geral', modalidade: 'presencial', carga_horaria: 4 },
      { id: 'c3', nome: 'Curso C', categoria: 'Geral', modalidade: 'presencial', carga_horaria: 4 },
      { id: 'c4', nome: 'Curso D', categoria: 'Geral', modalidade: 'presencial', carga_horaria: 4 },
      { id: 'c5', nome: nomeLongo, categoria: 'Segurança do Trabalho', modalidade: 'online', carga_horaria: 8 },
    ];
    const turmas = montarTurmas(
      [
        { id: 'a', curso_id: 'c1', data_inicio: '2026-09-15T09:00:00Z', status: 'planejado' },
        { id: 'b', curso_id: 'c2', data_inicio: '2026-09-15T11:00:00Z', status: 'em_curso' },
        { id: 'c', curso_id: 'c3', data_inicio: '2026-09-15T11:00:00Z', status: 'planejado' },
        { id: 'd', curso_id: 'c4', data_inicio: '2026-09-15T13:00:00Z', status: 'concluido' },
        { id: 'e', curso_id: 'c5', data_inicio: '2026-09-15T15:00:00Z', status: 'planejado' },
      ],
      cursos,
      [],
      new Date(2026, 8, 20)
    );
    const onAbrir = vi.fn();
    render(<AgendaSemanal turmas={turmas} semanaInicial={new Date(2026, 8, 14)} onAbrir={onAbrir} />);

    await userEvent.click(screen.getByRole('button', { name: /\+3 outras turmas/i }));
    await waitFor(() => expect(document.querySelectorAll('[data-dia-popover-turma]')).toHaveLength(5));

    const lista = document.querySelector('[data-dia-popover-lista]') as HTMLElement;
    expect(lista.textContent).toContain(nomeLongo);
    expect(lista.textContent).toContain('Planejado');
    expect(lista.textContent).toContain('Em andamento');
    expect(lista.textContent).toContain('Concluído');

    const itemLongo = document.querySelector('[data-dia-popover-turma="e"]') as HTMLElement;
    expect(itemLongo).toHaveAttribute('title', expect.stringContaining(nomeLongo));
    expect(itemLongo.querySelector('span.block.truncate')).toHaveTextContent(nomeLongo);

    await userEvent.click(document.querySelector('[data-dia-popover-turma="d"]') as HTMLElement);
    expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: 'd' }));
  });

  it('não renderiza o contador quando o dia tem até duas turmas', () => {
    const turmas = montarTurmas(
      [
        { id: 'a', curso_id: 'curso-1', data_inicio: '2026-09-15T09:00:00Z', status: 'planejado' },
        { id: 'b', curso_id: 'curso-1', data_inicio: '2026-09-15T11:00:00Z', status: 'planejado' },
      ],
      CURSOS,
      [],
      new Date(2026, 8, 20)
    );
    const { container } = render(
      <AgendaSemanal turmas={turmas} semanaInicial={new Date(2026, 8, 14)} onAbrir={vi.fn()} />
    );
    expect(container.querySelectorAll('[data-agenda-evento]')).toHaveLength(2);
    expect(container.querySelector('[data-dia-popover-trigger]')).toBeNull();
  });

  it('abre o contador pelo teclado e fecha com Escape', async () => {
    const turmas = montarTurmas(
      [
        { id: 'a', curso_id: 'curso-1', data_inicio: '2026-09-15T09:00:00Z', status: 'planejado' },
        { id: 'b', curso_id: 'curso-1', data_inicio: '2026-09-15T11:00:00Z', status: 'planejado' },
        { id: 'c', curso_id: 'curso-1', data_inicio: '2026-09-15T13:00:00Z', status: 'planejado' },
      ],
      CURSOS,
      [],
      new Date(2026, 8, 20)
    );
    render(<AgendaSemanal turmas={turmas} semanaInicial={new Date(2026, 8, 14)} onAbrir={vi.fn()} />);

    const gatilho = screen.getByRole('button', { name: /\+1 outra turma/i });
    gatilho.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(document.querySelector('[data-dia-popover-lista]')).not.toBeNull());

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.querySelector('[data-dia-popover-lista]')).toBeNull());
  });

  it('trunca títulos longos dentro do minicard e preserva o nome completo no title', () => {
    const nomeLongo = 'Treinamento de Segurança do Trabalho para Operações de Alta Complexidade';
    const turmas = montarTurmas(
      [{ id: 'longa', curso_id: 'curso-longo', data_inicio: '2026-09-15T09:00:00Z', status: 'planejado' }],
      [
        {
          id: 'curso-longo',
          nome: nomeLongo,
          categoria: 'Segurança do Trabalho',
          modalidade: 'online',
          carga_horaria: 8,
        },
      ],
      [],
      new Date(2026, 8, 20)
    );
    render(<AgendaSemanal turmas={turmas} semanaInicial={new Date(2026, 8, 14)} onAbrir={vi.fn()} />);

    const evento = document.querySelector('[data-agenda-evento="longa"]');
    expect(evento).not.toBeNull();
    expect(evento).toHaveAttribute('title', expect.stringContaining(nomeLongo));
    const titulo = evento?.querySelector('span.block.truncate');
    expect(titulo).toHaveTextContent(nomeLongo);
  });
});
