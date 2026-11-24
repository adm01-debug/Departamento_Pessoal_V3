import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => null,
}));

vi.mock('framer-motion', () => {
  // Os props de animação não fazem sentido no DOM do teste (o `motion.*` vira
  // uma tag comum); descartá-los evita warning de atributo desconhecido.
  // `variants`/`exit` entram na lista porque a janela de riscos usa a moldura
  // compartilhada (`CascadeDialogFrame`), que declara os dois nos blocos.
  const propsDom = ({ initial: _i, animate: _a, transition: _t, variants: _v, exit: _e, ...props }: any) => props;
  const motion = {
    div: ({ children, ...props }: any) => <div {...propsDom(props)}>{children}</div>,
    // Roscas/legenda/rótulos animados: mesmas tags que o Framer Motion renderiza.
    li: ({ children, ...props }: any) => <li {...propsDom(props)}>{children}</li>,
    span: ({ children, ...props }: any) => <span {...propsDom(props)}>{children}</span>,
    circle: (props: any) => <circle {...propsDom(props)} />,
    path: (props: any) => <path {...propsDom(props)} />,
    // `entrada-cards` monta o `MotionCard` com `motion.create` no import.
    create: (Componente: any) => Componente,
  };
  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    // A janela de riscos passa o modo de movimento pelo canal único do sistema
    // (`MOTION_REDUCED_MODE`): aqui o `MotionConfig` só repassa os filhos.
    MotionConfig: ({ children }: any) => <>{children}</>,
    // Gatilho das animações de entrada (rosca e barras) já visível no teste.
    useInView: () => true,
    // `lib/motionMode` → `useMovimentoReduzido()` usa o hook do Framer Motion.
    useReducedMotion: () => false,
  };
});

import { GestaoPontoAnalytics } from '../ponto/GestaoPontoAnalytics';

const DEFAULT_REGISTROS = [
  {
    colaborador_id: 'col-1',
    data: '2026-07-01',
    entrada_1: '08:00',
    saida_1: '17:00',
    horas_trabalhadas: '08:00',
    atraso_minutos: 0,
    saida_intervalo: null,
    retorno_intervalo: null,
  },
  {
    colaborador_id: 'col-1',
    data: '2026-07-02',
    entrada_1: '08:15',
    saida_1: '17:00',
    horas_trabalhadas: '07:45',
    atraso_minutos: 15,
    saida_intervalo: null,
    retorno_intervalo: null,
  },
];

describe('GestaoPontoAnalytics', () => {
  it('renders Painel de Gestão Estratégica title', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('Painel de Gestão Estratégica')).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText(/Monitoramento preditivo/i)).toBeInTheDocument();
  });

  it('renders IA Monitorando badge', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('IA Monitorando')).toBeInTheDocument();
  });

  it('renders Custo Projetado label', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText(/Custo Projetado/i)).toBeInTheDocument();
  });

  it('renders Previsão IA badge', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('Previsão IA')).toBeInTheDocument();
  });

  it('renders with non-empty registros', () => {
    render(<GestaoPontoAnalytics registros={DEFAULT_REGISTROS} />);
    expect(screen.getByText('Painel de Gestão Estratégica')).toBeInTheDocument();
  });

  it('renders MTP 671 reference in subtitle', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getAllByText(/MTP 671/i).length).toBeGreaterThanOrEqual(1);
  });

  it('calcula a taxa de assiduidade a partir dos registros', () => {
    render(<GestaoPontoAnalytics registros={DEFAULT_REGISTROS} />);
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.queryByText(/em relação ao mês anterior/)).not.toBeInTheDocument();
  });

  it('mostra traço na taxa de assiduidade sem registros', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders 0h projection when no registros', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('0h')).toBeInTheDocument();
  });

  // ── Redesign da área: gráficos → painel estratégico → monitor de riscos ──

  it('mostra o estado vazio da rosca quando não há registros', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('Sem registros')).toBeInTheDocument();
  });

  it('lista os quatro status com percentual e contagem', () => {
    render(<GestaoPontoAnalytics registros={DEFAULT_REGISTROS} />);
    // "No Horário" é a fatia dominante: também aparece no centro da rosca.
    expect(screen.getAllByText('No Horário').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Atrasos')).toBeInTheDocument();
    expect(screen.getByText('Faltas')).toBeInTheDocument();
    expect(screen.getByText('Incompletos')).toBeInTheDocument();
    // 1 registro no horário + 1 atraso = 50% em cada uma das duas linhas
    expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(2);
  });

  it('barras com o acabamento e o crescimento do card "2. Visualize o impacto"', () => {
    // Um registro extra às 09:00 para haver uma barra "comum" (a de 08:00 é o pico).
    const registros = [
      ...DEFAULT_REGISTROS,
      { ...DEFAULT_REGISTROS[0], data: '2026-07-03', entrada_1: '09:00', atraso_minutos: 0 },
    ];
    const { container } = render(<GestaoPontoAnalytics registros={registros} />);

    // Uma barra por hora da janela 06:00 → 20:00: 15 colunas. O contêiner do
    // gráfico também carrega as variáveis CSS do crescimento — só as barras
    // (que têm `transform` próprio) entram na conta.
    const barras = Array.from(container.querySelectorAll<HTMLElement>('[style*="crescimento-barra-"]')).filter(
      (elemento) => elemento.style.transform !== ''
    );
    expect(barras).toHaveLength(15);

    // O crescimento vertical é o `scaleY` da variável CSS escrita pelo
    // controlador (`useCrescimentoBarras`) — nada de animar `height`.
    expect(barras[0].getAttribute('style')).toContain('--crescimento-barra-0');
    expect(barras[0].style.transformOrigin).toBe('center bottom');

    // PADRONIZAÇÃO (pedido do layout): TODAS as colunas com entrada têm o MESMO
    // acabamento — 1,5px de contorno lime e 20% de preenchimento. A barra de
    // pico (08:00) NÃO é mais mais grossa nem mais densa que as demais.
    const comEntrada = barras.filter((barra) => barra.style.height !== '0%');
    expect(comEntrada).toHaveLength(2);
    for (const barra of comEntrada) {
      expect(barra.className).toContain('border-[1.5px]');
      expect(barra.className).toContain('border-primary');
      expect(barra.className).toContain('bg-primary/20');
      // Nada de contorno diferenciado nem preenchimento de pico.
      expect(barra.className).not.toContain('border-[2.5px]');
      expect(barra.className).not.toContain('bg-primary/[0.34]');
    }

    // Nenhum número fixo sobre as barras: a coluna não tem texto (o valor de
    // cada hora só é consultado pelo hover, na dica). Vale para a de pico também.
    const colunas = barras.map((barra) => barra.parentElement as HTMLElement);
    for (const coluna of colunas) expect(coluna.textContent).toBe('');

    // Hora sem nenhuma entrada não pinta preenchimento NEM contorno: com altura
    // zero a borda viraria uma linha sobre o eixo.
    const vazias = barras.filter((barra) => barra.style.height === '0%');
    expect(vazias).toHaveLength(13);
    for (const barra of vazias) {
      expect(barra.className).not.toContain('border-');
      expect(barra.className).not.toContain('bg-primary');
    }

    // As alturas continuam vindo dos dados (pico 2 de 4 no eixo = 50%; a barra
    // de 09:00, 1 de 4 = 25%) — a padronização visual não mexeu na escala.
    const pico = comEntrada.find((barra) => barra.style.height === '50%');
    const comum = comEntrada.find((barra) => barra.style.height === '25%');
    expect(pico).toBeTruthy();
    expect(comum).toBeTruthy();
  });

  it('renderiza as três regras do monitor de riscos com a contagem real', () => {
    render(<GestaoPontoAnalytics registros={[]} />);
    expect(screen.getByText('Interjornada')).toBeInTheDocument();
    expect(screen.getByText('Jornada Excedente')).toBeInTheDocument();
    expect(screen.getByText('Intervalo Mínimo')).toBeInTheDocument();
    expect(screen.getAllByText('0 ocorrências')).toHaveLength(3);
  });

  it('conta a violação de interjornada a partir dos registros', () => {
    const registros = [
      // 02/07 saiu 22:00 e voltou 03/07 às 08:00 → 10h de descanso (< 11h)
      {
        colaborador_id: 'col-1',
        data: '2026-07-02',
        entrada_1: '08:00',
        saida_1: '22:00',
        horas_trabalhadas: '08:00',
        atraso_minutos: 0,
        saida_intervalo: null,
        retorno_intervalo: null,
      },
      {
        colaborador_id: 'col-1',
        data: '2026-07-03',
        entrada_1: '08:00',
        saida_1: '17:00',
        horas_trabalhadas: '08:00',
        atraso_minutos: 0,
        saida_intervalo: null,
        retorno_intervalo: null,
      },
    ];
    render(<GestaoPontoAnalytics registros={registros} />);
    expect(screen.getByText('1 ocorrências')).toBeInTheDocument();
  });

  it('abre o diálogo "Ver detalhes" do monitor de riscos na moldura animada', async () => {
    const user = userEvent.setup();
    render(<GestaoPontoAnalytics registros={[]} />);

    // Antes de abrir, cada descrição aparece UMA vez (nos cards).
    expect(screen.getAllByText(/11h consecutivas de descanso/i)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /Ver detalhes/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // A janela NÃO é um `DialogContent` estático: é a moldura compartilhada do
    // popup "Pendências" (`CascadeDialogFrame`) — o véu que escurece e a caixa
    // com `transform-origin` (o eixo do crescimento em escala) estão no DOM.
    expect(document.querySelector('.backdrop-blur-sm')).not.toBeNull();
    expect(document.querySelector('[style*="transform-origin"]')).not.toBeNull();
    // Aberto, as mesmas descrições também aparecem no diálogo.
    expect(screen.getAllByText(/11h consecutivas de descanso/i)).toHaveLength(2);
  });

  // ── Dica (tooltip) do gráfico de barras ────────────────────────────────

  /** Devolve a coluna da barra que tem entrada (as vazias não abrem dica). */
  function colunaComEntrada(container: HTMLElement): HTMLElement {
    const barra = Array.from(container.querySelectorAll<HTMLElement>('[data-barra]')).find(
      (elemento) => elemento.style.height !== '0%'
    );
    expect(barra, 'alguma barra precisa ter entrada').toBeTruthy();
    return barra!.parentElement as HTMLElement;
  }

  it('mostra a dica do horário ao passar o mouse na barra', () => {
    const { container } = render(<GestaoPontoAnalytics registros={DEFAULT_REGISTROS} />);

    // Os dois registros são de 08:00 → 2 de 2 = 100% da série exibida.
    fireEvent.mouseEnter(colunaComEntrada(container));

    const dica = screen.getByRole('tooltip');
    expect(dica).toHaveTextContent('08:00 – 08:59');
    expect(dica).toHaveTextContent('Entradas registradas');
    expect(dica).toHaveTextContent('Participação no total');
    expect(dica).toHaveTextContent('100%');
    expect(dica).toHaveTextContent('Pico de movimentação');
  });

  it('a dica some quando o ponteiro sai das colunas e não reinicia as barras', () => {
    const { container } = render(<GestaoPontoAnalytics registros={DEFAULT_REGISTROS} />);
    const coluna = colunaComEntrada(container);
    const barras = Array.from(container.querySelectorAll<HTMLElement>('[data-barra]'));

    fireEvent.mouseEnter(coluna);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    // Nenhuma barra foi remontada/reiniciada: as variáveis do crescimento
    // continuam as mesmas e a dica não mexe na geometria das colunas.
    expect(Array.from(container.querySelectorAll<HTMLElement>('[data-barra]'))).toEqual(barras);
    expect(barras[0].getAttribute('style')).toContain('--crescimento-barra-0');

    fireEvent.mouseLeave(coluna.parentElement as HTMLElement);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

/**
 * ============================================================================
 * PARIDADE NA FONTE — padronização das barras e a janela animada de riscos.
 *
 * O DOM já é coberto acima para o gráfico; aqui travamos o que é difícil de
 * enxergar num teste de componente: que a barra de PICO não volte a ter contorno
 * mais grosso/número fixo e que a janela "Ver detalhes" continue montada na
 * MESMA moldura do popup "Pendências" (`CascadeDialogFrame` → `cascade-motion`),
 * com o movimento reduzido passando pelo canal único do sistema.
 * ============================================================================
 */
const FONTE = readFileSync(path.resolve(process.cwd(), 'src/components/ponto/GestaoPontoAnalytics.tsx'), 'utf8');

/** Fonte sem comentários: a documentação pode citar o que saiu; o código não. */
const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('GestaoPontoAnalytics — barras padronizadas e janela em cascata', () => {
  it('todas as barras usam a MESMA borda (o pico não tem contorno mais grosso)', () => {
    expect(CODIGO).toMatch(/item\.count > 0 && 'border-\[1\.5px\] border-primary bg-primary\/20 transition-colors'/);
    expect(CODIGO).not.toMatch(/border-\[2\.5px\]/);
    expect(CODIGO).not.toMatch(/bg-primary\/\[0\.34\]/);
  });

  it('não sobrou número fixo acima da barra (o valor só aparece na dica)', () => {
    expect(CODIGO).not.toMatch(/propsRotuloBarra/);
    // O hover continua consultando o valor: a dica é quem mostra o número.
    expect(CODIGO).toMatch(/<DicaFluxoEntradas/);
    // E o selo "Pico" do cabeçalho continua derivado da série exibida.
    expect(CODIGO).toMatch(/Pico: \{horarioPico\.hour\}/);
  });

  it('a janela "Ver detalhes" usa a moldura compartilhada do popup "Pendências"', () => {
    expect(CODIGO).toMatch(/import\s*\{\s*CascadeDialogFrame\s*\}\s*from\s*'@\/components\/ui\/cascade-dialog'/);
    expect(CODIGO).toMatch(/import\s*\{\s*cascadeItemVariants\s*\}\s*from\s*'@\/components\/ui\/cascade-motion'/);
    // Movimento reduzido pelo canal único do sistema (`lib/motionMode`).
    expect(CODIGO).toMatch(/import\s*\{[^}]*\bMotionConfig\b[^}]*\}\s*from\s*'framer-motion'/);
    expect(CODIGO).toMatch(/<MotionConfig reducedMotion=\{MOTION_REDUCED_MODE\}>/);
    // Nenhuma janela estática sobrou (era o `Dialog`/`DialogContent` anterior).
    expect(CODIGO).not.toMatch(/<DialogContent\b/);
    expect(CODIGO).not.toMatch(/<DialogTrigger\b/);
    expect(CODIGO).not.toMatch(/<Dialog\b/);
  });

  it('cabeçalho + cada regra cascateiam (fechamento em 4 blocos)', () => {
    expect(CODIGO).toMatch(/blocks=\{1 \+ riscos\.length\}/);
    // Dois wrappers no fonte: o bloco do cabeçalho e o `motion.div` do `map`
    // (que gera um por regra — as 3 regras do monitor).
    expect(CODIGO.match(/variants=\{cascadeItemVariants\}/g) ?? []).toHaveLength(2);
    expect(CODIGO).toMatch(/onCloseAutoFocus=\{\(evento\) => \{/);
  });
});
