/**
 * ============================================================================
 * APROVAÇÕES PENDENTES — fila de decisão (cabeçalho solto + grade de cartões).
 *
 * ESTRUTURA (reconstruída para a referência aprovada):
 *
 *   Aprovações pendentes   (ícone + subtítulo)   [Todo o período ▾] [Ver todas ▾] [8 solicitações]
 *   ┌──────────────────────────┐ ┌──────────────────────────┐ ┌───────────┐
 *   │ (avatar) Nome [Pendente] │ │ …                        │ │ …         │
 *   │ ──────────────────────── │ …                          │ …           │
 *   │ (data) 07/10  │  2h30    │ …                          │ …           │
 *   │ [ motivo…              ] │ …                          │ …           │
 *   │ [Ver] [✓ Aprovar] [✗]    │ …                          │ …           │
 *   └──────────────────────────┘ └──────────────────────────┘ └───────────┘
 *
 * DIFERENÇAS EM RELAÇÃO À VERSÃO ANTERIOR (só apresentação):
 *  - O FILTRO DE PERÍODO desceu para cá. Ele ocupava o quarto card da faixa
 *    de indicadores — posição de KPI, que filtro não é. Agora é um controle
 *    compacto no cabeçalho desta seção, à esquerda do "Ver todas", com
 *    calendário + rótulo do preset + chevron (`CLASSE_SELECT_PERIODO`) e a
 *    faixa exata de datas no `title`. Continua sendo o MESMO estado da
 *    página: mudar aqui recorta KPIs, fila e histórico.
 *  - O controle "Ver todas (N)" / "Mostrar menos" deixou de parecer texto
 *    secundário: é BOTÃO SECUNDÁRIO com borda e fundo translúcidos na cor de
 *    ação informativa (`CLASSE_BOTAO_SECUNDARIO_INFO`, em `horasExtrasComum`),
 *    37,5 px renderizados de altura e 13,75 px de respiro lateral — a MESMA
 *    régua do período ao lado (`CLASSE_CONTROLE_SECAO`), para que nenhum dos
 *    dois fique mais alto que o outro. O lime preenchido continua reservado à
 *    ação primária.
 *  - O cabeçalho da seção NÃO é mais um cartão: é uma faixa compacta sobre o
 *    fundo da página, imediatamente acima dos cartões (mesma seção visual).
 *    Ele quebra linha (`flex-wrap`) em vez de sobrepor ou cortar controles.
 *  - O cartão é compacto (~254 px renderizados): identificação, data/horas,
 *    motivo e ações em quatro blocos horizontais, com respiro interno de 15 px
 *    de classe (18,75 px) e 10–13 px entre blocos — sem vãos mortos.
 *  - APENAS TRÊS cartões são exibidos no estado inicial — é a composição da
 *    referência, que mostra o histórico logo abaixo. O contador do cabeçalho
 *    continua com o TOTAL REAL e o controle "Ver todas (N)" revela as demais
 *    (e recolhe de novo). Nenhuma solicitação é descartada, nenhuma consulta
 *    é limitada: o recorte é só de APRESENTAÇÃO (`LIMITE_CARTOES`).
 *
 * PALETA DO CARTÃO (revisão pedida — só COR, nenhuma medida):
 *  - SELO "Pendente" em ÂMBAR. A cor não é local: vem de `seloStatus`
 *    (`horasExtrasComum`), então o mesmo pill aparece no card, na tabela do
 *    histórico e no modal de detalhes. Fundo `/12`, borda `/30`, texto no token
 *    `--warning` (`#F59E0B` no claro, `#F5A314` no escuro). Translúcido, nunca
 *    sólido — o mesmo padrão de "Aprovada" e "Rejeitada".
 *  - "VER DETALHES" NEUTRO, LIME SÓ NO HOVER/FOCO (`CLASSE_BOTAO_DETALHES`):
 *    o botão é a porta de entrada para a leitura do pedido, não uma decisão —
 *    em repouso ele continua no cinza discreto que divide a linha com
 *    Aprovar/Rejeitar. No hover (e no foco por teclado) texto e borda passam
 *    ao lime da marca (`--primary`) com fundo `primary/10`: a MESMA receita de
 *    hover já usada nas ações de ícone do sistema. Aprovar/Rejeitar ficam
 *    intactos — verde e vermelho são VEREDITO e não se misturam com a ação
 *    neutra.
 *  - DESCRIÇÃO (motivo) sobre AZUL TRANSLÚCIDO — a MESMA receita do controle
 *    "Ver todas (N)" (`CLASSE_BOTAO_SECUNDARIO_INFO`, em `horasExtrasComum`):
 *    `bg-info/10` + `border-info/40` + ícone no token `--info`. Nenhuma cor
 *    nova: reaproveita o azul informativo do sistema (`hsl(199 89% 50%)` no
 *    escuro, `hsl(199 89% 48%)` no claro). O fundo fica nos 10% (o
 *    `rgba(0, 170, 255, 0.10)` pedido — translúcido, nunca sólido) e a borda
 *    vai a 40%, um passo acima dos 30% do botão: a faixa é larga e o contorno
 *    precisa fechar o bloco para o azul ficar evidente. O TEXTO continua
 *    neutro (`text-muted-foreground`) — quem carrega a cor é a superfície e o
 *    ícone, a leitura fica na hierarquia do cartão. Sem hover: a faixa não é
 *    clicável, então não pode parecer um controle.
 *  - NADA de medida mudou: mesmos `p-[15px]`, `gap-[8px]`, `h-[31px]`,
 *    `min-h-[34px]`, `rounded-[8px]/[11px]` e a mesma grade de três colunas.
 *
 * ENTRADA (mesma linguagem de movimento do Dashboard Executivo):
 *  - O cabeçalho da seção e os cartões entram pela BANDA DE CONTEÚDO da fila
 *    única (`ui/entradaGlobal.ts` → `entradaConteudoGlobal`: slots 0, 2, 4, 7,
 *    8…). Ela é o outro lado do zíper dos KPI Cards (`entradaKpiGlobal`, slots
 *    0, 1, 3, 5): os dois primeiros cards de conteúdo preenchem os vãos entre os
 *    KPIs e, do quarto em diante, a fila segue sozinha. Mesmos números em toda
 *    a página: 14 px de subida, 520 ms por card, 120 ms entre inícios e
 *    `ease-out` — nenhum valor é declarado neste arquivo.
 *  - `data-entrada="cascata"` nos `MotionCard`: o `Card` do design system
 *    carrega `.animate-squash` (entrada por CSS). Sem o opt-out, CSS e Motion
 *    animariam `opacity`/`transform` no MESMO nó e o `transform` do CSS venceria
 *    o inline da Motion — os cartões apareceriam todos juntos, sem cascata.
 *  - EXECUÇÃO ÚNICA: o slot de cada cartão é congelado na montagem
 *    (`useState` com inicializador). Aprovar/rejeitar desloca os cartões
 *    restantes, o período/filtros re-renderizam a lista e nada disso muda a
 *    posição na fila de um cartão já visível — a entrada é um evento de
 *    montagem, não de render.
 *  - Cartões revelados pelo "Ver todas" são uma LEVA NOVA: entram na fila
 *    simples a partir de 0 (120 ms entre eles), imediatamente. Esperar o slot
 *    global faria o 4º cartão esperar ~840 ms sem nada acontecendo na tela — o
 *    movimento é o mesmo, só o relógio da leva nova começa do zero.
 *
 * REGRAS PRESERVADAS:
 *  - Só aparecem solicitações com status `pendente`; a lista completa (com
 *    aprovadas e rejeitadas) continua na seção de histórico.
 *  - `Aprovar` e `Rejeitar` chamam os mesmos handlers da página (`aprovar` /
 *    `rejeitar` do serviço), para QUALQUER registro — inclusive os que estão
 *    atrás do "Ver todas".
 *  - O selo de status é um VEREDITO (pill translúcido de `seloStatus`) e o
 *    departamento é o real; sem departamento no vínculo, continua o estado
 *    informativo "Departamento não informado" (nenhum departamento é
 *    inventado).
 *  - Duplo envio: enquanto uma decisão está em voo, os dois botões de decisão
 *    ficam desabilitados e mostram o spinner — a mutation continua sendo a
 *    única fonte de escrita.
 * ============================================================================
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  ClipboardCheck,
  FileText,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { UserAvatar } from '@/components/ui/user-avatar';
import { EntradaPresenca, MotionCard } from '@/components/ui/entrada-cards';
import { entradaCardGlobal, entradaConteudoGlobal, propsEntradaGlobal } from '@/components/ui/entradaGlobal';
import { cn } from '@/lib/utils';
import {
  CLASSE_BOTAO_SECUNDARIO_INFO,
  CLASSE_SELECT_PERIODO,
  MEDIDA_SELECT_PERIODO,
  PERIODO_OPCOES,
  dataDaRealizacao,
  departamentoDoColaborador,
  formatarHoras,
  nomeDoColaborador,
  rotuloOpcaoPeriodo,
  rotuloPeriodo,
  rotuloStatus,
  seloStatus,
  type PeriodoId,
  type SolicitacaoHoraExtra,
} from './horasExtrasComum';

export interface AprovacoesPendentesProps {
  /** Somente as solicitações pendentes (a página já recorta o período). */
  solicitacoes: readonly SolicitacaoHoraExtra[];
  /** Período selecionado — o MESMO recorte dos indicadores e do histórico. */
  periodo: PeriodoId;
  onPeriodoChange: (periodo: PeriodoId) => void;
  onVerDetalhes: (s: SolicitacaoHoraExtra) => void;
  onAprovar: (s: SolicitacaoHoraExtra) => void | Promise<void>;
  onRejeitar: (s: SolicitacaoHoraExtra) => void | Promise<void>;
  /** Posição da seção na BANDA DE CONTEÚDO da fila única (zip com os KPIs). */
  index?: number;
}

/**
 * Quantos cartões a fila mostra ANTES do "Ver todas". Três é a composição da
 * referência (uma linha de desktop larga). Não é limite de dados — a lista
 * inteira continua em `solicitacoes` e é revelada pelo botão do cabeçalho.
 *
 * EXPORTADO porque a página precisa do MESMO número para posicionar o histórico
 * na fila de entrada (`index` = cartões visíveis + 1): a faixa de baixo entra
 * depois dos cartões, nunca no mesmo slot. Uma fonte só — mudar a composição
 * aqui move a fila do histórico junto.
 */
export const LIMITE_CARTOES = 3;

/** Rótulo "N solicitações" da pill do cabeçalho (sempre o TOTAL real). */
function rotuloQuantidade(qtd: number): string {
  return qtd === 1 ? '1 solicitação' : `${qtd} solicitações`;
}

/**
 * BOTÃO "VER DETALHES" — repouso NEUTRO, hover/foco em LIME.
 *
 * O botão NÃO é decisão: divide a linha com Aprovar (verde) e Rejeitar
 * (vermelho), então em repouso continua no cinza translúcido de antes —
 * `border-border/60 bg-muted/20`, texto herdado. Só o MOUSE (e o foco por
 * teclado) acende o lime da marca: texto `text-primary`, borda
 * `border-primary/45` e fundo `bg-primary/10` (10% de alfa, a faixa pedida de
 * 8–12%) — a mesma receita de hover das ações de ícone do sistema
 * (`hover:bg-primary/10 hover:text-primary`), em vez de uma cor nova.
 *
 * `transition-colors duration-200`: a troca é só de COR e leva 200 ms — dentro
 * da faixa 180–200 ms pedida, um passo abaixo dos 220 ms de
 * `--transition-duration-fast` (a régua de hover do `index.css`). Sair do
 * `transition-all` do `Button` é intencional: nenhuma outra propriedade muda
 * aqui, então nada pode "arrastar" junto no hover.
 *
 * O foco por teclado repete a MESMA paleta (`focus-visible:*`) para quem navega
 * sem mouse; o anel (`focus-visible:ring-2 ring-ring`) continua vindo do
 * `Button`. Aprovar e Rejeitar não são tocados.
 */
const CLASSE_BOTAO_DETALHES =
  'h-[31px] gap-[5px] rounded-[8px] border-border/60 bg-muted/20 px-[6px] text-[11px] font-medium transition-colors duration-200 hover:border-primary/45 hover:bg-primary/10 hover:text-primary focus-visible:border-primary/45 focus-visible:bg-primary/10 focus-visible:text-primary';

function CartaoPendente({
  solicitacao: s,
  posicao,
  baseEntrada,
  onVerDetalhes,
  onAprovar,
  onRejeitar,
}: {
  solicitacao: SolicitacaoHoraExtra;
  /** Posição do cartão na LEVA exibida (0 = primeiro cartão visível). */
  posicao: number;
  /** Posição da seção na BANDA DE CONTEÚDO da página (zip com os KPIs). */
  baseEntrada: number;
} & Pick<AprovacoesPendentesProps, 'onVerDetalhes' | 'onAprovar' | 'onRejeitar'>) {
  const nome = nomeDoColaborador(s);
  const departamento = departamentoDoColaborador(s);
  const motivo = s.motivo?.trim() || 'Motivo não informado';
  const data = dataDaRealizacao(s);
  const horas = formatarHoras(s.horas_solicitadas);

  /**
   * Decisão em voo — trava o duplo envio sem tocar na regra de negócio.
   */
  const [decidindo, setDecidindo] = useState<'aprovar' | 'rejeitar' | null>(null);

  /**
   * ENTRADA — resolvida UMA vez, na montagem (`useState` com inicializador), e
   * nunca mais: a posição na fila não pode depender do render. Aprovar, rejeitar
   * ou trocar o período desloca os cartões restantes; se o slot fosse
   * recalculado, o `custom` mudaria e a Motion reavaliaria a variante de um
   * cartão já visível. Congelado, filtro/atualização/decisão não reiniciam nada.
   *
   * Duas levas, um movimento só (mesmos 14 px / 520 ms / 120 ms / `ease-out`):
   *   • os TRÊS cartões da composição inicial entram na BANDA DE CONTEÚDO, logo
   *     depois do cabeçalho da seção (`baseEntrada + 1 + posicao`) — é o lado do
   *     zíper que preenche os vãos dos KPI Cards, como no Dashboard Executivo;
   *   • os cartões revelados pelo "Ver todas" são leva nova: fila simples a
   *     partir de 0, sem herdar a espera de slots que já passaram.
   */
  const [entrada] = useState<{ posicao: number; variantes: Variants }>(() =>
    posicao < LIMITE_CARTOES
      ? { posicao: baseEntrada + 1 + posicao, variantes: entradaConteudoGlobal }
      : { posicao: posicao - LIMITE_CARTOES, variantes: entradaCardGlobal }
  );

  const decidir = (qual: 'aprovar' | 'rejeitar', executar: (s: SolicitacaoHoraExtra) => void | Promise<void>) => {
    if (decidindo) return;
    setDecidindo(qual);
    // `Promise.resolve` normaliza os dois formatos de handler (síncrono/async)
    // e devolve a trava assim que a escrita termina.
    Promise.resolve(executar(s)).finally(() => setDecidindo(null));
  };

  return (
    <MotionCard
      {...propsEntradaGlobal(entrada.posicao, entrada.variantes)}
      data-entrada="cascata"
      className="flex min-w-0 flex-col rounded-[11px] border-border/50 p-[15px]"
    >
      {/* Bloco 1 — identificação (avatar · nome/departamento · selo) */}
      <div className="flex min-w-0 items-center gap-[10px]">
        <UserAvatar name={nome} className="h-[34px] w-[34px] shrink-0 text-[11px]" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground" title={nome}>
            {nome}
          </p>
          <p
            className="mt-[2px] truncate text-[10px] leading-tight text-muted-foreground"
            title={departamento ?? 'Departamento não informado'}
          >
            {departamento ?? 'Departamento não informado'}
          </p>
        </div>
        <Badge
          variant="outline"
          size="sm"
          className={cn('h-[21px] shrink-0 px-[10px] text-[10px]', seloStatus(s.status))}
        >
          {rotuloStatus(s.status)}
        </Badge>
      </div>

      {/* Bloco 2 — data da realização | horas solicitadas (linha horizontal) */}
      <div className="mt-[10px] flex min-w-0 items-center gap-[8px] border-t border-border/40 pt-[10px]">
        <div className="flex min-w-0 flex-[0_0_45%] items-center gap-[6px]">
          <CalendarDays className="h-[13px] w-[13px] shrink-0 text-muted-foreground" aria-hidden />
          <span className="sr-only">Data da realização:</span>
          <span className="truncate text-[11px] font-medium tabular-nums text-foreground">{data}</span>
        </div>
        <span aria-hidden className="h-[28px] w-px shrink-0 bg-border/50" />
        <div className="flex min-w-0 flex-1 items-center gap-[6px]">
          <Clock3 className="h-[15px] w-[15px] shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-[18px] font-semibold leading-none tabular-nums text-foreground">{horas}</p>
            <p className="mt-[4px] truncate text-[10px] leading-none text-muted-foreground">Horas solicitadas</p>
          </div>
        </div>
      </div>

      {/* Bloco 3 — motivo: faixa horizontal sobre superfície AZUL translúcida,
          a MESMA receita do "Ver todas (N)" do cabeçalho (`bg-info/10` +
          `border-info/40` + ícone no token `--info`). Separa a DESCRIÇÃO do
          resto do cartão sem competir com o âmbar do selo nem com o
          verde/vermelho das decisões. Só a superfície e o ícone carregam a cor:
          o texto segue em `text-muted-foreground` para preservar a leitura. */}
      <div
        className="mt-[10px] flex min-h-[34px] items-center gap-[8px] rounded-[8px] border border-info/40 bg-info/10 px-[10px] py-[6px]"
        title={motivo}
      >
        <FileText className="h-[13px] w-[13px] shrink-0 text-info" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{motivo}</p>
      </div>

      {/* Bloco 4 — ações: três colunas iguais (neutra / verde / vermelha). O
          `mt-auto` mantém o pé dos cartões da mesma linha alinhado. */}
      <div className="mt-auto grid grid-cols-3 gap-[8px] pt-[10px]">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onVerDetalhes(s)}
          className={CLASSE_BOTAO_DETALHES}
        >
          Ver detalhes
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={decidindo !== null}
          onClick={() => decidir('aprovar', onAprovar)}
          className="h-[31px] gap-[5px] rounded-[8px] border-success/40 bg-success/10 px-[6px] text-[11px] font-medium text-success hover:bg-success/15 hover:text-success"
        >
          {decidindo === 'aprovar' ? (
            <Spinner size="sm" className="h-[13px] w-[13px] text-success" />
          ) : (
            <Check className="h-[13px] w-[13px]" aria-hidden />
          )}
          Aprovar
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={decidindo !== null}
          onClick={() => decidir('rejeitar', onRejeitar)}
          className="h-[31px] gap-[5px] rounded-[8px] border-danger/45 bg-danger/10 px-[6px] text-[11px] font-medium text-danger hover:bg-danger/20 hover:text-danger-hover"
        >
          {decidindo === 'rejeitar' ? (
            <Spinner size="sm" className="h-[13px] w-[13px] text-danger" />
          ) : (
            <X className="h-[13px] w-[13px]" aria-hidden />
          )}
          Rejeitar
        </Button>
      </div>
    </MotionCard>
  );
}
export function AprovacoesPendentes({
  solicitacoes,
  periodo,
  onPeriodoChange,
  onVerDetalhes,
  onAprovar,
  onRejeitar,
  index = 0,
}: AprovacoesPendentesProps) {
  /** Expansão SÓ de apresentação: 3 cartões (referência) ou a fila inteira. */
  const [expandido, setExpandido] = useState(false);
  const temMais = solicitacoes.length > LIMITE_CARTOES;
  const visiveis = expandido ? solicitacoes : solicitacoes.slice(0, LIMITE_CARTOES);

  return (
    <EntradaPresenca>
      <section aria-labelledby="horas-extras-pendentes" className="pt-[3px]">
        {/* Cabeçalho compacto, SEM cartão: ícone + título/subtítulo | filtro de
            período + "Ver todas"/"Mostrar menos" + pill com o TOTAL real. */}
        <motion.div
          {...propsEntradaGlobal(index, entradaConteudoGlobal)}
          className="flex min-h-[34px] flex-wrap items-center justify-between gap-x-[12px] gap-y-[8px] px-[2px]"
        >
          <div className="flex min-w-0 items-center gap-[10px]">
            <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-success/15 text-success">
              <ClipboardCheck className="h-[15px] w-[15px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2
                id="horas-extras-pendentes"
                className="truncate text-[14px] font-semibold leading-tight text-foreground"
              >
                Aprovações pendentes
              </h2>
              <p className="mt-[2px] text-[11px] leading-snug text-muted-foreground">
                Analise as solicitações abaixo e tome uma decisão.
              </p>
            </div>
          </div>

          {/* Os controles dividem a linha com o título e QUEBRAM (o pai é
              `flex-wrap`); em telas estreitas o grupo ocupa a linha inteira e
              seus filhos quebram dentro dele — nenhum controle é cortado nem
              sobrepõe o título. */}
          <div className="flex w-full flex-wrap items-center justify-end gap-[9px] sm:w-auto sm:shrink-0">
            {/* Período — deixou de ser card na faixa de KPIs (filtro não é
                indicador) e virou controle compacto aqui, à esquerda do
                "Ver todas": calendário + rótulo do preset + chevron, na mesma
                altura e no mesmo respiro do botão ao lado. A faixa exata de
                datas (`rotuloPeriodo`) vai no `title`, sem alargar o chip. */}
            <Select value={periodo} onValueChange={(v) => onPeriodoChange(v as PeriodoId)}>
              <SelectTrigger
                aria-label="Período"
                title={rotuloPeriodo(periodo)}
                className={cn(CLASSE_SELECT_PERIODO, MEDIDA_SELECT_PERIODO)}
              >
                <CalendarRange className="h-[13px] w-[13px] opacity-70" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-left">{rotuloOpcaoPeriodo(periodo)}</span>
              </SelectTrigger>
              <SelectContent side="bottom" align="end" avoidCollisions={false}>
                {PERIODO_OPCOES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {temMais && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpandido((v) => !v)}
                aria-expanded={expandido}
                aria-controls="horas-extras-cartoes-pendentes"
                className={CLASSE_BOTAO_SECUNDARIO_INFO}
              >
                {expandido ? (
                  <>
                    Mostrar menos
                    <ChevronUp className="h-[12px] w-[12px]" aria-hidden />
                  </>
                ) : (
                  <>
                    Ver todas ({solicitacoes.length})
                    <ChevronDown className="h-[12px] w-[12px]" aria-hidden />
                  </>
                )}
              </Button>
            )}
            <Badge variant="warning" size="sm" className="shrink-0 px-[10px] py-[3px] text-[10px]" aria-live="polite">
              {rotuloQuantidade(solicitacoes.length)}
            </Badge>
          </div>
        </motion.div>

        {solicitacoes.length === 0 ? (
          <MotionCard
            {...propsEntradaGlobal(index + 1, entradaConteudoGlobal)}
            data-entrada="cascata"
            className="mt-[13px] rounded-[11px]"
          >
            <EmptyState
              icon={ClipboardCheck}
              title="Nenhuma aprovação pendente"
              description="Não há solicitações de horas extras aguardando decisão no período selecionado."
            />
          </MotionCard>
        ) : (
          <div id="horas-extras-cartoes-pendentes" className="mt-[13px] grid gap-[13px] md:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((s, i) => (
              <CartaoPendente
                key={s.id}
                solicitacao={s}
                posicao={i}
                baseEntrada={index}
                onVerDetalhes={onVerDetalhes}
                onAprovar={onAprovar}
                onRejeitar={onRejeitar}
              />
            ))}
          </div>
        )}
      </section>
    </EntradaPresenca>
  );
}
