/**
 * ============================================================================
 * LISTA DE ESCALAS — altura estrutural com rolagem interna.
 * ============================================================================
 *
 * Dois defeitos que estes testes travam:
 *
 *   1. a tabela crescia com o período e empurrava a página inteira → o card
 *      passou a ter rolagem interna com `<thead>` `sticky` (por isso a tabela é
 *      escrita à mão: o `Table` do DS cria um `div overflow-auto` que anularia o
 *      `sticky`);
 *   2. o teto fixo (`min(32rem, 70dvh)`) deixava a base do card flutuando acima
 *      da base do último card lateral → a altura agora vem da COLUNA
 *      (`flex-1 min-h-0` + `contain: size`), não de um número.
 * ============================================================================
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { ListaEscalas } from '../ListaEscalas';
import type { EscalaRegistro, TurnoRegistro } from '../turnosMetricas';

const TURNOS: TurnoRegistro[] = [
  {
    id: 't-adm',
    nome: 'Administrativo',
    cor: '#22c55e',
    horario_inicio: '08:00',
    horario_fim: '17:00',
    intervalo_minutos: 60,
    ativo: true,
  },
];

const ESCALAS: EscalaRegistro[] = Array.from({ length: 30 }).map((_, indice) => ({
  id: `e${indice}`,
  data: `2026-11-${String((indice % 28) + 1).padStart(2, '0')}`,
  status: 'agendado',
  colaborador_id: `c${indice}`,
  turno_id: 't-adm',
  colaborador: { nome_completo: `Colaborador ${indice}`, departamento: 'Logística' },
}));

describe('ListaEscalas — altura controlada', () => {
  it('deixa o card ocupar a coluna e rola só o miolo', () => {
    render(<ListaEscalas escalas={ESCALAS} turnos={TURNOS} onAbrirEscala={vi.fn()} />);

    const tabela = screen.getByRole('table');
    const rolagem = tabela.parentElement!;
    const card = rolagem.parentElement!;

    expect(rolagem.className).toContain('overflow-auto');
    expect(rolagem.className).toContain('scroll-interno');
    // A rolagem é a sobra do card (não um teto em px): a altura do card vem da
    // coluna da página.
    expect(rolagem.className).toContain('flex-1');
    expect(rolagem.className).toContain('min-h-0');
    // O conteúdo NÃO pode ditar a altura da linha da grade (`contain: size`).
    expect(card.className).toContain('flex-1');
    expect(card.style.contain).toBe('size');
    // Nenhum teto em número de linhas/altura fixa sobrou.
    expect(card.className).not.toContain('max-h-[');
    expect(rolagem.className).not.toContain('max-h-[');
  });

  it('mantém o cabeçalho fixo no topo da rolagem', () => {
    render(<ListaEscalas escalas={ESCALAS} turnos={TURNOS} onAbrirEscala={vi.fn()} />);

    const cabecalho = screen.getAllByRole('columnheader')[0];
    expect(cabecalho.className).toContain('sticky');
    expect(cabecalho.className).toContain('top-0');
  });

  it('desenha uma linha por escala com as colunas alinhadas', () => {
    render(<ListaEscalas escalas={ESCALAS} turnos={TURNOS} onAbrirEscala={vi.fn()} />);

    expect(screen.getAllByRole('row')).toHaveLength(ESCALAS.length + 1);
    expect(screen.getAllByRole('columnheader').map((celula) => celula.textContent)).toEqual([
      'Colaborador',
      'Data',
      'Turno',
      'Status',
      'Ações',
    ]);
  });

  it('abre os detalhes com a data e a escala da linha', () => {
    const onAbrirEscala = vi.fn();
    render(<ListaEscalas escalas={ESCALAS} turnos={TURNOS} onAbrirEscala={onAbrirEscala} />);

    const linha = screen.getByRole('button', { name: /Detalhes da escala de Colaborador 0 em/ });
    fireEvent.click(linha);

    expect(onAbrirEscala).toHaveBeenCalledWith('2026-11-01', [ESCALAS[0]]);
  });

  it('mostra o estado vazio quando o período não tem escala', () => {
    render(<ListaEscalas escalas={[]} turnos={TURNOS} onAbrirEscala={vi.fn()} />);

    const aviso = screen.getByText(/Nenhuma escala encontrada/);
    expect(aviso).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(document.body).queryByRole('columnheader')).toBeNull();
  });
});
