import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';

/**
 * ============================================================================
 * O MODAL "NOVO DESLIGAMENTO" ANIMA COMO O POPUP "PENDÊNCIAS".
 *
 * A janela não tem coreografia própria: ela usa a `CascadeDialogFrame` — a
 * MESMA moldura do popup de Pendências/Próximos Eventos — e por isso precisa
 * se comportar como ele: a caixa nasce pequena e cresce do centro
 * (`scaleX`/`scaleY` 0 → 1), o véu escurece em fade e os blocos entram em
 * cascata (cabeçalho → campos → botão), com a caixa só encolhendo depois que o
 * último bloco sumiu.
 *
 * Aqui o Framer Motion é o REAL (medimos `style.transform`/`style.opacity` no
 * DOM); o Radix fica em duble porque o alvo é a animação, não o focus-trap.
 * Se alguém trocar a moldura por um `DialogContent` estático, este teste cai.
 *
 * O ÚLTIMO caso cobre o "reduzir movimento": `DesligamentosPage` envolve a
 * página em `<MotionConfig reducedMotion="user">` (ver `lib/motionMode.ts`) e,
 * nesse modo, o Framer DESLIGA `scaleX/scaleY`. Sem um canal de opacidade na
 * caixa (`cascadeShellVariants`) ela apareceria INTEIRA de uma vez — que é
 * exatamente o "abre estático e abrupto" já relatado.
 * ============================================================================
 */

vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children }: any) => <div>{children}</div>,
  Portal: ({ children }: any) => <div>{children}</div>,
  Overlay: ({ children }: any) => <div>{children}</div>,
  Content: ({ children }: any) => <div>{children}</div>,
  Close: ({ children }: any) => <button>{children}</button>,
  Title: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  Description: ({ children, ...props }: any) => <p {...props}>{children}</p>,
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/services/desligamentoService', () => ({
  desligamentoService: { criar: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/components/ui/dialog', () => ({
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  DialogDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick }: any) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked }: any) => <input type="checkbox" readOnly checked={!!checked} />,
}));

vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((_e: any, d: string) => d) }));

import { NovoDesligamentoDialog } from '../desligamentos/NovoDesligamentoDialog';

/** Espera `ms` deixando o React/Framer rodarem (medição dentro de `act`). */
async function esperar(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/** Lê o `scaleY(x)` que o Framer escreveu no `transform` (1 quando é `none`). */
function escalaY(el: HTMLElement): number {
  const transform = el.style.transform;
  if (!transform || transform === 'none') return 1;
  const casamento = /scaleY\(([\d.]+)\)/.exec(transform);
  return casamento ? Number(casamento[1]) : 1;
}

/** Lê a opacidade inline que o Framer escreveu (1 quando ele não tocou nela). */
function opacidade(el: HTMLElement): number {
  return Number(el.style.opacity || '1');
}

/** Os blocos que cascateiam: filhos do corpo da moldura. */
function blocos(caixa: HTMLElement): HTMLElement[] {
  const corpo = caixa.lastElementChild as HTMLElement | null;
  return corpo ? (Array.from(corpo.children) as HTMLElement[]) : [];
}

describe('NovoDesligamentoDialog — animação da moldura (Framer real)', () => {
  it('a caixa cresce do centro e o véu escurece em fade', async () => {
    const { container, unmount } = render(<NovoDesligamentoDialog open onClose={() => {}} />);

    const caixa = container.querySelector<HTMLElement>('div[style*="transform-origin"]')!;
    const veu = container.querySelector<HTMLElement>('.backdrop-blur-sm')!;
    expect(caixa).not.toBeNull();
    expect(veu).not.toBeNull();

    const escalas: number[] = [];
    const opacidades: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      await esperar(60);
      escalas.push(escalaY(caixa));
      opacidades.push(opacidade(veu));
    }

    expect(Math.min(...escalas)).toBeLessThan(0.9); // nasceu pequena (escala < 1)
    expect(escalas.at(-1)).toBeGreaterThan(Math.min(...escalas)); // cresceu
    expect(opacidades[0]).toBeLessThan(1); // véu entrou em fade
    expect(opacidades.at(-1)).toBeGreaterThan(opacidades[0]);

    await esperar(900); // a abertura termina
    expect(escalaY(caixa)).toBe(1);
    expect(opacidade(veu)).toBe(1);

    unmount();
  }, 15_000);

  it('cabeçalho, campos e botão entram em cascata (não todos de uma vez)', async () => {
    const { container, unmount } = render(<NovoDesligamentoDialog open onClose={() => {}} />);
    const caixa = container.querySelector<HTMLElement>('div[style*="transform-origin"]')!;

    // `blocks={3}`: cabeçalho, corpo com os campos e o botão.
    expect(blocos(caixa)).toHaveLength(3);

    // Amostra a janela em que a cascata acontece: enquanto o primeiro bloco já
    // apareceu, o último (o botão) ainda está atrás — é o "stagger" de 0,12 s.
    const defasagens: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      await esperar(100);
      const [primeiro, , ultimo] = blocos(caixa);
      defasagens.push(opacidade(primeiro) - opacidade(ultimo));
    }
    expect(Math.max(...defasagens)).toBeGreaterThan(0.2);

    // ...e todos terminam visíveis (a cascata não deixa bloco pela metade).
    await esperar(900);
    for (const bloco of blocos(caixa)) expect(opacidade(bloco)).toBe(1);

    unmount();
  }, 20_000);

  it('no fechamento a caixa encolhe antes de sair do DOM (exit animado)', async () => {
    const { container, rerender, unmount } = render(<NovoDesligamentoDialog open onClose={() => {}} />);
    await esperar(1600); // deixa abrir por completo

    const caixa = container.querySelector<HTMLElement>('div[style*="transform-origin"]')!;
    expect(escalaY(caixa)).toBe(1);

    rerender(<NovoDesligamentoDialog open={false} onClose={() => {}} />);

    const escalas: number[] = [];
    for (let i = 0; i < 14; i += 1) {
      await esperar(100);
      const atual = container.querySelector<HTMLElement>('div[style*="transform-origin"]');
      if (!atual) break;
      escalas.push(escalaY(atual));
    }

    expect(escalas.length).toBeGreaterThan(0); // seguiu montada (forceMount)
    expect(Math.min(...escalas)).toBeLessThan(1); // encolheu de verdade

    unmount();
  }, 20_000);

  it('com "reduzir movimento" a janela entra em FADE (nunca aparece seca)', async () => {
    // Mesmo ambiente da página: `<MotionConfig reducedMotion="user">` com a
    // preferência LIGADA no sistema (`"always"` força o mesmo caminho no teste).
    const { container, unmount } = render(
      <MotionConfig reducedMotion="always">
        <NovoDesligamentoDialog open onClose={() => {}} />
      </MotionConfig>
    );

    const caixa = container.querySelector<HTMLElement>('div[style*="transform-origin"]')!;
    expect(caixa).not.toBeNull();

    const opacidades: number[] = [opacidade(caixa)];
    for (let i = 0; i < 6; i += 1) {
      await esperar(60);
      opacidades.push(opacidade(caixa));
    }

    // A caixa passa por opacidades intermediárias: entrou em fade.
    expect(Math.min(...opacidades)).toBeLessThan(0.9);
    // …sem escala/deslocamento (a preferência de acessibilidade é respeitada).
    expect(escalaY(caixa)).toBe(1);

    // E a abertura TERMINA visível.
    await esperar(1000);
    expect(opacidade(caixa)).toBe(1);

    unmount();
  }, 20_000);
});
