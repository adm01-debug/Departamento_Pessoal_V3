import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TurmasPainel } from '../TurmasPainel';
import type { ColaboradorTurma, CursoTurma, TurmaRegistro } from '../turmasDerivacoes';

beforeAll(() => {
  // Radix Select usa Pointer Capture no jsdom, que não implementa a API.
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  });
});

/** Referência fixa (23/10/2026) — mesma data usada na auditoria. */
const REFERENCIA = new Date(2026, 9, 23);

const CURSOS: CursoTurma[] = [
  {
    id: 'c1',
    nome: 'Integração e Cultura Organizacional',
    categoria: 'Onboarding',
    modalidade: 'online',
    carga_horaria: 8,
  },
  { id: 'c2', nome: 'NR-17 Ergonomia', categoria: 'Segurança do Trabalho', modalidade: 'presencial', carga_horaria: 4 },
  {
    id: 'c3',
    nome: 'NR-35 Trabalho em Altura',
    categoria: 'Segurança do Trabalho',
    modalidade: 'presencial',
    carga_horaria: 8,
  },
  { id: 'c4', nome: 'Liderança e Gestão de Equipes', categoria: 'Liderança', modalidade: 'hibrido', carga_horaria: 12 },
  {
    id: 'c5',
    nome: 'Comunicação Assertiva',
    categoria: 'Desenvolvimento Pessoal',
    modalidade: 'online',
    carga_horaria: 6,
  },
];

const COLABORADORES: ColaboradorTurma[] = [{ id: 'col1', nome_completo: 'Gustavo Henrique Alves', cargo: 'Instrutor' }];

const INSTANCIAS: TurmaRegistro[] = [
  {
    id: 'inst-1',
    curso_id: 'c2',
    instrutor_id: 'col1',
    data_inicio: '2026-09-01T12:00:00Z',
    local_link: 'Sala 01',
    capacidade_maxima: 20,
    status: 'planejado',
  },
  {
    id: 'inst-2',
    curso_id: 'c3',
    instrutor_id: 'col1',
    data_inicio: '2026-09-15T12:00:00Z',
    local_link: 'Sala 02',
    capacidade_maxima: 15,
    status: 'planejado',
  },
  {
    id: 'inst-3',
    curso_id: 'c4',
    instrutor_id: 'col1',
    data_inicio: '2026-08-01T12:00:00Z',
    local_link: 'Sala 03 + Online',
    capacidade_maxima: 25,
    status: 'em_curso',
  },
  {
    id: 'inst-4',
    curso_id: 'c1',
    instrutor_id: 'col1',
    data_inicio: '2026-02-05T12:00:00Z',
    local_link: 'Microsoft Teams',
    capacidade_maxima: 30,
    status: 'concluido',
  },
  {
    id: 'inst-5',
    curso_id: 'c5',
    instrutor_id: 'col1',
    data_inicio: '2026-08-20T12:00:00Z',
    local_link: 'Microsoft Teams',
    capacidade_maxima: 18,
    status: 'concluido',
  },
];

function renderPainel() {
  return render(
    <TurmasPainel instancias={INSTANCIAS} cursos={CURSOS} colaboradores={COLABORADORES} referencia={REFERENCIA} />
  );
}

const intervalo = () => document.querySelector('[data-agenda-range]')?.textContent?.trim() ?? '';
const cards = () => document.querySelectorAll('[data-turma-card]').length;

async function escolherStatus(label: string) {
  await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
  await userEvent.click(await screen.findByRole('option', { name: label }));
}

async function escolherModalidade(label: string) {
  await userEvent.click(screen.getByRole('combobox', { name: 'Modalidade' }));
  await userEvent.click(await screen.findByRole('option', { name: label }));
}

describe('TurmasPainel — B-01 — agenda acompanha os filtros', () => {
  it('filtra, navega manualmente sem reposicionar e restaura ao limpar', async () => {
    renderPainel();
    expect(intervalo()).toBe('14 set – 20 set 2026');
    expect(cards()).toBe(5);

    await escolherStatus('Concluído');
    await waitFor(() => expect(intervalo()).toBe('17 ago – 23 ago 2026'));
    expect(cards()).toBe(2);
    expect(document.querySelector('[data-agenda-evento="inst-5"]')).not.toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Próxima semana' }));
    await waitFor(() => expect(intervalo()).toBe('24 ago – 30 ago 2026'));
    expect(cards()).toBe(2);

    await userEvent.click(screen.getByRole('button', { name: 'Semana anterior' }));
    await waitFor(() => expect(intervalo()).toBe('17 ago – 23 ago 2026'));

    await escolherStatus('Planejado');
    await waitFor(() => expect(intervalo()).toBe('14 set – 20 set 2026'));
    expect(cards()).toBe(2);

    await userEvent.type(screen.getByLabelText('Buscar turmas'), 'NR-35');
    await waitFor(() => expect(cards()).toBe(1));
    expect(intervalo()).toBe('14 set – 20 set 2026');
    expect(document.querySelector('[data-agenda-evento="inst-2"]')).not.toBeNull();

    await userEvent.clear(screen.getByLabelText('Buscar turmas'));
    await userEvent.type(screen.getByLabelText('Buscar turmas'), 'nao-existe');
    await waitFor(() => expect(screen.getByText('Nenhuma turma encontrada')).toBeInTheDocument());
    expect(cards()).toBe(0);
    expect(intervalo()).toBe('19 out – 25 out 2026');
    expect(screen.getAllByText('Nenhuma turma agendada para este dia.')).toHaveLength(7);

    await userEvent.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]);
    await waitFor(() => expect(cards()).toBe(5));
    expect(intervalo()).toBe('14 set – 20 set 2026');
  });

  it('combina status + modalidade + busca e escolhe a semana do resultado', async () => {
    renderPainel();

    await escolherStatus('Planejado');
    await escolherModalidade('Presencial');
    await userEvent.type(screen.getByLabelText('Buscar turmas'), 'NR-17');

    await waitFor(() => expect(cards()).toBe(1));
    expect(intervalo()).toBe('31 ago – 06 set 2026');
    expect(document.querySelector('[data-agenda-evento="inst-1"]')).not.toBeNull();
  });

  it('abre o calendário no mês do evento filtrado (Concluído → agosto)', async () => {
    renderPainel();

    await escolherStatus('Concluído');
    await waitFor(() => expect(intervalo()).toBe('17 ago – 23 ago 2026'));

    await userEvent.click(screen.getByRole('button', { name: /ver calendário completo/i }));
    await waitFor(() => expect(screen.getByText('Agosto de 2026')).toBeInTheDocument());
    expect(document.querySelector('[data-calendario-turma="inst-5"]')).not.toBeNull();
  });

  it('abre o calendário no mês do evento quando a semana começa no mês anterior (Em andamento → agosto)', async () => {
    renderPainel();

    await escolherStatus('Em andamento');
    await waitFor(() => expect(intervalo()).toBe('27 jul – 02 ago 2026'));

    await userEvent.click(screen.getByRole('button', { name: /ver calendário completo/i }));
    await waitFor(() => expect(screen.getByText('Agosto de 2026')).toBeInTheDocument());
    expect(document.querySelector('[data-calendario-turma="inst-3"]')).not.toBeNull();
  });

  it('sem resultado, agenda e calendário apresentam o estado vazio', async () => {
    renderPainel();

    await userEvent.type(screen.getByLabelText('Buscar turmas'), 'nao-existe');
    await waitFor(() => expect(screen.getByText('Nenhuma turma encontrada')).toBeInTheDocument());
    expect(intervalo()).toBe('19 out – 25 out 2026');

    await userEvent.click(screen.getByRole('button', { name: /ver calendário completo/i }));
    await waitFor(() => expect(screen.getByText('Outubro de 2026')).toBeInTheDocument());
    expect(screen.getByText('Nenhuma turma neste mês.')).toBeInTheDocument();
  });

  it('abre o TurmaDetalheDialog existente a partir do terceiro evento do dia', async () => {
    const instancias: TurmaRegistro[] = [
      { id: 'a', curso_id: 'c2', data_inicio: '2026-09-15T12:00:00Z', status: 'planejado' },
      { id: 'b', curso_id: 'c3', data_inicio: '2026-09-15T13:00:00Z', status: 'em_curso' },
      { id: 'c', curso_id: 'c4', data_inicio: '2026-09-15T14:00:00Z', status: 'planejado' },
    ];
    render(
      <TurmasPainel instancias={instancias} cursos={CURSOS} colaboradores={COLABORADORES} referencia={REFERENCIA} />
    );

    await userEvent.click(screen.getByRole('button', { name: /\+1 outra turma/i }));
    await waitFor(() => expect(document.querySelectorAll('[data-dia-popover-turma]')).toHaveLength(3));
    await userEvent.click(document.querySelector('[data-dia-popover-turma="c"]') as HTMLElement);

    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('Liderança e Gestão de Equipes');
    expect(dialogo).toHaveTextContent('15/09/2026');
  });
});
