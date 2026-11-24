import { describe, expect, it, vi } from 'vitest';
import type { JSX } from 'react';
import { render, screen } from '@testing-library/react';

/**
 * Mock parcial e mínimo da Motion — o mesmo critério de
 * `PontoDashboardCards.test.tsx`: `motion.create` é usado no topo do módulo por
 * `entrada-cards.tsx` (`MotionCard`), `useInView` é importado por `DonutChart` e
 * as props EXCLUSIVAS da Motion precisam ser filtradas antes de chegar ao DOM
 * (o React reclamaria de `onAnimationComplete` como event handler desconhecido).
 *
 * `useReducedMotion` devolve `true`: com movimento reduzido os cards nascem no
 * estado final, então o teste lê exatamente o que o RH vê depois da entrada —
 * sem esperar 1 s de coreografia.
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
    function MotionMock({ children, ...rest }: any) {
      const Tag = tag as keyof JSX.IntrinsicElements;
      return <Tag {...semPropsMotion(rest)}>{children}</Tag>;
    };
  return {
    motion: {
      div: criar('div'),
      span: criar('span'),
      li: criar('li'),
      ul: criar('ul'),
      p: criar('p'),
      circle: criar('circle'),
      path: criar('path'),
      create: (Componente: any) =>
        function MotionMock({ children, ...rest }: any) {
          return <Componente {...semPropsMotion(rest)}>{children}</Componente>;
        },
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useReducedMotion: () => true,
    useInView: () => true,
  };
});

import { AlertaSaldoNegativoCard } from '../banco-horas/AlertaSaldoNegativoCard';
import { BancoHorasKpis } from '../banco-horas/BancoHorasKpis';
import { SituacaoSaldosCard } from '../banco-horas/SituacaoSaldosCard';
import { TotaisHorasCard } from '../banco-horas/TotaisHorasCard';
import {
  compararPeriodos,
  resumirHoras,
  resumirSituacaoSaldos,
  saldosPorColaborador,
  type RegistroBancoHoras,
  type ResumoHoras,
} from '../banco-horas/bancoHorasComum';

/**
 * ============================================================================
 * Cards do dashboard de Banco de Horas.
 *
 * Os testes olham o que o RH lê: o número que veio do banco (nunca placeholder
 * de vitrine), o estado vazio honesto e a regra do alerta que some quando
 * ninguém está no vermelho. Nenhum caso depende de rede — os dados entram por
 * prop, derivados pelas MESMAS funções que a página usa.
 * ============================================================================
 */

/** Lançamento no formato do PostgREST (`interval` como texto). */
function lancamento(
  colaboradorId: string,
  nome: string,
  tipo: 'credito' | 'debito',
  horas: string,
  saldoAtual: string
): RegistroBancoHoras {
  return {
    id: `${colaboradorId}-${horas}`,
    colaborador_id: colaboradorId,
    data: '2026-03-02',
    horas,
    tipo,
    motivo: 'Compensação',
    saldo_anterior: '00:00:00',
    saldo_atual: saldoAtual,
    created_at: '2026-03-02T09:00:00.000Z',
    colaborador: { nome_completo: nome, departamento: 'Operações' },
  };
}

const REGISTROS: RegistroBancoHoras[] = [
  lancamento('c1', 'Maria Silva', 'credito', '20:00:00', '20:00:00'),
  lancamento('c2', 'João Souza', 'debito', '06:00:00', '-06:00:00'),
  lancamento('c3', 'Carla Dias', 'debito', '02:00:00', '-02:00:00'),
];

const RESUMO = resumirHoras(REGISTROS);
const SALDOS = saldosPorColaborador(REGISTROS);
const SITUACAO = resumirSituacaoSaldos(SALDOS);
/** Semana anterior vazia: os selos caem no estado honesto "sem base anterior". */
const COMPARATIVO = compararPeriodos(REGISTROS, { de: '', ate: '' });

describe('BancoHorasKpis', () => {
  it('mostra o protagonista e os quatro secundários com número e leitura auxiliar', () => {
    render(
      <BancoHorasKpis
        resumo={RESUMO}
        situacao={SITUACAO}
        periodoAtivo
        comparativo={COMPARATIVO}
      />
    );

    // Protagonista: saldo do recorte com sinal + a decomposição créditos/débitos.
    expect(screen.getByText('Saldo total da equipe')).toBeInTheDocument();
    expect(screen.getByText('+12h00')).toBeInTheDocument();
    expect(screen.getByText('20h00 créditos · 8h00 débitos')).toBeInTheDocument();

    // Secundários: movimentações, créditos, débitos e a foto dos negativos.
    expect(screen.getByText('Movimentações')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Créditos')).toBeInTheDocument();
    expect(screen.getByText('20h00')).toBeInTheDocument();
    expect(screen.getByText('Débitos')).toBeInTheDocument();
    expect(screen.getByText('8h00')).toBeInTheDocument();
    expect(screen.getByText('Colaboradores com saldo negativo')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('8h00 a compensar')).toBeInTheDocument();

    // Os cards secundários não desenham mais minigráficos: a faixa de KPI é
    // só número + leitura auxiliar. O que não pode desaparecer é o atalho.
    expect(screen.queryAllByRole('img')).toHaveLength(0);

    // Sem callback, o atalho existe mas não é acionável.
    expect(screen.getByRole('button', { name: /Ver lista/ })).toBeInTheDocument();
  });

  it('diz "sem movimentações" e "nenhum no vermelho" quando não há recorte', () => {
    render(
      <BancoHorasKpis
        resumo={resumirHoras([])}
        situacao={resumirSituacaoSaldos([])}
        periodoAtivo={false}
        comparativo={compararPeriodos([], { de: '', ate: '' })}
      />
    );

    expect(screen.getByText('Sem movimentações no recorte')).toBeInTheDocument();
    expect(screen.getByText('Nenhum colaborador no vermelho')).toBeInTheDocument();
    // Nenhum gráfico decorativo numa base vazia.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver lista/ })).toBeDisabled();
  });

  it('avisa quando não existe base no período anterior', () => {
    render(
      <BancoHorasKpis resumo={RESUMO} situacao={SITUACAO} periodoAtivo comparativo={COMPARATIVO} />
    );

    expect(screen.getByText('sem base no período anterior')).toBeInTheDocument();
    expect(screen.getAllByText('sem base anterior').length).toBeGreaterThan(0);
  });
});

describe('TotaisHorasCard', () => {
  it('lista créditos, débitos e o saldo do recorte', () => {
    render(<TotaisHorasCard resumo={RESUMO} periodoAtivo />);

    expect(screen.getByText('Crédito')).toBeInTheDocument();
    expect(screen.getByText('Débito')).toBeInTheDocument();
    expect(screen.getByText('20h00')).toBeInTheDocument();
    expect(screen.getByText('8h00')).toBeInTheDocument();
    expect(screen.getByText('Saldo do período')).toBeInTheDocument();
    expect(screen.getByText('12h00')).toBeInTheDocument();
    // A escala é compartilhada: cada barra expõe o próprio valor no aria-label.
    expect(screen.getByRole('img', { name: 'Crédito: 20h00' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Débito: 8h00' })).toBeInTheDocument();
  });

  it('não desenha barra decorativa quando o recorte está vazio', () => {
    const vazio: ResumoHoras = resumirHoras([]);
    render(<TotaisHorasCard resumo={vazio} periodoAtivo={false} />);

    expect(screen.getByText('Nenhum lançamento no recorte selecionado.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('AlertaSaldoNegativoCard', () => {
  it('nomeia quem está no vermelho e soma a dívida', () => {
    render(<AlertaSaldoNegativoCard saldos={SALDOS} />);

    expect(screen.getByText('Saldos negativos')).toBeInTheDocument();
    expect(screen.getByText('8h00')).toBeInTheDocument();
    expect(screen.getByText(/em dívida com 2 colaboradores/)).toBeInTheDocument();
    expect(screen.getByText('João Souza')).toBeInTheDocument();
    expect(screen.getByText('Carla Dias')).toBeInTheDocument();
    // Quem está positivo NÃO aparece no alerta.
    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
  });

  it('resume a lista a partir do quinto nome', () => {
    const muitos = saldosPorColaborador(
      Array.from({ length: 6 }, (_, indice) =>
        lancamento(`n${indice}`, `Colaborador ${indice}`, 'debito', '01:00:00', '-01:00:00')
      )
    );
    render(<AlertaSaldoNegativoCard saldos={muitos} />);

    expect(screen.getByText(/em dívida com 6 colaboradores/)).toBeInTheDocument();
    expect(screen.getByText('+ 3 outros colaboradores')).toBeInTheDocument();
    // O card para em 3 nomes; o resto vive no diálogo "Ver todos".
    expect(screen.queryByText('Colaborador 3')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver todos' })).toBeInTheDocument();
  });

  it('não oferece "Ver todos" quando todos os nomes já cabem no card', () => {
    render(<AlertaSaldoNegativoCard saldos={SALDOS} />);

    expect(screen.queryByRole('button', { name: 'Ver todos' })).not.toBeInTheDocument();
  });

  it('não existe quando ninguém está no vermelho', () => {
    const soPositivos = saldosPorColaborador([
      lancamento('c1', 'Maria Silva', 'credito', '20:00:00', '20:00:00'),
    ]);
    const { container } = render(<AlertaSaldoNegativoCard saldos={soPositivos} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('SituacaoSaldosCard', () => {
  it('mostra a composição da foto e a soma dos saldos', () => {
    render(<SituacaoSaldosCard situacao={SITUACAO} isLoading={false} />);

    expect(screen.getByText('Situação dos saldos')).toBeInTheDocument();
    // A contagem mora no subtítulo (o cabeçalho ficou sem acessório para o título inteiro caber).
    expect(screen.getByText('Saldo atual de 3 colaboradores')).toBeInTheDocument();
    expect(screen.getByText('Positivos')).toBeInTheDocument();
    expect(screen.getByText('Negativos')).toBeInTheDocument();
    expect(screen.getByText('Zerados')).toBeInTheDocument();
    expect(screen.getByText('Saldo atual somado')).toBeInTheDocument();
    expect(screen.getByText('12h00')).toBeInTheDocument();
  });

  it('troca o esqueleto por um anel estático quando a base está vazia', () => {
    const { container } = render(
      <SituacaoSaldosCard situacao={resumirSituacaoSaldos([])} isLoading={false} />
    );

    expect(screen.getByText('sem saldos')).toBeInTheDocument();
    expect(screen.getByText('Saldo atual de 0 colaboradores')).toBeInTheDocument();
    // Nada pulsando eternamente: base vazia não é "carregando".
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });
});
