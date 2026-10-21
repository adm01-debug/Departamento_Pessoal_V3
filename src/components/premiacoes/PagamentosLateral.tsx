/**
 * ============================================================================
 * ABA PAGAMENTOS — COLUNA LATERAL (IMAGEM 4).
 *
 *   1. RESUMO FINANCEIRO — composição do dinheiro da tela (aprovados, pendentes,
 *      pagos e divergências) num donut + legenda com valores reais. São os MESMOS
 *      recortes dos quatro indicadores, para o total fechar com os cartões.
 *   2. PRÓXIMAS AÇÕES — pendências REAIS derivadas dos pagamentos
 *      (`montarAcoesPagamentos`). Cada item é um botão que aplica o filtro de
 *      etapa correspondente na tabela — a pendência se resolve na própria tela.
 *   3. ATIVIDADE RECENTE — a trilha de auditoria já existente
 *      (`premiacoes_auditoria`), do evento mais novo para o mais antigo; "Ver
 *      todas" leva à aba Auditoria (destino real do hub).
 *
 * Nenhum painel inventa dado: quantidade, valor, nome e tempo vêm dos registros
 * carregados pela página. O visual reaproveita o painel do módulo (mesmo raio,
 * borda, fundo e tipografia da coluna lateral de Campanhas).
 * ============================================================================
 */
import { motion, type Transition } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CirclePlus,
  Clock,
  History,
  PenLine,
  XCircle,
} from 'lucide-react';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { entradaCard, linhaEntradaHubVariants } from './premiacoesEntrada';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { indiceEntrada, iniciaisDe, tempoRelativo, type EventoAtividade } from './premiacoesComum';
import type { AcaoPagamento, ResumoFinanceiro } from './pagamentosComum';

/** Ícone + tom de cada pendência (mesmos tons dos indicadores financeiros). */
const APARENCIA_ACAO: Record<string, { Icone: typeof Clock; caixa: string }> = {
  'aguardando-aprovacao': { Icone: Clock, caixa: 'bg-warning/20 text-warning' },
  divergencias: { Icone: AlertTriangle, caixa: 'bg-destructive-vivid/20 text-destructive-vivid' },
  'enviados-folha': { Icone: CheckCircle2, caixa: 'bg-success/20 text-success' },
};

/**
 * Aparência de cada registro de ATIVIDADE RECENTE. O ícone e a cor saem do par
 * (entidade, ação) REAIS gravados na trilha de auditoria — nunca do texto do
 * título. É a gramática visual do evento:
 *
 *   · pagamento aprovado ............ CheckCircle2 · verde
 *   · pagamento conciliado .......... BadgeCheck  · verde
 *   · pagamento alterado/criado ..... History/CirclePlus · azul / lima
 *   · pagamento excluído ............ XCircle · vermelho
 *   · divergência de conciliação .... AlertTriangle · vermelho (estado REAL do
 *                                     pagamento na trilha, não o texto)
 *   · campanha (criada/alterada/…) .. PenLine · roxo — identidade da entidade
 *   · regra ......................... History · neutro
 */
const APARENCIA_EVENTO: Record<string, { Icone: typeof History; tom: string }> = {
  'pagamento:aprovacao': { Icone: CheckCircle2, tom: 'bg-success/15 text-success' },
  'pagamento:conciliacao': { Icone: BadgeCheck, tom: 'bg-success/15 text-success' },
  'pagamento:alteracao': { Icone: History, tom: 'bg-info/15 text-info' },
  'pagamento:criacao': { Icone: CirclePlus, tom: 'bg-primary/15 text-primary' },
  'pagamento:exclusao': { Icone: XCircle, tom: 'bg-destructive-vivid/15 text-destructive-vivid' },
  'campanha:criacao': { Icone: CirclePlus, tom: 'bg-xp/15 text-xp' },
  'campanha:aprovacao': { Icone: CheckCircle2, tom: 'bg-xp/15 text-xp' },
  'campanha:alteracao': { Icone: PenLine, tom: 'bg-xp/15 text-xp' },
  'campanha:exclusao': { Icone: XCircle, tom: 'bg-destructive-vivid/15 text-destructive-vivid' },
};

/** Divergência de conciliação é um ESTADO do pagamento: sobrepõe o tom da ação. */
const APARENCIA_DIVERGENCIA = { Icone: AlertTriangle, tom: 'bg-destructive-vivid/15 text-destructive-vivid' };

/**
 * TRAÇADO DO DONUT DO RESUMO FINANCEIRO — mais lento e mais suave que a régua
 * padrão do `DonutChart` (0,6s por segmento, passo de 0,15s, `easeOut`):
 *
 *    0,85s por segmento · passo de 0,17s · atraso inicial 0,22s ·
 *    ease [0.4, 0, 0.2, 1] (acelera e desacelera — o traçado "assenta")
 *
 * O gráfico de "Tipo de Vínculo" do Dashboard Executivo continua usando os
 * defaults do componente: o ajuste vale só para este card. Com os quatro
 * segmentos, o desenho termina em ~1,6s (0,22 + 3 × 0,17 + 0,85), sem atrasar
 * a leitura dos valores — que já estão visíveis na legenda e no centro.
 */
const TRAÇADO_DONUT_RESUMO = {
  animationDuration: 0.85,
  animationDelay: 0.22,
  segmentStagger: 0.17,
  animationEase: [0.4, 0, 0.2, 1] as Transition['ease'],
} as const;

function aparenciaDoEvento(evento: EventoAtividade): { Icone: typeof History; tom: string } {
  if (evento.divergente) return APARENCIA_DIVERGENCIA;
  return APARENCIA_EVENTO[`${evento.entidade}:${evento.acao}`] ?? { Icone: History, tom: 'bg-muted/60 text-muted-foreground' };
}

interface PagamentosLateralProps {
  resumo: ResumoFinanceiro;
  /** Rótulo do período em análise (vem do filtro real, nunca fixo). */
  periodoLabel: string;
  acoes: AcaoPagamento[];
  eventos: EventoAtividade[];
  /** Aplica o filtro de etapa da tabela (destino de cada próxima ação). */
  onIrParaEtapa: (destino: AcaoPagamento['destino']) => void;
  /** Abre a aba Auditoria (destino do "Ver todas" da atividade). */
  onVerAtividade: () => void;
}

export function PagamentosLateral({
  resumo,
  periodoLabel,
  acoes,
  eventos,
  onIrParaEtapa,
  onVerAtividade,
}: PagamentosLateralProps) {
  return (
    <div className="flex h-full min-w-0 flex-col gap-4 xl:min-h-0">
      {/* 1 · Resumo Financeiro */}
      <motion.section
        {...entradaCard(indiceEntrada('lateral', 0))}
        className="flex shrink-0 flex-col rounded-[14px] border border-border/50 bg-card/60 p-3"
      >
        <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Resumo Financeiro</h3>
        <p className="mb-1 truncate text-[11px] leading-[15px] text-muted-foreground/80" title={periodoLabel}>
          {periodoLabel}
        </p>

        {resumo.total > 0 ? (
          <DonutChart
            segments={resumo.segmentos}
            size={160}
            strokeWidth={16}
            // `w-full [&>svg]:mx-auto`: o gráfico (block no preflight do Tailwind)
            // fica centralizado na largura interna do card por `margin: auto` — sem
            // flex (o root do componente contém gráfico E legenda: um `flex` ali os
            // colocaria lado a lado e comprimiria o SVG), sem transform e sem margem
            // negativa. Diâmetro 160 (faixa 160–180) com anel de 16px, deixando o
            // furo de 128px para o valor central.
            className="w-full [&>svg]:mx-auto"
            formatValue={formatCurrency}
            centerClassName="fill-foreground text-[15px] font-semibold tabular-nums"
            {...TRAÇADO_DONUT_RESUMO}
          />
        ) : (
          <p className="px-1 py-3 text-[11px] text-muted-foreground">Nenhum valor no período selecionado.</p>
        )}
      </motion.section>

      {/* 2 · Próximas ações */}
      <motion.section
        {...entradaCard(indiceEntrada('lateral', 1))}
        className="flex shrink-0 flex-col rounded-[14px] border border-border/50 bg-card/60 p-3"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Próximas ações</h3>
          {acoes.length > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold tabular-nums text-primary">
              {acoes.length}
            </span>
          )}
        </div>

        {acoes.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">
            Nada pendente: nenhum pagamento aguarda aprovação ou conciliação.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {acoes.map((acao, indice) => {
              const aparencia = APARENCIA_ACAO[acao.id] ?? {
                Icone: Clock,
                caixa: 'bg-muted text-muted-foreground',
              };
              return (
                <motion.li
                  key={acao.id}
                  custom={indice}
                  variants={linhaEntradaHubVariants}
                  initial="hidden"
                  animate="visible"
                  className="origin-center"
                >
                  <button
                    type="button"
                    onClick={() => onIrParaEtapa(acao.destino)}
                    /* Hover do item inteiro (ícone + textos + valor + seta): o
                       fundo escurece para o azul-marinho de fundo do tema
                       (`--background`, mais escuro que a superfície `--card`),
                       com raio de 10px e transição de 200ms `ease-in-out`. Sem
                       borda brilhante, sem escala/deslocamento, sem mexer nas
                       cores dos ícones nem na geometria da linha. O mesmo fundo
                       aparece no foco de teclado (`focus-visible`). */
                    className="group flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-1.5 py-1.5 text-left transition-colors duration-200 ease-in-out hover:bg-background focus-visible:bg-background"
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        aparencia.caixa,
                      )}
                    >
                      <aparencia.Icone className="h-4 w-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      {/* Título em até duas linhas (não trunca: "6 pagamentos
                          aguardando aprovação" precisa ser legível) e o valor na
                          linha de apoio; o detalhe completo fica no `title`. O
                          valor da DIVERGÊNCIA é o único em vermelho (é dinheiro
                          que não bate), como pede a hierarquia da tela. */}
                      <span className="text-[11.5px] font-semibold leading-[15px]">{acao.titulo}</span>
                      <span
                        className={cn(
                          'truncate text-[11px] leading-[15px]',
                          acao.id === 'divergencias' ? 'font-medium text-destructive-vivid' : 'text-muted-foreground',
                        )}
                        title={acao.detalhe}
                      >
                        {formatCurrency(acao.valor)}
                      </span>
                    </span>
                    {/* Seta: ganha o tom da pendência no hover (só cor, com
                        transição — sem deslocamento e sem mudar o tamanho). */}
                    <ArrowRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors duration-200 ease-in-out',
                        acao.id === 'divergencias' ? 'group-hover:text-destructive-vivid' : 'group-hover:text-foreground',
                      )}
                      aria-hidden
                    />
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </motion.section>

      {/* 3 · Atividade recente — altura PROPORCIONAL AOS REGISTROS, logo abaixo de
          Próximas ações com o MESMO respiro entre cards (16px, o `gap` do
          contêiner). Sem `mt-auto`, sem `justify-between`, sem `flex-grow` e sem
          espaçadores: nada empurra este card para a base da coluna, então não
          existe vazio dentro dele.

          CALIBRAGEM DAS BASES (1512–1728px, a viewport de referência): o corpo da
          tabela (6 registros) fica 15px mais baixo que a coluna lateral, então é
          AQUI que os 15px são absorvidos — padding vertical 12→10, respiro do
          cabeçalho 12→8 e o vão entre as 4 atividades 2→0 (elas continuam
          separadas pelo próprio padding de 6px de cada item, sem cortar texto).
          Tudo continua com o mesmo número de registros e a mesma tipografia. */}
      <motion.section
        {...entradaCard(indiceEntrada('lateral', 5))}
        className="flex shrink-0 flex-col rounded-[14px] border border-border/50 bg-card/60 p-2.5"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Atividade recente</h3>
          <button
            type="button"
            onClick={onVerAtividade}
            className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Ver todas
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {eventos.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">
            Sem eventos registrados na trilha de auditoria.
          </p>
        ) : (
          <ul className="flex flex-col gap-0">
            {eventos.map((evento, indiceEvento) => {
              const quando = tempoRelativo(evento.quando);
              return (
                <motion.li
                  key={evento.id}
                  custom={indiceEvento}
                  variants={linhaEntradaHubVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex origin-center items-center gap-3 px-1.5 py-1.5"
                >
                  {/* Ícone SEMÂNTICO da categoria do evento (o responsável fica no
                      `title`): cada tipo de acontecimento tem ícone e cor próprios,
                      em vez de um relógio cinza idêntico para tudo. */}
                  {(() => {
                    const aparencia = aparenciaDoEvento(evento);
                    return (
                      <span
                        title={evento.responsavel ?? undefined}
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                          aparencia.tom,
                        )}
                      >
                        <aparencia.Icone className="h-4 w-4" />
                      </span>
                    );
                  })()}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-semibold leading-snug">{evento.titulo}</span>
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className="truncate text-[11px] leading-[17px] text-muted-foreground"
                        title={[evento.objeto, evento.descricao].filter(Boolean).join(' · ')}
                      >
                        {evento.objeto ?? evento.descricao}
                      </span>
                      {quando && (
                        <span className="shrink-0 text-[10.5px] text-muted-foreground/80">{quando}</span>
                      )}
                    </span>
                  </span>
                </motion.li>
              );
            })}
          </ul>
        )}
      </motion.section>
    </div>
  );
}
