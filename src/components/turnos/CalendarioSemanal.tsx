/**
 * ============================================================================
 * TURNOS & ESCALAS — CALENDÁRIO SEMANAL (o elemento central do painel).
 * ============================================================================
 *
 * Grade colaborador × dia (Seg … Dom), com a mesma composição da referência:
 *
 *   ┌────────────┬──────┬──────┬──────┬──── … ┐
 *   │ Colaborador│ Seg  │ Ter  │ Qua  │       │
 *   ├────────────┼──────┼──────┼──────┼──── … ┤
 *   │ (avatar)   │ turno│ turno│  —   │       │
 *   │  Nome      │ 08–17│ 08–17│ Folga│       │
 *   └────────────┴──────┴──────┴──────┴──── … ┘
 *
 * ── DENSIDADE (grade de planejamento) ───────────────────────────────────────
 * A grade é de PLANEJAMENTO, não um mural de cards: toda célula tem a MESMA
 * altura (`ALTURA_CELULA`), o mesmo raio curto e o mesmo padding interno, e os
 * vãos entre linhas/colunas são pequenos e iguais. Sem isso, um turno com nome
 * longo e uma célula vazia assumem alturas diferentes e a grade "ondula".
 *
 * ── CONTEÚDO DO CARD ────────────────────────────────────────────────────────
 * Duas linhas, alinhadas à esquerda e CENTRADAS na vertical da célula:
 *
 *   ┌────────────────────────┐
 *   │ ● Administrativo       │   ← nome 12,5px semibold (11,25px na célula estreita)
 *   │   08:00 – 17:00        │   ← horário 11,25px (10px na estreita), recuado
 *   └────────────────────────┘      junto com o nome (não com a bolinha)
 *
 * A bolinha e o nome formam a primeira linha; o horário começa na MESMA coluna
 * do nome — por isso o miolo é um grid `auto | 1fr` e o horário mora na coluna 2
 * da segunda linha, em vez de um `padding-left` chutado. Nome e horário têm
 * degraus de tamanho por CONTAINER QUERY na largura da própria célula (não por
 * viewport): a célula é que decide se o nome grande cabe, e o degrau pequeno
 * existe só para o caso em que ele não cabe (ver o bloco "DEGRAU DE LEITURA"
 * nas constantes).
 *
 * ── CORES ───────────────────────────────────────────────────────────────────
 * Cada célula com escala é pintada com a cor REAL do turno (`turnos.cor`, dado
 * do cliente) — nada de uma segunda paleta no componente. A tinta é montada em
 * três camadas, todas derivadas da MESMA cor:
 *
 *   1. `background-color` (alfa baixo) — a base que o hover acende;
 *   2. `background-image` — gradiente vertical sutil (alfa alto no topo, baixo
 *      na base), que dá volume ao card em vez do retângulo chapado;
 *   3. borda de 1px (alfa médio/alto) — o contorno colorido que separa o card
 *      do painel.
 *
 * O alfa é a única ferramenta de "saturação" aqui: sobre o painel escuro ele
 * produz o tom vivo da referência; sobre o tema claro produz o pastel
 * equivalente, com o texto do DS por cima. Por isso o card não usa cor cheia
 * (ilegível no claro) nem alfa quase zero (o problema corrigido: card da cor do
 * painel). A conversão hex→rgba é única (`turnosCores.ts`) e o hover só mexe em
 * alfa — fundo e borda acendem sem deslocar nada.
 *
 * ── CÉLULA VAZIA × FOLGA ────────────────────────────────────────────────────
 * "Sem escala cadastrada" (nenhum registro) e "Folga" (registro explícito, com
 * `status` contendo `folga`) são estados DIFERENTES, e continuam sendo: a folga
 * escreve "Folga" e tem fundo/borda um degrau acima; a vazia é uma célula mais
 * apagada que escreve "Sem escala". As duas são CÉLULAS de verdade (fundo +
 * borda de 1px, mesmo tamanho das células com turno) — é o jeito de chegar ao
 * ritmo de planilha da referência sem transformar registro ausente em folga.
 *
 * ── PREENCHIMENTO VERTICAL ──────────────────────────────────────────────────
 * O card é uma coluna flex de altura cheia: cabeçalho e rodapé medem o que
 * medem, a área das linhas é `flex-1` e CADA LINHA cresce junto (com teto de
 * `3.5rem`). Assim a base do card encosta na base do card "Próximas escalas"
 * sem `min-height` artificial e sem deixar um vão morto embaixo da grade.
 *
 * ── INTERAÇÃO ───────────────────────────────────────────────────────────────
 * Célula com escala abre os detalhes; célula vazia inicia a criação já com
 * colaborador e data preenchidos (quando há permissão de escrita). O hover só
 * reforça fundo/borda — nada muda de lugar. O card é estreito demais para nome
 * completo + faixa + intervalo, então o tooltip mostra os três; o nome do
 * colaborador truncado também tem tooltip (nome + departamento).
 *
 * ── ANIMAÇÃO ────────────────────────────────────────────────────────────────
 * Linhas em cascata e células em cascata diagonal, uma única vez por montagem
 * (`key` = visão + período no consumidor). Os números vêm da régua global —
 * ver `turnosAnimacoes.ts`. Com movimento reduzido, `initial={false}`: a grade
 * entra pronta, sem deslocamento.
 * ============================================================================
 */
import { useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { CalendarX2, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { useMovimentoReduzido } from '@/lib/motionMode';
import {
  rotuloDiaMes,
  rotuloDiaSemana,
  rotuloDiaSemanaCompleto,
  ehHoje,
  type IntervaloPeriodo,
} from './turnosCalendario';
import { hexParaRgba, normalizarHex } from './turnosCores';
import { FUNDO_CARD_OPACO } from './turnosSuperficies';
import {
  faixaHoraria,
  formatarIntervaloMinutos,
  escalaEhFolga,
  type EscalaRegistro,
  type LinhaCalendario,
  type MembroEquipe,
  type TurnoRegistro,
} from './turnosMetricas';
import { variantesCelulaCalendario, variantesLinhaCalendario } from './turnosAnimacoes';

/** Quantas linhas aparecem antes do "mostrar todos". */
const LINHAS_POR_PAGINA = 20;

/**
 * Template único das colunas (cabeçalho e linhas compartilham a régua).
 *
 * A primeira coluna é fixa em `10.5rem` (210px na base de 20px do DS) — largura
 * que cabe avatar, nome e departamento sem truncar a maioria dos nomes. As sete
 * colunas de dia dividem o resto por igual, então os dias continuam
 * proporcionais entre si. O `min-w` do bloco interno (52rem = 1040px) garante
 * que, com o container curto, a grade role na horizontal em vez de esmagar as
 * células (~117px por dia — o mínimo em que o nome do turno mais longo,
 * "Administrativo", e o horário "08:00 – 17:00" ainda cabem inteiros); a coluna
 * de colaboradores é `sticky`, então o nome nunca sai de vista durante a
 * rolagem. Acima disso a grade estica: em 1920 as células passam de 130px e os
 * sete dias aparecem sem rolagem.
 *
 * ── PROPORÇÃO (revisão) ─────────────────────────────────────────────────────
 * Largura e altura são acopladas: com células de 40px de altura e ~130px de
 * largura a grade virava uma tira achatada (3,3:1). A altura mínima subiu para
 * `2.4rem` (48px) — a célula passa a ter ~2,5:1 em 1920, a proporção da
 * referência — e as LINHAS esticam (`flex-1`, com teto) quando o card é
 * esticado para alinhar a base com a coluna lateral. Nada de `min-width`
 * maior: largura a mais só voltaria a achatar as células.
 */
const GRADE = 'grid grid-cols-[minmax(0,10.5rem)_repeat(7,minmax(0,1fr))] gap-1';

/**
 * Largura máxima do bloco da grade (78.5rem = 1570px na base de 20px).
 *
 * Acima disso as sete colunas de dia passariam de 190px cada e a célula voltaria
 * a ficar achatada (o inverso do problema que esta revisão corrige) — em monitor
 * ultra-largo o bloco para de crescer e centraliza no card. Em 1920 ou menos o
 * teto não é alcançado, então nada muda.
 */
const LARGURA_MAX_GRADE = 'max-w-[78.5rem]';

/**
 * Raio das células — MENOR que o `rounded-md` do DS de propósito.
 *
 * `--radius` (0.75rem = 15px) é calibrado para cards de 100px+; numa célula de
 * 40px ele desenha um "comprimido" e a grade perde o ar de planilha da
 * referência. 6px (→ 0.375rem depois do `postcss-escala-rem`) é o raio da
 * referência e continua suave.
 */
const RAIO_CELULA = 'rounded-[6px]';

/**
 * Altura MÍNIMA única de qualquer célula da grade (turno, folga e vazia).
 *
 * `2.4rem` = 48px na base de 20px do DS (era `2rem`/40px — achatada demais para
 * a largura que a célula recebe). Todas as células continuam com a MESMA altura:
 * elas preenchem a linha inteira (`h-full`) e a linha é que cresce, nunca uma
 * célula isolada — assim a grade não ondula entre colunas.
 */
const ALTURA_CELULA = 'h-full min-h-[2.4rem]';

/**
 * Degrau de leitura do card, decidido pela LARGURA DA PRÓPRIA CÉLULA
 * (`@container`, não breakpoint de viewport): a célula é que sabe se o nome
 * grande cabe, e ela muda de largura com a coluna lateral e com a rolagem.
 *
 * Os números vêm de medição com a fonte do DS (não de estimativa):
 *   • "Administrativo" (pior caso ativo) = 79,1px a 11,25px e 87,8px a 12,5px;
 *   • "12x36 Diurno"                      = 69,7px a 11,25px e 77,4px a 12,5px;
 *   • "08:00 – 17:00"                     = 66,8px a 10px    e 75,2px a 11,25px.
 *
 * Com padding 7,5px e o recuo da bolinha (7,5px + 5px), a célula mínima de
 * 111px deixa 83,5px para o nome — cabe 11,25px, NÃO cabe 12,5px. A partir de
 * 121px de célula (1920 em diante) o degrau grande entra com folga, sem
 * truncar o nome mais longo. Daí o `@min-[121px]:` nas classes do card:
 * abaixo disso valem as medidas pequenas; acima, nome e horário sobem um
 * degrau e o padding horizontal vai a 10px.
 */

export interface CalendarioSemanalProps {
  periodo: IntervaloPeriodo;
  linhas: LinhaCalendario[];
  turnos: readonly TurnoRegistro[];
  onAbrirEscala: (data: string, escalas: EscalaRegistro[]) => void;
  onCriarEscala: (colaborador: MembroEquipe, data: string) => void;
  podeGerenciar: boolean;
}

/** Uma célula com escala. */
function CelulaComEscala({
  escalas,
  turnos,
  rotulo,
  onClick,
}: {
  escalas: EscalaRegistro[];
  turnos: readonly TurnoRegistro[];
  rotulo: string;
  onClick: () => void;
}) {
  const escala = escalas[0];
  const turno = turnos.find((t) => t.id === escala.turno_id) ?? null;
  // O turno pode ter sido removido do catálogo: a escala traz uma cópia
  // (`escala.turno`) e o card continua legível em vez de virar "Turno".
  const dados = turno ?? escala.turno ?? null;
  const cor = normalizarHex(dados?.cor);
  const nome = dados?.nome ?? 'Turno';
  const horario = faixaHoraria(dados);
  const excedente = escalas.length - 1;
  const intervalo = turno?.intervalo_minutos ?? 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={`${rotulo}: ${nome}, ${horario}`}
          // As tintas do turno entram como CSS vars: inline style não tem
          // variante `:hover`, e com as vars o Tailwind anima fundo e borda na
          // cor EXATA do turno (dado do cliente, não token do DS). Alphas:
          // gradiente (topo 34% → base 15%), base 10% (é ela que o hover
          // acende para 18%) e borda 55% → 80% no hover.
          style={
            {
              '--celula-fundo': hexParaRgba(cor, 0.1),
              '--celula-topo': hexParaRgba(cor, 0.34),
              '--celula-base': hexParaRgba(cor, 0.15),
              '--celula-borda': hexParaRgba(cor, 0.55),
              '--celula-fundo-hover': hexParaRgba(cor, 0.18),
              '--celula-borda-hover': hexParaRgba(cor, 0.8),
            } as CSSProperties
          }
          className={cn(
            ALTURA_CELULA,
            RAIO_CELULA,
            // Duas linhas centradas na vertical da célula (as linhas da grade
            // crescem para esticar o card; com `justify-start` sobraria vão
            // embaixo e o miolo desalinharia do avatar da coluna vizinha). O
            // `py-1` é PISO, não o respiro final: quem dá os 8–16px acima e
            // abaixo é a centralização — e ele é o que garante que os 48px de
            // altura mínima das telas estreitas (1024/768) não cortem texto.
            'flex w-full flex-col justify-center overflow-hidden border px-1.5 py-1 text-left',
            '@min-[121px]:px-2',
            // Três camadas da mesma cor: cor de fundo (a que o hover acende),
            // gradiente por cima (volume) e borda colorida (contorno).
            'border-[color:var(--celula-borda)] bg-[var(--celula-fundo)]',
            'bg-[linear-gradient(160deg,var(--celula-topo),var(--celula-base))]',
            'hover:border-[color:var(--celula-borda-hover)] hover:bg-[var(--celula-fundo-hover)]',
            'transition-[background-color,border-color] duration-200 ease-out motion-reduce:transition-none',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
          )}
        >
          {/* Grid `bolinha | conteúdo`: o horário cai na coluna do NOME por
              construção (nada de `padding-left` chutado) e o `minmax(0,1fr)`
              deixa o `truncate` funcionar no nome mais longo. */}
          <span className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1 gap-y-1">
            {/* Bolinha na cor do turno: o identificador visual do card. */}
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
            <span className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 truncate text-[9px] font-semibold leading-tight text-foreground @min-[121px]:text-[10px]">
                {nome}
              </span>
              {excedente > 0 && (
                <span className="shrink-0 rounded-full bg-background/60 px-1 text-[8px] font-semibold leading-tight tabular-nums text-foreground">
                  +{excedente}
                </span>
              )}
            </span>
            {/* `text-foreground/80` (e não `muted-foreground`): sobre a tinta
                colorida o cinza do tema fica no limite de contraste nos dois
                temas; 80% do texto principal mantém a hierarquia (horário
                abaixo do nome, corpo menor) com contraste AA em ambos. */}
            <span className="col-start-2 min-w-0 truncate text-[8px] leading-tight tabular-nums text-foreground/80 @min-[121px]:text-[9px]">
              {horario}
            </span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 px-2 py-1.5 text-[11px] leading-snug">
        <p className="flex items-center gap-1.5 font-semibold">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
          {nome}
        </p>
        <p className="tabular-nums text-muted-foreground">{horario}</p>
        {intervalo > 0 && <p className="text-muted-foreground">Intervalo: {formatarIntervaloMinutos(intervalo)}</p>}
        {excedente > 0 && <p className="text-muted-foreground">+{excedente} escala(s) neste dia</p>}
      </TooltipContent>
    </Tooltip>
  );
}

/** Uma célula sem escala — distingue "folga" de "nada lançado". */
export function CelulaVazia({
  folga,
  rotulo,
  podeCriar,
  onClick,
}: {
  folga: boolean;
  rotulo: string;
  podeCriar: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!podeCriar}
      aria-label={folga ? `${rotulo}: folga` : `${rotulo}: sem escala cadastrada`}
      className={cn(
        ALTURA_CELULA,
        RAIO_CELULA,
        // Texto CENTRADO (horizontal e vertical) e tipografia no degrau pequeno:
        // a célula neutra tem a mesma altura do card de turno, mas nada compete
        // com a cor dos turnos.
        'group/celula flex w-full items-center justify-center border px-1.5 text-center transition-colors duration-200 ease-out motion-reduce:transition-none',
        // Os dois estados são CÉLULAS discretas de verdade (fundo + borda de 1px
        // sutis), com a mesma altura das células de turno — é o que dá o ritmo
        // de planilha da referência. A folga EXPLÍCITA é um degrau acima em fundo
        // e borda e escreve "Folga"; a vazia escreve "Sem escala". O texto fica
        // em `muted-foreground` cheio nos dois casos: a diferença entre eles é
        // fundo/borda, nunca legibilidade.
        folga
          ? 'border-border/50 bg-muted/25 text-muted-foreground'
          : 'border-border/30 bg-muted/10 text-muted-foreground',
        podeCriar && 'hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
      )}
    >
      {folga ? (
        <span className="text-[9px] font-medium leading-tight">Folga</span>
      ) : (
        // Sem escala: a célula existe (fundo/borda discretos, mesmo tamanho),
        // mas o texto diz o que é — nada de "Folga" inventada. Com permissão de
        // escrita o rótulo vira "+" no hover: a célula é o atalho de criação.
        <span className={cn('text-[9px] leading-tight', podeCriar && 'group-hover/celula:hidden')}>Sem escala</span>
      )}
      {!folga && podeCriar && <Plus className="hidden h-3 w-3 group-hover/celula:block" aria-hidden />}
    </button>
  );
}

export function CalendarioSemanal({
  periodo,
  linhas,
  turnos,
  onAbrirEscala,
  onCriarEscala,
  podeGerenciar,
}: CalendarioSemanalProps) {
  const reduzir = useMovimentoReduzido();
  const [expandido, setExpandido] = useState(false);

  const visiveis = useMemo(() => (expandido ? linhas : linhas.slice(0, LINHAS_POR_PAGINA)), [expandido, linhas]);
  const restantes = linhas.length - visiveis.length;

  return (
    <TooltipProvider delayDuration={150}>
      {/* Card = coluna flex de altura cheia: cabeçalho e rodapé com o tamanho do
          conteúdo, área da grade `flex-1`. É o que permite o card esticar até a
          base da coluna lateral (o `min-h-fit` evita corte quando o conteúdo
          passa da altura disponível, ex.: 20 colaboradores expandidos). */}
      <div className="flex h-full min-h-fit flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/40">
        <div className="flex-1 overflow-x-auto">
          <div className={cn('mx-auto flex min-h-full w-full min-w-[52rem] flex-col p-2', LARGURA_MAX_GRADE)}>
            {/* Cabeçalho: rótulo da primeira coluna + os sete dias.
                `items-stretch` + `flex items-center` no rótulo: a primeira
                célula tem a MESMA altura da linha de cabeçalhos e o texto fica
                centrado verticalmente nela (antes o rótulo era `items-end` com
                um bloco de fundo próprio — o "retângulo" solto atrás da
                palavra). O fundo é `FUNDO_CARD_OPACO`, a cor aparente do card:
                a célula continua opaca para a coluna de nomes não vazar por
                baixo na rolagem horizontal, mas sem emenda de tom. Padding
                horizontal `px-1.5` = o mesmo da coluna de nomes, então rótulo,
                avatar e nome começam exatamente no mesmo eixo. */}
            <div className={cn(GRADE, 'items-stretch pb-1')}>
              <div
                className={cn(
                  'sticky left-0 z-10 flex items-center px-1.5 text-[10px] font-medium text-muted-foreground',
                  FUNDO_CARD_OPACO
                )}
              >
                Colaborador
              </div>
              {periodo.dias.map((dia) => {
                const hoje = ehHoje(dia);
                return (
                  <div
                    key={dia}
                    // `border` transparente em TODOS: o dia atual ganha só a cor,
                    // então o box do cabeçalho não muda de altura ao navegar.
                    className={cn(
                      RAIO_CELULA,
                      'border border-transparent px-1 py-0.5 text-center leading-tight',
                      hoje && 'border-primary/30 bg-primary/10'
                    )}
                  >
                    <p className={cn('text-[10px]', hoje ? 'text-primary' : 'text-muted-foreground')}>
                      {rotuloDiaSemana(dia)}
                    </p>
                    <p
                      className={cn(
                        'text-[11px] font-semibold tabular-nums',
                        hoje ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {rotuloDiaMes(dia)}
                    </p>
                  </div>
                );
              })}
            </div>

            {visiveis.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <CalendarX2 className="h-7 w-7 text-muted-foreground" aria-hidden />
                <p className="text-[13px] text-muted-foreground">Nenhum colaborador para os filtros atuais.</p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-1">
                {visiveis.map((linha, indiceLinha) => (
                  <motion.div
                    key={linha.colaborador.id}
                    custom={indiceLinha}
                    variants={variantesLinhaCalendario}
                    initial={reduzir ? false : 'oculto'}
                    animate="visivel"
                    // `flex-1`: a linha cresce (até o teto) para ocupar a altura
                    // que sobra no card — é assim que a grade aproveita o espaço
                    // vertical sem esticar as células além da conta.
                    className={cn(GRADE, 'max-h-[3.5rem] flex-1 items-stretch')}
                  >
                    {/* Coluna fixa: fica visível na rolagem horizontal da grade.
                        `FUNDO_CARD_OPACO` = a cor aparente do card (opaca, para a
                        célula não vazar a coluna de dias por baixo), a mesma do
                        rótulo do cabeçalho — é o que faz a primeira coluna ler
                        como UMA faixa só, do cabeçalho à última linha. */}
                    <div
                      className={cn('sticky left-0 z-10 flex items-center gap-2 rounded-md px-1.5', FUNDO_CARD_OPACO)}
                    >
                      <UserAvatar
                        name={linha.colaborador.nome_completo}
                        size="sm"
                        className="h-6 w-6 shrink-0 text-[8px]"
                      />
                      <div className="min-w-0">
                        {/* `title` = acesso ao nome completo quando o truncamento
                          entrar em ação (a coluna é fixa, a largura não cresce). */}
                        <p
                          className="truncate text-[10px] font-semibold leading-tight text-foreground"
                          title={linha.colaborador.nome_completo}
                        >
                          {linha.colaborador.nome_completo}
                        </p>
                        <p
                          className="truncate text-[9px] leading-tight text-muted-foreground"
                          title={linha.colaborador.departamento || 'Sem departamento'}
                        >
                          {linha.colaborador.departamento || 'Sem departamento'}
                        </p>
                      </div>
                    </div>

                    {periodo.dias.map((dia, indiceColuna) => {
                      // Registro com status de folga NÃO é turno: vira o chip
                      // "Folga". Só o que sobra (turno de verdade) pinta a célula.
                      const doDia = linha.escalasPorDia.get(dia) ?? [];
                      const deTurno = doDia.filter((escala) => !escalaEhFolga(escala));
                      const temFolga = doDia.some((escala) => escalaEhFolga(escala));
                      const rotulo = `${linha.colaborador.nome_completo} · ${rotuloDiaSemanaCompleto(dia)} ${rotuloDiaMes(dia)}`;

                      return (
                        <motion.div
                          key={`${linha.colaborador.id}-${dia}`}
                          custom={[indiceLinha, indiceColuna] as [number, number]}
                          variants={variantesCelulaCalendario}
                          // Sem anel por célula na coluna de hoje: o destaque do dia
                          // atual fica no CABEÇALHO (discreto) — marcar as sete
                          // células viraria uma moldura grande no meio da grade.
                          // `@container`: a célula é a régua dos degraus de leitura
                          // do card (`@min-[121px]:` lá dentro) — a largura que
                          // importa é a DESTA célula, não a da viewport.
                          className="@container min-w-0"
                        >
                          {deTurno.length > 0 ? (
                            <CelulaComEscala
                              escalas={deTurno}
                              turnos={turnos}
                              rotulo={rotulo}
                              onClick={() => onAbrirEscala(dia, doDia)}
                            />
                          ) : (
                            <CelulaVazia
                              folga={temFolga}
                              rotulo={rotulo}
                              podeCriar={podeGerenciar}
                              onClick={() => onCriarEscala(linha.colaborador, dia)}
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ))}
              </div>
            )}

            {restantes > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setExpandido(true)}
                  className="rounded-lg px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  Mostrar todos os {linhas.length} colaboradores
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
