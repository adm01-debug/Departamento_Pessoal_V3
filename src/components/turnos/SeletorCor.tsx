/**
 * ============================================================================
 * TURNOS & ESCALAS — SELETOR DE COR DO TURNO (100% dark, sem UI nativa).
 * ============================================================================
 *
 * O cadastro de turnos usava `<input type="color">`. O seletor NATIVO do
 * navegador é uma janela clara do sistema operacional — no dark mode do produto
 * ele aparecia como um bloco branco no meio do modal, sem herdar token, raio,
 * tipografia nem foco do Design System.
 *
 * Este componente substitui SÓ a interface de escolha: o valor continua sendo o
 * mesmo `turnos.cor` (hex `#rrggbb`), então nada muda no banco, no serviço nem
 * na validação. A peça é composta de:
 *
 *   • área de saturação × brilho (dois gradientes sobre a matiz atual);
 *   • faixa de matiz (arco-íris contínuo);
 *   • paleta de atalhos (as cores já usadas nos turnos do sistema);
 *   • pré-visualização + campo hexadecimal EDITÁVEL (regex tolerante: `#abc`,
 *     `abc`, `#aabbcc`).
 *
 * ── POR QUE NADA DE DEPENDÊNCIA NOVA ────────────────────────────────────────
 * O repo não tem biblioteca de color picker, e o que falta é geometria simples
 * (um retângulo com dois gradientes e uma faixa) + conversão hex↔HSV, que já
 * mora em `turnosCores.ts`. Um pacote extra traria CSS/imagens próprias e uma
 * segunda paleta para manter — aqui só entram tokens do DS.
 *
 * ── ACESSIBILIDADE ──────────────────────────────────────────────────────────
 * A área e a faixa são `role="slider"` com valores ARIA e navegação por setas
 * (Shift = passo grande); o campo hexadecimal é o caminho completo por teclado
 * e a paleta são botões de verdade. O arrasto usa `setPointerCapture`, então
 * sair do retângulo no meio do movimento não perde a interação.
 *
 * ── POR QUE POPOVER (e não um painel embutido) ──────────────────────────────
 * O `<PopoverContent>` do DS renderiza em PORTAL: cresce para fora do modal
 * (`CascadeDialogFrame` tem `overflow-hidden`), então o seletor nunca é
 * cortado, e reaproveita a animação de entrada de popover já existente. É o
 * mesmo caminho do `DatePicker` dentro dos diálogos do sistema.
 *
 * ── O BUG QUE DEIXAVA O SELETOR "SEM FUNCIONAR" ────────────────────────────
 * Três causas somadas, todas medidas no navegador:
 *   1. o `Dialog` modal do Radix escreve `pointer-events: none` no `<body>` e
 *      devolve `auto` só ao próprio conteúdo — o popover (portal) herdava
 *      `none`, então era DESENHADO mas todo clique atravessava para o
 *      formulário atrás;
 *   2. o `FocusScope` do diálogo roubava o foco de qualquer coisa dentro do
 *      popover (campo hexadecimal e sliders não recebiam foco), porque
 *      `node_modules` tinha DUAS cópias de `@radix-ui/react-focus-scope` e a
 *      pilha de escopos é estado de módulo;
 *   3. sem camada própria (`modal`), Esc fechava o modal inteiro em vez de só
 *      o painel.
 * A correção são três linhas e estão documentadas no markup: `modal` no
 * `Popover`, `pointer-events-auto` no `PopoverContent` e `dedupe` das camadas
 * do Radix em `vite.config.ts` (isso conserta de tabela todo `Popover` dentro
 * de `Dialog` do sistema).
 *
 * ── HIERARQUIA DO PAINEL ───────────────────────────────────────────────────
 * De cima para baixo: área de saturação/brilho → faixa de matiz → paleta em
 * grade (6 × 2) → pré-visualização da cor → campo hexadecimal editável. Todos
 * os controles leem e escrevem o MESMO estado (`hsv` + hex publicado ao
 * formulário), então escolher na paleta move o marcador da área, editar o hex
 * move marcador e paleta, e assim por diante — sincronização bidirecional.
 *
 * ── RESPIRO (o que mudou no refinamento) ───────────────────────────────────
 * Antes os cinco blocos ficavam a 15 px um do outro dentro de 320 px: a faixa
 * de matiz encostava na paleta, os círculos ficavam com 2 px de folga entre si
 * e o rótulo de cada campo praticamente tocava o controle. Agora o painel é
 * 380 px (= 19 rem na base de 20 px) com `p-4` (20 px) e `gap-3` (15 px) fixos
 * — a MESMA régua em todos os intervalos, então nada "respira" diferente do
 * vizinho. Cada campo é um bloco `space-y-2` (10 px entre rótulo e controle),
 * a paleta virou grade de células IGUAIS (círculos de 40 px com ~18 px de ar
 * entre eles, em vez de 2 px) e a amostra da prévia tem a MESMA altura do
 * campo hexadecimal (`h-9`), então os dois hexadecimais ficam na mesma linha
 * óptica. Nada mudou de função: são as mesmas classes de controle, o mesmo
 * estado e o mesmo contrato de valor.
 * ============================================================================
 */
import { useRef, useState, type PointerEvent as PointerEventReact } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { hexParaHsv, hsvParaHex, normalizarHex, type CorHsv } from './turnosCores';

export interface SeletorCorProps {
  /** Cor atual em hex (`turnos.cor`). */
  valor: string;
  /** Nova cor escolhida — sempre `#rrggbb` minúsculo. */
  onValor: (cor: string) => void;
  /** Id do gatilho (o `Label htmlFor` do formulário aponta para cá). */
  id?: string;
  /** Rótulo acessível do gatilho. */
  rotulo?: string;
  className?: string;
}

/**
 * Paleta de atalhos: as cores que já circulam nos turnos e nos tokens
 * semânticos do sistema. Não é uma segunda paleta — são atalhos para o mesmo
 * campo hexadecimal, e qualquer cor fora dela entra pelo campo/área.
 */
const PALETA = [
  '#22c55e',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#64748b',
] as const;

const HEX_VALIDO = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Hex COMPLETO (`#rrggbb` ou `rrggbb`).
 *
 * `HEX_VALIDO` (acima) aceita também a forma curta `#abc` — mas ela só pode ser
 * consolidada quando o usuário TERMINA de digitar: aplicar a cada tecla fazia
 * `#1e8` virar `#11ee88` no meio da digitação de `#1e88e5` (o quarto caractere
 * disparava a expansão, o campo era reescrito e o resto das teclas se perdia).
 * Por isso a digitação só publica com 6 dígitos; a forma curta é resolvida no
 * Enter/blur (`confirmarHex`).
 */
const HEX_COMPLETO = /^#?[0-9a-f]{6}$/i;

const limitar = (valor: number) => Math.min(1, Math.max(0, valor));

/** Posição do ponteiro (0–1) dentro do elemento que recebeu o evento. */
function fracaoDoEvento(evento: PointerEventReact<HTMLElement>): { x: number; y: number } {
  const caixa = evento.currentTarget.getBoundingClientRect();
  if (!caixa.width || !caixa.height) return { x: 0, y: 0 };
  return {
    x: limitar((evento.clientX - caixa.left) / caixa.width),
    y: limitar((evento.clientY - caixa.top) / caixa.height),
  };
}

/** Arrasto com captura de ponteiro — o mesmo para a área e para a faixa. */
function useArrasto(onMover: (x: number, y: number) => void) {
  const arrastando = useRef(false);

  return {
    onPointerDown: (evento: PointerEventReact<HTMLDivElement>) => {
      arrastando.current = true;
      evento.currentTarget.setPointerCapture(evento.pointerId);
      const { x, y } = fracaoDoEvento(evento);
      onMover(x, y);
    },
    onPointerMove: (evento: PointerEventReact<HTMLDivElement>) => {
      if (!arrastando.current) return;
      const { x, y } = fracaoDoEvento(evento);
      onMover(x, y);
    },
    onPointerUp: (evento: PointerEventReact<HTMLDivElement>) => {
      arrastando.current = false;
      if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
        evento.currentTarget.releasePointerCapture(evento.pointerId);
      }
    },
    onPointerCancel: () => {
      arrastando.current = false;
    },
  };
}

export function SeletorCor({ valor, onValor, id, rotulo = 'Cor do turno', className }: SeletorCorProps) {
  const corAtual = normalizarHex(valor);

  // `hsv` é o estado dos CONTROLES (a matiz não existe em cinzas: guardar só o
  // hex faria a faixa "pular" para o vermelho ao escolher branco/preto).
  // `assinatura` é a última cor que este componente emitiu/absorveu: quando a
  // prop muda por fora (abrir outro turno no modal), ele resincroniza.
  const [hsv, setHsv] = useState<CorHsv>(() => hexParaHsv(corAtual));
  const [assinatura, setAssinatura] = useState(corAtual);
  const [texto, setTexto] = useState(corAtual);
  const [aberto, setAberto] = useState(false);

  if (corAtual !== assinatura) {
    setAssinatura(corAtual);
    setHsv(hexParaHsv(corAtual));
    setTexto(corAtual);
  }

  /** Publica a cor: estado local + prop (o formulário é a fonte da verdade). */
  const aplicarCor = (hex: string) => {
    const normalizado = normalizarHex(hex);
    setAssinatura(normalizado);
    setTexto(normalizado);
    setHsv(hexParaHsv(normalizado));
    onValor(normalizado);
  };

  /** Ajusta só matiz/saturação/brilho a partir do que já está na tela. */
  const aplicarHsv = (parcial: Partial<CorHsv>) => {
    const proximo = { ...hsv, ...parcial };
    const hex = hsvParaHex(proximo);
    setHsv(proximo);
    setAssinatura(hex);
    setTexto(hex);
    onValor(hex);
  };

  const arrastoArea = useArrasto((x, y) => aplicarHsv({ s: x, v: 1 - y }));
  const arrastoMatiz = useArrasto((x) => aplicarHsv({ h: Math.round(x * 360) }));

  const digitarHex = (bruto: string) => {
    setTexto(bruto);
    if (HEX_COMPLETO.test(bruto.trim())) aplicarCor(bruto);
  };

  /**
   * Enter/blur: consolida o que está no campo. Hex completo já foi publicado na
   * digitação; aqui só falta a forma curta (`abc` → `#aabbcc`) — e, se o texto
   * não for hex nenhum, o campo volta para a cor atual (nunca fica "sujo").
   */
  const confirmarHex = () => {
    if (HEX_VALIDO.test(texto.trim())) aplicarCor(texto);
    else setTexto(corAtual);
  };

  // `modal`: o popover precisa participar da PILHA DE CAMADAS do diálogo —
  // ver o comentário do `PopoverContent` mais abaixo.
  return (
    <Popover modal open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={`${rotulo}: ${corAtual}`}
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-2 text-left transition-colors hover:border-primary/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            className
          )}
        >
          <span
            className="h-4 w-4 shrink-0 rounded-[4px] border border-border/50"
            style={{ backgroundColor: corAtual }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-[11px] tabular-nums text-foreground/90">{corAtual}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>

      {/*
        ── TRÊS PEÇAS QUE FAZEM O PAINEL SER CLICÁVEL/EDITÁVEL ──────────────
        1. `modal` no `Popover` (acima): o painel entra na PILHA DE CAMADAS do
           diálogo como camada superior — é o que faz o `FocusScope` dele pausar
           a armadilha de foco do modal (senão o diálogo devolve o foco para o
           gatilho a cada tentativa) e o que faz Esc fechar só o painel.
        2. `dedupe` de `@radix-ui/react-focus-scope`/`react-dismissable-layer`
           em `vite.config.ts`: sem isso o `node_modules` carrega DUAS pilhas
           independentes e o item 1 não funciona.
        3. `pointer-events-auto` aqui: o diálogo modal escreve
           `pointer-events: none` no `<body>`; como o popover é portal (fora do
           conteúdo do diálogo), sem esta classe o painel aparece desenhado mas
           TODO clique atravessa para o formulário atrás dele.

        Largura = 380 px (19 rem na base de 20 px do DS) com teto de viewport,
        e `align="start"`/`side="bottom"` ancoram o painel na borda esquerda do
        campo e o abrem para baixo. Quem decide o lado final é o Radix
        (`avoidCollisions` ligado por padrão): sem espaço abaixo, ele abre acima
        e, perto da borda da janela, desliza para dentro — nunca é cortado pelo
        modal (é portal) nem estoura o viewport.
      */}
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className="pointer-events-auto w-[19rem] max-w-[calc(100vw-2.5rem)] rounded-2xl border-border/60 bg-popover p-4 shadow-xl"
      >
        {/*
          Hierarquia pedida: área → matiz → paleta → prévia → hexadecimal.
          O respiro mora NESTE `div` (`flex flex-col gap-3` = 15 px entre todos
          os blocos), não no `className` do `PopoverContent`: o popover do DS
          embrulha os filhos num `motion.div`, então `space-y-*`/`gap-*` no
          conteúdo alcançariam só esse wrapper e os blocos ficariam colados.
        */}
        <div className="flex flex-col gap-3">
          <AreaCor hsv={hsv} corAtual={corAtual} arrasto={arrastoArea} onAjustar={aplicarHsv} />
          <FaixaMatiz hsv={hsv} arrasto={arrastoMatiz} onAjustar={aplicarHsv} />
          <PaletaCores corAtual={corAtual} onEscolher={aplicarCor} />
          <PreviaCor corAtual={corAtual} />
          <CampoHex texto={texto} onDigitar={digitarHex} onConfirmar={confirmarHex} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Área de saturação (eixo X) × brilho (eixo Y) — dois gradientes sobre a matiz.
 */
function AreaCor({
  hsv,
  corAtual,
  arrasto,
  onAjustar,
}: {
  hsv: CorHsv;
  corAtual: string;
  arrasto: ReturnType<typeof useArrasto>;
  onAjustar: (parcial: Partial<CorHsv>) => void;
}) {
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Saturação e brilho"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(hsv.v * 100)}
      aria-valuetext={`${Math.round(hsv.s * 100)}% de saturação, ${Math.round(hsv.v * 100)}% de brilho`}
      onKeyDown={(evento) => {
        const passo = evento.shiftKey ? 0.1 : 0.02;
        if (evento.key === 'ArrowLeft') onAjustar({ s: limitar(hsv.s - passo) });
        else if (evento.key === 'ArrowRight') onAjustar({ s: limitar(hsv.s + passo) });
        else if (evento.key === 'ArrowUp') onAjustar({ v: limitar(hsv.v + passo) });
        else if (evento.key === 'ArrowDown') onAjustar({ v: limitar(hsv.v - passo) });
        else return;
        evento.preventDefault();
      }}
      {...arrasto}
      className="relative h-24 w-full cursor-crosshair touch-none rounded-lg border border-border/50 shadow-inner focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
      }}
    >
      <span
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
        style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: corAtual }}
        aria-hidden
      />
    </div>
  );
}

/** Faixa de matiz — arco-íris contínuo com marcador na cor atual. */
function FaixaMatiz({
  hsv,
  arrasto,
  onAjustar,
}: {
  hsv: CorHsv;
  arrasto: ReturnType<typeof useArrasto>;
  onAjustar: (parcial: Partial<CorHsv>) => void;
}) {
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Matiz"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hsv.h)}
      onKeyDown={(evento) => {
        const passo = evento.shiftKey ? 20 : 4;
        if (evento.key === 'ArrowLeft') onAjustar({ h: (hsv.h - passo + 360) % 360 });
        else if (evento.key === 'ArrowRight') onAjustar({ h: (hsv.h + passo) % 360 });
        else if (evento.key === 'Home') onAjustar({ h: 0 });
        else if (evento.key === 'End') onAjustar({ h: 359 });
        else return;
        evento.preventDefault();
      }}
      {...arrasto}
      className="relative h-3.5 w-full cursor-pointer touch-none rounded-full border border-border/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        background:
          'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
      }}
    >
      <span
        className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
        style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        aria-hidden
      />
    </div>
  );
}

/**
 * Paleta de atalhos (mesmas cores que já circulam nos turnos do sistema).
 *
 * GRADE de 6 colunas × 2 linhas — não `flex-wrap`: com 12 amostras e largura
 * fixa, o `flex-wrap` quebrava em 7 + 5 (ou 9 + 3) e a última linha ficava
 * desalinhada da primeira. Células de largura igual + `place-items-center`
 * deixam todos os círculos no mesmo eixo, em qualquer largura do painel.
 *
 * RESPIRO: a célula é a coluna da grade (≈ 48 px) e o círculo é `h-8` (40 px),
 * então sobram ~8 px de ar em cada lado dele — somados ao `gap-2` (10 px), os
 * círculos nunca se encostam, qualquer que seja o nome da cor. O anel da cor
 * ativa usa `ring-offset-2` (10 px) e por isso também não encosta no vizinho.
 */
function PaletaCores({ corAtual, onEscolher }: { corAtual: string; onEscolher: (cor: string) => void }) {
  return (
    <div className="grid grid-cols-6 place-items-center gap-2" role="group" aria-label="Paleta de cores">
      {PALETA.map((cor) => {
        const ativa = corAtual === cor;
        return (
          <button
            key={cor}
            type="button"
            onClick={() => onEscolher(cor)}
            aria-label={`Usar a cor ${cor}`}
            aria-pressed={ativa}
            className={cn(
              'h-8 w-8 rounded-full border transition-transform duration-150 hover:scale-105 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              // Cor ativa: anel externo afastado do preenchimento — o indicador
              // não se confunde com a borda da própria amostra.
              ativa ? 'border-transparent ring-2 ring-foreground ring-offset-2 ring-offset-popover' : 'border-border/50'
            )}
            style={{ backgroundColor: cor }}
          />
        );
      })}
    </div>
  );
}

/**
 * Pré-visualização da cor selecionada (o que será gravado em `turnos.cor`).
 *
 * A amostra e o valor hexadecimal ficam na MESMA linha e com a MESMA altura
 * (`h-9`): antes o swatch era mais alto que o texto ao lado e o par lia
 * desalinhado. O valor tem largura pelo conteúdo (`shrink-0`) e algarismos
 * tabulares, então o bloco não "treme" ao arrastar a área de cor.
 */
function PreviaCor({ corAtual }: { corAtual: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
        Cor selecionada
      </p>
      <div className="flex items-center gap-2">
        <span
          className="h-9 flex-1 rounded-lg border border-border/50"
          style={{ backgroundColor: corAtual }}
          aria-hidden
        />
        <span className="grid h-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-secondary/40 px-2.5 text-[11px] font-medium tabular-nums text-foreground">
          {corAtual}
        </span>
      </div>
    </div>
  );
}

/**
 * Campo hexadecimal editável — o caminho completo por teclado.
 *
 * A digitação publica a cor assim que o valor tem 6 dígitos; a forma curta
 * (`#abc`) é consolidada no Enter/blur, junto com a limpeza de um valor
 * inválido — assim o campo nunca "reescreve o que a pessoa está digitando".
 *
 * Sem `uppercase` no texto: o hex circula em minúsculas no gatilho, nas escalas
 * e na prévia — o campo edita exatamente o mesmo valor que está gravado.
 */
function CampoHex({
  texto,
  onDigitar,
  onConfirmar,
}: {
  texto: string;
  onDigitar: (bruto: string) => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase leading-none tracking-wide text-muted-foreground">Hexadecimal</p>
      <Input
        value={texto}
        onChange={(evento) => onDigitar(evento.target.value)}
        onBlur={onConfirmar}
        onKeyDown={(evento) => {
          if (evento.key !== 'Enter') return;
          evento.preventDefault();
          onConfirmar();
        }}
        aria-label="Código hexadecimal da cor"
        spellCheck={false}
        maxLength={7}
        placeholder="#rrggbb"
        className="h-9 px-3 text-[11px] tabular-nums"
      />
    </div>
  );
}
