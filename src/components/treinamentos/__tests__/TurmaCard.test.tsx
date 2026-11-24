import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TurmaCard } from '../TurmaCard';
import { montarTurmas, type CursoTurma } from '../turmasDerivacoes';

const CURSOS: CursoTurma[] = [
  {
    id: 'curso-1',
    nome: 'NR-17 Ergonomia',
    categoria: 'Segurança do Trabalho',
    modalidade: 'presencial',
    carga_horaria: 4,
  },
];

function turma(inscritos?: number, referencia = new Date(2026, 7, 25)) {
  return montarTurmas(
    [
      {
        id: 'inst-1',
        curso_id: 'curso-1',
        data_inicio: '2026-09-01T12:00:00Z',
        status: 'planejado',
        capacidade_maxima: 20,
        local_link: 'Sala 01',
        inscritos,
      },
    ],
    CURSOS,
    [],
    referencia
  )[0];
}

function turmaSemLocal() {
  return montarTurmas(
    [
      {
        id: 'inst-sem-local',
        curso_id: 'curso-1',
        data_inicio: '2026-09-01T12:00:00Z',
        status: 'planejado',
        capacidade_maxima: 20,
        local_link: null,
      },
    ],
    CURSOS,
    [],
    new Date(2026, 7, 25)
  )[0];
}

function turmaComUrl() {
  return montarTurmas(
    [
      {
        id: 'inst-url',
        curso_id: 'curso-1',
        data_inicio: '2026-09-01T12:00:00Z',
        status: 'planejado',
        local_link: 'https://meet.example.com/turma',
      },
    ],
    CURSOS,
    [],
    new Date(2026, 7, 25)
  )[0];
}

describe('TurmaCard — composição compacta', () => {
  it('coloca título e categoria DENTRO do cabeçalho da imagem', () => {
    const { container } = render(<TurmaCard turma={turma()} onAbrir={vi.fn()} />);
    const header = container.querySelector('[data-turma-header]');
    expect(header).not.toBeNull();
    expect(header?.querySelector('[data-turma-titulo]')).not.toBeNull();
    expect(header?.querySelector('[data-turma-categoria]')).not.toBeNull();
  });

  it('sem inscritos reais não inventa barra/percentual', () => {
    render(<TurmaCard turma={turma()} onAbrir={vi.fn()} />);
    expect(screen.getByText('20 vagas')).toBeInTheDocument();
    expect(screen.getByText('Ocupação não informada')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('com inscritos reais calcula e exibe ocupação + barra', () => {
    render(<TurmaCard turma={turma(10)} onAbrir={vi.fn()} />);
    expect(screen.getByText('10 de 20 vagas')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('mantém apenas o botão principal quando o local é sala/plataforma, sem menu vazio', async () => {
    const onAbrir = vi.fn();
    const { container } = render(<TurmaCard turma={turma()} onAbrir={onAbrir} />);

    const principal = screen.getByRole('button', { name: /ver turma/i });
    await userEvent.click(principal);
    expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: 'inst-1' }));

    expect(screen.queryByRole('button', { name: /ações da turma/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ver detalhes')).not.toBeInTheDocument();
    expect(screen.queryByText('Copiar local')).not.toBeInTheDocument();

    const rodape = container.querySelector('[data-turma-rodape]');
    expect(rodape?.children).toHaveLength(1);
    expect(rodape?.firstElementChild).toHaveClass('flex-1');
  });

  it('mantém a navegação por teclado no menu quando há URL real', async () => {
    render(<TurmaCard turma={turmaComUrl()} onAbrir={vi.fn()} />);
    const gatilho = screen.getByRole('button', { name: /ações da turma/i });
    gatilho.focus();

    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('menuitem', { name: /abrir link/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /copiar local/i })).not.toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(gatilho).toHaveFocus());
  });

  it('não renderiza menu sem local válido e deixa o botão ocupar todo o rodapé', () => {
    const { container } = render(<TurmaCard turma={turmaSemLocal()} onAbrir={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /ações da turma/i })).not.toBeInTheDocument();
    const rodape = container.querySelector('[data-turma-rodape]');
    expect(rodape?.children).toHaveLength(1);
    expect(rodape?.firstElementChild).toHaveClass('flex-1');
    expect(screen.getByRole('button', { name: /ver turma/i })).toBeInTheDocument();
  });

  it('mantém “Abrir link” somente quando o local é uma URL real', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<TurmaCard turma={turmaComUrl()} onAbrir={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /ações da turma/i }));

    const abrir = await screen.findByRole('menuitem', { name: /abrir link/i });
    expect(screen.queryByRole('menuitem', { name: /copiar local/i })).not.toBeInTheDocument();
    await userEvent.click(abrir);
    expect(open).toHaveBeenCalledWith('https://meet.example.com/turma', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  it.each(['planejado', 'em_curso', 'concluido', 'cancelado'])(
    'preserva a ação principal para o status %s',
    async (status) => {
      const onAbrir = vi.fn();
      const [t] = montarTurmas(
        [
          {
            id: `inst-${status}`,
            curso_id: 'curso-1',
            data_inicio: '2026-09-01T12:00:00Z',
            status,
            capacidade_maxima: 20,
            local_link: 'Sala 01',
          },
        ],
        CURSOS,
        [],
        new Date(2026, 7, 25)
      );

      render(<TurmaCard turma={t} onAbrir={onAbrir} />);
      await userEvent.click(screen.getByRole('button', { name: /ver turma/i }));
      expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: `inst-${status}` }));
    }
  );

  it('mostra os três grupos de metadados com complementos reais', () => {
    render(<TurmaCard turma={turma()} onAbrir={vi.fn()} />);
    expect(screen.getByText('01/09/2026')).toBeInTheDocument();
    expect(screen.getByText('Em 7 dias')).toBeInTheDocument();
    expect(screen.getByText('4 horas')).toBeInTheDocument();
    expect(screen.getByText('Presencial')).toBeInTheDocument();
    expect(screen.getByText('Sala 01')).toBeInTheDocument();
  });

  it('exibe intervalo somente quando a data final traz horário', () => {
    const [comFim] = montarTurmas(
      [
        {
          id: 'inst-fim',
          curso_id: 'curso-1',
          data_inicio: '2026-09-01T11:00:00Z',
          data_fim: '2026-09-01T15:00:00Z',
          status: 'planejado',
          capacidade_maxima: 20,
          local_link: 'Sala 01',
        },
      ],
      CURSOS,
      [],
      new Date(2026, 7, 25)
    );
    const { container } = render(<TurmaCard turma={comFim} onAbrir={vi.fn()} />);
    const meta = container.querySelector('[data-turma-meta]')?.textContent ?? '';
    expect(meta).toMatch(/\d{2}:\d{2} – \d{2}:\d{2}/);
  });
});
