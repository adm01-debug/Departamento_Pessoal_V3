/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — COLUNA LATERAL DIREITA.
 *
 *   1. PRÓXIMAS AÇÕES  — pendências REAIS derivadas de `premiacoesComum`
 *      (campanha em rascunho/revisão, pagamentos aguardando aprovação e
 *      divergências de conciliação). Cada item leva à seção onde a pendência se
 *      resolve; o rodapé "Ver todas as ações" abre a LISTA COMPLETA numa janela
 *      com o MESMO padrão do popup "Pendências" (`ui/animated-cascade-dialog`,
 *      o componente-base reaproveitado pelas janelas de detalhe do sistema) —
 *      nenhum botão sem efeito, nenhuma tarefa inventada.
 *   2. ATIVIDADE RECENTE — a trilha de auditoria já existente, do evento mais
 *      novo para o mais antigo. "Ver todas" leva à aba Auditoria (destino real);
 *      o avatar é a inicial do responsável quando o histórico do pagamento
 *      registra quem fez, senão o ícone da trilha (sem foto fictícia).
 * ============================================================================
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Clock,
  History,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { entradaCard } from './premiacoesEntrada';
import { linhaTabelaVariants } from '@/components/ui/table-row-reveal';
import { cn } from '@/lib/utils';
import {
  indiceEntrada,
  iniciaisDe,
  tempoRelativo,
  type AcaoPendente,
  type DestinoAcao,
  type EventoAtividade,
  type TipoAcaoPendente,
} from './premiacoesComum';

/** Quantos itens de "Próximas ações" cabem no card (a lista completa vai na janela). */
const LIMITE_ACOES = 3;

interface CampanhaLateralProps {
  acoes: AcaoPendente[];
  eventos: EventoAtividade[];
  /** Navega para a seção onde a pendência/atividade se resolve. */
  onNavegar: (destino: DestinoAcao | 'auditoria') => void;
}

/** Ícone + cor de cada tipo de pendência (mesmos tons dos indicadores do topo). */
const APARENCIA_ACAO: Record<TipoAcaoPendente, { Icone: LucideIcon; caixa: string }> = {
  configuracao: { Icone: ClipboardList, caixa: 'bg-info/15 text-info' },
  aprovacao: { Icone: Clock, caixa: 'bg-warning/15 text-warning' },
  conciliacao: { Icone: AlertTriangle, caixa: 'bg-warning/15 text-warning' },
};

/** Rótulo humano do TIPO da pendência (campo real `tipo` do registro). */
const ROTULO_TIPO_ACAO: Record<TipoAcaoPendente, string> = {
  configuracao: 'Configuração',
  aprovacao: 'Aprovação',
  conciliacao: 'Conciliação',
};

/** Botão-painel do cabeçalho ("Ver todas" / "Ver menos"). */
function BotaoCabecalho({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

export function CampanhaLateral({ acoes, eventos, onNavegar }: CampanhaLateralProps) {
  const [detalheAberto, setDetalheAberto] = useState(false);
  // O card mostra as primeiras ações; a LISTA COMPLETA vai na janela (mesma
  // fonte de dados, nenhum registro simulado).
  const acoesVisiveis = acoes.slice(0, LIMITE_ACOES);
  const podeExpandir = acoes.length > LIMITE_ACOES;

  return (
    <div className="flex h-full min-w-0 flex-col gap-3.5 xl:min-h-0">
      {/* 1 · Próximas ações — altura NATURAL (é o bloco de pendências; não
          absorve folga, quem absorve é a Atividade recente). */}
      <motion.section
        {...entradaCard(indiceEntrada('lateral', 0))}
        className="flex shrink-0 flex-col rounded-[14px] border border-border/50 bg-card/60 p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">
              Próximas ações
            </h3>
          </div>
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
              acoes.length > 0 ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground',
            )}
          >
            {acoes.length}
          </span>
        </div>

        {acoes.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">
            Nenhuma pendência: nenhuma campanha aguarda aprovação ou conciliação.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {acoesVisiveis.map((acao, indiceAcao) => {
              const aparencia = APARENCIA_ACAO[acao.tipo];
              const desde = tempoRelativo(acao.desde);
              return (
                <motion.li
                  key={acao.id}
                  custom={indiceAcao}
                  variants={linhaTabelaVariants}
                  initial="hidden"
                  animate="visible"
                  className="origin-center"
                >
                  <button
                    type="button"
                    onClick={() => onNavegar(acao.destino)}
                    className="flex w-full items-center gap-3 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-accent/5"
                  >
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', aparencia.caixa)}>
                      <aparencia.Icone className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      {/* Duas linhas: TÍTULO em largura cheia e, abaixo, objeto +
                          tempo — nenhum título trunca por causa do indicador de
                          tempo. O detalhe ("3 solicitações pendentes") fica no
                          title e na aba onde a pendência é resolvida. */}
                      <span className="block truncate text-[11.5px] font-semibold leading-snug">{acao.titulo}</span>
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className="truncate text-[11px] leading-[17px] text-muted-foreground"
                          title={`${acao.objeto} · ${acao.detalhe}`}
                        >
                          {acao.objeto}
                        </span>
                        {desde && <span className="shrink-0 text-[10.5px] text-muted-foreground/80">{desde}</span>}
                      </span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}

        {podeExpandir && (
          <motion.div
            {...entradaCard(acoesVisiveis.length)}
            className="mt-1.5 border-t border-border/30 pt-2"
          >
            <BotaoCabecalho onClick={() => setDetalheAberto(true)}>Ver todas as ações</BotaoCabecalho>
          </motion.div>
        )}
      </motion.section>

      {/* 2 · Atividade recente — ABSORVE a folga da coluna: recebe a altura que
          sobra da tabela e rola por dentro (`overflow-y-auto`), preservando todos
          os registros e terminando na MESMA linha da borda inferior da tabela. */}
      <motion.section
        {...entradaCard(indiceEntrada('lateral', 5))}
        className="flex flex-1 flex-col rounded-[14px] border border-border/50 bg-card/60 p-4 xl:min-h-0"
      >
        {/* O link do cabeçalho entra na MESMA cascata da coluna, como os
            registros logo abaixo: em "Próximas ações" os itens já nasciam
            animados; aqui faltavam o link e as linhas da trilha. O wrapper é um
            ITEM FLEX (`flex shrink-0`) do `justify-between`, então a caixa do
            botão continua colada à direita, no mesmo ponto de antes. */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">
            Atividade recente
          </h3>
          <motion.div {...entradaCard(indiceEntrada('lateral', 6))} className="flex shrink-0 items-center">
            <BotaoCabecalho onClick={() => onNavegar('auditoria')}>Ver todas</BotaoCabecalho>
          </motion.div>
        </div>

        {eventos.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">
            Sem eventos registrados na trilha de auditoria.
          </p>
        ) : (
          <ul className="flex min-h-0 flex-col gap-0.5 xl:flex-1 xl:overflow-y-auto xl:pr-1">
            {eventos.map((evento, indiceEvento) => {
              const quando = tempoRelativo(evento.quando);
              return (
                // A LINHA inteira é a unidade animada (mesma régua dos registros
                // de "Próximas ações" e das linhas da tabela): o `li` continua
                // sendo o MESMO `li` flex, só recebe a entrada do Dashboard.
                <motion.li
                  key={evento.id}
                  custom={indiceEvento}
                  variants={linhaTabelaVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex origin-center items-center gap-3 px-1.5 py-2"
                >
                  {evento.responsavel ? (
                    <span
                      title={evento.responsavel}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary"
                    >
                      {iniciaisDe(evento.responsavel)}
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                      <History className="h-4 w-4" />
                    </span>
                  )}
                  {/* Duas linhas como na referência: TÍTULO do evento + objeto
                      relacionado. O motivo completo fica no title (e na aba
                      Auditoria), sem inflar a altura do painel. */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-semibold leading-snug">{evento.titulo}</span>
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className="truncate text-[11px] leading-[17px] text-muted-foreground"
                        title={[evento.objeto, evento.descricao].filter(Boolean).join(' · ')}
                      >
                        {evento.objeto ?? evento.descricao}
                      </span>
                      {quando && <span className="shrink-0 text-[10.5px] text-muted-foreground/80">{quando}</span>}
                    </span>
                  </span>
                </motion.li>
              );
            })}
          </ul>
        )}
      </motion.section>

      {/* JANELA DA LISTA COMPLETA — mesmo componente-base do popup "Pendências"
          (`ui/animated-cascade-dialog`: overlay `bg-black/60` + blur, coreografia
          em cascata, X, Escape, gerenciamento de foco e o scroll interno do
          miolo). Os registros são os MESMOS já derivados para o card — nenhum
          campo, prazo ou pendência é inventado. */}
      <AnimatedCascadeDialog
        open={detalheAberto}
        onOpenChange={setDetalheAberto}
        title="Próximas ações"
        titleIcon={CalendarClock}
        titleIconClassName="h-5 w-5 text-primary"
        emptyMessage="Nenhuma ação pendente no momento."
        items={[
          <p key="subtitulo" className="text-[13px] leading-relaxed text-muted-foreground">
            Acompanhe as ações pendentes relacionadas às campanhas.
          </p>,
          ...acoes.map((acao) => {
            const aparencia = APARENCIA_ACAO[acao.tipo];
            const desde = tempoRelativo(acao.desde);
            return (
              <div key={acao.id} className="space-y-2.5 rounded-xl border border-border/30 p-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', aparencia.caixa)}
                  >
                    <aparencia.Icone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold">{acao.titulo}</span>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[9.5px] font-medium uppercase tracking-wide"
                  >
                    {ROTULO_TIPO_ACAO[acao.tipo]}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs leading-relaxed text-foreground/90">{acao.objeto}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{acao.detalhe}</p>
                  {desde && <p className="text-[11px] text-muted-foreground/80">Em aberto {desde}</p>}
                </div>
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDetalheAberto(false);
                      onNavegar(acao.destino);
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Resolver agora
                  </button>
                </div>
              </div>
            );
          }),
        ]}
      />
    </div>
  );
}
