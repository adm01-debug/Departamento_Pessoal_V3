/**
 * ============================================================================
 * INDICADORES RESUMIDOS — QUATRO CARDS, TODOS DE INDICADOR.
 *
 * A faixa contínua original (um único `Card` com `gap-px`, valor de 16 px,
 * rótulo de 10 px e ícone de 26 px) fazia os indicadores parecerem uma régua
 * miniaturizada. Agora são QUATRO superfícies separadas, com espaço visível
 * entre elas — e as quatro medem o MESMO tipo de coisa:
 *
 *   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
 *   │ ⏳ 8 Pend.    │ │ ✓ 20h30 Aprov│ │ 📄 20 Total  │ │ ✓ 86% Taxa   │
 *   │ 14h30 de…    │ │ em 10 solic. │ │ no período…  │ │ 6 de 7 dec.  │
 *   └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
 *
 * O quarto card NÃO é mais o controle de período: filtro não é indicador e
 * não pode ocupar posição de KPI. Ele desceu para o cabeçalho da seção
 * "Aprovações pendentes" (`AprovacoesPendentes`), ao lado do "Ver todas (N)",
 * e continua alimentando TODOS estes números (o recorte por data de
 * realização é feito pela página, antes de chegar aqui).
 *
 * Medidas (px de classe × 1,25 = px renderizados na base rem de 20 px do
 * Design System — ver `docs/ESCALA-GLOBAL-DESIGN-SYSTEM.md`):
 *   vão entre cards ......... 13 px → 16 px
 *   padding interno ......... 15 px → 19 px
 *   raio .................... 11 px → 14 px
 *   valor ................... 21 px → 26 px
 *   rótulo / auxiliar ....... 11 px → 14 px / 10 px → 12,5 px
 *   bloco do ícone .......... 37 px → 46 px  (ícone 17 px → 21 px)
 *
 * UNIFORMIDADE: os quatro cards saem do MESMO componente (`Indicador`) e da
 * MESMA grade — mesma altura (a linha da grade estica as células e todas têm
 * o mesmo `padding` + a mesma pilha de texto), mesma largura proporcional
 * (`xl:grid-cols-4`), mesmo raio, mesmo alinhamento de ícone e a mesma
 * hierarquia tipográfica. O quarto indicador não é maior nem diferente.
 *
 * ENTRADA — a MESMA do Dashboard Executivo, sem nenhum número próprio aqui:
 * os quatro cards usam `entradaKpiGlobal`, a variante de KPI Cards da fila
 * única do Design System (`ui/entradaGlobal.ts` → 14 px de subida, 520 ms por
 * card, `ease-out` `cubic-bezier(0,0,.58,1)`). É LITERALMENTE a mesma
 * instância que `DashboardExecutivoPage` passa em cada `MotionCard` da tira
 * superior, com `custom` = posição do card (0…3): os slots saem 0, 1, 3, 5 —
 * 0 / 120 / 360 / 600 ms. Os vãos (slots 2 e 4) ficam reservados aos cards de
 * CONTEÚDO da página (`entradaConteudoGlobal`), que se encaixam no zíper:
 * é esse encaixe que faz a página ler como a do Dashboard Executivo.
 * `data-entrada="cascata"` desliga o `.animate-squash` que TODO `Card` carrega
 * (entrada por CSS): com as duas camadas ligadas no mesmo nó, o `transform` do
 * CSS vence o inline da Motion e a cascata vira "todos entram juntos".
 *
 * NENHUM número é inventado: pendentes/aprovadas/total, as horas somadas e a
 * taxa de aprovação vêm das solicitações reais já carregadas pela página
 * (`useHorasExtras`), recortadas pelo período selecionado. A taxa é
 * `aprovadas / (aprovadas + rejeitadas)` — pendente não entra no denominador —
 * e sem nenhuma decisão o card mostra `—` e "Nenhuma decisão no período".
 * ============================================================================
 */
import { BadgeCheck, CheckCircle2, FileText, Hourglass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EntradaPresenca, MotionCard } from '@/components/ui/entrada-cards';
import { entradaKpiGlobal, propsEntradaGlobal } from '@/components/ui/entradaGlobal';
import { cn } from '@/lib/utils';
import { descricaoTaxaAprovacao, formatarHoras, rotuloTaxaAprovacao, type ResumoDecisoes } from './horasExtrasComum';

export interface HorasExtrasKpisProps {
  /** Solicitações aguardando decisão. */
  pendentes: number;
  /** Soma das horas das solicitações pendentes. */
  horasPendentes: number;
  /** Solicitações aprovadas. */
  aprovadas: number;
  /** Soma das horas aprovadas. */
  horasAprovadas: number;
  /** Total de solicitações no período selecionado. */
  total: number;
  /** Decisões do período (aprovadas/rejeitadas/decididas) — base da taxa. */
  decisoes: ResumoDecisoes;
  /** Posição da faixa na BANDA de KPI Cards (fila intercalada do sistema). */
  index?: number;
}

/**
 * Grade dos indicadores: 1 coluna (mobile) → 2 (tablet) → 4 (desktop ≥1280 px).
 * O vão é o MESMO entre cards, linhas e colunas (13 px → 16 px renderizados).
 */
const GRADE = 'grid grid-cols-1 gap-[13px] sm:grid-cols-2 xl:grid-cols-4';

/** Superfície de UM indicador: fundo, borda, raio e respiro próprios. */
const CARTAO = 'flex min-w-0 items-center gap-[10px] rounded-[11px] border-border/50 bg-card p-[15px] text-left';
const BLOCO_ICONE = 'grid h-[37px] w-[37px] shrink-0 place-items-center rounded-[10px]';
const ICONE = 'h-[17px] w-[17px]';
const VALOR = 'shrink-0 text-[21px] font-semibold leading-none tabular-nums text-foreground';
const ROTULO = 'min-w-0 truncate text-[11px] font-medium leading-tight text-muted-foreground';
const AUXILIAR = 'mt-[5px] truncate text-[10px] leading-tight text-muted-foreground';

/** Uma superfície: ícone em bloco + valor em destaque + rótulo e texto auxiliar. */
function Indicador({
  icone: Icone,
  tom,
  valor,
  rotulo,
  auxiliar,
  index,
}: {
  icone: LucideIcon;
  tom: string;
  valor: string | number;
  rotulo: string;
  auxiliar: string;
  index: number;
}) {
  return (
    <MotionCard {...propsEntradaGlobal(index, entradaKpiGlobal)} data-entrada="cascata" className={CARTAO}>
      <span className={cn(BLOCO_ICONE, tom)}>
        <Icone className={ICONE} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-[6px]">
          <span className={VALOR}>{valor}</span>
          <span className={ROTULO} title={rotulo}>
            {rotulo}
          </span>
        </div>
        <p className={AUXILIAR} title={auxiliar}>
          {auxiliar}
        </p>
      </div>
    </MotionCard>
  );
}

export function HorasExtrasKpis({
  pendentes,
  horasPendentes,
  aprovadas,
  horasAprovadas,
  total,
  decisoes,
  index = 0,
}: HorasExtrasKpisProps) {
  return (
    <EntradaPresenca>
      <div className={GRADE}>
        <Indicador
          index={index}
          icone={Hourglass}
          tom="bg-warning/15 text-warning"
          valor={pendentes}
          rotulo="Solicitações pendentes"
          auxiliar={`${formatarHoras(horasPendentes)} de horas solicitadas`}
        />

        <Indicador
          index={index + 1}
          icone={CheckCircle2}
          tom="bg-primary/15 text-primary"
          valor={formatarHoras(horasAprovadas)}
          rotulo="Horas aprovadas"
          auxiliar={aprovadas === 1 ? 'em 1 solicitação' : `em ${aprovadas} solicitações`}
        />

        <Indicador
          index={index + 2}
          icone={FileText}
          tom="bg-info/15 text-info"
          valor={total}
          rotulo="Total de solicitações"
          auxiliar="no período selecionado"
        />

        {/* Taxa de aprovação: veredito do período — verde de status (a mesma
            família do selo "Aprovada"), nunca o lime da ação primária. */}
        <Indicador
          index={index + 3}
          icone={BadgeCheck}
          tom="bg-success/15 text-success"
          valor={rotuloTaxaAprovacao(decisoes.taxa)}
          rotulo="Taxa de aprovação"
          auxiliar={descricaoTaxaAprovacao(decisoes)}
        />
      </div>
    </EntradaPresenca>
  );
}
