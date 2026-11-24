import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PipelineBoard, type PipelineBoardProps } from '../PipelineBoard';
import type { CandidaturaComRelacoes } from '@/types/recrutamento';

beforeAll(() => {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  });
});

function candidatura(
  id: string,
  nome: string,
  etapa: string,
  extras: Partial<CandidaturaComRelacoes> = {}
): CandidaturaComRelacoes {
  return {
    id,
    empresa_id: 'empresa-1',
    vaga_id: 'vaga-1',
    candidato_id: `cand-${id}`,
    etapa,
    status: etapa === 'contratado' ? 'contratado' : 'em_andamento',
    nota_geral: 4.5,
    feedback: null,
    entrevistador: 'Camila Prado (Tech Recruiter)',
    data_entrevista: '2026-08-18T12:00:00Z',
    data_proxima_etapa: '2026-08-25',
    motivo_rejeicao: null,
    feedback_ia: null,
    historico_etapas: null,
    created_at: '2026-08-03T12:00:00Z',
    updated_at: '2026-08-03T12:00:00Z',
    candidato: {
      id: `cand-${id}`,
      empresa_id: 'empresa-1',
      nome,
      email: 'candidato@email.com',
      telefone: '(11) 90000-0000',
      origem: 'LinkedIn',
      experiencia_anos: 7,
      pretensao_salarial: 12000,
      formacao: 'Ciência da Computação',
      linkedin: null,
      cpf: null,
      curriculo_url: null,
      observacoes: null,
      created_at: '2026-08-02T12:00:00Z',
      updated_at: '2026-08-02T12:00:00Z',
    },
    vaga: {
      titulo: 'Desenvolvedor(a) Full Stack Sênior',
      departamento: 'Tecnologia',
      requisitos: 'React, TypeScript, Node.js, AWS',
    },
    ...extras,
  };
}

const CANDIDATURAS = [
  candidatura('1', 'Mariana Alves Rodrigues', 'triagem'),
  candidatura('2', 'Bruno Carvalho Mendes', 'entrevista'),
  candidatura('3', 'Diego Nascimento Lima', 'teste'),
  candidatura('4', 'Rafael Souza Pereira', 'proposta'),
  candidatura('5', 'Patrícia Gomes Barbosa', 'contratado'),
];

function renderBoard(overrides: Partial<PipelineBoardProps> = {}) {
  const props = {
    candidaturas: CANDIDATURAS,
    onAbrir: vi.fn(),
    onMoverEtapa: vi.fn(),
    onContatar: vi.fn(),
    onSimular: vi.fn(),
    ...overrides,
  };
  render(<PipelineBoard {...props} />);
  return props;
}

describe('PipelineBoard — cinco etapas e cards ricos', () => {
  it('renderiza as cinco colunas com a contagem e o card completo', () => {
    renderBoard();
    const colunas = document.querySelectorAll('[data-pipeline-coluna]');
    expect(colunas).toHaveLength(5);
    expect([...colunas].map((coluna) => coluna.getAttribute('data-pipeline-coluna'))).toEqual([
      'triagem',
      'entrevista',
      'teste',
      'proposta',
      'contratado',
    ]);
    colunas.forEach((coluna) => expect(coluna.querySelectorAll('[data-candidato-card]')).toHaveLength(1));

    const card = document.querySelector('[data-candidato-card="1"]') as HTMLElement;
    expect(card).toHaveTextContent('Mariana Alves Rodrigues');
    expect(card).toHaveTextContent('Desenvolvedor(a) Full Stack Sênior');
    expect(card).toHaveTextContent('LinkedIn');
    expect(card).toHaveTextContent('React');
    expect(card).toHaveTextContent('Triagem inicial');
    expect(card).toHaveTextContent('4.5');
  });

  it('abre o dossiê pelo card e pelo menu de ações', async () => {
    const props = renderBoard();
    const card = document.querySelector('[data-candidato-card="1"]') as HTMLElement;

    await userEvent.click(card);
    expect(props.onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));

    await userEvent.click(screen.getByRole('button', { name: /Mais ações de Mariana Alves Rodrigues/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Ver detalhes' }));
    expect(props.onAbrir).toHaveBeenCalledTimes(2);
  });

  it('move a etapa pelo menu do card sem perder as opções', async () => {
    const props = renderBoard();
    await userEvent.click(screen.getByRole('button', { name: /Mais ações de Mariana Alves Rodrigues/i }));
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveTextContent('Ver detalhes');
    expect(menu).toHaveTextContent('Contatar candidato');
    expect(menu).toHaveTextContent('Mover para');

    await userEvent.click(screen.getByRole('menuitem', { name: 'Contratado' }));
    expect(props.onMoverEtapa).toHaveBeenCalledWith('1', 'contratado');
  });

  it('aciona adicionar candidato, arquivadas e contatar pelos controles existentes', async () => {
    const props = renderBoard();
    const triagem = document.querySelector('[data-pipeline-coluna="triagem"]') as HTMLElement;
    await userEvent.click(within(triagem).getByRole('button', { name: 'Adicionar candidato' }));
    expect(props.onSimular).toHaveBeenCalledWith('adicionar candidato em Triagem');

    await userEvent.click(screen.getByRole('button', { name: /Ver etapas arquivadas/i }));
    expect(props.onSimular).toHaveBeenCalledWith('ver etapas arquivadas');

    await userEvent.click(screen.getByRole('button', { name: /Mais ações de Mariana/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Contatar candidato' }));
    expect(props.onContatar).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });

  it('mostra o estado vazio discreto e o rodapé com total/última atualização', () => {
    renderBoard({ candidaturas: [] });
    expect(screen.getAllByText('Solte aqui')).toHaveLength(5);
    const footer = document.querySelector('[data-pipeline-footer]');
    expect(footer).toHaveTextContent('Mostrando 0 candidatos');
    expect(footer).toHaveTextContent('Última atualização: sem atualizações');
    expect(footer).toHaveTextContent('Ver etapas arquivadas');
  });

  it('usa largura/altura de coluna e scroll da referência de Admissão', () => {
    renderBoard();
    const colunas = document.querySelectorAll('[data-pipeline-coluna]');
    expect(colunas).toHaveLength(5);
    colunas.forEach((coluna) => {
      // Mesmo slot do Kanban de Admissão: 272px de largura e altura por viewport.
      expect(coluna.className).toContain('w-[272px]');
      expect(coluna.className).toContain('h-[calc(100vh-19rem)]');
      expect(coluna.className).toContain('shrink-0');
      expect(coluna).toHaveAttribute('data-pipeline-drop', 'false');
      expect(coluna.getAttribute('aria-label')).toMatch(/—/);
    });

    const listas = document.querySelectorAll('[data-pipeline-lista]');
    expect(listas).toHaveLength(5);
    listas.forEach((lista) => {
      // Só a lista rola; sem `overscroll-contain` (o scroll encadeia na página).
      expect(lista.className).toContain('overflow-y-auto');
      expect(lista.className).not.toContain('overscroll');
    });

    const board = document.querySelector('[data-pipeline-board]') as HTMLElement;
    expect(board.className).toContain('overflow-x-auto');
    expect(board.className).toContain('gap-3');
    expect(board.className).not.toContain('h-[520px]');
  });

  it('desabilita o arraste de candidatura arquivada para não contornar o estado', () => {
    renderBoard({
      candidaturas: [candidatura('9', 'Ana Arquivada', 'triagem', { status: 'arquivada' })],
    });
    const card = document.querySelector('[data-candidato-card="9"]') as HTMLElement;
    expect(card).toHaveAttribute('data-pipeline-arrastavel', 'false');
  });

  it('mantém o dossiê e os botões internos independentes do arraste', async () => {
    const props = renderBoard();
    const card = document.querySelector('[data-candidato-card="1"]') as HTMLElement;

    await userEvent.click(card);
    expect(props.onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));

    await userEvent.click(within(card).getByRole('button', { name: /Mais ações de Mariana/i }));
    expect(await screen.findByRole('menu')).toHaveTextContent('Mover para');
  });
});
