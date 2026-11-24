import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * Contrato das AÇÕES SECUNDÁRIAS DOS CARDS DO CONTROLE DE PONTO
 * (`components/ponto/acoesCardsPonto.ts`).
 *
 * O pedido de produto é objetivo: **"Ver detalhes"** (Banco de Horas),
 * **"Ver relatório"** (Horas Trabalhadas) e **"Ver todas"** (Últimas Batidas)
 * precisam ficar no verde-lime oficial — texto E seta — preservando tipografia,
 * tamanho, peso, posição, fundo transparente, hover e funcionalidade.
 *
 * O jsdom não pinta pixel, então o teste trava o que É verificável:
 *
 *   • os três botões saem com a MESMA classe (padrão único de ação secundária);
 *   • o lime é o token do sistema (`text-primary`) e o hover é a variação clara
 *     do MESMO matiz (`--primary-glow`, conferido também nos valores do CSS);
 *   • a seta não tem cor própria — herda `currentColor`, então é o lime exato;
 *   • geometria/tipografia atuais (`h-6`, `rounded-lg`, `px-2`, `gap-1`,
 *     `font-body`, `text-[10px]`) e repouso sem fundo/borda/sombra;
 *   • o clique continua chamando o callback do card;
 *   • nenhum dos três volta a repetir a string de classes na mão.
 *
 * O que só o navegador vê (matiz renderizado, hover com variável CSS
 * computada) foi conferido em `/ponto` real.
 */

/**
 * O mock precisa de `motion.create`: `cardVariants` vem de `MetricCard`, que
 * monta `MotionCard = motion.create(Card)` no topo do módulo, e
 * `useReducedMotion` porque os cards leem a preferência por `lib/motionMode`.
 * As props exclusivas da Motion são filtradas para o React não reclamar de
 * `onAnimationComplete` como "unknown event handler" — mesmo esquema de
 * `PontoDashboardCards.test.tsx`, com o filtro em `vi.hoisted` (o `vi.mock` é
 * içado acima dos imports).
 */
const { semPropsMotion } = vi.hoisted(() => {
  const PROPS_MOTION = new Set([
    'custom',
    'variants',
    'initial',
    'animate',
    'exit',
    'transition',
    'layout',
    'whileHover',
    'whileTap',
    'onAnimationComplete',
  ]);
  return {
    semPropsMotion: (props: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(props).filter(([chave]) => !PROPS_MOTION.has(chave))),
  };
});

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...semPropsMotion(rest)}>{children}</div>,
    create: (Componente: any) =>
      function MotionMock({ children, ...rest }: any) {
        return <Componente {...semPropsMotion(rest)}>{children}</Componente>;
      },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

import { PontoBancoHorasCard } from '../ponto/PontoBancoHorasCard';
import { PontoHorasSemanaCard } from '../ponto/PontoHorasSemanaCard';
import { PontoUltimasBatidasCard } from '../ponto/PontoUltimasBatidasCard';
import { ACAO_CARD_LIME, ACOES_CARDS_PONTO } from '../ponto/acoesCardsPonto';

const classes = (valor: string | null | undefined) => (valor ?? '').split(/\s+/).filter(Boolean);

/** Batida com todas as colunas reais que o card lê (nome, data, hora, tipo). */
const BATIDA = {
  id: 'bat-1',
  colaborador_id: 'col-1',
  colaborador: { nome_completo: 'Ana Beatriz Souza' },
  data: '2026-11-05',
  hora: '08:09',
  tipo: 'entrada',
  origem: 'relogio',
  dentro_raio: true,
};

const REGISTROS = [{ data: '2026-11-03', horas_trabalhadas: '08:00', horas_extras: '01:30', horas_falta: '00:00' }];

/** Renderiza os três cards e devolve os três botões + os callbacks. */
function renderizarAcoes() {
  const verDetalhes = vi.fn();
  const verRelatorio = vi.fn();
  const verTodas = vi.fn();

  render(
    <>
      <PontoBancoHorasCard
        bancoResumo={{ saldo: '02:30', saldoMinutos: 150, tipo: 'credito' }}
        registrosSemana={REGISTROS}
        onVerDetalhes={verDetalhes}
      />
      {/* O card de Horas fica sem série: o jsdom não mede o `ResponsiveContainer`
          (0×0) e o Recharts só poluiria o log. O botão mora no cabeçalho, que
          não depende do gráfico — e o caso com dados está coberto em
          `PontoDashboardCards`/`PontoCardsMotion`. */}
      <PontoHorasSemanaCard registrosSemana={[]} onVerRelatorio={verRelatorio} />
      <PontoUltimasBatidasCard batidas={[BATIDA]} onVerTodas={verTodas} />
    </>
  );

  return {
    verDetalhes: screen.getByRole('button', { name: /Ver detalhes/i }),
    verRelatorio: screen.getByRole('button', { name: /Ver relatório/i }),
    verTodas: screen.getByRole('button', { name: /Ver todas/i }),
    callbacks: { verDetalhes, verRelatorio, verTodas },
  };
}

describe('ações secundárias dos cards de Ponto — lime nos três', () => {
  it('os três botões compartilham a MESMA classe (um padrão só)', () => {
    // A classe é uma só no módulo...
    expect(ACOES_CARDS_PONTO.verDetalhes).toBe(ACAO_CARD_LIME);
    expect(ACOES_CARDS_PONTO.verRelatorio).toBe(ACAO_CARD_LIME);
    expect(ACOES_CARDS_PONTO.verTodas).toBe(ACAO_CARD_LIME);

    // ...e é a mesma que chega na tela nos três cards.
    const { verDetalhes, verRelatorio, verTodas } = renderizarAcoes();
    const doModulo = classes(ACAO_CARD_LIME);

    // A base do `Button` soma classes próprias (foco, transição, `inline-flex`),
    // mas TODAS as classes da ação secundária precisam estar presentes nos três.
    for (const botao of [verDetalhes, verRelatorio, verTodas]) {
      expect(classes(botao.className)).toEqual(expect.arrayContaining(doModulo));
    }

    // E os três são indistinguíveis por classe: nada de pintura local em um só.
    expect(classes(verDetalhes.className).sort()).toEqual(classes(verRelatorio.className).sort());
    expect(classes(verRelatorio.className).sort()).toEqual(classes(verTodas.className).sort());
  });

  it('texto no lime oficial do sistema (--primary)', () => {
    const { verDetalhes, verRelatorio, verTodas } = renderizarAcoes();

    for (const botao of [verDetalhes, verRelatorio, verTodas]) {
      expect(classes(botao.className)).toContain('text-primary');
      // Nenhum resquício do texto neutro/herdado.
      expect(classes(botao.className)).not.toContain('text-muted-foreground');
      expect(classes(botao.className)).not.toContain('text-foreground');
    }
  });

  it('a seta herda o lime do botão (currentColor), sem cor própria', () => {
    const { verDetalhes, verRelatorio, verTodas } = renderizarAcoes();

    for (const botao of [verDetalhes, verRelatorio, verTodas]) {
      const seta = botao.querySelector('svg');
      expect(seta).not.toBeNull();
      // Propriedade herdada: o traço do ícone é o `currentColor` do botão — o
      // mesmo lime do texto, sem chance de divergir.
      expect(seta?.getAttribute('stroke')).toBe('currentColor');
      // Nenhuma utility de cor na própria seta.
      expect(classes(seta?.getAttribute('class')).some((c) => c.startsWith('text-'))).toBe(false);
      // Geometria da seta preservada (12px).
      expect(classes(seta?.getAttribute('class'))).toEqual(expect.arrayContaining(['h-3', 'w-3']));
    }
  });

  it('hover mantém a identidade lime, um degrau mais claro', () => {
    const { verDetalhes, verRelatorio, verTodas } = renderizarAcoes();

    for (const botao of [verDetalhes, verRelatorio, verTodas]) {
      const lista = classes(botao.className);
      expect(lista).toContain('hover:text-primary-glow');
      // O ghost pinta `hover:text-accent-foreground`; o `twMerge` precisa ter
      // removido — senão o texto voltaria ao neutro no hover.
      expect(lista).not.toContain('hover:text-accent-foreground');
      // Véu de hover preservado (o mesmo `--accent` que o ghost já dava).
      expect(lista).toContain('hover:bg-accent');
    }
  });

  it('repouso transparente: sem fundo, borda ou sombra', () => {
    const { verDetalhes, verRelatorio, verTodas } = renderizarAcoes();

    for (const botao of [verDetalhes, verRelatorio, verTodas]) {
      const lista = classes(botao.className);
      expect(lista).toContain('bg-transparent');
      // Só o `bg-transparent` — nenhum preenchimento.
      expect(lista.filter((c) => c.startsWith('bg-'))).toEqual(['bg-transparent']);
      expect(lista.some((c) => c.startsWith('border'))).toBe(false);
      expect(lista.some((c) => c.startsWith('shadow'))).toBe(false);
    }
  });
});

describe('ações secundárias dos cards de Ponto — contrato de código', () => {
  it('geometria, tipografia e peso preservados', () => {
    const { verDetalhes, verRelatorio, verTodas } = renderizarAcoes();

    for (const botao of [verDetalhes, verRelatorio, verTodas]) {
      // h-6 = 24px, rounded-lg = 8px, px-2 = 8px, gap-1 = 4px, 10px, font-body.
      expect(classes(botao.className)).toEqual(
        expect.arrayContaining(['h-6', 'shrink-0', 'gap-1', 'rounded-lg', 'px-2', 'font-body', 'text-[10px]'])
      );
      // O peso vem da base do `Button` — continua `font-medium`.
      expect(classes(botao.className)).toContain('font-medium');
      expect(classes(botao.className)).not.toContain('font-semibold');
    }
  });

  it('os rótulos e o clique continuam os mesmos', () => {
    const { verDetalhes, verRelatorio, verTodas, callbacks } = renderizarAcoes();

    expect(verDetalhes).toHaveTextContent('Ver detalhes');
    expect(verRelatorio).toHaveTextContent('Ver relatório');
    expect(verTodas).toHaveTextContent('Ver todas');

    fireEvent.click(verDetalhes);
    fireEvent.click(verRelatorio);
    fireEvent.click(verTodas);

    expect(callbacks.verDetalhes).toHaveBeenCalledTimes(1);
    expect(callbacks.verRelatorio).toHaveBeenCalledTimes(1);
    expect(callbacks.verTodas).toHaveBeenCalledTimes(1);
  });

  it('os três cards consomem a classe compartilhada (sem repetir a string na mão)', () => {
    const arquivos = ['PontoBancoHorasCard.tsx', 'PontoHorasSemanaCard.tsx', 'PontoUltimasBatidasCard.tsx'];
    const pinturaAntiga = 'className="h-6 shrink-0 gap-1 rounded-lg px-2 font-body text-[10px]"';

    for (const arquivo of arquivos) {
      const fonte = readFileSync(resolve(process.cwd(), 'src/components/ponto', arquivo), 'utf8');

      expect(fonte).toContain("from './acoesCardsPonto'");
      expect(fonte).toContain('className={ACAO_CARD_LIME}');
      // Nenhum dos três volta a declarar a pintura localmente.
      expect(fonte).not.toContain(pinturaAntiga);
    }
  });

  it('--primary-glow é a variação MAIS CLARA do mesmo matiz de --primary', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

    /** Todos os valores do token, na ordem em que aparecem (claro, escuro). */
    const ler = (token: string) =>
      [
        ...css.matchAll(
          new RegExp(`--${token}:\\s*(\\d+(?:\\.\\d+)?)\\s+(\\d+(?:\\.\\d+)?)%\\s+(\\d+(?:\\.\\d+)?)%`, 'g')
        ),
      ].map((achado) => achado.slice(1).map(Number) as [number, number, number]);

    const primario = ler('primary');
    const brilho = ler('primary-glow');

    // Um par por tema (claro e escuro).
    expect(primario.length).toBeGreaterThanOrEqual(2);
    expect(brilho.length).toBeGreaterThanOrEqual(2);

    for (const [indice, [matiz, saturacao, luminosidade]] of primario.entries()) {
      const [matizClaro, saturacaoClara, luminosidadeClara] = brilho[indice];
      // Mesmo matiz e mesma saturação — o hover não troca de cor...
      expect([matizClaro, saturacaoClara]).toEqual([matiz, saturacao]);
      // ...só clareia.
      expect(luminosidadeClara).toBeGreaterThan(luminosidade);
    }
  });
});
