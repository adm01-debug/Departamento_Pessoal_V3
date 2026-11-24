import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CLASSE_LINHA_HOVER } from '@/components/ui/linha-tabela-hover';
import { TabelaCandidatos } from '../TabelaCandidatos';
import { criarCandidatura, criarVaga } from './candidatosFixture';
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';

/**
 * ============================================================================
 * HOVER DAS LINHAS — Candidatos (Recrutamento & Seleção).
 *
 * O efeito é 100% CSS (`:hover` no `<tr>`), então não há o que "simular": o que
 * se trava aqui é o CONTRATO de classes — a MESMA string da tabela "Histórico de
 * solicitações" (vinda da fonte única `ui/linha-tabela-hover.ts`), aplicada no
 * `<tr>` e em nenhum `<td>`, com 200 ms, sem tocar em espaçamento/altura e sem
 * apagar o indicador da linha selecionada.
 * ============================================================================
 */
const VAGAS_POR_ID: ReadonlyMap<string, VagaRow> = new Map([['vaga-1', criarVaga()]]);

const base = criarCandidatura();

function candidato(id: string, pessoaId: string, nome: string) {
  return criarCandidatura({ id, candidato: { ...base.candidato!, id: pessoaId, nome } });
}

const CANDIDATURAS: CandidaturaComRelacoes[] = [
  candidato('cand-1', 'p1', 'Ana Souza'),
  candidato('cand-2', 'p2', 'Bruno Lima'),
  candidato('cand-3', 'p3', 'Carla Dias'),
];

function renderizar(selecionados: string[] = []) {
  const onVerPerfil = vi.fn();
  const onMoverEtapa = vi.fn();
  const onAlternarSelecao = vi.fn();
  const onAlternarTodos = vi.fn();
  const utils = render(
    <TabelaCandidatos
      candidaturas={CANDIDATURAS}
      vagasPorId={VAGAS_POR_ID}
      selecionados={new Set(selecionados)}
      onAlternarSelecao={onAlternarSelecao}
      onAlternarTodos={onAlternarTodos}
      todosDaPaginaSelecionados={selecionados.length === CANDIDATURAS.length}
      algunsSelecionados={selecionados.length > 0}
      onVerPerfil={onVerPerfil}
      onMoverEtapa={onMoverEtapa}
      cascadeKey="teste-hover"
    />
  );
  return { ...utils, onVerPerfil, onMoverEtapa, onAlternarSelecao, onAlternarTodos };
}

const linhas = (container: HTMLElement) => [...container.querySelectorAll('tbody tr')] as HTMLTableRowElement[];

const celulas = (linha: HTMLElement) => [...linha.querySelectorAll('td')] as HTMLTableCellElement[];

describe('TabelaCandidatos — hover das linhas', () => {
  it('aplica a régua do Histórico de solicitações no <tr>, em todas as linhas', () => {
    const { container } = renderizar();
    const corpo = linhas(container);
    expect(corpo).toHaveLength(CANDIDATURAS.length);
    for (const linha of corpo) {
      expect(linha).toHaveClass('transition-colors', 'duration-200', 'hover:bg-background/60');
    }
  });

  it('usa a MESMA constante da tabela de referência (200 ms, fundo --background a 60%)', () => {
    expect(CLASSE_LINHA_HOVER).toBe('transition-colors duration-200 hover:bg-background/60');

    const { container } = renderizar();
    const linha = linhas(container)[0];
    expect(linha.className).toContain(CLASSE_LINHA_HOVER);
    // O hover Lime antigo (`hover:bg-primary/[0.025]`) não existe mais.
    expect(linha.className).not.toContain('hover:bg-primary');
    // Nada de borda, sombra, escala ou deslocamento no realce.
    expect(linha.className).not.toMatch(/hover:(shadow|ring|scale|translate|border)/);
  });

  it('não pinta célula a célula: as <td> ficam transparentes e sem hover próprio', () => {
    const { container } = renderizar();
    for (const linha of linhas(container)) {
      for (const celula of celulas(linha)) {
        expect(celula.className).not.toContain('hover:');
        expect(celula.className).not.toMatch(/(^|\s)bg-/);
        expect(celula.className).not.toContain('transition');
      }
    }
  });

  it('preserva espaçamento, altura e alinhamento das células e a estrutura da tabela', () => {
    const { container } = renderizar();
    const tabela = container.querySelector('table');
    expect(tabela).toHaveClass('table-fixed', 'border-collapse');
    expect(tabela?.querySelectorAll('colgroup col')).toHaveLength(9);
    for (const linha of linhas(container)) {
      const tds = celulas(linha);
      expect(tds).toHaveLength(9);
      for (const td of tds) {
        expect(td).toHaveClass('py-1.5', 'align-middle');
      }
    }
  });

  it('linha selecionada mantém o indicador Lime e ganha hover próprio (distinto do hover escuro)', () => {
    const { container } = renderizar(['cand-2']);
    const [primeira, segunda, terceira] = linhas(container);

    expect(primeira.className).not.toContain('bg-primary/[0.035]');
    expect(primeira).toHaveClass('hover:bg-background/60');

    // Selecionada: mesmo tint de antes + hover no próprio Lime, nunca o azul-marinho.
    expect(segunda).toHaveClass('transition-colors', 'duration-200');
    expect(segunda.className).toContain('bg-primary/[0.035]');
    expect(segunda.className).toContain('hover:bg-primary/[0.06]');
    expect(segunda.className).not.toContain('hover:bg-background/60');

    expect(terceira).toHaveClass('hover:bg-background/60');
  });

  it('mantém seleção múltipla, "Ver perfil" e o menu de ações funcionando', async () => {
    const { container, onVerPerfil, onMoverEtapa, onAlternarSelecao, onAlternarTodos } = renderizar();
    const linha = linhas(container)[0];

    await userEvent.click(within(linha).getByRole('checkbox', { name: /Selecionar Ana Souza/i }));
    expect(onAlternarSelecao).toHaveBeenCalledWith('cand-1');

    await userEvent.click(screen.getByRole('checkbox', { name: /Selecionar todos os candidatos da página/i }));
    expect(onAlternarTodos).toHaveBeenCalledTimes(1);

    await userEvent.click(within(linha).getByRole('button', { name: /Ver perfil de Ana Souza/i }));
    expect(onVerPerfil).toHaveBeenCalledWith(CANDIDATURAS[0]);

    await userEvent.click(within(linha).getByRole('button', { name: /Ações de Ana Souza/i }));
    expect(await screen.findByText('Mover para etapa')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Entrevista' }));
    expect(onMoverEtapa).toHaveBeenCalledWith('cand-1', 'entrevista');
  });
});
