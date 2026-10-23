import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreinamentoCursoCard } from '../TreinamentoCursoCard';
import type { CursoCatalogo } from '../treinamentosDerivacoes';

/**
 * FICHA DO CURSO — contrato do redesign compacto.
 *
 * Garante que o diálogo mantém TODOS os dados reais (categoria,
 * obrigatoriedade, modalidade, carga, NR, cadastro e inscritos), o grid 2×2,
 * no máximo 3 avatares e o estado vazio — sem inventar participantes.
 */

beforeAll(() => {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  });
});

const CURSO: CursoCatalogo = {
  id: 'curso-1',
  nome: 'Comunicação Assertiva',
  descricao: 'Técnicas de comunicação e feedback.',
  categoria: 'Desenvolvimento Pessoal',
  modalidade: 'online',
  carga_horaria: 6,
  obrigatorio: false,
  nr_relacionada: null,
  created_at: '2026-02-02T12:00:00.000Z',
};

const PARTICIPACAO = {
  inscritos: 50,
  colaboradores: [
    { id: 'c1', nome: 'Ana Beatriz', fotoUrl: null },
    { id: 'c2', nome: 'Carlos Lima', fotoUrl: null },
    { id: 'c3', nome: 'Diana Souza', fotoUrl: null },
    { id: 'c4', nome: 'Eduardo Quarto', fotoUrl: null },
  ],
};

async function abrirFicha(props: { curso?: CursoCatalogo; participacao?: typeof PARTICIPACAO }) {
  render(<TreinamentoCursoCard curso={props.curso ?? CURSO} participacao={props.participacao} onExcluir={vi.fn()} />);
  await userEvent.click(screen.getAllByRole('button', { name: /Ver curso/i })[0]);
  return screen.findByRole('dialog');
}

describe('Detalhes do curso — ficha compacta', () => {
  it('preserva todos os dados reais no cabeçalho, badges e grid 2×2', async () => {
    const dialog = await abrirFicha({ participacao: PARTICIPACAO });

    expect(within(dialog).getByText('Comunicação Assertiva')).toBeInTheDocument();
    expect(within(dialog).getByText('Técnicas de comunicação e feedback.')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Desenvolvimento Pessoal').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Opcional')).toBeInTheDocument();

    for (const label of ['Modalidade', 'Carga horária', 'NR relacionada', 'Cadastrado em']) {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    }
    expect(within(dialog).getByText('Online')).toBeInTheDocument();
    expect(within(dialog).getByText('6h')).toBeInTheDocument();
    expect(within(dialog).getByText('Não informada')).toBeInTheDocument();
    expect(within(dialog).getByText('02/02/2026')).toBeInTheDocument();
  });

  it('mostra no máximo 3 avatares e a contagem real de inscritos', async () => {
    const dialog = await abrirFicha({ participacao: PARTICIPACAO });

    expect(within(dialog).getByText('50 participantes vinculados')).toBeInTheDocument();
    expect(within(dialog).getByTitle('50 participantes vinculados')).toBeInTheDocument();
    expect(within(dialog).getByTitle('Ana Beatriz')).toBeInTheDocument();
    expect(within(dialog).getByTitle('Carlos Lima')).toBeInTheDocument();
    expect(within(dialog).getByTitle('Diana Souza')).toBeInTheDocument();
    expect(within(dialog).queryByTitle('Eduardo Quarto')).not.toBeInTheDocument();
  });

  it('exibe o estado vazio quando não há inscrição, sem inventar participantes', async () => {
    const dialog = await abrirFicha({});

    expect(within(dialog).getByText('Nenhuma inscrição registrada para este curso.')).toBeInTheDocument();
    expect(within(dialog).queryByText(/participantes vinculados/)).not.toBeInTheDocument();
  });

  it('trata dados incompletos sem exibir undefined/null/NaN', async () => {
    const dialog = await abrirFicha({
      curso: {
        ...CURSO,
        descricao: null,
        categoria: null,
        modalidade: null,
        carga_horaria: null,
        obrigatorio: null,
        nr_relacionada: null,
        created_at: null,
      },
    });

    expect(within(dialog).getByText('Este curso não possui descrição cadastrada.')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Não informada').length).toBeGreaterThanOrEqual(2);
    expect(within(dialog).getAllByText('—').length).toBe(2);
    expect(dialog.textContent).not.toMatch(/undefined|null|NaN/);
  });

  it('usa o badge verde de obrigatoriedade e nunca imprime undefined/NaN', async () => {
    const dialog = await abrirFicha({ curso: { ...CURSO, obrigatorio: true }, participacao: PARTICIPACAO });

    expect(within(dialog).getByText('Obrigatório')).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/undefined|null|NaN/);
  });
});
