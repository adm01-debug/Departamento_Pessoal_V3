/**
 * Central de Ajustes — APARÊNCIA DA LINHA (tabela de solicitações).
 *
 * O jsdom não pinta pixel, então o teste trava o CONTRATO do padrão adotado
 * para a tabela, que é o pedido da vitrine:
 *
 *   • a linha NÃO tem estado pintado: nenhuma `<tr>`/`<td>` ganha fundo, barra
 *     lateral (`before:`), contorno ou borda por lado — a marcação vive só no
 *     checkbox e a linha aberta, só no painel de detalhes ao lado;
 *   • a tabela é UNIFORME: linha ativa, linha marcada e linha comum têm
 *     exatamente as MESMAS classes (sem zebra, sem degrau de contraste entre
 *     uma linha e a seguinte, sem cara de card independente);
 *   • o único estado pintado é o HOVER, em cinza-azulado (`muted/70`), igual em
 *     todas as linhas, em 200 ms e só com `background-color` animado;
 *   • o fio entre linhas é hairline (`border-border/25`);
 *   • checkbox marcado é lime preenchido com check ESCURO
 *     (`data-[state=checked]:bg-primary` + `:text-primary-foreground`);
 *   • cores semânticas de badges (risco e status), selo Portaria 671 e avatar
 *     seguem intactas — nada da linha pinta por cima delas.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CentralAjustesTabela } from '../ponto/CentralAjustesTabela';
import type { NivelRiscoAjuste, SolicitacaoAjustePonto } from '../ponto/centralAjustes';

function solicitacao(
  id: string,
  nome: string,
  { status = 'pendente', risco }: { status?: string; risco?: NivelRiscoAjuste } = {}
): SolicitacaoAjustePonto {
  return {
    id,
    colaborador_id: `col-${id}`,
    colaborador: { nome_completo: nome },
    data_ponto: '2026-11-04',
    tipo_ponto: 'saida',
    hora_sugerida: '17:00:00',
    hora_original: '12:00:00',
    motivo: 'Esqueci de registrar a saída no fim do expediente.',
    status,
    relatorio_conformidade: risco
      ? { portaria_671_conformidade: true, ia_risco: { nivel: risco, resumo: 'Batida fora da janela.' } }
      : { portaria_671_conformidade: true },
  };
}

const SOLICITACOES = [
  solicitacao('a1', 'Ana Beatriz Souza', { risco: 'alto' }),
  solicitacao('a2', 'Carlos Eduardo Lima', { risco: 'medio' }),
  solicitacao('a3', 'Fernanda Costa Ribeiro', { status: 'aprovado', risco: 'baixo' }),
];

function montar({
  idAtiva = 'a2',
  selecionadas = ['a2', 'a3'],
}: { idAtiva?: string | null; selecionadas?: string[] } = {}) {
  const { container } = render(
    <CentralAjustesTabela
      solicitacoes={SOLICITACOES}
      selecionadas={selecionadas}
      onAlternarSelecao={vi.fn()}
      onAlternarSelecaoDaPagina={vi.fn()}
      idAtiva={idAtiva}
      onAtivar={vi.fn()}
    />
  );
  return container;
}

/** Linha do corpo pelo nome do colaborador (o cabeçalho fica de fora). */
const linhaDe = (container: HTMLElement, nome: string) => {
  const linha = [...container.querySelectorAll<HTMLTableRowElement>('tbody tr')].find((tr) =>
    tr.textContent?.includes(nome)
  );
  if (!linha) throw new Error(`Linha de ${nome} não encontrada`);
  return linha;
};

const celulasDe = (linha: HTMLTableRowElement) => [...linha.querySelectorAll<HTMLTableCellElement>('td')];

/**
 * Classes que PINTAM a caixa e não podem existir na linha: fundo, contorno,
 * anel, sombra, pseudo-elemento (a antiga barra lateral) e zebra. O fio
 * horizontal (`border-b`) é permitido — é justamente o separador aprovado.
 */
const PINTURA_NA_CAIXA =
  /^(bg-|before:|after:|ring-|shadow|outline-|odd:|even:|border-(?:x|y|l|r|t|primary)(?:-|$)|border-\d)/;

const pinturasDe = (elemento: Element) =>
  elemento.className
    .toString()
    .split(/\s+/)
    .filter((classe) => classe.length > 0 && PINTURA_NA_CAIXA.test(classe));

describe('CentralAjustesTabela — aparência da linha', () => {
  it('não pinta a linha ativa: sem fundo, sem barra lateral e sem contorno', () => {
    const container = montar();
    const linha = linhaDe(container, 'Carlos Eduardo Lima');

    // O estado continua exposto para leitor de tela e para a lógica da tela…
    expect(linha).toHaveAttribute('aria-selected', 'true');
    expect(linha).toHaveAttribute('data-estado', 'ativa');

    // …mas não vira pixel: nenhuma pintura no <tr>.
    expect(pinturasDe(linha)).toEqual([]);

    // E nenhuma célula recebe fundo, barra (`before:`) ou borda por lado.
    const celulas = celulasDe(linha);
    expect(celulas).toHaveLength(8);
    celulas.forEach((celula) => expect(pinturasDe(celula)).toEqual([]));
  });

  it('dá à linha ativa, à marcada e à comum exatamente as mesmas classes', () => {
    const container = montar({ selecionadas: ['a1'] });
    const ativa = linhaDe(container, 'Carlos Eduardo Lima');
    const marcada = linhaDe(container, 'Ana Beatriz Souza');
    const comum = linhaDe(container, 'Fernanda Costa Ribeiro');

    expect(marcada).toHaveAttribute('data-estado', 'marcada');
    expect(comum).toHaveAttribute('data-estado', 'inativa');

    // Uniformidade: sem zebra e sem degrau de contraste entre linhas.
    expect(marcada.className).toBe(ativa.className);
    expect(comum.className).toBe(ativa.className);
    expect(container.querySelector('[class*="odd:"], [class*="even:"]')).toBeNull();
  });

  it('aplica o mesmo hover cinza-azulado em todas as linhas, em 200 ms', () => {
    const container = montar();

    ['Ana Beatriz Souza', 'Carlos Eduardo Lima', 'Fernanda Costa Ribeiro'].forEach((nome) => {
      const linha = linhaDe(container, nome);
      expect(linha).toHaveClass('hover:bg-muted/70');
      expect(linha).toHaveClass('transition-colors', 'duration-200');

      // O hover não puxa para verde (nem para o verde do sistema).
      expect(linha.className).not.toMatch(/hover:bg-(success|primary|foreground)/);
      // Nada de `transition-all`: só o fundo pode se mover.
      expect(linha.className).not.toContain('transition-all');
    });
  });

  it('separa as linhas com um fio hairline, sem desenhar caixas', () => {
    const container = montar();

    ['Ana Beatriz Souza', 'Carlos Eduardo Lima', 'Fernanda Costa Ribeiro'].forEach((nome) => {
      const linha = linhaDe(container, nome);
      expect(linha).toHaveClass('border-border/25');
      expect(linha.className).not.toMatch(/border-[xy](?:-|$)/);
      expect(linha.className).not.toMatch(/border-(?:l|r|t)-/);
    });
  });

  it('mantém densidade e colunas intactas (nada de altura ou espaçamento novo)', () => {
    const container = montar();
    const celulas = celulasDe(linhaDe(container, 'Carlos Eduardo Lima'));

    expect(celulas).toHaveLength(8);
    celulas.forEach((celula) => expect(celula).toHaveClass('px-2', 'py-[5px]', 'align-middle'));

    const cabecalhos = [...container.querySelectorAll('th')].map((th) => th.textContent?.trim() ?? '');
    expect(cabecalhos).toHaveLength(8);
    expect(cabecalhos.slice(1)).toEqual([
      'Colaborador',
      'Data',
      'Tipo de ajuste',
      'Horário',
      'Motivo',
      'Risco IA',
      'Status',
    ]);
  });

  it('marca a seleção só no checkbox: lime preenchido com check escuro', () => {
    montar();

    const marcado = screen.getByRole('checkbox', { name: /selecionar solicitação de carlos eduardo lima/i });
    expect(marcado).toHaveAttribute('data-state', 'checked');
    // Lime vem de `--primary` e o ícone de check de `--primary-foreground`
    // (240 20% 6%, quase preto): preenchido lime, check ESCURO.
    expect(marcado).toHaveClass('data-[state=checked]:bg-primary');
    expect(marcado).toHaveClass('data-[state=checked]:text-primary-foreground');

    const desmarcado = screen.getByRole('checkbox', { name: /selecionar solicitação de ana beatriz souza/i });
    expect(desmarcado).toHaveAttribute('data-state', 'unchecked');
    expect(desmarcado).not.toHaveAttribute('data-state', 'checked');
  });

  it('na seleção múltipla todos os checkboxes ficam lime sem pintar as linhas', () => {
    const container = montar({ selecionadas: ['a1', 'a2', 'a3'] });
    const referencia = linhaDe(container, 'Carlos Eduardo Lima').className;

    ['Ana Beatriz Souza', 'Carlos Eduardo Lima', 'Fernanda Costa Ribeiro'].forEach((nome) => {
      const linha = linhaDe(container, nome);
      expect(pinturasDe(linha)).toEqual([]);
      expect(linha.className).toBe(referencia);

      const caixa = within(linha).getByRole('checkbox');
      expect(caixa).toHaveAttribute('data-state', 'checked');
    });
  });

  it('preserva as cores semânticas dos badges, do selo Portaria 671 e do avatar', () => {
    const container = montar();
    const linha = linhaDe(container, 'Ana Beatriz Souza');

    // Risco alto continua vermelho e status pendente continua âmbar.
    expect(within(linha).getByText('Alto')).toHaveClass('bg-destructive');
    expect(within(linha).getByText('Pendente')).toHaveClass('bg-warning/15');
    // Selo de conformidade continua no verde de sucesso (texto, não fundo).
    expect(within(linha).getByText('Portaria 671')).toHaveClass('text-success');
    // Nome/avatar intactos na coluna Colaborador.
    expect(within(linha).getByText('Ana Beatriz Souza')).toHaveClass('truncate', 'font-medium');
  });
});
