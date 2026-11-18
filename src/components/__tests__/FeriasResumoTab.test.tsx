import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps, ElementType, ReactNode } from 'react';

/**
 * `FeriasResumoTab` está viva no dossiê do colaborador e não tinha NENHUM
 * teste. O arquivo que a branch `muri` trazia (3 casos) virou obsoleto: aquele
 * componente tinha um hook e textos de tela completamente diferentes dos de
 * hoje. Estes casos cobrem o que a tela de hoje promete, com atenção ao que o
 * próprio componente documenta como risco:
 *
 *   "Sem este corte, uma consulta de afastamentos fora do ar faz o KPI
 *   'Situação atual' pintar de verde 'Sem afastamentos ativos' para alguém que
 *   está afastado pelo INSS" (FeriasResumoTab.tsx:428-430)
 *
 * ou seja: falha de consulta NÃO pode virar "está tudo bem".
 */

vi.mock('framer-motion', () => {
  type PropsDeAnimacao = {
    custom?: unknown;
    variants?: unknown;
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    whileHover?: unknown;
    whileTap?: unknown;
    transition?: unknown;
    layoutId?: unknown;
  };
  const semMotion = <P extends object>({
    custom,
    variants,
    initial,
    animate,
    exit,
    whileHover,
    whileTap,
    transition,
    layoutId,
    ...resto
  }: P & PropsDeAnimacao) => resto;
  return {
    motion: {
      create: (Component: ElementType) => (props: ComponentProps<'div'> & PropsDeAnimacao) => (
        <Component {...semMotion(props)} />
      ),
      div: (props: ComponentProps<'div'> & PropsDeAnimacao) => <div {...semMotion(props)} />,
      span: (props: ComponentProps<'span'> & PropsDeAnimacao) => <span {...semMotion(props)} />,
      tr: (props: ComponentProps<'tr'> & PropsDeAnimacao) => <tr {...semMotion(props)} />,
      button: (props: ComponentProps<'button'> & PropsDeAnimacao) => <button {...semMotion(props)} />,
      circle: () => <circle />,
      path: () => <path />,
    },
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));

type EstadoConsulta<T> = { data: T | undefined; isLoading: boolean; isError: boolean };

const vazio = <T,>(data: T): EstadoConsulta<T> => ({ data, isLoading: false, isError: false });

let ferias: EstadoConsulta<unknown[]> = vazio([]);
let periodos: EstadoConsulta<unknown[]> = vazio([]);
let afastamentos: EstadoConsulta<unknown[]> = vazio([]);

vi.mock('@/hooks', () => ({
  useFeriasResumoColaborador: () => ferias,
  useAfastamentosRecentes: () => afastamentos,
}));
vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  usePeriodosAquisitivos: () => periodos,
}));

import { FeriasResumoTab } from '../colaborador-detalhes/FeriasResumoTab';

describe('FeriasResumoTab', () => {
  beforeEach(() => {
    ferias = vazio([]);
    periodos = vazio([]);
    afastamentos = vazio([]);
  });

  it('mostra o spinner enquanto QUALQUER uma das três consultas carrega', () => {
    afastamentos = { data: undefined, isLoading: true, isError: false };
    render(<FeriasResumoTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('falha na consulta de afastamentos NÃO pode virar "está tudo bem"', () => {
    afastamentos = { data: undefined, isLoading: false, isError: true };
    render(<FeriasResumoTab colaboradorId="col-1" />);

    expect(screen.getByText(/Não foi possível carregar as férias e os afastamentos/)).toBeInTheDocument();
    // O risco documentado no próprio componente: nenhum KPI verde de
    // "sem afastamentos" quando a consulta nem respondeu.
    expect(screen.queryByText(/Sem afastamentos ativos/)).toBeNull();
  });

  it('falha na consulta de férias também corta a tela inteira', () => {
    ferias = { data: undefined, isLoading: false, isError: true };
    render(<FeriasResumoTab colaboradorId="col-1" />);
    expect(screen.getByText(/Não foi possível carregar as férias e os afastamentos/)).toBeInTheDocument();
  });

  it('sem férias programadas, diz "Nenhuma programada" em vez de inventar data', () => {
    render(<FeriasResumoTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhuma programada')).toBeInTheDocument();
  });

  it('sem histórico, diz que não há férias concluídas', () => {
    render(<FeriasResumoTab colaboradorId="col-1" />);
    expect(screen.getAllByText('Nenhuma férias concluída até o momento.').length).toBeGreaterThan(0);
  });

  it('com férias aprovada no futuro, o card "Próximas férias" sai do estado vazio', () => {
    ferias = vazio([
      {
        id: 'f1',
        colaborador_id: 'col-1',
        data_inicio: '2099-01-10',
        data_fim: '2099-01-20',
        dias_gozo: 10,
        status: 'aprovada',
      },
    ]);
    render(<FeriasResumoTab colaboradorId="col-1" />);
    expect(screen.queryByText('Nenhuma programada')).toBeNull();
  });
});
