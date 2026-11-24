import { useState } from 'react';
import {
  Calendar,
  History,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Send,
  ShieldCheck,
  Target,
  User,
  UserCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { CancelamentoFeedbackResumo } from './CancelamentoFeedbackResumo';
import { iniciais } from './desempenhoComum';
import { tomTipoFeedback } from './feedbacksComum';
import { HistoricoFeedbackDialog } from './HistoricoFeedbackDialog';
import { useHistoricoFeedback } from './useHistoricoFeedback';
import {
  TEXTO_NAO_INFORMADO,
  textoDoCampo,
  textoNota,
  type AcaoFeedback,
  type AcaoFeedbackId,
  type FeedbackCanonico,
} from './feedbackCanonico';

/**
 * ============================================================================
 * CARD CANÔNICO DE FEEDBACK — a ÚNICA estrutura de item da aba "Feedbacks".
 *
 * Usado pela LISTA (`FeedbackCard`) e pela fila "Aguardando gestor"
 * (`PendenciasAprovacao`). As quatro regiões existem SEMPRE, em qualquer ciclo,
 * tipo e status:
 *
 *   (A) COLABORADOR   → avatar, nome, cargo · departamento, ciclo, PDI e status;
 *   (B) RESPONSÁVEIS  → gestor responsável (vínculo), avaliador, tipo e data;
 *   (C) RESULTADOS    → desempenho, potencial, faixa e status da aprovação;
 *   (D) AÇÕES         → Ver avaliação · Devolver · Aprovar (sempre visíveis,
 *                        desabilitadas com o motivo quando a regra não permite).
 *
 * REGRA ABSOLUTA: nenhum controle desaparece por causa do ciclo, do status ou
 * do tipo. `item.acoes` (de `getFeedbackActions`) devolve o estado de cada um —
 * a autorização real continua no servidor, então desabilitado ≠ liberado.
 *
 * A coluna de resultados/ações tem largura FIXA (`lg:w-[340px]`, a mesma da fila
 * aprovada em 16/10/2026) e alinhamento à direita: a borda direita não anda
 * quando muda o número de botões.
 * ============================================================================
 */

/** Tinta do avatar por tipo — a mesma família do chip do tipo. */
const AVATAR_TIPO: Record<string, string> = {
  gestor: 'bg-primary/15 text-primary ring-primary/20',
  par: 'bg-info/15 text-info ring-info/20',
  auto: 'bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] ring-[hsl(var(--chart-4)/0.20)]',
  subordinado: 'bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))] ring-[hsl(var(--chart-2)/0.20)]',
};

/** Ordem padrão das ações na FILA de aprovação (região 4). */
const ORDEM_FILA: AcaoFeedbackId[] = ['ver', 'enviar', 'devolver', 'aprovar', 'validarPotencial'];

/** Ícone de cada ação de escrita. */
const ICONE_ACAO: Partial<Record<AcaoFeedbackId, React.ReactNode>> = {
  editar: <Pencil className="h-3.5 w-3.5" />,
  enviar: <Send className="h-3.5 w-3.5" />,
  devolver: <RotateCcw className="h-3.5 w-3.5" />,
  aprovar: <UserCheck className="h-3.5 w-3.5" />,
  validarPotencial: <ShieldCheck className="h-3.5 w-3.5" />,
};

/** Pele do botão de cada ação (tokens já usados pelo módulo). */
const CLASSE_ACAO: Partial<Record<AcaoFeedbackId, string>> = {
  editar:
    'group h-8 gap-1.5 rounded-lg border-border/60 bg-secondary/30 text-[11px] font-normal text-foreground/90 hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
  ver: 'group h-8 gap-1.5 rounded-lg border-border/60 bg-secondary/30 text-[11px] font-normal text-foreground/90 hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
  enviar: 'h-8 gap-1.5 text-xs',
  devolver: 'h-8 gap-1.5 text-xs',
  aprovar: 'h-8 gap-1.5 border-success/45 bg-success/15 text-xs text-success hover:bg-success/25 hover:text-success',
  validarPotencial: 'h-8 gap-1.5 text-xs',
};

/** Classe do badge de status (registro ou aprovação — mesma anatomia). */
const BADGE_STATUS =
  'inline-flex h-6 w-fit items-center whitespace-nowrap rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide';

/**
 * PRÉVIA DOS TEXTOS — aparece na fila do gestor e mostra TODOS os relatos do
 * conjunto (Gestor, Par, Autoavaliação e Subordinado), cada um com sua autoria.
 * A visibilidade é decidida antes da renderização (RLS/consultas): o card só
 * recebe os registros que a conta autenticada pode ler.
 *
 * Uma linha por seção (`truncate` + `title` com o texto completo) para informar
 * a decisão sem inflar a altura do card. Campo vazio vira "Não informado".
 */
function PreviaTextos({ item }: { item: FeedbackCanonico }) {
  /**
   * Um relato por avaliador. Em registros isolados só existe ele mesmo; na fila
   * consolidada vêm todos os relatos recebidos, cada um com sua autoria. As três
   * seções são SEMPRE renderizadas e campo vazio usa "Não informado".
   */
  const relatos = item.relatos?.length
    ? item.relatos
    : [
        {
          id: item.feedback?.id ? String(item.feedback.id) : 'atual',
          tipo: item.tipo,
          tipoRotulo: item.tipoRotulo,
          avaliador: item.avaliador === '—' ? '' : item.avaliador,
          conteudo: item.conteudo,
        },
      ];
  const multiplos = relatos.length > 1;

  const linhasDe = (conteudo: FeedbackCanonico['conteudo']) => [
    { rotulo: 'Fortes', texto: conteudo.pontosFortes, tinta: 'text-success' },
    { rotulo: 'Melhoria', texto: conteudo.pontosMelhoria, tinta: 'text-warning' },
    { rotulo: 'Comentários', texto: conteudo.comentarios, tinta: 'text-muted-foreground' },
  ];

  return (
    <div className="min-w-0 space-y-1 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5">
      {relatos.map((relato, indice) => (
        <div
          key={`${relato.id}-${indice}`}
          className={cn('min-w-0 space-y-0.5', indice > 0 && 'border-t border-border/30 pt-1')}
        >
          {multiplos && (
            <p
              className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground/80"
              title={`${relato.tipoRotulo} · ${relato.avaliador || TEXTO_NAO_INFORMADO}`}
            >
              {relato.tipoRotulo} · {relato.avaliador || TEXTO_NAO_INFORMADO}
            </p>
          )}
          {linhasDe(relato.conteudo).map((linha) => (
            <p
              key={`${relato.id}-${linha.rotulo}`}
              className="flex min-w-0 items-baseline gap-1.5 text-[10px] leading-snug"
            >
              <span className={cn('shrink-0 font-medium', linha.tinta)}>{linha.rotulo}:</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground" title={textoDoCampo(linha.texto)}>
                {textoDoCampo(linha.texto)}
              </span>
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

export interface CartaoFeedbackProps {
  item: FeedbackCanonico;
  /**
   * `lista` mostra a citação do feedback e o menu de filtros;
   * `fila` mostra a justificativa da devolução e a data de envio.
   * As REGIÕES são as mesmas; o CONJUNTO DE AÇÕES é decidido pelo chamador.
   */
  contexto: 'lista' | 'fila';
  /**
   * Ações renderizadas (ids de `getFeedbackActions`). Padrão = fila de
   * aprovação. A LISTA passa `['editar']` — nenhum controle de aprovação
   * aparece nos filtros normais.
   */
  acoes?: AcaoFeedbackId[];
  /** Mostra a prévia dos textos (somente na fila e para a avaliação do gestor). */
  previaTextos?: boolean;
  /** Justificativa registrada (fila). */
  justificativa?: string | null;
  /** Data de envio ao gestor (fila), já formatada. */
  enviadoEm?: string | null;
  /** Quadrante do Nine-Box, quando o fluxo já classificou (fila). */
  quadrante?: string | null;
  onVer?: () => void;
  onEnviar?: () => void;
  onDevolver?: () => void;
  onAprovar?: () => void;
  onValidarPotencial?: () => void;
  /** Abre o formulário existente com os dados do registro. */
  onEditar?: () => void;
  onFiltrarAvaliado?: (nome: string) => void;
  onFiltrarAvaliador?: (nome: string) => void;
  /** Operação em andamento: desabilita TODOS os controles de escrita. */
  salvando?: boolean;
  /** Dica geral do card (fila). */
  titulo?: string;
}

export function CartaoFeedbackCanonico({
  item,
  contexto,
  acoes: acoesPedidas = ORDEM_FILA,
  previaTextos = false,
  justificativa = null,
  enviadoEm = null,
  quadrante = null,
  onVer,
  onEnviar,
  onDevolver,
  onAprovar,
  onValidarPotencial,
  onEditar,
  onFiltrarAvaliado,
  onFiltrarAvaliador,
  salvando = false,
  titulo,
}: CartaoFeedbackProps) {
  const local = [item.cargo, item.departamento].filter(Boolean).join(' · ');
  const acoes = acoesPedidas
    .map((id) => item.acoes.find((a) => a.id === id))
    .filter((a): a is AcaoFeedback => Boolean(a));
  const podeFiltrar = contexto === 'lista' && Boolean(onFiltrarAvaliado || onFiltrarAvaliador);

  const [historicoAberto, setHistoricoAberto] = useState(false);
  const cancelado = item.status.chave === 'cancelado';

  const aoClicar = (id: AcaoFeedbackId) => {
    if (id === 'ver') onVer?.();
    if (id === 'editar') onEditar?.();
    if (id === 'enviar') onEnviar?.();
    if (id === 'devolver') onDevolver?.();
    if (id === 'aprovar') onAprovar?.();
    if (id === 'validarPotencial') onValidarPotencial?.();
  };

  return (
    <Card
      data-testid="cartao-feedback"
      className="flex flex-col gap-3 rounded-xl border-border/60 bg-gradient-to-b from-card to-card/60 px-4 py-3 shadow-elevated transition-all hover:border-primary/30 hover:shadow-lg"
      title={titulo}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-5">
        {/* ── (A) Colaborador: avatar · nome · cargo/departamento · ciclo · PDI ── */}
        <div className="flex min-w-0 flex-1 gap-3">
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-inset',
              AVATAR_TIPO[item.tipo] ?? AVATAR_TIPO.gestor
            )}
          >
            {iniciais(item.avaliado)}
          </span>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="min-w-0">
              <h3 className="truncate font-display text-[13px] font-semibold leading-tight tracking-tight">
                {item.avaliado}
              </h3>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                {local || 'Sem cargo e departamento cadastrados'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 text-[10px] font-medium text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" />
                {textoDoCampo(item.cicloNome)}
              </span>
              {item.pdi.estado === 'informado' && (
                <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 text-[10px] font-medium text-muted-foreground">
                  <Target className="h-3 w-3 shrink-0" />
                  {textoDoCampo(item.pdi)}
                </span>
              )}
              <span className={cn(BADGE_STATUS, item.status.tom)}>{item.status.rotulo}</span>
              {quadrante && (
                <span className="inline-flex h-6 items-center rounded-md border border-success/45 bg-success/20 px-2 text-[10px] font-medium text-success">
                  Nine-Box: {quadrante}
                </span>
              )}
            </div>

            {/* PRÉVIA (fila do gestor): os três campos de TODOS os relatos do
                conjunto, com o tipo/avaliador de cada um. Campo vazio aparece
                como "Não informado"; nenhum tipo é ocultado. */}
            {previaTextos && contexto === 'fila' && <PreviaTextos item={item} />}

            {/* Citação (lista) — texto REAL do registro, sem reticências forçadas. */}
            {contexto === 'lista' && (
              <blockquote className="border-l-2 border-border/60 pl-2.5 text-[11px] italic leading-snug text-muted-foreground">
                “{textoDoCampo(item.conteudo.comentarios, 'Sem texto registrado.')}”
              </blockquote>
            )}

            {/* Justificativa da devolução (fila) — também texto real. */}
            {contexto === 'fila' && justificativa && (
              <p className="line-clamp-2 text-[10px] italic leading-snug text-muted-foreground" title={justificativa}>
                “{justificativa}”
              </p>
            )}
          </div>
        </div>

        {/* ── (B) Responsáveis: gestor (vínculo) · avaliador · tipo · data ─────── */}
        <div className="flex min-w-0 shrink-0 flex-row items-end justify-between gap-3 border-t border-border/20 pt-2.5 lg:w-[216px] lg:flex-col lg:items-start lg:justify-start lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="min-w-0 space-y-1 lg:w-full">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Gestor responsável</p>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
                {item.gestorResponsavel.estado === 'informado' ? iniciais(item.gestorResponsavel.valor) : 'NI'}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block truncate text-[12px] font-medium leading-tight',
                    item.gestorResponsavel.estado !== 'informado' && 'text-muted-foreground'
                  )}
                  title={
                    item.gestorResponsavel.estado === 'informado'
                      ? textoDoCampo(item.gestorResponsavel)
                      : 'Gestor responsável não identificado'
                  }
                >
                  {item.gestorResponsavel.estado === 'informado'
                    ? textoDoCampo(item.gestorResponsavel)
                    : 'Não identificado'}
                </span>
              </span>
            </div>

            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avaliado por</p>
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
                {iniciais(item.avaliadorCampo.estado === 'informado' ? item.avaliadorCampo.valor : TEXTO_NAO_INFORMADO)}
              </span>
              <span className="min-w-0">
                <span
                  className="block truncate text-[12px] font-medium leading-tight"
                  title={textoDoCampo(item.avaliadorCampo)}
                >
                  {textoDoCampo(item.avaliadorCampo)}
                </span>
              </span>
            </div>
          </div>

          {/* Tipo + data numa ÚNICA linha (compacta a coluna sem tirar dado). */}
          <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap text-[10px] text-muted-foreground lg:mt-auto">
            <span
              className={cn(
                'inline-flex h-5 items-center rounded-md border px-1.5 text-[9px] font-medium uppercase tracking-wide',
                tomTipoFeedback(item.feedback?.tipo)
              )}
            >
              {textoDoCampo(item.tipoCampo)}
            </span>
            <span className="flex items-center gap-1">
              {contexto === 'fila' ? (
                <Send className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Calendar className="h-3.5 w-3.5 shrink-0" />
              )}
              {contexto === 'fila'
                ? enviadoEm
                  ? `Enviado ${enviadoEm}`
                  : 'Ainda não enviado'
                : textoDoCampo(item.dataCampo)}
            </span>
          </div>
        </div>

        {/* ── (C) Resultados — números com largura fixa, alinhados à direita ──── */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-border/20 pt-2.5 lg:w-[230px] lg:items-end lg:justify-center lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex flex-wrap items-start justify-end gap-3">
            <div className="flex flex-col items-end gap-1 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Desempenho</p>
              {item.desempenho.estado === 'informado' && item.desempenho.valor !== null ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn('font-display text-base font-semibold leading-none tabular-nums', item.faixa.tinta)}
                  >
                    {textoNota(item.desempenho)}
                  </span>
                  <span
                    className={cn(
                      'rounded-md border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide',
                      item.faixa.badge
                    )}
                  >
                    {item.faixa.rotulo}
                  </span>
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Sem nota</span>
              )}
            </div>

            <div className="flex flex-col items-end gap-1 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Potencial</p>
              {item.potencial.estado === 'informado' && item.potencial.valor !== null ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn('font-display text-base font-semibold leading-none tabular-nums', item.faixa.tinta)}
                  >
                    {textoNota(item.potencial)}
                  </span>
                  <span
                    className={cn(
                      'rounded-md border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide',
                      item.faixa.badge
                    )}
                  >
                    {item.faixa.rotulo}
                  </span>
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Não atribuído</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CANCELAMENTO (lista): faixa de largura TOTAL, compacta, com a MESMA
          fonte do modal. Fora da coluna estreita para o motivo não ser picado. */}
      {contexto === 'lista' && cancelado && (
        <CancelamentoFeedbackResumo item={item} onVerHistorico={() => setHistoricoAberto(true)} />
      )}

      {/* ── (D) AÇÕES — linha própria: badge à esquerda, controles à direita ──
          A linha ocupa a largura do card (nunca é espremida pela coluna de
          resultados) e quebra em duas linhas em telas estreitas. Os botões
          permanecem SEMPRE visíveis; `disabled` + `title` explicam a restrição. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/20 pt-2.5">
        <span role="status" className={cn(BADGE_STATUS, item.aprovacao.tom)}>
          <ShieldCheck className="mr-1 h-3 w-3" />
          {item.aprovacao.rotulo}
        </span>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {acoes.map((acao) => (
            <Button
              key={acao.id}
              variant="outline"
              size="sm"
              className={CLASSE_ACAO[acao.id]}
              disabled={salvando || !acao.habilitado}
              title={acao.motivo ?? undefined}
              aria-label={acao.rotulo}
              onClick={() => aoClicar(acao.id)}
            >
              {ICONE_ACAO[acao.id]}
              {acao.rotulo}
            </Button>
          ))}

          {contexto === 'lista' && !cancelado && (
            <Button
              variant="outline"
              size="sm"
              className={CLASSE_ACAO.ver}
              onClick={() => setHistoricoAberto(true)}
            >
              <History className="h-3.5 w-3.5" />
              Ver histórico
            </Button>
          )}

          {podeFiltrar && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  aria-label={`Ações do feedback de ${item.avaliado}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {onFiltrarAvaliado && (
                  <DropdownMenuItem onClick={() => onFiltrarAvaliado(item.avaliado)}>
                    <User className="mr-2 h-3.5 w-3.5" /> Filtrar por este colaborador
                  </DropdownMenuItem>
                )}
                {onFiltrarAvaliador && (
                  <DropdownMenuItem onClick={() => onFiltrarAvaliador(item.avaliador)}>
                    <User className="mr-2 h-3.5 w-3.5" /> Filtrar por este avaliador
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {historicoAberto && (
        <DialogHistoricoCarregado item={item} aberto onOpenChange={setHistoricoAberto} />
      )}
    </Card>
  );
}

/** Diálogo conectado: só monta o hook quando o usuário abre o histórico. */
function DialogHistoricoCarregado({
  item,
  aberto,
  onOpenChange,
}: {
  item: FeedbackCanonico;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
}) {
  const { data: eventos = [], isLoading, error } = useHistoricoFeedback(item, aberto);
  return (
    <HistoricoFeedbackDialog
      item={item}
      aberto={aberto}
      onOpenChange={onOpenChange}
      eventos={eventos}
      carregando={isLoading}
      erro={error}
    />
  );
}
