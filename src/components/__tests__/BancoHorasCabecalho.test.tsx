import { useState, type ElementType, type ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Mock parcial e mínimo da Motion — o mesmo de `BancoHorasCards.test.tsx` /
 * `BancoHorasExtrato.test.tsx`, com `header` a mais porque o cabeçalho é um
 * `motion.header`. `useReducedMotion → true` deixa os blocos no estado final
 * (nada de esperar a cascata) e as props exclusivas da Motion são filtradas
 * antes de chegarem ao DOM.
 */
type MotionMockProps = { children?: ReactNode } & Record<string, unknown>;

const { semPropsMotion } = vi.hoisted(() => {
  const PROPS_MOTION = new Set([
    'custom',
    'variants',
    'initial',
    'animate',
    'exit',
    'transition',
    'layout',
    'layoutId',
    'whileHover',
    'whileTap',
    'whileFocus',
    'onAnimationComplete',
    'onAnimationStart',
  ]);
  return {
    semPropsMotion: (props: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(props).filter(([chave]) => !PROPS_MOTION.has(chave))),
  };
});

vi.mock('framer-motion', async () => {
  const criar = (tag: string) =>
    function MotionMock({ children, ...rest }: MotionMockProps) {
      // `ElementType` no lugar de `keyof JSX.IntrinsicElements`: o namespace global
      // `JSX` não existe no tsconfig de testes (React 19), e o mock precisa
      // aceitar qualquer tag que a Motion use.
      const Tag = tag as ElementType;
      return <Tag {...semPropsMotion(rest)}>{children}</Tag>;
    };
  return {
    motion: {
      div: criar('div'),
      span: criar('span'),
      header: criar('header'),
      li: criar('li'),
      ul: criar('ul'),
      p: criar('p'),
      create: (Componente: ElementType) =>
        function MotionMock({ children, ...rest }: MotionMockProps) {
          return <Componente {...semPropsMotion(rest)}>{children}</Componente>;
        },
    },
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
    useInView: () => true,
  };
});

import { CabecalhoBancoHoras } from '../banco-horas/CabecalhoBancoHoras';
import {
  FILTROS_EXTRATO_PADRAO,
  PERIODO_EXTRATO_PADRAO,
  somarDias,
  type FiltrosExtrato,
  type PeriodoExtrato,
} from '../banco-horas/bancoHorasComum';
import { todayLocalISO } from '@/utils/dateLocal';

/**
 * O Radix Select (dropdown de período) depende de APIs de ponteiro que o jsdom
 * não implementa. Sem estes stubs o clique no gatilho estoura antes de abrir o
 * menu — o componente em si está correto, quem falta é o navegador.
 */
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

/**
 * ============================================================================
 * Barra de ações do Banco de Horas.
 *
 * Cobre os três ajustes de UI/UX: (1) "Exportar" em lime (único preenchido,
 * hover com brilho + halo, pressão com escala, foco acessível); (2) período no
 * `Select` padronizado do DS (calendário · texto · chevron, menu com os
 * atalhos, opção marcada, "Personalizado" preservando as datas); (3) "Mais
 * filtros" escuro no repouso com halo lime SÓ no hover e estado padronizado de
 * filtro ativo. A lógica de filtragem continua sendo a da página — os testes
 * conferem o `periodo`/`filtros` que o cabeçalho devolve, não uma cópia.
 * ============================================================================
 */
function Harness({
  periodoInicial = PERIODO_EXTRATO_PADRAO,
  filtrosIniciais = FILTROS_EXTRATO_PADRAO,
  onExportar = () => {},
}: {
  periodoInicial?: PeriodoExtrato;
  filtrosIniciais?: FiltrosExtrato;
  onExportar?: () => void;
}) {
  const [periodo, setPeriodo] = useState<PeriodoExtrato>(periodoInicial);
  const [filtros, setFiltros] = useState<FiltrosExtrato>(filtrosIniciais);

  return (
    <>
      <CabecalhoBancoHoras
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        filtros={filtros}
        onFiltrosChange={setFiltros}
        onLimparFiltros={() => {
          setPeriodo(PERIODO_EXTRATO_PADRAO);
          setFiltros(FILTROS_EXTRATO_PADRAO);
        }}
        onExportar={onExportar}
      />
      <p data-testid="periodo-atual">{JSON.stringify(periodo)}</p>
    </>
  );
}

const gatilhoPeriodo = () => screen.getByRole('combobox');
const botaoMaisFiltros = () => screen.getByRole('button', { name: /mais filtros/i });
const botaoExportar = () => screen.getByRole('button', { name: /exportar/i });

describe('cabeçalho de Banco de Horas — Exportar em lime', () => {
  it('é a única ação preenchida: lime, texto escuro e ícone herdando a cor', () => {
    render(<Harness />);
    const botao = botaoExportar();

    // Dupla oficial `--primary` / `--primary-foreground` (texto quase-preto).
    expect(botao).toHaveClass('bg-primary', 'text-primary-foreground', 'border-primary');
    expect(botao).toHaveClass('font-semibold');
    // O ícone não declara cor própria: herda o `currentColor` escuro do botão.
    const icone = botao.querySelector('svg');
    expect(icone).not.toBeNull();
    expect(icone?.getAttribute('class') ?? '').not.toMatch(/text-(primary-foreground|muted)/);
  });

  it('hover realça o lime (token oficial) e acende o halo discreto; pressão reduz 2%', () => {
    render(<Harness />);
    const botao = botaoExportar();

    expect(botao).toHaveClass('hover:bg-primary-glow', 'hover:border-primary-glow');
    expect(botao).toHaveClass('hover:shadow-glow');
    expect(botao).toHaveClass('active:scale-[0.98]');
    // Transição na faixa pedida (200–250 ms) e foco visível na cor do texto.
    expect(botao).toHaveClass('duration-fast');
    expect(botao).toHaveClass('focus-visible:ring-primary-foreground');
    // Nada de animação contínua: nenhum `animate-*`.
    expect(botao.className).not.toMatch(/\banimate-/);
  });

  it('continua chamando a exportação da página', async () => {
    const onExportar = vi.fn();
    render(<Harness onExportar={onExportar} />);
    await userEvent.click(botaoExportar());
    expect(onExportar).toHaveBeenCalledTimes(1);
  });
});

describe('cabeçalho de Banco de Horas — período no Select padronizado', () => {
  it('nasce em "Todo o período" com o calendário à esquerda', () => {
    render(<Harness />);
    const gatilho = gatilhoPeriodo();

    expect(gatilho).toHaveTextContent('Todo o período');
    expect(gatilho.querySelector('svg')).not.toBeNull();
    // Geometria dos três controles da faixa (alinhamento vertical).
    expect(gatilho).toHaveClass('h-[34px]', 'rounded-[10px]', 'text-[12px]');
  });

  it('abre o menu com os atalhos e aplica o período escolhido', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(gatilhoPeriodo());

    for (const rotulo of [
      'Todo o período',
      'Últimos 7 dias',
      'Últimos 30 dias',
      'Últimos 90 dias',
      'Últimos 12 meses',
      'Personalizado',
    ]) {
      expect(screen.getByRole('option', { name: rotulo })).toBeInTheDocument();
    }

    await user.click(screen.getByRole('option', { name: 'Últimos 30 dias' }));

    const hoje = todayLocalISO();
    expect(JSON.parse(screen.getByTestId('periodo-atual').textContent ?? '{}')).toEqual({
      de: somarDias(hoje, -29),
      ate: hoje,
    });
    // O gatilho passa a refletir o atalho escolhido.
    expect(gatilhoPeriodo()).toHaveTextContent('Últimos 30 dias');
  });

  it('volta para "Todo o período" ao escolher o atalho aberto', async () => {
    const user = userEvent.setup();
    render(<Harness periodoInicial={{ de: '2026-09-01', ate: '2026-10-31' }} />);

    await user.click(gatilhoPeriodo());
    await user.click(screen.getByRole('option', { name: 'Todo o período' }));

    expect(JSON.parse(screen.getByTestId('periodo-atual').textContent ?? '{}')).toEqual({
      de: '',
      ate: '',
    });
  });

  it('mostra as próprias datas quando o recorte é livre (nunca mente sobre o período)', () => {
    render(<Harness periodoInicial={{ de: '2026-09-01', ate: '2026-10-31' }} />);
    expect(gatilhoPeriodo()).toHaveTextContent('01/09/2026 – 31/10/2026');
  });

  it('"Personalizado" abre o painel de datas sem descartar o recorte atual', async () => {
    const user = userEvent.setup();
    render(<Harness periodoInicial={{ de: '2026-09-01', ate: '2026-10-31' }} />);

    await user.click(gatilhoPeriodo());
    await user.click(screen.getByRole('option', { name: 'Personalizado' }));

    // Os dois campos de data continuam disponíveis (mesmo `DatePicker` do DS).
    expect(await screen.findByLabelText('Data inicial do recorte')).toBeInTheDocument();
    expect(screen.getByLabelText('Data final do recorte')).toBeInTheDocument();
    // Abrir o painel não mexe no recorte.
    expect(JSON.parse(screen.getByTestId('periodo-atual').textContent ?? '{}')).toEqual({
      de: '2026-09-01',
      ate: '2026-10-31',
    });
  });
});

describe('cabeçalho de Banco de Horas — "Mais filtros" com halo no hover', () => {
  it('fica escuro no repouso (sem lime e sem halo)', () => {
    render(<Harness />);
    const botao = botaoMaisFiltros();

    expect(botao).toHaveAttribute('data-filtros-ativos', 'false');
    expect(botao).not.toHaveClass('bg-primary/10');
    expect(botao).not.toHaveClass('text-primary');
    // Mesma altura/raio dos vizinhos.
    expect(botao).toHaveClass('h-[34px]', 'rounded-[10px]');
  });

  it('acende borda lime + halo só no hover, com transição de 220 ms', () => {
    render(<Harness />);
    const botao = botaoMaisFiltros();

    expect(botao).toHaveClass('hover:border-primary/40', 'hover:bg-primary/5');
    expect(botao).toHaveClass('hover:shadow-glow');
    expect(botao).toHaveClass('duration-fast');
    expect(botao.className).not.toMatch(/\banimate-/);
  });

  it('usa o estado padronizado de filtro ativo quando há recorte aplicado', () => {
    render(<Harness filtrosIniciais={{ busca: '', tipo: 'negativos' }} />);
    const botao = botaoMaisFiltros();

    expect(botao).toHaveAttribute('data-filtros-ativos', 'true');
    // Receita do `FilterChip` compacto: borda 50%, tinta 10%, texto lime.
    expect(botao).toHaveClass('border-primary/50', 'bg-primary/10', 'text-primary');
  });

  it('continua abrindo o painel de filtros avançados com as datas', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(botaoMaisFiltros());

    expect(await screen.findByText('Filtros avançados')).toBeInTheDocument();
    expect(screen.getByLabelText('Data inicial do recorte')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });
});
