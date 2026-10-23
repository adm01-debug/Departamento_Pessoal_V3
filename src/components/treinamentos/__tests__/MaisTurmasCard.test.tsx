import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MaisTurmasCard } from '../MaisTurmasCard';
import { TurmasPainel } from '../TurmasPainel';
import type { CursoTurma, TurmaRegistro } from '../turmasDerivacoes';

/**
 * ============================================================================
 * CARD “MAIS TURMAS EM BREVE” — prova do componente e do POSICIONAMENTO.
 *
 * O que é verificado aqui:
 *   • o card é informativo e NÃO é turma (não entra na contagem da coluna,
 *     não desaparece com filtro, não é duplicado nas outras colunas);
 *   • fica DEPOIS dos cards reais da coluna “Em andamento”;
 *   • textos, ícone, borda tracejada e raio são os da referência;
 *   • o CTA só existe quando há fluxo real E autorização — sem fluxo, nada de
 *     botão inoperante.
 * ============================================================================
 */

const CURSOS: CursoTurma[] = [
  { id: 'curso-1', nome: 'Liderança e Gestão de Equipes', categoria: 'Liderança', modalidade: 'hibrido' },
  { id: 'curso-2', nome: 'NR-17 Ergonomia', categoria: 'Segurança do Trabalho', modalidade: 'presencial' },
];

const INSTANCIAS: TurmaRegistro[] = [
  {
    id: 'inst-andamento',
    curso_id: 'curso-1',
    data_inicio: '2026-08-01T12:00:00Z',
    status: 'em_curso',
    capacidade_maxima: 25,
    local_link: 'Sala 03',
  },
  {
    id: 'inst-planejada',
    curso_id: 'curso-2',
    data_inicio: '2026-09-15T12:00:00Z',
    status: 'planejado',
    capacidade_maxima: 15,
    local_link: 'Sala 02',
  },
];

function renderizarPainel() {
  return render(<TurmasPainel instancias={INSTANCIAS} cursos={CURSOS} />);
}

describe('MaisTurmasCard', () => {
  it('renderiza ícone de grupo, título e descrição da referência', () => {
    const { container } = render(<MaisTurmasCard />);

    expect(screen.getByRole('heading', { name: 'Mais turmas em breve' })).toBeInTheDocument();
    expect(screen.getByText('Novas oportunidades de aprendizado para o seu time.')).toBeInTheDocument();
    expect(container.querySelector('svg.lucide-users')).toBeInTheDocument();
  });

  it('usa borda tracejada, raio de 12px e altura da referência (sem largura fixa)', () => {
    const card = render(<MaisTurmasCard />).container.querySelector('[data-mais-turmas-em-breve]');

    expect(card).not.toBeNull();
    expect(card).toHaveClass('border-dashed');
    expect(card).toHaveClass('rounded-xl');
    expect(card).toHaveClass('min-h-[240px]');
    expect(card).toHaveClass('w-full');
    expect(card?.className).not.toMatch(/\bw-\[\d/);
  });

  it('não apresenta botão quando não existe fluxo real de criação', () => {
    render(<MaisTurmasCard />);
    expect(screen.queryByRole('button', { name: /nova turma/i })).not.toBeInTheDocument();
  });

  it('não apresenta botão sem autorização, mesmo com o fluxo disponível', () => {
    render(<MaisTurmasCard onNovaTurma={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /nova turma/i })).not.toBeInTheDocument();
  });

  it('com fluxo e autorização, o botão chama a criação existente', async () => {
    const criar = vi.fn();
    render(<MaisTurmasCard onNovaTurma={criar} podeCriarTurma />);

    const botao = screen.getByRole('button', { name: /nova turma/i });
    await userEvent.click(botao);

    expect(criar).toHaveBeenCalledTimes(1);
    expect(botao.querySelector('svg.lucide-plus')).toBeInTheDocument();
  });
});

describe('TurmasPainel — posicionamento do card complementar', () => {
  it('exibe o card uma única vez, na coluna Em andamento', () => {
    const { container } = renderizarPainel();

    const cards = container.querySelectorAll('[data-mais-turmas-em-breve]');
    expect(cards).toHaveLength(1);

    const colunaAndamento = container.querySelector('[data-turmas-coluna="andamento"]');
    expect(colunaAndamento).not.toBeNull();
    expect(within(colunaAndamento as HTMLElement).getByText('Mais turmas em breve')).toBeInTheDocument();

    expect(container.querySelector('[data-turmas-coluna="proximas"] [data-mais-turmas-em-breve]')).toBeNull();
    expect(container.querySelector('[data-turmas-coluna="concluidas"] [data-mais-turmas-em-breve]')).toBeNull();
  });

  it('aparece depois dos cards reais da coluna, no mesmo invólucro de animação', () => {
    const { container } = renderizarPainel();
    const coluna = container.querySelector('[data-turmas-coluna="andamento"]') as HTMLElement;

    const ordem = Array.from(coluna.querySelectorAll('[data-turma-card], [data-mais-turmas-em-breve]'));
    expect(ordem).toHaveLength(2);
    expect(ordem[0]).toHaveAttribute('data-turma-card', 'inst-andamento');
    expect(ordem[1]).toHaveAttribute('data-mais-turmas-em-breve');

    // Mesmo wrapper de entrada usado pelos cards (`linhaEntradaHubVariants`).
    const wrapper = ordem[1].parentElement;
    expect(wrapper).toHaveClass('min-w-0');
    expect(wrapper).toHaveClass('origin-center');
  });

  it('não entra na contagem da coluna nem na contagem total de turmas', () => {
    const { container } = renderizarPainel();
    const coluna = container.querySelector('[data-turmas-coluna="andamento"]') as HTMLElement;

    const contador = coluna.querySelector('header span[title$="turma(s)"]');
    expect(contador).toHaveTextContent('1');

    // Duas instâncias reais => dois cards de turma no painel.
    expect(container.querySelectorAll('[data-turma-card]')).toHaveLength(2);
  });

  it('com fluxo real e autorização, o painel exibe o CTA e aciona a criação', async () => {
    const novaTurma = vi.fn();
    render(<TurmasPainel instancias={INSTANCIAS} cursos={CURSOS} onNovaTurma={novaTurma} podeCriarTurma />);

    const botao = screen.getByRole('button', { name: /nova turma/i });
    await userEvent.click(botao);

    expect(novaTurma).toHaveBeenCalledTimes(1);
  });

  it('não participa dos filtros: continua visível quando a busca esvazia a coluna', async () => {
    const { container } = renderizarPainel();

    await userEvent.type(screen.getByLabelText('Buscar turmas'), 'curso inexistente');

    expect(screen.getByText('Nenhuma turma encontrada')).toBeInTheDocument();
    expect(container.querySelector('[data-turma-card]')).toBeNull();
    expect(container.querySelector('[data-mais-turmas-em-breve]')).not.toBeNull();
  });
});
