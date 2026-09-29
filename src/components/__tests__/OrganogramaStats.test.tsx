import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OrganogramaStats } from '../organograma/OrganogramaStats';

function renderStats() {
  return render(<OrganogramaStats totalDeptos={5} totalColabs={4} niveis={3} />);
}

/** Badge do ícone = `<span>` que embrulha o `<svg>` de cada card. */
function iconBadges(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('svg')).map((svg) => svg.parentElement as Element);
}

/** O card do indicador em si: o `motion.div` que também carrega a entrada. */
function cards(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.h-11.border-border\\/60'));
}


describe('OrganogramaStats', () => {
  it('mostra os três indicadores com os seus valores', () => {
    renderStats();

    expect(screen.getByText('Departamentos')).toBeInTheDocument();
    expect(screen.getByText('Colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Níveis hierárquicos')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('dá uma cor de ícone diferente para cada indicador', () => {
    const { container } = renderStats();
    const badges = iconBadges(container);

    expect(badges).toHaveLength(3);
    const classNames = badges.map((badge) => badge.className);

    // Nenhuma cor repetida entre os três cards.
    expect(new Set(classNames).size).toBe(3);

    // Cada indicador com um token diferente do design system:
    // azul/ciano (`--info`), verde (`--success`) e roxo (`--chart-4`).
    expect(classNames[0]).toMatch(/(^|\s)text-info(\s|$)/);
    expect(classNames[1]).toMatch(/(^|\s)text-success(\s|$)/);
    expect(classNames[2]).toMatch(/--chart-4/);
    expect(classNames[2]).toMatch(/(^|\s)text-\[hsl\(var\(--chart-4\)\)\](\s|$)/);

    // Nenhum card voltou ao lime do botão de ação (`primary`).
    for (const className of classNames) {
      expect(className).not.toMatch(/text-primary(\s|$)/);
    }
  });

  it('mantém o tamanho e o raio do badge de ícone e a estrutura do card', () => {
    const { container } = renderStats();

    for (const badge of iconBadges(container)) {
      expect(badge.className).toMatch(/(^|\s)w-6(\s|$)/);
      expect(badge.className).toMatch(/(^|\s)h-6(\s|$)/);
      expect(badge.className).toMatch(/(^|\s)rounded-md(\s|$)/);
    }
    // Card do indicador (altura, borda e fundo) segue igual ao de antes.
    expect(cards(container)).toHaveLength(3);
    expect(container.querySelectorAll('p.uppercase')).toHaveLength(3);
  });

  it('entra com a cascata dos KPI Cards do Dashboard (escondido no 1º frame, visível no fim)', async () => {
    const { container } = renderStats();
    const reveal = cards(container);

    // Keyframe `hidden` do `cardVariants` (dashboard/MetricCard.tsx): fade + 20px
    // abaixo. Os três cards saem juntos, cada um no seu slot de delay (0, 1 e 2
    // em organogramaHeaderReveal.ts).
    for (const card of reveal) {
      expect(card.getAttribute('style')).toBe('opacity: 0; transform: translateY(20px);');
    }

    await waitFor(() => {
      for (const card of reveal) expect(card.style.opacity).toBe('1');
    }, { timeout: 2000 });
    for (const card of reveal) {
      expect(card.style.transform).toBe('none');
    }
  });

  it('reaproveita o `cardVariants` do Dashboard em vez de recriar a animação', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/organograma/OrganogramaStats.tsx'), 'utf8');

    // Mesmo objeto, importado da referência — o padrão dos KPI Cards do Dashboard
    // Executivo, sem `hidden:`/`visible:` local (nada de cópia "parecida").
    expect(source).toMatch(/import \{ cardVariants \} from '@\/components\/dashboard\/MetricCard'/);
    expect(source).toMatch(/variants=\{cardVariants\}/);
    expect(source).toMatch(/initial="hidden"/);
    expect(source).toMatch(/animate="visible"/);
    expect(source).not.toMatch(/hidden:\s*\{/);
    expect(source).not.toMatch(/visible:\s*\(/);

    // Cada card no seu slot da fila do cabeçalho, na MESMA ordem do array acima
    // (que é a ordem visual: esquerda → direita).
    const slots = [...source.matchAll(/reveal: HEADER_REVEAL\.(\w+)/g)].map((m) => m[1]);
    expect(slots).toEqual(['departamentos', 'colaboradores', 'niveis']);
    expect(source).not.toMatch(/custom=\{\d+\}/);
  });
});
