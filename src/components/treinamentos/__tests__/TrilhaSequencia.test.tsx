import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrilhaSequencia } from '../TrilhaSequencia';
import type { TrilhaCursoVinculo } from '../trilhasDerivacoes';

/**
 * TIMELINE DA TRILHA — contrato do redesign.
 *
 * Garante o que o modal promete: ordem REAL de `trilhas_cursos.ordem`,
 * numeração 01/02/03 (posição, nunca conclusão), metadados só com dados
 * existentes, linha conectora entre etapas (nunca depois da última), ação de
 * remover por etapa e estado vazio explícito.
 */

const VINCULOS: TrilhaCursoVinculo[] = [
  {
    id: 'v-3',
    curso_id: 'curso-3',
    ordem: 3,
    obrigatorio: false,
    curso: { id: 'curso-3', nome: 'Diversidade e Inclusão', carga_horaria: 4, modalidade: 'online' },
  },
  {
    id: 'v-1',
    curso_id: 'curso-1',
    ordem: 1,
    obrigatorio: true,
    curso: { id: 'curso-1', nome: 'Integração e Cultura Organizacional', carga_horaria: 8, modalidade: 'online' },
  },
  {
    id: 'v-2',
    curso_id: 'curso-2',
    ordem: 2,
    obrigatorio: true,
    curso: { id: 'curso-2', nome: 'LGPD — Proteção de Dados', carga_horaria: 4, modalidade: 'online' },
  },
];

const CATEGORIAS = new Map<string, string | null>([
  ['curso-1', 'Onboarding'],
  ['curso-2', 'Compliance'],
  ['curso-3', 'Cultura'],
]);

describe('TrilhaSequencia — timeline numerada', () => {
  it('respeita a ordem real de trilhas_cursos.ordem', () => {
    render(<TrilhaSequencia vinculos={VINCULOS} categoriaPorCurso={CATEGORIAS} />);

    const itens = screen.getAllByRole('listitem');
    expect(itens).toHaveLength(3);
    expect(itens.map((li) => li.querySelector('p')?.textContent)).toEqual([
      'Integração e Cultura Organizacional',
      'LGPD — Proteção de Dados',
      'Diversidade e Inclusão',
    ]);
  });

  it('numera as etapas como posição (01/02/03), sem estado de conclusão', () => {
    render(<TrilhaSequencia vinculos={VINCULOS} />);

    const numeros = screen
      .getAllByRole('listitem')
      .map((li) => li.querySelector('span[aria-hidden]')?.textContent)
      .filter((texto) => /^\d{2}$/.test(texto ?? ''));
    expect(numeros).toEqual(['01', '02', '03']);
    expect(screen.queryByText(/conclu[íi]d/i)).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Jornada de aprendizagem' })).toBeInTheDocument();
  });

  it('exibe metadados reais e nunca imprime undefined/null/NaN', () => {
    render(<TrilhaSequencia vinculos={VINCULOS} />);
    expect(screen.getByText('8h · Online · Obrigatório')).toBeInTheDocument();
    expect(screen.getByText('4h · Online · Opcional')).toBeInTheDocument();

    const semDados: TrilhaCursoVinculo = {
      id: 'v-sem-dados',
      curso_id: 'curso-x',
      ordem: 1,
      curso: { nome: 'Curso sem metadados' },
    };
    const { container, unmount } = render(<TrilhaSequencia vinculos={[semDados]} />);
    expect(container.textContent).not.toMatch(/undefined|null|NaN/);
    expect(screen.getByText('Curso sem metadados')).toBeInTheDocument();
    unmount();
  });

  it('mostra conector entre etapas, mas não depois da última', () => {
    const { container } = render(<TrilhaSequencia vinculos={VINCULOS} />);
    const itens = container.querySelectorAll('ol > li');
    expect(itens[0].querySelector('[data-conector]')).not.toBeNull();
    expect(itens[1].querySelector('[data-conector]')).not.toBeNull();
    expect(itens[2].querySelector('[data-conector]')).toBeNull();
  });

  it('chama a remoção real da etapa com o id do vínculo', async () => {
    const remover = vi.fn();
    render(<TrilhaSequencia vinculos={VINCULOS} onRemover={remover} />);

    const botao = screen.getByRole('button', {
      name: 'Desvincular Integração e Cultura Organizacional da trilha',
    });
    await userEvent.click(botao);

    expect(remover).toHaveBeenCalledWith('v-1');
  });

  it('exibe o estado vazio aprovado quando a trilha não tem cursos', () => {
    render(<TrilhaSequencia vinculos={[]} />);
    expect(screen.getByText('Esta trilha ainda não possui cursos.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('usa skeleton acessível durante o carregamento', () => {
    const { container } = render(<TrilhaSequencia vinculos={[]} carregando />);
    expect(container.querySelector('[aria-hidden]')).not.toBeNull();
    expect(screen.queryByText('Esta trilha ainda não possui cursos.')).not.toBeInTheDocument();
  });
});
