import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditoriaChips } from '@/components/avaliacao/AuditoriaChips';

/**
 * ============================================================================
 * AUDITORIA — chips de módulo: identidade de COR por categoria.
 *
 * O que se prova é a regra visual pedida: cada chip mantém a cor da SUA
 * categoria mesmo quando NÃO está selecionado (borda tingida, fundo com tint,
 * texto com leve coloração, bolinha sólida e contador na mesma linguagem) e o
 * estado selecionado continua mais forte (fundo/borda/texto intensos + glow).
 * Nenhum dado de banco: só as contagens que a página já calcula.
 * ============================================================================
 */

const CONTAGENS = {
  todos: 10,
  porTabela: {
    ciclos_avaliacao: 2,
    metas_okrs: 2,
    feedbacks_360: 3,
    pdis: 2,
    competencias_matriz: 1,
  },
};

function renderChips(modulo = '') {
  return render(<AuditoriaChips modulo={modulo} onModulo={vi.fn()} contagens={CONTAGENS} />);
}

const botao = (rotulo: RegExp): HTMLElement => screen.getByRole('button', { name: rotulo });
const classes = (el: HTMLElement): string[] => el.className.split(/\s+/).filter(Boolean);
const tem = (el: HTMLElement, classe: string) =>
  expect(classes(el), `classe ausente no chip: ${classe}`).toContain(classe);
const naoTem = (el: HTMLElement, classe: string) =>
  expect(classes(el), `classe inesperada no chip: ${classe}`).not.toContain(classe);

/** A bolinha indicadora: o único `span[aria-hidden]` do chip. */
const ponto = (el: HTMLElement): HTMLElement => el.querySelector('span[aria-hidden]') as HTMLElement;
/** O contador: o `span` tabular do chip. */
const contador = (el: HTMLElement): HTMLElement =>
  Array.from(el.querySelectorAll('span')).find((s) => s.className.includes('tabular-nums')) as HTMLElement;

interface Caso {
  rotulo: RegExp;
  /** Cor sólida da bolinha. */
  ponto: string;
  borda: string;
  fundo: string;
  texto: string;
  hoverFundo: string;
  hoverBorda: string;
  contador: string;
}

const CASOS: Caso[] = [
  {
    rotulo: /^Todos/,
    ponto: 'bg-primary',
    borda: 'border-primary/25',
    fundo: 'bg-primary/10',
    texto: 'text-primary/90',
    hoverFundo: 'hover:bg-primary/15',
    hoverBorda: 'hover:border-primary/45',
    contador: 'bg-primary/15',
  },
  {
    rotulo: /^Ciclos/,
    ponto: 'bg-info',
    borda: 'border-info/25',
    fundo: 'bg-info/10',
    texto: 'text-info/90',
    hoverFundo: 'hover:bg-info/15',
    hoverBorda: 'hover:border-info/45',
    contador: 'bg-info/15',
  },
  {
    rotulo: /^Metas/,
    ponto: 'bg-success',
    borda: 'border-success/25',
    fundo: 'bg-success/10',
    texto: 'text-success/90',
    hoverFundo: 'hover:bg-success/15',
    hoverBorda: 'hover:border-success/45',
    contador: 'bg-success/15',
  },
  {
    rotulo: /^Feedbacks/,
    ponto: 'bg-primary',
    borda: 'border-primary/25',
    fundo: 'bg-primary/10',
    texto: 'text-primary/90',
    hoverFundo: 'hover:bg-primary/15',
    hoverBorda: 'hover:border-primary/45',
    contador: 'bg-primary/15',
  },
  {
    rotulo: /^PDI/,
    ponto: 'bg-warning',
    borda: 'border-warning/25',
    fundo: 'bg-warning/10',
    texto: 'text-warning/90',
    hoverFundo: 'hover:bg-warning/15',
    hoverBorda: 'hover:border-warning/45',
    contador: 'bg-warning/15',
  },
  {
    rotulo: /^Nine-Box/,
    ponto: 'bg-destructive-vivid',
    borda: 'border-destructive-vivid/30',
    fundo: 'bg-destructive-vivid/10',
    texto: 'text-destructive-vivid/90',
    hoverFundo: 'hover:bg-destructive-vivid/15',
    hoverBorda: 'hover:border-destructive-vivid/50',
    contador: 'bg-destructive-vivid/15',
  },
];

describe('AuditoriaChips — a cor da categoria vale mesmo SEM seleção', () => {
  it('todos os chips nascem com a cor própria (borda, fundo, texto, bolinha e contador)', () => {
    renderChips('__nenhum__'); // nenhum módulo selecionado (nem o "Todos")

    for (const caso of CASOS) {
      const chip = botao(caso.rotulo);
      expect(chip, `${caso.rotulo} deveria estar no repouso`).toHaveAttribute('aria-pressed', 'false');

      // Borda/fundo/texto tingidos: o chip não pode parecer "apagado"/neutro.
      tem(chip, caso.borda);
      tem(chip, caso.fundo);
      tem(chip, caso.texto);

      // Hover reforça a MESMA cor (não troca por um tom genérico).
      tem(chip, caso.hoverFundo);
      tem(chip, caso.hoverBorda);

      // Bolinha indicadora sólida na cor da categoria.
      tem(ponto(chip), caso.ponto);

      // Contador na mesma linguagem visual da categoria.
      tem(contador(chip), caso.contador);
    }
  });

  it('não sobra o cinza neutro do estado inativo antigo', () => {
    renderChips('__nenhum__');

    for (const caso of CASOS) {
      const chip = botao(caso.rotulo);
      // O antigo "apagado" era `border-border/40 bg-muted/20 text-muted-foreground`.
      naoTem(chip, 'border-border/40');
      naoTem(chip, 'bg-muted/20');
      naoTem(chip, 'text-muted-foreground');
    }
  });

  it('o chip SELECIONADO mantém a cor-base e ganha mais contraste + glow', () => {
    renderChips('pdis');

    const pdi = botao(/^PDI/);
    expect(pdi).toHaveAttribute('aria-pressed', 'true');

    // Mesma família (warning), agora mais intensa.
    tem(pdi, 'bg-warning/20');
    tem(pdi, 'border-warning/55');
    tem(pdi, 'text-warning');
    tem(pdi, 'shadow-glow-warning');
    // O contador também sobe de intensidade.
    tem(contador(pdi), 'bg-warning/25');
    tem(contador(pdi), 'text-warning');
    // Hover não rebaixa o selecionado (ele já está no tom mais forte).
    naoTem(pdi, 'hover:bg-warning/15');

    // E os demais continuam com a cor própria, só que no repouso.
    expect(botao(/^Nine-Box/)).toHaveAttribute('aria-pressed', 'false');
    tem(botao(/^Nine-Box/), 'text-destructive-vivid/90');
    tem(botao(/^Ciclos/), 'text-info/90');
  });

  it('o clique continua entregando o valor do módulo (nenhuma lógica mudou)', () => {
    const onModulo = vi.fn();
    render(<AuditoriaChips modulo="" onModulo={onModulo} contagens={CONTAGENS} />);

    botao(/^Ciclos/).click();
    expect(onModulo).toHaveBeenCalledWith('ciclos_avaliacao');
  });
});
