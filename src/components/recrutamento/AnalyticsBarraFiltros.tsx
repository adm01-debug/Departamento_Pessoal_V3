import { Briefcase, CalendarRange, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlowHoverButton } from '@/components/ui/flow-hover-button';
import { cn } from '@/lib/utils';
import { BOTAO_ACAO, BOTAO_ACAO_SELECT, FLOW_BOTAO_ACAO } from './analyticsVisual';
import {
  PERIODOS_ANALYTICS,
  VAGA_TODAS,
  rotuloDoPeriodo,
  temFiltroAtivo,
  type FiltrosAnalytics,
  type PeriodoAnalytics,
} from './analyticsFiltros';

/**
 * ============================================================================
 * BARRA DE AÇÕES DA ANALYTICS — recorte + exportação, à direita do título
 *
 * Três controles, todos com o MESMO desenho (`BOTAO_ACAO`): fundo do card,
 * borda sutil, ícone à esquerda. Os dois primeiros são `Select` de verdade —
 * mudam o recorte de todos os painéis (ver `analyticsFiltros.ts`) — e o
 * terceiro baixa o CSV do recorte atual (`analyticsRelatorio.ts`).
 *
 * O Exportar é o único dos três que ANIMA no hover, e anima EXATAMENTE como o
 * botão "Sincronizar" do Dashboard principal: mesmo componente
 * (`ui/flow-hover-button.tsx`), mesma onda, mesmas durações — a diferença é só
 * a identidade do botão (altura, raio, tipografia, espaçamento), que continua a
 * do `BOTAO_ACAO`. Ver `FLOW_BOTAO_ACAO` em `analyticsVisual.ts` e a regressão
 * `__tests__/analyticsExportarAnimacao.test.tsx`.
 *
 * Não existe controle "decorativo" aqui: se um botão aparece, ele faz algo.
 *
 * ── POR QUE O RÓTULO É UM `div` (E NÃO UM `span`) ─────────────────────────
 * O `SelectTrigger` padrão do sistema aplica `[&>span]:line-clamp-1` em todo
 * `span` filho direto. `line-clamp-1` não é "uma linha de texto": ele troca o
 * `display` do filho para `-webkit-box` com `-webkit-box-orient: vertical`,
 * desligando o `flex` do rótulo — ícone e texto empilhavam na VERTICAL (o
 * sintoma "ícone acima do texto"). O grupo do rótulo é um `div`, que aquele
 * seletor não alcança; o corte de texto continua no `truncate` do `span`
 * interno. Os três controles formam uma linha só: ícone · rótulo · chevron.
 * ============================================================================
 */
export function AnalyticsBarraFiltros({
  filtros,
  vagas,
  onPeriodo,
  onVaga,
  onExportar,
}: {
  filtros: FiltrosAnalytics;
  /** Vagas disponíveis no recorte do módulo (`titulo` é o rótulo do item). */
  vagas: { id: string; titulo: string }[];
  onPeriodo: (periodo: PeriodoAnalytics) => void;
  onVaga: (vagaId: string) => void;
  onExportar: () => void;
}) {
  const ordenadas = [...vagas].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  const filtrando = temFiltroAtivo(filtros);
  // Com `max-w` no trigger, o título longo termina em reticências — o `title`
  // do botão é onde o nome inteiro continua legível (mesmo padrão do período).
  const tituloVaga = ordenadas.find((vaga) => vaga.id === filtros.vagaId)?.titulo ?? 'Todas as vagas';

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5" data-analytics-filtros>
      {/* Período — janela ancorada na data de referência da base. */}
      <Select value={filtros.periodo} onValueChange={(valor) => onPeriodo(valor as PeriodoAnalytics)}>
        <SelectTrigger
          className={`${BOTAO_ACAO_SELECT} min-w-[150px]`}
          aria-label="Período do recorte"
          title={`Recorte de período · ${rotuloDoPeriodo(filtros.periodo)}`}
        >
          {/* `div` e não `span`: ver o bloco do cabeçalho (line-clamp do trigger). */}
          <div className="flex min-w-0 items-center gap-1.5">
            <CalendarRange className="h-[14px] w-[14px] shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">
              <SelectValue />
            </span>
          </div>
        </SelectTrigger>
        <SelectContent align="end">
          {PERIODOS_ANALYTICS.map((opcao) => (
            <SelectItem key={opcao.value} value={opcao.value} className="text-[12.5px]">
              {opcao.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Vaga — recorta candidaturas, vagas, origens e indicadores. */}
      <Select value={filtros.vagaId} onValueChange={onVaga}>
        <SelectTrigger
          className={`${BOTAO_ACAO_SELECT} min-w-[165px] max-w-[215px]`}
          aria-label="Vaga do recorte"
          title={`Recorte por vaga · ${tituloVaga}`}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <Briefcase className="h-[14px] w-[14px] shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">
              <SelectValue />
            </span>
          </div>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value={VAGA_TODAS} className="text-[12.5px]">
            Todas as vagas
          </SelectItem>
          {ordenadas.map((vaga) => (
            <SelectItem key={vaga.id} value={vaga.id} className="text-[12.5px]">
              {vaga.titulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Exportar — CSV do que está na tela, no recorte atual. Sem largura
          mínima: o botão é do tamanho do próprio rótulo (ícone + texto).
          A ONDA de hover é a do botão "Sincronizar" do Dashboard principal —
          mesma implementação (`ui/flow-hover-button.tsx`), mesma cor de onda e
          mesmas classes de movimento (`FLOW_BOTAO_ACAO`, copiado 1:1 de
          `dashboard/DashboardHeader.tsx`). O `cn()` é obrigatório aqui: é ele
          que faz `hover:bg-primary/5` / `hover:border-primary/30` do token da
          animação substituírem `hover:bg-muted/50` / `hover:border-border` do
          `BOTAO_ACAO` (em vez de as duas regras disputarem no CSS gerado).
          O que NÃO vem do Sincronizar: altura, raio, padding, tipografia,
          espaçamento do ícone e a largura — todos seguem no `BOTAO_ACAO`. */}
      <FlowHoverButton
        type="button"
        onClick={onExportar}
        className={cn(BOTAO_ACAO, 'justify-center', FLOW_BOTAO_ACAO)}
        title="Exportar o recorte atual em CSV"
        icon={<Download className="h-[14px] w-[14px] shrink-0 text-muted-foreground" aria-hidden />}
      >
        Exportar
      </FlowHoverButton>

      {/* Marca discreta de que os painéis estão recortados (só quando estão). */}
      {filtrando && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10.5px] font-medium leading-none text-primary">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
          recorte ativo
        </span>
      )}
    </div>
  );
}
