import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * O mock precisa de `motion.create`: `cardVariants` vem de `MetricCard`, que
 * monta `MotionCard = motion.create(Card)` no topo do módulo.
 *
 * `useReducedMotion` também precisa existir: os cards de Ponto leem a
 * preferência pelo caminho único do sistema (`lib/motionMode` →
 * `useMovimentoReduzido`), e o mock é total — sem a função, o módulo de motion
 * quebra ao importar. Devolver `false` mantém o movimento completo no teste.
 *
 * As props EXCLUSIVAS da Motion são filtradas antes de chegar ao `<div>`: o
 * React reclamaria de `onAnimationComplete` como "unknown event handler".
 *
 * O filtro vive em `vi.hoisted` porque o `vi.mock` é içado ACIMA dos imports —
 * uma `const` de topo de arquivo ainda estaria em TDZ quando a fábrica roda.
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

import { PontoEquipeStatusCard } from '../ponto/PontoEquipeStatusCard';
import { PontoBancoHorasCard } from '../ponto/PontoBancoHorasCard';
import { PontoPendenciasCard } from '../ponto/PontoPendenciasCard';
import { PontoFechamentoCard } from '../ponto/PontoFechamentoCard';
import { PontoHorasSemanaCard } from '../ponto/PontoHorasSemanaCard';
import { PontoUltimasBatidasCard } from '../ponto/PontoUltimasBatidasCard';
import { PontoIndicadoresKpi } from '../ponto/PontoIndicadoresKpi';

/**
 * Cards de resumo do dashboard de Ponto.
 *
 * Os testes olham o que o RH lê na tela: número que veio do banco (nunca
 * placeholder de vitrine), estado vazio honesto e ação que leva para a aba de
 * gestão. Nenhum caso depende de rede — os dados entram por prop.
 */
describe('PontoEquipeStatusCard', () => {
  const COLABORADORES = [
    { id: 'a', nome_completo: 'Ana Silva' },
    { id: 'b', nome_completo: 'Bruno Souza' },
    { id: 'c', nome_completo: 'Carla Dias' },
  ];

  it('conta jornada pela última batida do colaborador', () => {
    render(
      <PontoEquipeStatusCard
        colaboradores={COLABORADORES}
        batidasHoje={[
          { colaborador_id: 'a', tipo: 'entrada' },
          { colaborador_id: 'b', tipo: 'entrada' },
          { colaborador_id: 'b', tipo: 'saida' },
        ]}
      />
    );

    expect(screen.getByText('em jornada agora')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    // Grade 2×2: os quatro indicadores do card precisam estar na tela.
    expect(screen.getByText('Em jornada')).toBeInTheDocument();
    expect(screen.getByText('Em intervalo')).toBeInTheDocument();
    expect(screen.getByText('Não iniciaram')).toBeInTheDocument();
    expect(screen.getByText('Encerraram')).toBeInTheDocument();
  });

  it('avisa quando não há colaborador ativo vinculado', () => {
    render(<PontoEquipeStatusCard colaboradores={[]} batidasHoje={[]} />);
    expect(screen.getByText('Nenhum colaborador ativo vinculado à empresa.')).toBeInTheDocument();
  });
});

describe('PontoBancoHorasCard', () => {
  it('mostra saldo credor somando HH:MM da semana', () => {
    render(
      <PontoBancoHorasCard
        bancoResumo={{ saldo: '02:30', saldoMinutos: 150, tipo: 'credito' }}
        registrosSemana={[
          { horas_trabalhadas: '08:00', horas_extras: '01:00', horas_falta: '00:00' },
          { horas_trabalhadas: '04:30', horas_extras: '00:00', horas_falta: '00:30' },
        ]}
      />
    );

    expect(screen.getByText('+02:30')).toBeInTheDocument();
    // O selo "Credor" saiu do card (a referência não o tem); o crédito segue
    // identificado pelo sinal `+` e pela cor verde do saldo.
    expect(screen.getByText('+02:30')).toHaveClass('text-success');
    expect(screen.getByText('12:30')).toBeInTheDocument();
    expect(screen.getByText('+01:00')).toBeInTheDocument();
    expect(screen.getByText('-00:30')).toBeInTheDocument();
    // Os quatro valores da grade 2×2 (trabalhadas, previstas, extras, devidas).
    expect(screen.getByText('Horas trabalhadas')).toBeInTheDocument();
    expect(screen.getByText('Horas previstas')).toBeInTheDocument();
  });

  it('soma horas previstas pela janela esperada de cada dia', () => {
    render(
      <PontoBancoHorasCard
        bancoResumo={{ saldo: '00:00', saldoMinutos: 0, tipo: 'credito' }}
        registrosSemana={[
          { entrada_esperada: '08:00', saida_esperada: '17:00', horas_trabalhadas: '08:00' },
          { entrada_esperada: '08:00', saida_esperada: '12:00', horas_trabalhadas: '04:00' },
          // Dia sem marcação esperada não entra na soma de previstas.
          { horas_trabalhadas: '04:00' },
        ]}
      />
    );

    // 9h + 4h = 13h previstas; 8h + 4h + 4h = 16h trabalhadas.
    expect(screen.getByText('13:00')).toBeInTheDocument();
    expect(screen.getByText('16:00')).toBeInTheDocument();
  });

  it('mostra devedor e o aviso quando não há lançamento no banco', () => {
    const { unmount } = render(
      <PontoBancoHorasCard bancoResumo={{ saldo: '01:00', saldoMinutos: -60, tipo: 'debito' }} />
    );

    expect(screen.getByText('-01:00')).toBeInTheDocument();
    // Débito segue marcado pelo sinal `-` e pelo vermelho do módulo.
    expect(screen.getByText('-01:00')).toHaveClass('text-[#FF4545]');
    unmount();

    render(<PontoBancoHorasCard bancoResumo={null} />);
    expect(screen.getByText('--:--')).toBeInTheDocument();
    expect(screen.getByText('Sem lançamento no banco de horas para este colaborador.')).toBeInTheDocument();
  });
});

describe('PontoPendenciasCard', () => {
  it('mostra "Em dia" quando não há pendência', () => {
    render(<PontoPendenciasCard />);
    expect(screen.getByText('Em dia')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma pendência aberta na competência.')).toBeInTheDocument();
  });

  it('lista as três pendências e chama o atalho para a gestão', () => {
    const onRevisar = vi.fn();
    render(
      <PontoPendenciasCard
        jornadasAbertas={2}
        ajustesPendentes={1}
        colaboradoresSemRegistro={3}
        onRevisar={onRevisar}
      />
    );

    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Marcações incompletas')).toBeInTheDocument();
    expect(screen.getByText('Solicitações de ajuste')).toBeInTheDocument();
    expect(screen.getByText('Sem batida hoje')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Revisar pendências/i }));
    expect(onRevisar).toHaveBeenCalledTimes(1);
  });
});

describe('PontoFechamentoCard', () => {
  it('mostra o percentual real da competência', () => {
    render(
      <PontoFechamentoCard inicio="2026-10-01" fim="2026-10-31" processados={1} colaboradores={2} pendentes={1} />
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    // Período de apuração em destaque: datas reais da competência.
    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
    expect(screen.getByText('31/10/2026')).toBeInTheDocument();
  });

  it('marca completo quando todos os ativos têm registro', () => {
    const onAcompanhar = vi.fn();
    render(
      <PontoFechamentoCard
        inicio="2026-10-01"
        fim="2026-10-31"
        processados={3}
        colaboradores={3}
        onAcompanhar={onAcompanhar}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Completo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Acompanhar fechamento/i }));
    expect(onAcompanhar).toHaveBeenCalledTimes(1);
  });
});

describe('PontoHorasSemanaCard', () => {
  it('estado vazio quando não há registro na semana', () => {
    render(<PontoHorasSemanaCard registrosSemana={[]} />);
    expect(screen.getByText('Sem registros nos últimos 7 dias.')).toBeInTheDocument();
  });
});

describe('PontoUltimasBatidasCard', () => {
  const BATIDA = {
    id: 'bat-1',
    colaborador_id: 'col-1',
    colaborador: { nome_completo: 'Ana Silva' },
    data: '2026-10-30',
    hora: '08:02',
    tipo: 'entrada',
    origem: 'kiosk',
    dentro_raio: true,
  };

  it('estado vazio quando ninguém bateu ponto hoje', () => {
    render(<PontoUltimasBatidasCard batidas={[]} />);
    expect(screen.getByText('Nenhuma batida registrada hoje.')).toBeInTheDocument();
  });

  it('deriva origem e situação das colunas reais da batida', () => {
    render(<PontoUltimasBatidasCard batidas={[BATIDA]} />);

    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Entrada')).toBeInTheDocument();
    expect(screen.getByText('30/10')).toBeInTheDocument();
    expect(screen.getByText('Kiosk')).toBeInTheDocument();
    expect(screen.getByText('Validado')).toBeInTheDocument();
  });

  it('respeita o limite de linhas e oferece "Ver todas"', () => {
    const onVerTodas = vi.fn();
    const batidas = Array.from({ length: 9 }, (_, indice) => ({
      ...BATIDA,
      id: `bat-${indice}`,
      hora: `08:0${indice}`,
    }));

    render(<PontoUltimasBatidasCard batidas={batidas} limite={4} onVerTodas={onVerTodas} />);

    // 1 linha de cabeçalho + 4 linhas de batida.
    expect(screen.getAllByRole('row')).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: /Ver todas/i }));
    expect(onVerTodas).toHaveBeenCalledTimes(1);
  });
});

describe('PontoIndicadoresKpi', () => {
  it('calcula pontualidade, média, saldo e dias a partir dos registros', () => {
    render(
      <PontoIndicadoresKpi
        registrosSemana={[
          {
            data: '2026-10-28',
            entrada_1: '08:00',
            atraso_minutos: 0,
            horas_trabalhadas: '08:00',
            horas_extras: '01:00',
            horas_falta: '00:00',
          },
          {
            data: '2026-10-29',
            entrada_1: '08:12',
            atraso_minutos: 12,
            horas_trabalhadas: '04:00',
            horas_extras: '00:00',
            horas_falta: '00:30',
          },
        ]}
      />
    );

    // Quatro KPI Cards independentes, cada um com título, valor e descrição.
    expect(screen.getByText('Pontualidade')).toBeInTheDocument();
    expect(screen.getByText('Média diária')).toBeInTheDocument();
    expect(screen.getByText('Saldo da semana')).toBeInTheDocument();
    expect(screen.getByText('Dias com registro')).toBeInTheDocument();

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('06:00')).toBeInTheDocument();
    expect(screen.getByText('+00:30')).toBeInTheDocument();
    expect(screen.getByText('2 de 7')).toBeInTheDocument();

    // Descrições de apoio (o "por dia com registro" agora vem capitalizado).
    expect(screen.getByText('Entradas no horário')).toBeInTheDocument();
    expect(screen.getByText('Por dia com registro')).toBeInTheDocument();
    expect(screen.getByText('Extras − devidas')).toBeInTheDocument();
    expect(screen.getByText('Últimos 7 dias')).toBeInTheDocument();
  });

  it('não conta dia sem entrada como atraso', () => {
    render(<PontoIndicadoresKpi registrosSemana={[{ data: '2026-10-30', entrada_1: null, horas_falta: '08:00' }]} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('-08:00')).toBeInTheDocument();
  });

  it('saldo negativo pinta o KPI com o vermelho vibrante do módulo', () => {
    const { container } = render(
      <PontoIndicadoresKpi registrosSemana={[{ data: '2026-10-30', entrada_1: '08:00', horas_falta: '01:00' }]} />
    );

    // O valor continua legível como débito: sinal `-` e a cor do módulo.
    expect(screen.getByText('-01:00')).toBeInTheDocument();
    // Chip do ícone do KPI "Saldo da semana" com a variante vibrante do token.
    expect(container.querySelector('.text-destructive-vivid')).not.toBeNull();
  });
});
