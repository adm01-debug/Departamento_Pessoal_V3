import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from '@/components/ui/user-avatar';
import { TONS_AVATAR } from '@/lib/avatarTons';

// O bug que estes casos travam: o fallback usava `bg-gradient-to-br` com
// `from-chart-N to-chart-M`. Essas classes NAO geram CSS (o tema do Tailwind
// v4 do projeto nao registra `--color-chart-*`), entao 4 dos 5 tons sorteados
// renderizavam sem fundo nenhum. O teste exige que o fundo venha sempre da
// paleta de `avatarTons`, que e a unica cujas classes existem de verdade.

// Cada caso renderiza em arvore propria: usar `screen` depois de dois
// `render` no mesmo teste acha os dois fallbacks.
function classesDoFallback(nome: string): string {
  const { container, unmount } = render(<UserAvatar name={nome} />);
  // O Avatar do Radix renderiza <span raiz><span fallback>: o tom esta no de
  // dentro, nao no primeiro.
  const spans = container.querySelectorAll('span');
  const el = spans[spans.length - 1];
  const classes = el?.className ?? '';
  unmount();
  return classes;
}

function tomDe(classes: string): string | undefined {
  return TONS_AVATAR.find((tom) => tom.split(' ').every((c) => classes.includes(c)));
}

describe('UserAvatar', () => {
  it('mostra as iniciais de nome composto', () => {
    render(<UserAvatar name="Ana Beatriz Souza" />);
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('o fundo vem sempre da paleta de avatarTons', () => {
    expect(tomDe(classesDoFallback('Carlos Eduardo'))).toBeTruthy();
  });

  it('nao usa mais gradiente nem token chart-*', () => {
    const classes = classesDoFallback('Mariana Oliveira');
    expect(classes).not.toContain('bg-gradient-to-br');
    expect(classes).not.toMatch(/from-chart-|to-chart-|from-primary|to-primary-glow/);
  });

  // Mesma pessoa, mesma cor em qualquer tela: e o contrato de `tomDoAvatar`.
  it('o mesmo nome recebe sempre o mesmo tom', () => {
    const a = classesDoFallback('Gustavo Henrique');
    const b = classesDoFallback('Gustavo Henrique');
    expect(a).toBe(b);
  });

  // 5 tons na paleta: nomes diferentes nao podem cair todos no mesmo.
  it('nomes diferentes usam mais de um tom', () => {
    const tons = new Set(
      ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fabio', 'Gisele'].map((n) => tomDe(classesDoFallback(n)))
    );
    expect(tons.size).toBeGreaterThan(1);
  });
});
