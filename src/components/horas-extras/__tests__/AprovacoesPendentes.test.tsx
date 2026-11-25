import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AprovacoesPendentes } from '../AprovacoesPendentes';
import type { SolicitacaoHoraExtra } from '../horasExtrasComum';

/**
 * Cartões de "Aprovações pendentes" — as três revisões de COR pedidas:
 * selo "Pendente" em âmbar, "Ver detalhes" com hover lime e descrição sobre
 * azul translúcido. O que estes testes protegem é o CONTRATO das classes:
 * nenhuma outra propriedade pode entrar no hover (o pedido é exclusivamente
 * visual) e nenhum cartão pode ficar diferente dos demais.
 */

const MOTIVOS = [
  'Atendimento a pico de demanda',
  'Fechamento mensal de folha',
  'Cobertura de colaborador afastado',
  'Inventário de estoque',
  'Migração de sistema fora do horário',
];

function linha(i: number): SolicitacaoHoraExtra {
  return {
    id: `sol-${i}`,
    data: `2026-10-${String(20 - i).padStart(2, '0')}`,
    horas_solicitadas: [2.5, 1, 2, 3, 1.5][i % 5],
    motivo: MOTIVOS[i % MOTIVOS.length],
    status: 'pendente',
    created_at: `2026-10-${String(18 - i).padStart(2, '0')}T12:00:00.000Z`,
    colaborador: { nome_completo: `Colaborador ${i}`, departamento: 'Financeiro' },
  };
}

/** 5 pendentes: 3 na fila inicial + 2 atrás do "Ver todas". */
const SOLICITACOES = Array.from({ length: 5 }, (_, i) => linha(i));

function renderFila(solicitacoes: readonly SolicitacaoHoraExtra[] = SOLICITACOES) {
  const props = {
    solicitacoes,
    periodo: 'todos' as const,
    onPeriodoChange: vi.fn(),
    onVerDetalhes: vi.fn(),
    onAprovar: vi.fn(),
    onRejeitar: vi.fn(),
  };
  render(<AprovacoesPendentes {...props} />);
  return props;
}

/** Classes de qualquer elemento (usa o ATRIBUTO para funcionar também em SVG). */
const classes = (el: Element | null): string[] => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

/** Selos "Pendente" renderizados. */
const selos = () => screen.getAllByText('Pendente');

/** Botões "Ver detalhes" renderizados. */
const botoesDetalhes = () => screen.getAllByRole('button', { name: 'Ver detalhes' });

/** Faixa do motivo (o `<p>` truncado vive dentro dela). */
function faixaDoMotivo(indice = 0): HTMLElement {
  const faixa = screen.getByText(MOTIVOS[indice]).parentElement;
  if (!faixa) throw new Error('faixa do motivo não encontrada');
  return faixa;
}

/** Card inteiro (o `<Card>` que embrulha a faixa do motivo). */
function card(indice = 0): HTMLElement {
  const el = faixaDoMotivo(indice).parentElement;
  if (!el) throw new Error('card não encontrado');
  return el;
}

describe('AprovacoesPendentes — selo "Pendente" em âmbar', () => {
  it('pinta TODOS os selos com o âmbar de atenção do sistema', () => {
    renderFila();

    const todos = selos();
    expect(todos).toHaveLength(3); // a fila inicial; o resto vem no "Ver todas"
    for (const selo of todos) {
      const cls = classes(selo);
      // `--warning` (a cor de atenção do sistema: #F59E0B no claro, #F5A314 no
      // escuro) — não um tom local inventado para esta tela.
      expect(cls).toContain('text-warning');
      expect(cls).toContain('bg-warning/12');
      expect(cls).toContain('border-warning/30');
      // Translúcido (fundo com alfa), nunca sólido, e sem o cinza antigo.
      expect(cls).not.toContain('bg-warning');
      expect(cls).not.toContain('bg-secondary');
      expect(cls).not.toContain('text-secondary-foreground');
    }
  });

  it('mantém a geometria do selo: 21 px de altura, mesmo respiro e fonte', () => {
    renderFila();

    for (const selo of selos()) {
      const cls = classes(selo);
      expect(cls).toContain('h-[21px]');
      expect(cls).toContain('px-[10px]');
      expect(cls).toContain('text-[10px]');
      // O peso segue `font-medium` — `semibold` alargaria o pill e mexeria no
      // respiro do cabeçalho do cartão.
      expect(cls).toContain('font-medium');
      expect(cls).not.toContain('font-semibold');
    }
  });

  it('os cards revelados pelo "Ver todas" recebem o MESMO selo', () => {
    renderFila();

    fireEvent.click(screen.getByRole('button', { name: /Ver todas/ }));

    const todos = selos();
    expect(todos).toHaveLength(SOLICITACOES.length);
    for (const selo of todos) {
      expect(classes(selo)).toContain('bg-warning/12');
    }
  });
});

describe('AprovacoesPendentes — "Ver detalhes" acende o lime só no hover/foco', () => {
  it('em repouso o botão continua NEUTRO (nada de verde permanente)', () => {
    renderFila();

    for (const botao of botoesDetalhes()) {
      const cls = classes(botao);
      // Aparência de repouso preservada: borda e fundo cinzas translúcidos.
      expect(cls).toContain('border-border/60');
      expect(cls).toContain('bg-muted/20');
      // Nenhuma classe lime SEM prefixo de estado — o botão não fica verde.
      expect(cls).not.toContain('text-primary');
      expect(cls).not.toContain('bg-primary/10');
      expect(cls).not.toContain('border-primary/45');
    }
  });

  it('no hover o texto, a borda e o fundo passam ao lime da marca', () => {
    renderFila();

    for (const botao of botoesDetalhes()) {
      const cls = classes(botao);
      expect(cls).toContain('hover:text-primary');
      // 10% de alfa — dentro da faixa pedida de 8–12%.
      expect(cls).toContain('hover:bg-primary/10');
      expect(cls).toContain('hover:border-primary/45');
    }
  });

  it('o foco por teclado repete a paleta do hover', () => {
    renderFila();

    for (const botao of botoesDetalhes()) {
      const cls = classes(botao);
      expect(cls).toContain('focus-visible:text-primary');
      expect(cls).toContain('focus-visible:bg-primary/10');
      expect(cls).toContain('focus-visible:border-primary/45');
    }
  });

  it('a troca é suave e só de COR: `transition-colors` de 200 ms', () => {
    renderFila();

    for (const botao of botoesDetalhes()) {
      const cls = classes(botao);
      expect(cls).toContain('transition-colors');
      // Faixa pedida: 180–200 ms (o `transition-all` de 220 ms do Button sai).
      expect(cls).toContain('duration-200');
      expect(cls).not.toContain('transition-all');
      // Nada de tamanho, sombra, escala ou deslocamento no hover.
      const medidaNoHover = /^(hover|focus-visible):(scale|translate|shadow|h-|w-|p[xytblr]?-)/;
      expect(cls.some((c) => medidaNoHover.test(c))).toBe(false);
    }
  });

  it('preserva tamanho e posicionamento do botão', () => {
    renderFila();

    for (const botao of botoesDetalhes()) {
      const cls = classes(botao);
      expect(cls).toContain('h-[31px]');
      expect(cls).toContain('rounded-[8px]');
      expect(cls).toContain('px-[6px]');
      expect(cls).toContain('text-[11px]');
    }
  });
});

describe('AprovacoesPendentes — Aprovar e Rejeitar não foram tocados', () => {
  it('mantêm as cores de veredito e não ganham o lime do "Ver detalhes"', () => {
    renderFila();

    const aprovar = screen.getAllByRole('button', { name: /Aprovar/ })[0];
    const rejeitar = screen.getAllByRole('button', { name: /Rejeitar/ })[0];

    const clsAprovar = classes(aprovar);
    expect(clsAprovar).toContain('bg-success/10');
    expect(clsAprovar).toContain('hover:bg-success/15');
    expect(clsAprovar).toContain('text-success');
    expect(clsAprovar).not.toContain('hover:text-primary');

    const clsRejeitar = classes(rejeitar);
    expect(clsRejeitar).toContain('bg-danger/10');
    expect(clsRejeitar).toContain('hover:bg-danger/20');
    expect(clsRejeitar).toContain('text-danger');
    expect(clsRejeitar).not.toContain('hover:text-primary');
  });
});

describe('AprovacoesPendentes — descrição sobre azul translúcido', () => {
  it('a faixa do motivo usa o mesmo azul do "Ver todas" (fundo 10%, borda 40%)', () => {
    renderFila();

    for (let i = 0; i < 3; i++) {
      const cls = classes(faixaDoMotivo(i));
      // `--info` do design system: fundo `rgba(0,170,255,0.10)` e borda
      // `rgba(0,170,255,0.40)` — a receita do controle "Ver todas (N)".
      expect(cls).toContain('bg-info/10');
      expect(cls).toContain('border-info/40');
      // Não é mais o azul apagado (25%) nem o cinza do `--muted`.
      expect(cls).not.toContain('border-info/25');
      expect(cls).not.toContain('bg-muted/20');
      // Translúcido, nunca sólido.
      expect(cls).not.toContain('bg-info');
    }
  });

  it('o ícone assume o azul do sistema e o texto continua neutro', () => {
    renderFila();

    const faixa = faixaDoMotivo();
    const texto = screen.getByText(MOTIVOS[0]);
    // A leitura fica na hierarquia do cartão (texto neutro).
    expect(classes(texto)).toContain('text-muted-foreground');
    expect(classes(texto)).not.toContain('text-info');
    expect(texto.className).toContain('truncate');

    // O ícone (FileText) carrega a cor: token `--info`, o mesmo do botão.
    const icone = faixa.querySelector('svg');
    expect(icone).not.toBeNull();
    expect(classes(icone)).toContain('text-info');
    expect(classes(icone)).not.toContain('text-muted-foreground');
  });

  it('mantém border-radius, padding e altura mínima da faixa', () => {
    renderFila();

    const cls = classes(faixaDoMotivo());
    expect(cls).toContain('min-h-[34px]');
    expect(cls).toContain('rounded-[8px]');
    expect(cls).toContain('px-[10px]');
    expect(cls).toContain('py-[6px]');
    expect(cls).toContain('gap-[8px]');
    expect(cls).toContain('mt-[10px]');
  });
});

describe('AprovacoesPendentes — nada muda de medida nem vaza para os vizinhos', () => {
  it('o cartão mantém a diagramação (padding, raio, grade de três colunas)', () => {
    renderFila();

    const cls = classes(card());
    expect(cls).toContain('p-[15px]');
    expect(cls).toContain('rounded-[11px]');
    expect(cls).toContain('border-border/50');
    expect(cls).toContain('flex');
    expect(cls).toContain('flex-col');

    // A linha de ações segue em três colunas iguais, com o pé alinhado.
    const acoes = botoesDetalhes()[0].parentElement;
    expect(classes(acoes)).toContain('grid-cols-3');
    expect(classes(acoes)).toContain('mt-auto');
  });

  it('o hover mora no botão: o cartão e a faixa não acendem junto', () => {
    renderFila();

    for (let i = 0; i < 3; i++) {
      // Nenhum `hover:` no container nem na faixa do motivo — passar o mouse
      // sobre um vizinho não pinta nada.
      expect(classes(card(i)).some((c) => c.startsWith('hover:'))).toBe(false);
      expect(classes(faixaDoMotivo(i)).some((c) => c.startsWith('hover:'))).toBe(false);
    }
  });

  it('todos os cartões (inclusive os revelados) têm classes idênticas', () => {
    renderFila();

    fireEvent.click(screen.getByRole('button', { name: /Ver todas/ }));

    const faixas = MOTIVOS.slice(0, SOLICITACOES.length).map((m) => screen.getByText(m).parentElement?.className ?? '');
    expect(faixas).toHaveLength(SOLICITACOES.length);
    expect(new Set(faixas).size).toBe(1); // uma única classe para todos

    // O mesmo vale para o selo e para o botão: nada é estilizado por solicitação.
    expect(new Set(selos().map((s) => s.className)).size).toBe(1);
    expect(new Set(botoesDetalhes().map((b) => b.className)).size).toBe(1);
  });
});
