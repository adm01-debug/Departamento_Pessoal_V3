import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Prova das derivações da aba "Metas & OKRs" e da cascata de entrada do grid.
 *
 * O mock da Motion expõe `custom`/`initial`/`animate`/`hidden` em data-attributes
 * (mesma técnica de `DesempenhoEntradaCascade.test.tsx`), o que permite conferir
 * a ORDEM de entrada contra o `cardVariants` do Dashboard Executivo.
 */
vi.mock('framer-motion', () => {
  const capturar =
    (Tag: any) =>
    ({ children, custom, variants, initial, animate, ...rest }: any) => (
      <Tag
        data-testid="entrada-card"
        data-custom={String(custom)}
        data-initial={initial}
        data-animate={animate}
        data-hidden={JSON.stringify(variants?.hidden)}
        {...rest}
      >
        {children}
      </Tag>
    );
  return {
    motion: {
      div: capturar('div'),
      span: capturar('span'),
      create:
        (Component: any) =>
        ({ children, custom, variants, initial, animate, ...rest }: any) => (
          <div
            data-testid="entrada-card"
            data-custom={String(custom)}
            data-initial={initial}
            data-animate={animate}
            data-hidden={JSON.stringify(variants?.hidden)}
          >
            <Component {...rest}>{children}</Component>
          </div>
        ),
    },
    AnimatePresence: ({ children }: any) => children,
    useReducedMotion: () => false,
    useInView: () => true,
  };
});

import { MetasOKRsTab } from '../avaliacao/MetasOKRsTab';
import { MetaCard } from '../avaliacao/MetaCard';
import { IndicadorEvolucao } from '../avaliacao/IndicadorEvolucao';
import { cardVariants } from '@/components/dashboard/MetricCard';
import {
  contarPorSituacao,
  derivarMeta,
  descricaoPrazo,
  diasAte,
  ordenarMetas,
  situacaoMeta,
} from '../avaliacao/metasComum';

const DIA = 86_400_000;
const AGORA = new Date('2026-10-13T12:00:00').getTime();

/** Data local (YYYY-MM-DD) deslocada N dias de `AGORA` — sem UTC no meio. */
function prazoLocal(dias: number): string {
  const d = new Date(AGORA + dias * DIA);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Meta base: criada 60 dias antes de `AGORA` (o ritmo já dá leitura). */
function metaBase(extra: Record<string, unknown> = {}) {
  return {
    id: 'm',
    titulo: 'Meta',
    tipo: 'individual',
    status: 'ativo',
    valor_objetivo: 100,
    valor_atual: 50,
    created_at: new Date(AGORA - 60 * DIA).toISOString(),
    data_limite: prazoLocal(20),
    ...extra,
  };
}

describe('metasComum — situação derivada (nunca uma coluna do banco)', () => {
  it('status encerrado → concluída', () => {
    expect(situacaoMeta(metaBase({ status: 'concluido' }), AGORA)).toBe('concluida');
    expect(situacaoMeta(metaBase({ status: 'Concluída' }), AGORA)).toBe('concluida');
  });

  it('prazo vencido e não concluída → atrasada (mesma regra do módulo)', () => {
    expect(situacaoMeta(metaBase({ data_limite: prazoLocal(-6) }), AGORA)).toBe('atrasada');
  });

  it('progresso abaixo do ritmo decorrido → em risco', () => {
    // 60 de 80 dias decorridos (75%) com apenas 40% de progresso.
    expect(situacaoMeta(metaBase({ valor_atual: 40 }), AGORA)).toBe('risco');
  });

  it('progresso acima do ritmo decorrido → em dia', () => {
    expect(situacaoMeta(metaBase({ valor_atual: 90 }), AGORA)).toBe('emdia');
  });

  it('status sem andamento → em risco', () => {
    expect(situacaoMeta(metaBase({ status: 'pausado', valor_atual: 99 }), AGORA)).toBe('risco');
  });

  it('sem prazo não afirma atraso nem risco', () => {
    expect(situacaoMeta(metaBase({ data_limite: null, valor_atual: 1 }), AGORA)).toBe('emdia');
  });
});

describe('metasComum — prazo e agregações', () => {
  it('conta dias de calendário (0 = hoje, negativo = atraso)', () => {
    expect(diasAte(metaBase({ data_limite: prazoLocal(0) }), AGORA)).toBe(0);
    expect(diasAte(metaBase({ data_limite: prazoLocal(4) }), AGORA)).toBe(4);
    expect(diasAte(metaBase({ data_limite: prazoLocal(-6) }), AGORA)).toBe(-6);
  });

  it('descreve o prazo com a leitura contextual da referência', () => {
    expect(descricaoPrazo(derivarMeta(metaBase({ data_limite: prazoLocal(-6) }), AGORA))).toBe('Atrasada há 6 dias');
    expect(descricaoPrazo(derivarMeta(metaBase({ data_limite: prazoLocal(4) }), AGORA))).toBe('4 dias restantes');
    expect(descricaoPrazo(derivarMeta(metaBase({ status: 'concluido' }), AGORA))).toBe('Concluída');
  });

  it('não inventa evolução sem histórico nem departamento sem a relação', () => {
    const semHistorico = derivarMeta(metaBase(), AGORA);
    expect(semHistorico.evolucao).toBeNull();
    expect(semHistorico.departamento).toBeNull();

    const comHistorico = derivarMeta(metaBase({ progresso_anterior: 38 }), AGORA);
    expect(comHistorico.evolucao).toBe(12);
  });

  it('conta cada situação uma única vez', () => {
    const itens = [
      derivarMeta(metaBase({ id: 'a', data_limite: prazoLocal(-2) }), AGORA),
      derivarMeta(metaBase({ id: 'b', valor_atual: 90 }), AGORA),
      derivarMeta(metaBase({ id: 'c', status: 'concluido' }), AGORA),
    ];
    expect(contarPorSituacao(itens)).toEqual({ todas: 3, emdia: 1, risco: 0, atrasada: 1, concluida: 1 });
  });

  it('ordena "mais críticos" com as atrasadas primeiro', () => {
    const atrasada = derivarMeta(metaBase({ id: 'a', data_limite: prazoLocal(-2) }), AGORA);
    const risco = derivarMeta(metaBase({ id: 'r', valor_atual: 10 }), AGORA);
    const dia = derivarMeta(metaBase({ id: 'd', valor_atual: 99 }), AGORA);
    expect(ordenarMetas([dia, atrasada, risco], 'criticos').map((i) => i.meta.id)).toEqual(['a', 'r', 'd']);
  });
});

describe('MetasOKRsTab — cascata de entrada na ordem de leitura', () => {
  const REF_HIDDEN = JSON.stringify(cardVariants.hidden);

  it('banner (0) → filtros (1) → cards (2, 3, 4), com o keyframe do Dashboard', () => {
    const metas = [
      metaBase({ id: 'm1', titulo: 'Atrasada', data_limite: prazoLocal(-6), valor_atual: 40 }),
      metaBase({ id: 'm2', titulo: 'Em dia', valor_atual: 95 }),
      metaBase({ id: 'm3', titulo: 'Concluída', status: 'concluido', valor_atual: 100 }),
    ];

    render(<MetasOKRsTab metas={metas} />);

    const blocos = screen.getAllByTestId('entrada-card');
    expect(blocos.map((e) => e.getAttribute('data-custom'))).toEqual(['0', '1', '2', '3', '4']);
    blocos.forEach((el) => {
      expect(el.getAttribute('data-initial')).toBe('hidden');
      expect(el.getAttribute('data-animate')).toBe('visible');
      expect(el.getAttribute('data-hidden')).toBe(REF_HIDDEN);
    });

    // Conteúdo real na tela (nada de placeholder).
    expect(screen.getByText('1 meta precisa de atenção')).toBeInTheDocument();
    expect(screen.getAllByText('Atrasada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Concluída').length).toBeGreaterThan(0);
    expect(screen.getByText('1-3')).toBeInTheDocument();
  });
});

describe('metasComum — evolução em PONTOS PERCENTUAIS (nunca variação relativa)', () => {
  it('diferença entre o progresso atual e a medição anterior', () => {
    expect(derivarMeta(metaBase({ valor_atual: 63, progresso_anterior: 51 }), AGORA).evolucao).toBe(12);
    expect(derivarMeta(metaBase({ valor_atual: 40, progresso_anterior: 51 }), AGORA).evolucao).toBe(-11);
    expect(derivarMeta(metaBase({ valor_atual: 50, progresso_anterior: 50 }), AGORA).evolucao).toBe(0);
  });

  it('51% → 63% é +12 pontos percentuais (a variação relativa seria ~+23,5%)', () => {
    expect(derivarMeta(metaBase({ valor_atual: 63, progresso_anterior: 51 }), AGORA).evolucao).toBe(12);
  });

  it('travou a variação em −100…100 e ignora histórico inválido', () => {
    expect(derivarMeta(metaBase({ valor_atual: 100, progresso_anterior: 0 }), AGORA).evolucao).toBe(100);
    expect(derivarMeta(metaBase({ valor_atual: 0, progresso_anterior: 100 }), AGORA).evolucao).toBe(-100);
    expect(derivarMeta(metaBase({ progresso_anterior: 'abc' }), AGORA).evolucao).toBeNull();
  });
});

describe('IndicadorEvolucao — os três estados da referência', () => {
  it('positiva: TrendingUp com ícone e percentual em verde-success', () => {
    const { container } = render(<IndicadorEvolucao variacao={12} />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByText('desde a última atualização')).toBeInTheDocument();
    const svg = container.querySelector('svg')!;
    expect(svg.classList.contains('lucide-trending-up')).toBe(true);
    expect(svg.classList.contains('text-success')).toBe(true);
    expect(container.querySelector('span.text-success')?.textContent).toBe('+12%');
  });

  it('negativa: TrendingDown com ícone e percentual em vermelho', () => {
    const { container } = render(<IndicadorEvolucao variacao={-8} />);
    expect(screen.getByText('-8%')).toBeInTheDocument();
    const svg = container.querySelector('svg')!;
    expect(svg.classList.contains('lucide-trending-down')).toBe(true);
    expect(svg.classList.contains('text-destructive-vivid')).toBe(true);
  });

  it('neutra: ícone neutro e percentual sem sinal (sem alteração)', () => {
    const { container } = render(<IndicadorEvolucao variacao={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    const svg = container.querySelector('svg')!;
    expect(svg.classList.contains('lucide-minus')).toBe(true);
    expect(svg.classList.contains('text-muted-foreground')).toBe(true);
  });

  it('vive direto sobre o card: sem background, badge, borda ou container quadrado', () => {
    const { container } = render(<IndicadorEvolucao variacao={5} />);
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.tagName).toBe('P');
    expect(raiz.className).not.toMatch(/\bbg-|\bborder\b|\brounded\b/);
  });
});

describe('MetaCard — indicador só aparece com histórico real', () => {
  it('mostra a evolução quando há progresso_anterior e some sem ele', () => {
    const comHistorico = derivarMeta(metaBase({ valor_atual: 63, progresso_anterior: 51 }), AGORA);
    const semHistorico = derivarMeta(metaBase(), AGORA);

    const { rerender } = render(<MetaCard item={comHistorico} indice={2} />);
    expect(screen.getByText('desde a última atualização')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();

    rerender(<MetaCard item={semHistorico} indice={2} />);
    expect(screen.queryByText('desde a última atualização')).not.toBeInTheDocument();
  });
});

