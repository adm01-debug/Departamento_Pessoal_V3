/**
 * ============================================================================
 * CABEÇALHO DA PÁGINA — faixa compacta, SEM cartão externo.
 *
 * Segue a MESMA receita do cabeçalho aprovado de Horas Extras
 * (`horas-extras/CabecalhoSolicitacoes.tsx`): o bloco título/subtítulo vive
 * direto sobre o fundo da página, na escala dos demais módulos — bloco do ícone
 * de 34 px (42,5 px renderizados) e botão de 31 px (38,75 px) —, e a tipografia
 * é a do cabeçalho padrão do sistema (`PageLayout`): `text-2xl` + `font-display`
 * + `font-medium` + `tracking-tight`.
 *
 *   [ ícone do módulo ]  Banco de Horas
 *                        Saldos, créditos e débitos…          [ Exportar ]
 *
 * O ícone é o `Scale` que a navegação lateral usa para esta rota
 * (`AppSidebar` → `color: 'text-info'`), no gradiente de informação do Design
 * System (`from-info` + `glow-info`) para casar com a cor do item de menu.
 *
 * Nada além de apresentação mora aqui: o botão apenas chama `onExportar` e a
 * página segue dona da consulta e do recorte exportado.
 * ============================================================================
 */
/**
 * ============================================================================
 * CABEÇALHO DA PÁGINA — uma única linha: título à esquerda, controles à direita.
 *
 *   [ícone] Banco de Horas            [período] [Mais filtros] [Exportar]
 *           Acompanhe as movimentações…
 *
 * A composição segue a terceira imagem de referência (aprovada): o bloco
 * título/subtítulo fica à esquerda, e os TRÊS controles ficam na mesma linha,
 * alinhados ao centro vertical do bloco. Antes só existia o "Exportar" — o
 * período e os filtros avançados moravam dentro do card do extrato e comiam a
 * altura da tabela; agora eles sobem para cá (ver `FiltrosCabecalhoBancoHoras`).
 *
 * Tipografia e ícones são os do cabeçalho padrão do sistema (`PageLayout`):
 * `text-2xl` + `font-display` + `font-medium` + `tracking-tight`, bloco de
 * ícone de 34 px no gradiente de informação (`from-info` + `glow-info`) que a
 * navegação lateral usa para esta rota. Nada de nova paleta nem novo ícone.
 *
 * Nada além de apresentação mora aqui: os controles avisam a página, que é
 * dona do recorte (período + filtros) e da exportação.
 *
 * ── A LINGUAGEM DA FAIXA (os três controles) ───────────────────────────────
 * Mesma altura (34 px de classe), mesmo raio (`rounded-[10px]`), mesmo `gap`
 * (8 px) e a mesma tipografia (`text-[12px] font-medium`), para a linha ler
 * como um bloco só:
 *
 *   [período]        Select do DS (`ui/select.tsx`) — fundo escuro, borda
 *                    neutra, calendário à esquerda e chevron que gira ao abrir;
 *                    hover só acende a borda em lime fosco (SEM halo).
 *   [Mais filtros]   `outline` escuro no repouso; no hover ganha borda lime +
 *                    halo lime de baixa opacidade; com QUALQUER filtro ativo
 *                    usa o estado padronizado de "filtro ligado" (tinta lime
 *                    10% + borda 50% + texto lime), o mesmo dos chips compactos
 *                    de `ui/filter-chip`.
 *   [Exportar]       único preenchido em lime (`--primary`), a ação principal.
 *
 * Halo (`shadow-glow`) só existe onde há intenção de destaque: "Mais filtros"
 * no hover e "Exportar" no hover. Nada de animação pulsante em estado nenhum.
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { Download, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { BotaoMaisFiltros, SeletorPeriodoBancoHoras } from './FiltrosCabecalhoBancoHoras';
import type { FiltrosExtrato, PeriodoExtrato } from './bancoHorasComum';

/**
 * ── "EXPORTAR" — O LIME DO SISTEMA (ação principal da faixa) ───────────────
 *
 * Antes o botão era `variant="outline"` sem cor própria: mesmo peso visual do
 * período e do "Mais filtros", e a única ação que ENTREGA algo (o CSV do
 * recorte) não se distinguia das duas que só mudam o recorte. Agora ele é o
 * único preenchido:
 *
 *   • fundo `--primary` (68 100% 48%, o lime "Bombon Lime" do DS) e texto
 *     `--primary-foreground` (240 20% 6%, o quase-preto do fundo principal) —
 *     a MESMA dupla `bg-primary`/`text-primary-foreground` do variant `default`
 *     do Button, da pill de etapa ativa e do CTA do Dashboard. Nenhum tom novo:
 *     o ícone não tem cor própria e herda o `currentColor` (vem escuro junto);
 *   • hover sobe UM DEGRAU de brilho no lime — `--primary-glow` (58% no tema
 *     claro, 60% no escuro; é o token que os degradês do DS já usam) — e acende
 *     o halo lime `shadow-glow` (`0 0 20px -5px`, a régua de todo glow do
 *     sistema). Halo é `box-shadow`: não muda tamanho nem empurra vizinho;
 *   • `active:scale-[0.98]` na pressão (2%, o mesmo passo dos CTAs), sem pulso
 *     contínuo em nenhum estado;
 *   • foco de teclado com anel INTERNO na cor do texto: o `--ring` do tema
 *     também é lime e desapareceria sobre o fundo lime — quase-preto sobre lime
 *     dá ~15:1 de contraste;
 *   • `duration-fast` (220 ms) — a faixa pedida de 200–250 ms e o passo de
 *     micro-interação da régua global de movimento (`docs/motion-regua-global.md`).
 *
 * Altura (34 px de classe, 42,5 px renderizados pela escala de 125%), raio,
 * `px` e `gap` são os mesmos dos outros dois controles: a linha continua
 * alinhada no eixo vertical.
 *
 * POR QUE `variant="outline"` (e não o `default`): o variant `default` traz
 * `hover:shadow-sm`, e `shadow-sm` + `shadow-glow` NÃO se anulam no
 * `tailwind-merge` (o `glow` é um nome do tema, então o merge o lê como COR de
 * sombra e mantém as duas classes) — na cascata o `shadow-sm` vencia e o halo
 * lime não aparecia no hover. O `outline` não declara sombra nenhuma, então o
 * `shadow-xs` do repouso e o `hover:shadow-glow` são os únicos da lista e
 * valem exatamente o que está escrito. Cor, borda e texto continuam todos
 * declarados aqui — nada é herdado do variant.
 */
const CLASSES_EXPORTAR = cn(
  'h-[34px] shrink-0 gap-[8px] rounded-[10px] px-[16px] text-[12px] font-semibold',
  'border border-primary bg-primary text-primary-foreground',
  'shadow-xs transition-all duration-fast',
  'hover:border-primary-glow hover:bg-primary-glow hover:text-primary-foreground hover:shadow-glow',
  'active:scale-[0.98]',
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground'
);

export interface CabecalhoBancoHorasProps {
  /** Recorte de datas da página (o mesmo que alimenta KPIs, gráficos e extrato). */
  periodo: PeriodoExtrato;
  onPeriodoChange: (periodo: PeriodoExtrato) => void;
  /** Filtros do extrato — o "Mais filtros" espelha o chip de saldos negativos. */
  filtros: FiltrosExtrato;
  onFiltrosChange: (filtros: FiltrosExtrato) => void;
  /** Zera período, busca e tipo de uma vez. */
  onLimparFiltros: () => void;
  /** Exporta o recorte atual em CSV (ação já existente na página). */
  onExportar: () => void;
  /** Sem lançamentos no recorte não há o que exportar. */
  podeExportar?: boolean;
  /** Posição do bloco na fila de entrada (0 = abre a página). */
  index?: number;
}

export function CabecalhoBancoHoras({
  periodo,
  onPeriodoChange,
  filtros,
  onFiltrosChange,
  onLimparFiltros,
  onExportar,
  podeExportar = true,
  index = 0,
}: CabecalhoBancoHorasProps) {
  return (
    <EntradaPresenca>
      <motion.header
        {...entradaCard(index)}
        className="flex min-h-[38px] flex-wrap items-center justify-between gap-x-[14px] gap-y-[8px] py-[2px]"
      >
        <div className="flex min-w-0 items-start gap-[12px] sm:items-center">
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-info to-info/60 text-info-foreground shadow-glow-info">
            <Scale className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-medium tracking-tight">Banco de Horas</h1>
            <p className="mt-[2px] text-[11px] leading-snug text-muted-foreground">
              Acompanhe as movimentações, saldos e históricos de banco de horas da equipe.
            </p>
          </div>
        </div>

        {/* Controles do recorte: período → filtros avançados → exportação. */}
        <div className="flex flex-wrap items-center justify-end gap-[8px]">
          <SeletorPeriodoBancoHoras periodo={periodo} onPeriodoChange={onPeriodoChange} />
          <BotaoMaisFiltros
            periodo={periodo}
            onPeriodoChange={onPeriodoChange}
            filtros={filtros}
            onFiltrosChange={onFiltrosChange}
            onLimpar={onLimparFiltros}
          />
          <Button
            variant="outline"
            onClick={onExportar}
            disabled={!podeExportar}
            title="Exporta os lançamentos do período selecionado em CSV"
            className={CLASSES_EXPORTAR}
          >
            <Download className="h-[15px] w-[15px]" aria-hidden />
            Exportar
          </Button>
        </div>
      </motion.header>
    </EntradaPresenca>
  );
}
