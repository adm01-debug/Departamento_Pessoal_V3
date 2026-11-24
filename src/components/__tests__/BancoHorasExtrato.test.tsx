import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Mock parcial e mínimo da Motion — o mesmo de `BancoHorasCards.test.tsx`:
 * `motion.create` é usado no topo de `entrada-cards.tsx`, `useInView` pelo
 * `DonutChart` e as props EXCLUSIVAS da Motion precisam ser filtradas antes de
 * chegar ao DOM (o React reclamaria de `onAnimationComplete`). Com
 * `useReducedMotion → true` as linhas da cascata nascem no estado final.
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
      tr: criar('tr'),
      ts: criar('ts'),
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

import { ExtratoBancoHoras } from '../banco-horas/ExtratoBancoHoras';
import {
  FILTROS_EXTRATO_PADRAO,
  type FiltrosExtrato,
  type RegistroBancoHoras,
} from '../banco-horas/bancoHorasComum';

/**
 * ============================================================================
 * Extrato do Banco de Horas.
 *
 * O que se prova aqui é o que o RH faz na tabela: ler os números exatos do
 * banco, ver a contagem REAL de cada chip e filtrar por tipo. O período é da
 * página (o extrato recebe `registros` já recortado), por isso os casos montam
 * a lista direto.
 * ============================================================================
 */

function lancamento(over: Partial<RegistroBancoHoras> = {}): RegistroBancoHoras {
  return {
    id: 'r1',
    colaborador_id: 'c1',
    data: '2026-03-02',
    horas: '02:00:00',
    tipo: 'credito',
    motivo: 'Compensação',
    saldo_anterior: '00:00:00',
    saldo_atual: '02:00:00',
    created_at: '2026-03-02T10:00:00.000Z',
    colaborador: { nome_completo: 'Maria Silva', departamento: 'Operações' },
    ...over,
  };
}

const REGISTROS: RegistroBancoHoras[] = [
  lancamento({ id: 'r1', data: '2026-03-02' }),
  lancamento({
    id: 'r2',
    data: '2026-03-01',
    horas: '04:00:00',
    tipo: 'debito',
    saldo_anterior: '-02:00:00',
    saldo_atual: '-06:00:00',
    colaborador: { nome_completo: 'João Souza', departamento: 'Logística' },
  }),
];

/** O estado de busca/tipo mora na página; o wrapper reproduz esse contrato. */
function ExtratoControlado({
  registros = REGISTROS,
  totalBase = REGISTROS.length,
  filtrosIniciais = FILTROS_EXTRATO_PADRAO,
}: {
  registros?: RegistroBancoHoras[];
  totalBase?: number;
  filtrosIniciais?: FiltrosExtrato;
}) {
  const [filtros, setFiltros] = useState<FiltrosExtrato>(filtrosIniciais);
  return (
    <ExtratoBancoHoras
      registros={registros}
      totalBase={totalBase}
      filtros={filtros}
      onFiltrosChange={setFiltros}
      isLoading={false}
    />
  );
}

describe('ExtratoBancoHoras', () => {
  it('mostra o lançamento com horas, tipo e saldos do banco', () => {
    render(<ExtratoControlado />);

    expect(screen.getByText('Extrato do banco de horas')).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('João Souza')).toBeInTheDocument();
    expect(screen.getByText('02/03/2026')).toBeInTheDocument();
    expect(screen.getByText('01/03/2026')).toBeInTheDocument();
    // Crédito entra com "+", débito com "−".
    expect(screen.getByText('+2h00')).toBeInTheDocument();
    expect(screen.getByText('−4h00')).toBeInTheDocument();
    expect(screen.getByText('-6h00')).toBeInTheDocument();
    expect(screen.getByText('2 registros')).toBeInTheDocument();
  });

  it('conta cada chip sobre a mesma lista', () => {
    render(<ExtratoControlado />);

    expect(screen.getByRole('button', { name: /Todos/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /Créditos/ })).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /Débitos/ })).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /Negativos/ })).toHaveTextContent('1');
  });

  it('filtra pelo chip de saldos negativos', async () => {
    const usuario = userEvent.setup();
    render(<ExtratoControlado />);

    await usuario.click(screen.getByRole('button', { name: /Negativos/ }));

    expect(screen.getByText('João Souza')).toBeInTheDocument();
    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
  });

  it('distingue base vazia de recorte sem resultado', () => {
    const { unmount } = render(<ExtratoControlado registros={[]} totalBase={0} />);
    expect(screen.getByText('Nenhum lançamento no banco de horas')).toBeInTheDocument();
    unmount();

    render(<ExtratoControlado filtrosIniciais={{ busca: 'ninguém', tipo: 'todos' }} />);
    expect(screen.queryByText('João Souza')).not.toBeInTheDocument();
    expect(screen.getByText('0 de 2 registros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Limpar busca/i })).toBeInTheDocument();
  });
});
