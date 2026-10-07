import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { ChartColumn } from 'lucide-react';
import { construirSerieMensal, type DesligamentoLike } from './desligamentosDerivacoes';

interface TurnoverChartProps {
  desligamentos: DesligamentoLike[];
  /** Índice na cascata de entrada da página. */
  index?: number;
}

/**
 * Séries secundárias (motivos), na ordem da legenda e com as cores pedidas na
 * referência (tokens do design system): azul/ciano = pedido de demissão, âmbar =
 * acordo mútuo, vermelho = justa causa, violeta = término de contrato e
 * cinza-azulado = outros.
 */
const CATEGORIAS = [
  { key: 'pedido', label: 'Pedido de Demissão', color: 'hsl(var(--info))' },
  { key: 'acordo', label: 'Acordo Mútuo', color: 'hsl(var(--warning))' },
  { key: 'justa', label: 'Justa Causa', color: 'hsl(var(--destructive-vivid))' },
  { key: 'termino', label: 'Término de Contrato', color: 'hsl(var(--xp))' },
  { key: 'outros', label: 'Outros', color: 'hsl(var(--muted-foreground))' },
] as const;

/**
 * Linha principal (Total) — azul-ciano luminosa, na mesma família cromática do
 * módulo (`--info`), mas mais clara/viva para se destacar como a série dominante
 * sobre as linhas secundárias.
 */
const COR_TOTAL = 'hsl(190 92% 52%)';

/* ─── Temporização da animação de ENTRADA (só deste gráfico) ──────────────────
 * Todas as séries são desenhadas da esquerda p/ a direita ao mesmo tempo, em
 * `DURACAO_S`, com progresso LINEAR pelo tempo (sem mola, sem bounce). A área do
 * total é revelada junto, por um clip horizontal sincronizado com a curva. */
const DURACAO_S = 1.8;
/** `stroke-dash` bem maior que qualquer path — esconde o traçado até desenhar. */
const DASH_OCULTO = '999999';
/** Amostras da curva do Total (comprimento→x) p/ sincronizar o clip da área. */
const AMOSTRAS = 64;

/** Ciclo ÚNICO da animação de entrada — só avança, nunca reinicia. */
type Fase = 'aguardando' | 'animando' | 'concluido';

const PERIODOS = [
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
  { value: '24', label: 'Últimos 24 meses' },
] as const;

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** "2025-11" → "Nov/25" (formato compacto do eixo X e da tooltip). */
function mesCurto(key: string): string {
  const [ano, mes] = key.split('-');
  return `${MESES_CURTO[Number(mes) - 1] ?? ''}/${ano.slice(2)}`;
}

/** Itens da legenda: as 5 categorias (marcador de linha) + o Total (linha + ponto). */
const LEGENDA = [
  ...CATEGORIAS.map((c) => ({ label: c.label, color: c.color, tipo: 'linha' as const })),
  { label: 'Total', color: COR_TOTAL, tipo: 'total' as const },
];

/** Tooltip compacta: mês no cabeçalho, categorias à esquerda, total destacado. */
function TooltipEvolucao({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number; payload?: { total?: number } }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload[0]?.payload?.total ?? 0;
  return (
    <div className="min-w-[176px] rounded-lg border border-border/60 bg-card p-2.5 shadow-elevated">
      <p className="mb-1.5 font-display text-[11px] font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {CATEGORIAS.map((c) => {
          const valor = payload.find((p) => p.dataKey === c.key)?.value ?? 0;
          return (
            <div key={c.key} className="flex items-center justify-between gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-[3px] w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                {c.label}
              </span>
              <span className="font-medium tabular-nums text-foreground">{valor}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between border-t border-border/50 pt-1.5 text-[11px]">
        <span className="font-medium text-muted-foreground">Total</span>
        <span className="font-display font-semibold tabular-nums text-foreground">{total}</span>
      </div>
    </div>
  );
}

/**
 * "Evolução dos Desligamentos" — faixa analítica compacta: cabeçalho horizontal
 * (ícone em bloco azul + título/subtítulo e o seletor de período), gráfico
 * COMPOSTO de linhas e áreas (área+linha do Total dominante e 5 linhas finas para
 * os motivos) e legenda lateral. Mesma lógica de dados de antes — só o modelo
 * visual foi trocado (era barras empilhadas).
 */
export function TurnoverChart({ desligamentos, index = 0 }: TurnoverChartProps) {
  const [meses, setMeses] = useState('12');

  // Preferência de movimento reduzido do sistema (hook já existente).
  const prefereReduzirMovimento = useReducedMotion() ?? false;
  // Exceção EXCLUSIVA do ambiente de desenvolvimento: força a animação deste
  // gráfico mesmo com "reduzir movimento" ligado no SO (para poder observá-la
  // localmente). Em PRODUÇÃO a preferência de acessibilidade é respeitada.
  const forcarAnimacaoLocal = import.meta.env.DEV;
  // DECISÃO ÚNICA — usada por todas as séries; nenhuma delas consulta a
  // preferência original diretamente.
  const reduzMovimento = !forcarAnimacaoLocal && prefereReduzirMovimento;

  const serie = useMemo(() => construirSerieMensal(desligamentos, Number(meses), new Date()), [desligamentos, meses]);
  // Rótulo "Nov/25" derivado do `key` (ex.: "2025-11") — formatação só aqui, sem
  // tocar na derivação nem nos testes dela.
  const dados = useMemo(() => serie.map((p) => ({ ...p, mes: mesCurto(p.key) })), [serie]);

  // Host local para escopo dos seletores (`hostRef`), sem seletores globais.
  const hostRef = useRef<HTMLDivElement>(null);
  const idGrafico = useId().replace(/[^a-zA-Z0-9]/g, '');
  const idArea = `gradarea-${idGrafico}`;
  const idReveal = `reveal-${idGrafico}`;

  // ─── Ciclo ÚNICO da animação de entrada ────────────────────────────────────
  // Máquina que SÓ AVANÇA: 'aguardando' → 'animando' → 'concluido'. O gatilho de
  // visibilidade liga a execução; a partir daí NADA a reinicia (re-render,
  // revalidação de dados, identidade nova de array, hover, resize, rolagem,
  // troca de período). Uma nova visita real à página (remontagem) rearma.
  const [fase, setFase] = useState<Fase>(() =>
    typeof IntersectionObserver === 'undefined' ? 'animando' : 'aguardando'
  );
  const faseEfetiva: Fase = reduzMovimento ? 'concluido' : fase;
  const dashEntrada = faseEfetiva !== 'concluido' ? DASH_OCULTO : undefined;

  // Detecção REAL de visibilidade (IntersectionObserver + aba ativa). Só dispara
  // quando ≥ METADE DA ÁREA DE PLOTAGEM (ou 140px) está visível — evita começar
  // com uma "bordinha" do card na tela e a área desenhada ainda fora de vista.
  // Dispara UMA vez (1ª entrada visível); sair/voltar não reinicia; remontar rearma.
  useEffect(() => {
    if (reduzMovimento) return;
    const host = hostRef.current;
    if (!host) return;
    let disparado = false;
    const disparar = () => {
      if (disparado) return;
      disparado = true;
      setFase('animando');
    };
    if (typeof IntersectionObserver === 'undefined') {
      disparar();
      return;
    }
    const alvoDe = (el: Element) => Math.min((el.getBoundingClientRect().height || 0) * 0.5, 140);
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting || document.visibilityState !== 'visible') continue;
          if (e.intersectionRect.height >= alvoDe(e.target)) disparar();
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    observador.observe(host);
    const aoMudarVisibilidade = () => {
      if (document.visibilityState !== 'visible') return;
      const r = host.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0) {
        if (Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0) >= Math.min(r.height * 0.5, 140)) {
          disparar();
        }
      }
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      observador.disconnect();
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [reduzMovimento]);


  // Antes de animar ('aguardando'), os traçados já vêm ocultos pelo `dash`, mas a
  // ÁREA do total não tem dash — então a escondemos com o clip horizontal de
  // largura 0. Reaplicado quando os dados mudam (paths novos) enquanto se aguarda.
  useLayoutEffect(() => {
    if (reduzMovimento || fase !== 'aguardando') return;
    const host = hostRef.current;
    if (!host) return;
    const area = host.querySelector<SVGPathElement>('path.recharts-area-area');
    const rect = host.querySelector<SVGRectElement>('rect[data-ev-reveal]');
    if (area) area.setAttribute('clip-path', `url(#${idReveal})`);
    if (rect) rect.setAttribute('width', '0');
    // `dados` só reaplica o ocultamento quando o Recharts recria os paths.
  }, [fase, reduzMovimento, dados, idReveal]);

  useLayoutEffect(() => {
    // LOOP COORDENADOR ÚNICO da entrada (linha do total + linhas dos motivos +
    // revelação da área). Deps só do ciclo (NÃO dos dados): re-render, revalidação
    // e troca de período não re-acionam. Enquanto 'animando', SÓ este loop escreve
    // nos traçados — não há animação nativa do Recharts nem do Framer concorrendo.
    if (reduzMovimento || fase !== 'animando') return;
    const host = hostRef.current;
    if (!host) return;

    let raf = 0;
    let cancelado = false;

    // Geometria capturada UMA vez e reutilizada; re-descoberta apenas se algum nó
    // foi remontado pelo Recharts (raro) — nunca medida por frame.
    type Linha = { el: SVGPathElement; len: number };
    let linhas: Linha[] = [];
    let total: { el: SVGPathElement; len: number; x0: number; tab: number[] } | null = null;
    let areaFill: SVGPathElement | null = null;
    let reveal: SVGRectElement | null = null;

    const comprimento = (el: SVGPathElement): number => {
      try {
        return el.getTotalLength();
      } catch {
        return 0;
      }
    };

    const descobrir = () => {
      linhas = [...host.querySelectorAll<SVGPathElement>('path.recharts-line-curve')].map((el) => ({
        el,
        len: comprimento(el),
      }));
      areaFill = host.querySelector<SVGPathElement>('path.recharts-area-area');
      reveal = host.querySelector<SVGRectElement>('rect[data-ev-reveal]');
      const curva = host.querySelector<SVGPathElement>('path.recharts-area-curve');
      if (curva) {
        const len = comprimento(curva);
        // Tabela comprimento→x (amostragem ÚNICA) p/ o clip da área acompanhar a
        // EXATA posição do traçado na curva, sem `getPointAtLength` por frame.
        const tab: number[] = [];
        for (let k = 0; k <= AMOSTRAS; k++) {
          tab.push(curva.getPointAtLength((len * k) / AMOSTRAS).x);
        }
        const x0 = tab[0] ?? 0;
        total = { el: curva, len, x0, tab };
        if (areaFill) areaFill.setAttribute('clip-path', `url(#${idReveal})`);
        if (reveal) {
          reveal.setAttribute('x', `${x0}`);
          reveal.setAttribute('width', '0');
        }
      }
    };
    descobrir();

    /** x do traçado na fração `frac` (0..1) do comprimento — por interpolação. */
    const xNaFracao = (frac: number): number => {
      if (!total || total.tab.length === 0) return 0;
      const idx = Math.max(0, Math.min(AMOSTRAS, frac * AMOSTRAS));
      const i = Math.floor(idx);
      const j = Math.min(AMOSTRAS, i + 1);
      const f = idx - i;
      return total.tab[i] * (1 - f) + total.tab[j] * f;
    };

    const inicio = performance.now();
    const DURACAO = DURACAO_S * 1000;

    const passo = (agora: number) => {
      if (cancelado) return;
      const t = agora - inicio;
      if (!total || !total.el.isConnected || linhas.some((l) => !l.el.isConnected)) descobrir();

      // Progresso LINEAR pelo timestamp recebido (sem incrementos fixos por frame).
      const p = Math.min(1, t / DURACAO);

      // 1) LINHAS dos motivos — revelação contínua da esquerda p/ a direita.
      for (const l of linhas) {
        if (l.len > 0) {
          l.el.style.strokeDasharray = `${l.len}`;
          l.el.style.strokeDashoffset = `${l.len * (1 - p)}`;
        }
      }

      // 2) LINHA do Total + ÁREA — o traçado avança e o clip da área revela o
      //    preenchimento EXATAMENTE até a extremidade desenhada.
      if (total && total.len > 0) {
        total.el.style.strokeDasharray = `${total.len}`;
        total.el.style.strokeDashoffset = `${total.len * (1 - p)}`;
        if (reveal) reveal.setAttribute('width', `${Math.max(0, xNaFracao(p) - total.x0)}`);
      }

      if (t >= DURACAO) {
        for (const l of linhas) {
          l.el.style.strokeDasharray = 'none';
          l.el.style.strokeDashoffset = '0';
        }
        if (total) {
          total.el.style.strokeDasharray = 'none';
          total.el.style.strokeDashoffset = '0';
        }
        // Remove o clip ⇒ a área fica completa. Traçados ficam completos e NÃO
        // remontam (por isso não há segunda execução).
        if (areaFill) areaFill.removeAttribute('clip-path');
        setFase('concluido');
        return;
      }
      // Fallback: nada renderizou em 4s ⇒ mostra tudo e encerra (sem loop infinito).
      if (t > 4000 && linhas.length === 0 && !total) {
        setFase('concluido');
        return;
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);

    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
    };
  }, [fase, reduzMovimento, idReveal]);


  return (
    <MotionConfig reducedMotion={forcarAnimacaoLocal ? 'never' : 'user'}>
      <motion.div
        custom={index}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
        }}
        initial="hidden"
        animate="visible"
      >
        <Card variant="flat" className="rounded-xl border-border/40">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-2 pt-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-info/10 text-info">
                <ChartColumn className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold leading-tight tracking-tight">Evolução dos Desligamentos</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Quantidade de desligamentos por tipo (últimos {meses} meses)
                </p>
              </div>
            </div>
            <Select value={meses} onValueChange={setMeses}>
              <SelectTrigger className="h-8 w-[168px] rounded-lg border-border/40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CardContent className="px-4 pb-3 pt-0">
            <div className="flex flex-col gap-3 md:flex-row">
              <div ref={hostRef} className="min-w-0 flex-1">
                <AnimatePresence>
                  <ResponsiveContainer width="100%" height={145}>
                    <ComposedChart data={dados} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id={idArea} x1="0" y1="0" x2="0" y2="1">
                          {/* Degradê vertical da área do Total: junto à linha a cor
                              aparece com opacidade moderada e vai desaparecendo até a
                              base (sem stops brancos/pretos, sem faixas). */}
                          <stop offset="0%" stopColor={COR_TOTAL} stopOpacity={0.25} />
                          <stop offset="45%" stopColor={COR_TOTAL} stopOpacity={0.1} />
                          <stop offset="100%" stopColor={COR_TOTAL} stopOpacity={0} />
                        </linearGradient>
                        {/* Clip horizontal (largura 0 → plot inteiro) que revela a
                            área junto com o avanço da linha do Total. y/height
                            folgados: só o eixo X importa aqui. */}
                        <clipPath id={idReveal}>
                          <rect data-ev-reveal x={0} y={-1000} width={0} height={3000} />
                        </clipPath>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} />
                      <XAxis
                        dataKey="mes"
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))', opacity: 0.4 }}
                        interval="preserveStartEnd"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        cursor={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.5 }}
                        content={<TooltipEvolucao />}
                        wrapperStyle={{ zIndex: 30, outline: 'none' }}
                      />

                      {/* Motivos: linhas finas, cor própria, mais discretas. */}
                      {CATEGORIAS.map((c) => (
                        <Line
                          key={c.key}
                          type="monotone"
                          dataKey={c.key}
                          name={c.label}
                          stroke={c.color}
                          strokeWidth={1.5}
                          strokeOpacity={0.8}
                          strokeLinecap="round"
                          strokeDasharray={dashEntrada}
                          strokeDashoffset={dashEntrada}
                          dot={false}
                          activeDot={{ r: 3, strokeWidth: 0, fill: c.color }}
                          isAnimationActive={false}
                        />
                      ))}
                      {/* Total: a série dominante (linha + área translúcida). */}
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke={COR_TOTAL}
                        strokeWidth={2.6}
                        strokeLinecap="round"
                        fill={`url(#${idArea})`}
                        fillOpacity={1}
                        strokeDasharray={dashEntrada}
                        strokeDashoffset={dashEntrada}
                        dot={false}
                        activeDot={{ r: 4.5, strokeWidth: 0, fill: COR_TOTAL }}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </AnimatePresence>
              </div>

              {/* Legenda lateral no desktop; quebra para baixo em telas pequenas. */}
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 md:w-[150px] md:flex-none md:flex-col md:flex-nowrap md:justify-center md:gap-x-0 md:gap-y-2">
                {LEGENDA.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-[11px]">
                    {item.tipo === 'total' ? (
                      <span className="relative inline-flex h-2.5 w-4 shrink-0 items-center">
                        <span className="absolute inset-x-0 h-[3px] rounded-full" style={{ backgroundColor: item.color }} />
                        <span
                          className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      </span>
                    ) : (
                      <span className="inline-flex h-2.5 w-4 shrink-0 items-center">
                        <span className="h-[3px] w-full rounded-full" style={{ backgroundColor: item.color }} />
                      </span>
                    )}
                    <span className="text-muted-foreground">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </MotionConfig>
  );
}

