import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Prova OBJETIVA das duas correções pedidas pelo usuário (29/10/2026) na coluna
 * "Status" da tabela "Todos os Ciclos":
 *
 * 1. PADRÃO ÚNICO — nenhum status usa preenchimento SÓLIDO. Antes o `ativo` era
 *    `border-transparent bg-primary text-primary-foreground` (sólido) enquanto
 *    `concluido`/`em_andamento`/`rascunho` eram tonalizados; agora os quatro
 *    seguem a MESMA receita (contorno tonalizado + fundo tonalizado + texto na
 *    cor do status), variando só o MATIZ.
 * 2. UMA LINHA — todos os badges carregam `whitespace-nowrap` (o "Em Andamento"
 *    quebrava em duas linhas) e o rótulo é texto simples, sem `<br>`.
 *
 * O mock da Motion expõe os props recebidos em data-attributes: mesma técnica de
 * `DesempenhoEntradaCascade.test.tsx` / `DesempenhoBarrasProgresso.test.tsx`.
 */
vi.mock('framer-motion', () => {
  const capturar = (Tag: any) =>
    ({ children, initial, animate, transition, style, ...rest }: any) => (
      <Tag data-initial={JSON.stringify(initial)} style={style} {...rest}>
        {children}
      </Tag>
    );
  return {
    motion: {
      div: capturar('div'),
      span: capturar('span'),
      section: capturar('section'),
      p: capturar('p'),
      tr: capturar('tr'),
      li: capturar('li'),
      create: (Component: any) =>
        ({ children, custom, variants, initial, animate, ...rest }: any) => (
          <Component {...rest}>{children}</Component>
        ),
    },
    AnimatePresence: ({ children }: any) => children,
    useReducedMotion: () => false,
    useInView: () => true,
  };
});

import { TodosCiclosTable } from '../avaliacao/TodosCiclosTable';

const CICLOS = [
  { id: 'a', nome: 'Ciclo ativo', status: 'ativo' },
  { id: 'b', nome: 'Ciclo concluído', status: 'concluido' },
  { id: 'c', nome: 'Ciclo em andamento', status: 'em_andamento' },
  { id: 'd', nome: 'Ciclo rascunho', status: 'rascunho' },
  // Status desconhecido → cai na receita neutra (nunca numa cor sólida).
  { id: 'e', nome: 'Ciclo cancelado', status: 'cancelado' },
];

/** Matiz de cada status colorido — o que distingue um badge do outro. */
const MATIZ: Record<string, string> = {
  ativo: 'primary',
  concluido: 'success',
  'em andamento': 'warning',
};

/** Preenchimentos SÓLIDOS — nenhum deles pode aparecer no badge de status. */
const SOLIDOS = ['bg-primary', 'bg-success', 'bg-warning', 'bg-info', 'bg-destructive', 'bg-muted'];

function tokens(elemento: Element): string[] {
  return (elemento.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
}

/** Só o token EXATO conta: `bg-primary/10` (tonalizado) não é `bg-primary`. */
function possuiToken(tokensDoBadge: string[], token: string): boolean {
  return tokensDoBadge.includes(token);
}

function badgeDe(rotulo: string): HTMLElement {
  return screen.getByText(rotulo) as HTMLElement;
}

function renderizarTabela() {
  return render(
    <TodosCiclosTable ciclos={CICLOS} metas={[]} onSelecionar={() => undefined} onExcluir={() => undefined} />
  );
}

describe('coluna Status — "Todos os Ciclos"', () => {
  it('nenhum status usa cor sólida: os cinco badges são tonalizados', () => {
    renderizarTabela();

    ['ativo', 'concluido', 'em andamento', 'rascunho', 'cancelado'].forEach((rotulo) => {
      const badge = badgeDe(rotulo);
      const classes = tokens(badge);

      // Fundo translúcido (ex.: `bg-primary/10`) — e não o token sólido.
      expect(classes.some((c) => /^bg-[a-z-]+\/\d+$/.test(c))).toBe(true);
      SOLIDOS.forEach((solido) => {
        expect(possuiToken(classes, solido)).toBe(false);
      });
      // Badge sólida escrevia `text-*-foreground` (texto escuro sobre a cor).
      expect(classes.some((c) => /^text-[a-z-]+$/.test(c))).toBe(true);
      expect(possuiToken(classes, 'text-primary-foreground')).toBe(false);
      // Contorno tonalizado sempre presente (era `border-transparent` no ativo).
      expect(classes.some((c) => c.startsWith('border-'))).toBe(true);
      expect(possuiToken(classes, 'border-transparent')).toBe(false);
    });
  });

  it('cada status colorido mantém o próprio matiz na MESMA receita /*/10 + border-*/40 + text-*', () => {
    renderizarTabela();

    Object.entries(MATIZ).forEach(([rotulo, tom]) => {
      const classes = tokens(badgeDe(rotulo));
      expect(classes).toContain(`bg-${tom}/10`);
      expect(classes).toContain(`border-${tom}/40`);
      expect(classes).toContain(`text-${tom}`);
    });
  });

  it('"Ativo" deixou de ser o único badge sólido (era bg-primary cheio)', () => {
    renderizarTabela();

    const classes = tokens(badgeDe('ativo'));
    expect(classes).toContain('bg-primary/10');
    expect(classes).toContain('text-primary');
    expect(possuiToken(classes, 'bg-primary')).toBe(false);
    expect(possuiToken(classes, 'text-primary-foreground')).toBe(false);
  });

  it('todos os badges ficam em UMA linha (whitespace-nowrap) — inclui "Em Andamento"', () => {
    renderizarTabela();

    ['ativo', 'concluido', 'em andamento', 'rascunho', 'cancelado'].forEach((rotulo) => {
      const badge = badgeDe(rotulo);
      expect(tokens(badge)).toContain('whitespace-nowrap');
      // Rótulo é texto simples: sem `<br>`, sem quebra embutida.
      expect(badge.querySelector('br')).toBeNull();
      expect(badge.textContent).toBe(rotulo);
    });
  });

  it('o rótulo mantém a capitalização visual ("Em Andamento") em todos os status', () => {
    renderizarTabela();

    ['ativo', 'concluido', 'em andamento', 'rascunho', 'cancelado'].forEach((rotulo) => {
      expect(tokens(badgeDe(rotulo))).toContain('capitalize');
    });
  });
});
