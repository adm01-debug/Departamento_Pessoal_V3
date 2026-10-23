import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

function turma(inscritos?: number) {
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
    CURSOS
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

  it('mantém a ação existente e o menu com a captura do local', () => {
    render(<TurmaCard turma={turma()} onAbrir={vi.fn()} />);
    expect(screen.getByRole('button', { name: /ver turma/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ações da turma/i })).toBeInTheDocument();
  });
});
