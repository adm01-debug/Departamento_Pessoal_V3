import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';

/**
 * ============================================================================
 * AUDITORIA (Hub de Premiações) — PARIDADE DE ENTRADA COM AS REFERÊNCIAS.
 *
 * Prova, no DOM renderizado, que:
 *   1. o painel de filtros usa EXATAMENTE o variant dos KPI Cards do Dashboard
 *      Executivo (`cardVariants` de `dashboard/MetricCard.tsx`);
 *   2. cada cabeçalho de dia e cada evento entram em sequência com a linguagem
 *      da lista de Campanhas (fade + 10px), na régua própria da Auditoria
 *      (`auditoriaEntrada.ts`: 0,55s · passo 0,11s · easeOutCubic);
 *   3. o índice do stagger é CONTÍNUO entre os grupos de data (não reinicia a
 *      cada dia);
 *   4. filtrar NÃO remonta o painel de filtros nem o contêiner da lista — só a
 *      lista de eventos, igual à `chaveCascata` da tabela de Campanhas.
 *
 * O mock da Motion expõe `custom`/`initial`/`animate`/`hidden` e o resultado de
 * `variants.visible(custom)` em data-attributes (mesma técnica de
 * `DesempenhoEntradaCascade.test.tsx`), permitindo comparar delay, duração e
 * easing REAIS — não apenas "parecido".
 * ============================================================================
 */
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  const cache = new Map<unknown, unknown>();

  const capturar = (Tag: unknown) => {
    if (cache.has(Tag)) return cache.get(Tag);
    const Componente = ({ children, custom, variants, initial, animate, ...rest }: any) => {
      const Props = Tag as any;
      return (
        <Props
          {...rest}
          data-custom={String(custom)}
          data-initial={initial}
          data-animate={animate}
          data-hidden={JSON.stringify(variants?.hidden)}
          data-visible={JSON.stringify(variants?.visible?.(custom))}
        >
          {children}
        </Props>
      );
    };
    cache.set(Tag, Componente);
    return Componente;
  };

  const motion = new Proxy(
    {},
    {
      get: (_alvo, tag) => (tag === 'create' ? (Componente: unknown) => capturar(Componente) : capturar(tag)),
    }
  );

  return {
    ...actual,
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

import { AuditoriaTab } from '../premiacoes/AuditoriaTab';
import { cardVariants } from '@/components/dashboard/MetricCard';
import {
  AUDITORIA_ENTRADA_ATRASO,
  AUDITORIA_ENTRADA_DURACAO,
  AUDITORIA_ENTRADA_MAX_PASSO,
  AUDITORIA_ENTRADA_PASSO,
  AUDITORIA_EASE_OUT_CUBIC,
  linhaAuditoriaVariants,
} from '../premiacoes/auditoriaEntrada';
import type { AuditoriaHub, CampanhaHub, PagamentoHub } from '../premiacoes/premiacoesComum';

const CAMPANHA: CampanhaHub = {
  id: 'camp-1',
  nome: 'Campanha de Vendas Q3 2026',
  data_inicio: '2026-07-01',
  data_fim: '2026-09-30',
  status: 'ativo',
  orcamento_estimado: 85000,
};
const PAGAMENTO: PagamentoHub = {
  id: 'pag-1',
  campanha_id: 'camp-1',
  valor_aprovado: 1250,
  status: 'aprovado_financeiro',
  status_conciliacao: 'divergente',
  colaborador: { nome_completo: 'Pedro Henrique Barbosa' },
  campanha: { nome: 'Campanha de Vendas Q3 2026' },
  historico_mudancas: [{ user: 'RH / Admin' }],
};

/** Dois grupos: HOJE (2 eventos) e há 3 dias (2 eventos). */
const AGORA = Date.now();
const DIA = 24 * 60 * 60 * 1000;
const AUDITORIA: AuditoriaHub[] = [
  {
    id: 'a-1',
    entidade_tipo: 'pagamento',
    entidade_id: 'pag-1',
    acao: 'alteracao',
    motivo: 'Divergência de R$ 70,00 identificada na conciliação (IRRF).',
    created_at: new Date(AGORA - 60_000).toISOString(),
  },
  {
    id: 'a-2',
    entidade_tipo: 'campanha',
    entidade_id: 'camp-1',
    acao: 'criacao',
    motivo: 'Campanha criada com orçamento de R$ 85.000,00.',
    created_at: new Date(AGORA - 120_000).toISOString(),
  },
  {
    id: 'a-3',
    entidade_tipo: 'campanha',
    entidade_id: 'camp-1',
    acao: 'alteracao',
    motivo: 'Orçamento revisado.',
    created_at: new Date(AGORA - 3 * DIA).toISOString(),
  },
  {
    id: 'a-4',
    entidade_tipo: 'campanha',
    entidade_id: 'camp-1',
    acao: 'criacao',
    motivo: 'Campanha duplicada para o próximo trimestre.',
    created_at: new Date(AGORA - 3 * DIA - 60_000).toISOString(),
  },
];

function renderTab(over: Partial<ComponentProps<typeof AuditoriaTab>> = {}) {
  return render(
    <AuditoriaTab
      auditoria={AUDITORIA}
      pagamentos={[PAGAMENTO]}
      campanhas={[CAMPANHA]}
      onExportar={vi.fn()}
      {...over}
    />
  );
}

const eventoRows = () => [...document.querySelectorAll<HTMLElement>('[data-testid="auditoria-evento"]')];

const porTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
const entradaDe = (el: Element | null) => el?.closest<HTMLElement>('[data-custom]') ?? null;

describe('Auditoria — entrada padrão do sistema', () => {
  it('os 10 controles dos filtros entram em cascata com o variant dos KPI Cards', () => {
    renderTab();

    const unidades = [
      entradaDe(screen.getByLabelText(/Buscar evento, campanha, colaborador ou valor/i)),
      screen.getByLabelText('Tipo de evento'),
      screen.getByLabelText('Entidade'),
      screen.getByLabelText('Usuário'),
      screen.getByLabelText('Período'),
      // As seis badges contam como UMA unidade (grupo), não seis atrasos.
      entradaDe(screen.getByRole('button', { name: /Todas\s*\d+/ })),
      entradaDe(screen.getByLabelText('Ordenar por')),
      screen.getByRole('button', { name: /Limpar filtros/ }),
      screen.getByRole('button', { name: 'CSV' }),
      screen.getByRole('button', { name: 'PDF' }),
    ].map((el) => el as HTMLElement);

    unidades.forEach((el, i) => {
      expect(el.getAttribute('data-custom')).toBe(String(i));
      expect(el.getAttribute('data-initial')).toBe('hidden');
      expect(el.getAttribute('data-animate')).toBe('visible');
      expect(el.getAttribute('data-hidden')).toBe(JSON.stringify(cardVariants.hidden));
      const visivel = JSON.parse(el.getAttribute('data-visible') ?? '{}');
      expect(visivel).toEqual((cardVariants.visible as (n: number) => unknown)(i));
      // Mesmo movimento/easing do Dashboard; intervalo de 0,08s por controle.
      expect(visivel.transition).toEqual({
        delay: i * 0.08,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      });
    });

    // A ordem no DOM é exatamente a ordem visual pedida (busca → … → PDF).
    const noPainel = [
      ...screen.getByLabelText('Filtros da auditoria').querySelectorAll<HTMLElement>('[data-custom]'),
    ].map((el) => Number(el.getAttribute('data-custom')));
    expect(noPainel).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('cabeçalho e eventos entram em sequência (0,55s · 0,11s · easeOutCubic), sem movimento duplicado', () => {
    renderTab();

    const timeline = porTestId('auditoria-timeline');
    // O contêiner é ESTÁTICO — nada recebe duas animações de entrada.
    expect(timeline.getAttribute('data-custom')).toBeNull();

    const unidades = [...timeline.querySelectorAll<HTMLElement>('[data-cascata-indice]')];
    expect(unidades.map((u) => u.getAttribute('data-testid'))).toEqual([
      'auditoria-grupo-cabecalho',
      'auditoria-evento',
      'auditoria-evento',
      'auditoria-grupo-cabecalho',
      'auditoria-evento',
      'auditoria-evento',
    ]);
    expect(unidades.map((u) => Number(u.getAttribute('data-cascata-indice')))).toEqual([0, 1, 2, 3, 4, 5]);

    unidades.forEach((el, i) => {
      expect(el.getAttribute('data-initial')).toBe('hidden');
      expect(el.getAttribute('data-animate')).toBe('visible');
      // Movimento da timeline: fade + 10px verticais (sem escala horizontal,
      // para o trilho permanecer alinhado durante a cascata).
      expect(el.getAttribute('data-hidden')).toBe(JSON.stringify({ opacity: 0, y: 10 }));
      const visivel = JSON.parse(el.getAttribute('data-visible') ?? '{}');
      expect(visivel).toEqual((linhaAuditoriaVariants.visible as (n: number) => unknown)(i));
      expect(visivel.transition).toEqual({
        duration: AUDITORIA_ENTRADA_DURACAO,
        delay: AUDITORIA_ENTRADA_ATRASO + i * AUDITORIA_ENTRADA_PASSO,
        ease: AUDITORIA_EASE_OUT_CUBIC,
      });
    });

    expect(AUDITORIA_ENTRADA_DURACAO).toBe(0.55);
    expect(AUDITORIA_ENTRADA_PASSO).toBe(0.11);
    // Atraso total limitado: do 9º passo em diante o delay não cresce.
    const excedente = (linhaAuditoriaVariants.visible as (n: number) => { transition: { delay: number } })(999);
    expect(excedente.transition.delay).toBe(
      AUDITORIA_ENTRADA_ATRASO + AUDITORIA_ENTRADA_MAX_PASSO * AUDITORIA_ENTRADA_PASSO
    );
  });

  it('filtrar não reinicia a cascata dos controles nem a entrada dos cabeçalhos', () => {
    renderTab();

    const painelAntes = screen.getByLabelText('Filtros da auditoria');
    const listaAntes = porTestId('auditoria-timeline');
    const rowsAntes = eventoRows();
    const cabecalhoAntes = listaAntes.querySelector('[data-testid="auditoria-grupo-cabecalho"]');

    fireEvent.change(screen.getByLabelText(/Buscar evento, campanha, colaborador ou valor/i), {
      target: { value: 'IRRF' },
    });

    // Mesmos NÓS: nenhuma nova animação de entrada nos controles/cabeçalhos.
    expect(screen.getByLabelText('Filtros da auditoria')).toBe(painelAntes);
    expect(porTestId('auditoria-timeline')).toBe(listaAntes);
    expect(listaAntes.querySelector('[data-testid="auditoria-grupo-cabecalho"]')).toBe(cabecalhoAntes);
    // A lista de eventos troca de identidade (mesma `chaveCascata` de Campanhas).
    expect(eventoRows()).not.toBe(rowsAntes);
  });
});
