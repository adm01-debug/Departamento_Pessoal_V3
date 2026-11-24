import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';

/**
 * Contrato das AÇÕES DO CABEÇALHO DO CONTROLE DE PONTO
 * (`components/ponto/acoesCabecalhoPonto.ts`).
 *
 * O pedido de produto é explícito: os quatro botões de `/ponto` precisam ter a
 * MESMA linguagem de hover dos botões "Exportar"/"Sincronizar" do Dashboard
 * principal, com a hierarquia de cor separando ação principal de secundária.
 * Como o jsdom não pinta pixel nenhum, o teste trava o que É verificável:
 *
 *   • base comum (altura 36px, raio do DS, 220ms, -2px, pressão) nos quatro;
 *   • régua de glow tirada do Dashboard real (`DashboardHeader`, renderizado
 *     aqui como referência — mesma técnica de
 *     `recrutamento/__tests__/analyticsExportarAnimacao.test.tsx`);
 *   • cor por botão: ciano no Espelho, lime no AEJ, NEUTRO nas duas ações de
 *     apoio (nenhum token de marca);
 *   • gancho de `prefers-reduced-motion` (`ponto-acao-cabecalho` + a regra em
 *     `src/index.css`) — e a garantia de que o repouso não anima sem parar.
 *
 * O que o jsdom não vê (halo renderizado, -2px medido, alinhamento da faixa)
 * foi conferido no navegador real; as classes abaixo são a fonte de verdade.
 */

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder ?? 'AFDT'}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001', nome: 'Empresa Teste' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any) => String(e)),
}));

import { ImportarAFDTDialog } from '../ponto/ImportarAFDTDialog';
import { GerarAEJDialog } from '../ponto/GerarAEJDialog';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ACOES_CABECALHO_PONTO } from '../ponto/acoesCabecalhoPonto';

const classes = (valor: string | null | undefined) => (valor ?? '').split(/\s+/).filter(Boolean);

/** BASE que os QUATRO botões do cabeçalho precisam ter. */
const BASE_COMUM = [
  'h-9', // 36px — a altura atual, preservada
  'rounded-lg', // raio do Design System
  'gap-1.5', // 6px entre ícone e texto
  'text-[11px]',
  'font-body',
  'bg-background', // superfície escura preservada
  'border',
  'shadow-xs', // degrau de onde o halo parte
  'transition-all',
  'duration-fast', // 220ms (faixa pedida: 200–250ms)
  'hover:-translate-y-0.5', // -2px, o máximo permitido
  'active:translate-y-0',
  'active:scale-[0.98]',
  'focus-visible:ring-2',
  'focus-visible:ring-ring',
  'ponto-acao-cabecalho', // gancho do prefers-reduced-motion
];

const TONS = Object.entries(ACOES_CABECALHO_PONTO);

function renderizarBotoesDoPonto() {
  // Os dois triggers que vivem em componentes próprios (os outros dois são da
  // `PontoPage`; lá a garantia vem do teste de fonte, abaixo).
  const importar = render(<ImportarAFDTDialog />).container.querySelector('button')!;
  const aej = render(<GerarAEJDialog />).container.querySelector('button')!;
  return { importar, aej };
}

function renderizarReferenciaDoDashboard() {
  const { container } = render(
    <DashboardHeader greeting="Boa tarde" userName="Abner" isLoading={false} onRefresh={() => {}} />
  );
  const botoes = Array.from(container.querySelectorAll('button'));
  const exportar = botoes.find((b) => b.textContent?.includes('Exportar'))!;
  const sincronizar = botoes.find((b) => b.textContent?.includes('Sincronizar'))!;
  return { exportar, sincronizar };
}

describe('Cabeçalho do Controle de Ponto — linguagem de ação única', () => {
  it('os quatro botões têm a MESMA base (altura, raio, respiro, 220ms, -2px, pressão)', () => {
    const { importar, aej } = renderizarBotoesDoPonto();

    // Todo `ACOES_CABECALHO_PONTO` carrega a base…
    for (const [, classe] of TONS) {
      for (const item of BASE_COMUM) {
        expect(classes(classe)).toContain(item);
      }
    }

    // …e os dois triggers reais (que passam pelo `Button`) também, o que prova
    // que o `cn()` do `Button` não derrubou nada da base.
    for (const botao of [importar, aej]) {
      for (const item of BASE_COMUM) {
        expect(classes(botao.className)).toContain(item);
      }
    }

    // Nenhum deles anima por escala no hover (só a pressão do clique).
    for (const [, classe] of TONS) {
      expect(classes(classe).some((c) => c.startsWith('hover:scale'))).toBe(false);
      expect(classes(classe).some((c) => c.startsWith('hover:translate-y') && c !== 'hover:-translate-y-0.5')).toBe(
        false
      );
    }
  });

  it('"Gerar AEJ" usa a MESMA régua de glow do "Exportar" do Dashboard', () => {
    const { aej } = renderizarBotoesDoPonto();
    const { exportar, sincronizar } = renderizarReferenciaDoDashboard();

    // Referência: o hover do Exportar é `shadow-glow` (0 0 20px -5px + alfa do
    // `--primary`) — o mesmo degrau que a ação principal do Ponto usa.
    expect(classes(exportar.className)).toContain('hover:shadow-glow');
    expect(classes(aej.className)).toContain('hover:shadow-glow');
    expect(classes(ACOES_CABECALHO_PONTO.gerarAej)).toContain('hover:shadow-glow');

    // O `before:` de onda do Sincronizar NÃO é reutilizado aqui: o pedido é o
    // glow difuso atrás do botão, que não muda o tamanho dele.
    expect(classes(sincronizar.className).some((c) => c.startsWith('before:'))).toBe(true);
    for (const [, classe] of TONS) {
      expect(classes(classe).some((c) => c.startsWith('before:'))).toBe(false);
    }
  });

  it('separa ação principal de secundária pela cor (ciano · lime · neutro)', () => {
    const { importar, aej } = renderizarBotoesDoPonto();

    // 1. Espelho 671 — azul-ciano (`--info`) em ícone, texto e borda sutil.
    expect(classes(ACOES_CABECALHO_PONTO.espelho671)).toEqual(
      expect.arrayContaining(['text-info', 'border-info/30', 'hover:border-info/50', 'hover:shadow-glow-info'])
    );

    // 3. Gerar AEJ — lime da marca (`--primary`) em ícone/texto, borda que
    // intensifica no hover e glow lime. O texto NÃO volta ao neutro no hover.
    expect(classes(aej.className)).toEqual(
      expect.arrayContaining(['text-primary', 'hover:text-primary', 'border-primary/30', 'hover:border-primary/60'])
    );
    expect(classes(aej.className)).not.toContain('hover:text-accent-foreground');

    // 2 e 4. Ações de apoio — SEM cor de marca, com halo neutro.
    expect(classes(importar.className)).toEqual(
      expect.arrayContaining(['text-foreground/90', 'hover:shadow-glow-neutral', 'hover:text-foreground'])
    );
    expect(classes(importar.className)).not.toContain('hover:text-accent-foreground');
    for (const neutra of [ACOES_CABECALHO_PONTO.importarAfdt, ACOES_CABECALHO_PONTO.maisAcoes]) {
      for (const corDeMarca of ['text-info', 'text-primary', 'text-success', 'text-warning', 'text-destructive']) {
        expect(classes(neutra)).not.toContain(corDeMarca);
      }
    }

    // "Mais ações" é o único com véu de fundo cheio no hover (ele abre menu).
    expect(classes(ACOES_CABECALHO_PONTO.maisAcoes)).toContain('hover:bg-accent');
    expect(classes(ACOES_CABECALHO_PONTO.importarAfdt)).toContain('hover:bg-accent/60');
  });

  it('a PontoPage consome os tokens (os dois botões que moram na página)', () => {
    const fonte = readFileSync(resolve(process.cwd(), 'src/pages/PontoPage.tsx'), 'utf8');

    expect(fonte).toContain('className={ACAO_ESPELHO_671}');
    expect(fonte).toContain('className={ACAO_MAIS_ACOES}');
    // Nenhum resquício do className manual antigo nos quatro.
    expect(fonte).not.toContain('className="h-9 rounded-lg gap-1.5 font-body text-[11px]');
  });

  it('respeita prefers-reduced-motion pelo gancho em src/index.css', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

    // A classe existe no CSS e zera translate/scale sob movimento reduzido.
    expect(css).toMatch(
      /\.ponto-acao-cabecalho:hover,\s*\n\s*\.ponto-acao-cabecalho:active\s*\{[^}]*translate:\s*none;[^}]*scale:\s*none;/s
    );

    // E o gancho está nos quatro tons (o teste da base já cobre; aqui fica o
    // lembrete de que TODO tom novo precisa dele).
    for (const [, classe] of TONS) {
      expect(classes(classe)).toContain('ponto-acao-cabecalho');
    }
  });
});
