/**
 * Área de AUDITORIA do módulo de Admissões (aba "Auditoria" de `AdmissoesPage`).
 *
 * REDESENHO: a aba era um card único com uma barra de busca e uma tabela "crua"
 * (colunas de texto puro, sem avatar, sem ação por linha). Agora é um painel de
 * conformidade — a leitura de cima para baixo:
 *
 *   1. RESUMO     — 4 cards de métrica (Eventos, Sucesso, Pendentes, Falhas) com
 *                   ícone, número grande, descrição e indicador secundário REAL;
 *   2. FILTROS    — busca + Status/Etapa/Responsável/Período na mesma linha, com
 *                   "Mais filtros" (tipo do evento, recibo do eSocial e
 *                   intervalo de datas) e "Limpar filtros";
 *   3. CHIPS      — atalhos arredondados por status e por etapa, com contagem;
 *   4. HISTÓRICO  — bloco "Histórico de Auditoria – Admissões" com cabeçalho
 *                   (ícone + título + subtítulo) e "Ordenar por";
 *   5. TABELA     — Data/Hora, Evento (ícone + título + descrição), Candidato
 *                   (avatar + cargo • departamento), Etapa (badge), Status
 *                   (badge), Responsável (avatar + função) e Ações (ver
 *                   detalhes, abrir registro e mais ações).
 *
 * DADOS: nenhuma query nova e nenhuma regra nova. A trilha vem de
 * `getMockAuditoria()` (MOCK VISUAL — ver `src/mocks/admissoesMock.ts`) e TODAS
 * as leituras (resumo, filtro, ordenação, contagem) vêm de
 * `auditoriaDerivacoes.ts`. Os tokens visuais vêm de `auditoriaComum.ts`, que
 * por sua vez reusa `admissoesComum.ts` e `kanbanComum.ts` — nenhuma cor,
 * rótulo ou ícone é recriado aqui.
 *
 * RESPONSIVIDADE: os 4 cards viram 2×2 a partir de `sm`. A linha de filtros é
 * UMA SÓ em qualquer largura (`flex` sem `wrap`): a busca expande, os selects
 * encolhem até 140px e, abaixo da soma dos mínimos, o container rola na
 * horizontal — nenhum controle desce para uma segunda linha. A faixa de chips
 * usa `flex-wrap` (pode quebrar com respiro) e a tabela mantém largura mínima
 * legível, rolando na horizontal só como último recurso (nenhuma coluna é
 * escondida).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  History,
  Inbox,
  MoreVertical,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CascadeTableBody, CascadeTableRow } from '@/components/ui/cascade-table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';
import { MetricCard, cardVariants } from '@/components/dashboard/MetricCard';
import { cn } from '@/lib/utils';
import { iniciais } from './admissoesDerivacoes';
import { TOM_KANBAN } from './kanbanComum';
import {
  FILTROS_AUDITORIA_VAZIOS,
  QUICK_FILTER_PADRAO,
  QUICK_FILTER_VALORES,
  QUICK_FILTERS,
  aplicarQuickFilter,
  contarPorEtapa,
  filtrarAuditoria,
  formatarDataHora,
  hojeAuditoria,
  ordenarAuditoria,
  possuiFiltrosAtivos,
  responsaveisDisponiveis,
  resumoAuditoria,
  tiposDeEvento,
  type EventoAuditoria,
  type FiltrosAuditoria,
  type OrdemAuditoria,
  type PeriodoAuditoria,
  type QuickFilter,
} from './auditoriaDerivacoes';
import {
  CARDS_RESUMO,
  ICONE_EVENTO_CRIACAO,
  ICONE_STATUS,
  LABEL_STATUS,
  OPCOES_ETAPA,
  ORDENS_AUDITORIA,
  PERIODOS_AUDITORIA,
  ACAO_PROCESSO_CRIADO,
  chipQuickFilter,
  etapaDaTrilha,
  seloStatus,
  type ChaveResumo,
} from './auditoriaComum';
// MOCK VISUAL — ver src/mocks/admissoesMock.ts
import type { StatusAuditoria } from '@/mocks/admissoesMock';
import { getMockAuditoria, isAdmissoesMockEnabled } from '@/mocks/admissoesMock';

/**
 * Sentinela dos selects com opção "todos". O Radix proíbe `value=""` em
 * `SelectItem`, então "todos" precisa de um valor próprio — e é ele que
 * `atualizar` traduz de volta para a string vazia (o estado do filtro).
 */
const VALOR_TODOS = '__todos__';

/**
 * Destino de "Ver logs globais": a TRILHA GLOBAL do sistema, que JÁ EXISTE e já
 * está registrada no router (`App.tsx`: `path="auditoria"` → `AuditoriaPage` —
 * exatamente a tela do item "Auditoria" da sidebar, alimentada pelo
 * `auditoriaService` sobre `audit_logs`/`auditoria`, com filtros por tabela/ação,
 * busca, exportação e detalhe do registro).
 *
 * ANTES o atalho apontava para `/configuracoes/logs` — rota que NÃO existe em
 * nenhum lugar do `App.tsx`, então caía no `<Route path="*">` e o usuário via a
 * página 404. Não é uma rota nova: é a tela real de auditoria global, atrás do
 * `AdminRoute` (o dado é administrativo — o comportamento para quem não é admin
 * é a tela "Acesso Restrito" do próprio guard, nunca uma 404).
 */
const ROTA_LOGS_GLOBAIS = '/auditoria';

/** Classes do avatar de iniciais (mesma linguagem dos avatares do módulo). */
const CORES_AVATAR = [
  'bg-primary/15 text-primary',
  'bg-info/15 text-info',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-destructive-vivid/15 text-destructive-vivid',
];

/** Avatar circular de iniciais, cor estável por nome (não muda entre reloads). */
function AvatarIniciais({ nome, className }: { nome?: string | null; className?: string }) {
  let hash = 0;
  const texto = nome ?? '';
  for (let i = 0; i < texto.length; i += 1) hash = (hash + texto.charCodeAt(i) * (i + 1)) % CORES_AVATAR.length;
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-display text-[10px] font-semibold',
        CORES_AVATAR[hash],
        className
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

/** Classe do quadradinho de ícone do evento — tinta do tom da etapa. */
function chipDoEvento(etapa: string): string {
  return TOM_KANBAN[etapaDaTrilha(etapa).tom].chip;
}

/* ─── Peças do topo ───────────────────────────────────────────────────────── */

interface ChipFiltroProps {
  label: string;
  total: number;
  ativo: boolean;
  /** Classe do pontinho de cor (`bg-*`); omitida nos chips neutros. */
  ponto?: string;
  icone?: LucideIcon;
  onClick: () => void;
}

/** Atalho arredondado de filtro (status ou etapa) com contagem real. */
function ChipFiltro({ label, total, ativo, ponto, icone: Icone, onClick }: ChipFiltroProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        // `w-full`: o chip agora é o CONTEÚDO de um wrapper Motion que carrega a
        // geometria (`flex-1 min-w-fit`) — o botão só preenche o wrapper. `flex`
        // (não `inline-flex`) evita o respiro de linha do formato inline dentro
        // do wrapper, mantendo a altura exata de 32px. Comportamento de hover,
        // foco e estado ativo intactos.
        'flex h-8 w-full min-w-fit items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-[11.5px] font-medium transition-colors',
        // ATIVO = tinta cheia do `primary` do sistema (o mesmo amarelo/limão dos
        // botões primários) com texto escuro — é o destaque forte da referência.
        ativo
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border/40 bg-card text-muted-foreground hover:border-border/70 hover:bg-muted/50 hover:text-foreground'
      )}
    >
      {ponto && (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ativo ? 'bg-primary-foreground/60' : ponto)} />
      )}
      {Icone && <Icone className={cn('h-3.5 w-3.5 shrink-0', ativo && 'text-primary-foreground')} />}
      {label}
      <span className={cn('tabular-nums', ativo ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>
        ({total})
      </span>
    </button>
  );
}

/** Linha rótulo/valor do detalhe do evento. */
function CampoDetalhe({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-[12.5px] leading-snug text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Blocos que cascateiam nesta janela: cabeçalho (título + descrição), a grade de
 * campos e o bloco do eSocial. Mesma ideia do popup "Pendências"
 * (`items.length + 1`); aqui é fixa e define o atraso do fechamento da casca em
 * `cascadeShellVariants`.
 */
const BLOCOS_CASCATA_EVENTO = 3;
const SHELL_CASCATA = cascadeShellVariants(BLOCOS_CASCATA_EVENTO);
const OVERLAY_CASCATA = cascadeOverlayVariants(BLOCOS_CASCATA_EVENTO);

/**
 * Detalhe do evento — o destino do botão "Ver detalhes" da linha. Mostra o
 * registro COMPLETO (nada truncado) para a ação da tabela ter função real, e
 * não só um ícone decorativo.
 *
 * ANIMAÇÃO: RADIX + FRAMER na MESMA montagem do popup "Pendências"
 * (`ui/animated-cascade-dialog.tsx` + `ui/cascade-motion.ts`, a coreografia única
 * do sistema): mesmo véu (`bg-black/60` + `backdrop-blur-sm`), mesma casca que
 * abre de dentro para fora, mesmo botão X e mesma cascata de entrada/saída dos
 * blocos. Nada de coreografia nova — só o CONTEÚDO (campos do evento) é desta
 * janela, e o tamanho/chrome seguem os do `DialogContent` de sempre.
 */
function DetalheEventoDialog({
  evento,
  aberto,
  onOpenChange,
}: {
  evento: EventoAuditoria | null;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
}) {
  if (!evento) return null;

  const etapa = etapaDaTrilha(evento.etapa);
  const IconeStatus = ICONE_STATUS[evento.status];
  const IconeEvento = evento.acao === ACAO_PROCESSO_CRIADO ? ICONE_EVENTO_CRIACAO : etapa.icon;
  const quando = formatarDataHora(evento.data_hora);

  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {aberto && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                variants={OVERLAY_CASCATA}
                initial="closed"
                animate="open"
                exit="closed"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className={cn(
                  'fixed left-[50%] top-[50%] z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 border bg-background p-5 shadow-lg sm:rounded-lg',
                  'max-w-lg'
                )}
                style={{ transformOrigin: 'top center' }}
                variants={SHELL_CASCATA}
                initial="closed"
                animate="open"
                exit="closed"
              >
                {/* CONTÊINER da cascata: cabeçalho, campos e eSocial entram em
                    sequência (e somem de trás para frente). Carrega o `grid gap-3`
                    que antes ficava na casca — o espaçamento interno não muda. */}
                <motion.div
                  className="grid gap-3"
                  variants={cascadeContainerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  <motion.div variants={cascadeItemVariants}>
                    <DialogHeader>
                      <DialogTitle className="flex items-start gap-3 text-base">
                        <span
                          className={cn(
                            'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl',
                            chipDoEvento(evento.etapa)
                          )}
                        >
                          <IconeEvento className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">{evento.acao}</span>
                      </DialogTitle>
                      <DialogDescription className="pl-11">{evento.detalhe}</DialogDescription>
                    </DialogHeader>
                  </motion.div>

                  <motion.div variants={cascadeItemVariants}>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
                      <CampoDetalhe rotulo="Candidato">{evento.candidato}</CampoDetalhe>
                      <CampoDetalhe rotulo="Cargo">{evento.cargo || '—'}</CampoDetalhe>
                      <CampoDetalhe rotulo="Departamento">{evento.departamento || '—'}</CampoDetalhe>
                      <CampoDetalhe rotulo="Data/Hora">
                        {quando.data}
                        {quando.hora ? ` · ${quando.hora}` : ''}
                      </CampoDetalhe>
                      <CampoDetalhe rotulo="Etapa">
                        {/* Mesma regra da coluna: a badge NUNCA quebra em duas linhas. */}
                        <span
                          className={cn(
                            'inline-flex w-fit min-w-max shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium',
                            etapa.badge
                          )}
                        >
                          <etapa.icon className="h-3 w-3 shrink-0" /> {etapa.label}
                        </span>
                      </CampoDetalhe>
                      <CampoDetalhe rotulo="Status">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide',
                            seloStatus(evento.status)
                          )}
                        >
                          <IconeStatus className="h-3 w-3" /> {LABEL_STATUS[evento.status]}
                        </span>
                      </CampoDetalhe>
                      <CampoDetalhe rotulo="Responsável">{evento.responsavel || 'Não atribuído'}</CampoDetalhe>
                      <CampoDetalhe rotulo="Função">{evento.responsavel_cargo || '—'}</CampoDetalhe>
                    </dl>
                  </motion.div>

                  {evento.evento_esocial && (
                    <motion.div variants={cascadeItemVariants}>
                      <div className="mt-1 rounded-xl border border-border/40 bg-muted/30 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          eSocial
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-foreground">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <FileCheck2 className="h-3.5 w-3.5 text-muted-foreground" /> {evento.evento_esocial}
                          </span>
                          <span className="text-muted-foreground">
                            {evento.protocolo ? `Recibo ${evento.protocolo}` : 'Aguardando recibo de protocolo'}
                          </span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                <DialogPrimitive.Close className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-colors hover:bg-accent hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar</span>
                </DialogPrimitive.Close>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/**
 * Botão-ícone pequeno da coluna de ações, sempre com tooltip. `disabled` existe
 * porque "Abrir registro" só faz sentido quando o evento tem recibo/documento.
 */
function BotaoAcao({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="h-7 w-7 rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Copia o recibo do eSocial (com guarda para ambiente sem clipboard). */
function copiarProtocolo(protocolo: string) {
  const copia = navigator.clipboard?.writeText(protocolo);
  if (!copia) {
    toast.error('Não foi possível copiar o protocolo.');
    return;
  }
  copia.then(
    () => toast.success(`Protocolo ${protocolo} copiado.`),
    () => toast.error('Não foi possível copiar o protocolo.')
  );
}

/* ─── Tela ────────────────────────────────────────────────────────────────── */

export default function AuditoriaAdmissoesContent() {
  const navigate = useNavigate();
  // "Ver logs globais" é PONTO DE NAVEGAÇÃO do sistema: fica sempre visível e NÃO é
  // acoplado a `pode('auditoria','read')`. Quem autoriza `/auditoria` é o guard da
  // rota (`PermissionRoute`) — a visibilidade do atalho não decide acesso.
  // "Hoje" resolvido uma vez por montagem — mesma régua (`inicioDoDia`) do módulo.
  const hoje = useMemo(() => hojeAuditoria(), []);

  // MOCK VISUAL — ver src/mocks/admissoesMock.ts (dev + VITE_ADMISSOES_MOCK=true).
  const eventos = useMemo(() => (isAdmissoesMockEnabled() ? getMockAuditoria() : []), []);

  const [filtros, setFiltros] = useState<FiltrosAuditoria>(FILTROS_AUDITORIA_VAZIOS);
  // FONTE ÚNICA do destaque da linha de chips — mutuamente exclusiva por
  // construção, nunca derivada de `status`/`etapa` (que são combináveis).
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(QUICK_FILTER_PADRAO);
  const [ordem, setOrdem] = useState<OrdemAuditoria>('recentes');
  const [painelAberto, setPainelAberto] = useState(false);
  const [eventoDetalhe, setEventoDetalhe] = useState<EventoAuditoria | null>(null);
  // `aberto` SEPARADO do evento: ao fechar, o evento continua montado durante a
  // animação de SAÍDA (Radix + `AnimatePresence`), exatamente como no popup
  // "Pendências" — sem isso a janela sumiria de uma vez, sem transição.
  const [detalheAberto, setDetalheAberto] = useState(false);

  /**
   * Atualiza UM campo do filtro. Mexer MANUALMENTE em `status`/`etapa` (nos
   * selects) solta o chip rápido — assim o chip aceso nunca mente sobre o filtro.
   */
  const atualizar = <C extends keyof FiltrosAuditoria>(campo: C, valor: FiltrosAuditoria[C]) => {
    if (campo === 'status' || campo === 'etapa') setQuickFilter(QUICK_FILTER_PADRAO);
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  };

  /** Traduz a sentinela do Radix de volta para "sem filtro". */
  const atualizarDeSelect =
    <C extends keyof FiltrosAuditoria>(campo: C) =>
    (valor: string) =>
      atualizar(campo, (valor === VALOR_TODOS ? '' : valor) as FiltrosAuditoria[C]);

  /**
   * Chip rápido (e card de status, que é da mesma família): grava o id E
   * reescreve `status`/`etapa` de uma vez — é o que apaga o resíduo do chip
   * anterior. Os demais filtros seguem intactos (seguem combináveis).
   */
  const selecionarQuickFilter = (quick: QuickFilter) => {
    setQuickFilter(quick);
    setFiltros((atual) => aplicarQuickFilter(atual, quick));
  };

  /** Limpar TUDO: os filtros combináveis E o chip rápido (volta para "Todos"). */
  const limparFiltros = () => {
    setFiltros(FILTROS_AUDITORIA_VAZIOS);
    setQuickFilter(QUICK_FILTER_PADRAO);
  };

  const resumo = useMemo(() => resumoAuditoria(eventos, hoje), [eventos, hoje]);
  const filtrados = useMemo(() => filtrarAuditoria(eventos, filtros, hoje), [eventos, filtros, hoje]);
  const lista = useMemo(() => ordenarAuditoria(filtrados, ordem), [filtrados, ordem]);

  /**
   * Chave da CASCATA de linhas: muda quando a listagem troca de identidade
   * (ordenação, chip rápido ou filtros), remontando o `<tbody>` compartilhado
   * (`CascadeTableBody`) e repetindo a cascata — mesmo contrato da Auditoria
   * Global, que consome exatamente o mesmo componente.
   */
  const cascataChave = `${ordem}|${quickFilter}|${JSON.stringify(filtros)}`;
  const contagemPorEtapa = useMemo(() => contarPorEtapa(eventos), [eventos]);
  const opcoesResponsavel = useMemo(() => responsaveisDisponiveis(eventos), [eventos]);
  const opcoesTipo = useMemo(() => tiposDeEvento(eventos), [eventos]);
  const temFiltro = possuiFiltrosAtivos(filtros);

  const valorDoCard: Record<ChaveResumo, number> = {
    eventos: resumo.total,
    sucesso: resumo.sucesso,
    pendentes: resumo.pendentes,
    falhas: resumo.falhas,
  };

  /** Total por status — os chips e o select usam os MESMOS números do resumo. */
  const totalPorStatus: Record<StatusAuditoria, number> = {
    sucesso: resumo.sucesso,
    pendente: resumo.pendentes,
    falha: resumo.falhas,
  };

  /** Contador de cada chip rápido — sempre o número REAL da trilha. */
  const totalDoChip = (quick: QuickFilter): number => {
    const { status, etapa } = QUICK_FILTER_VALORES[quick];
    if (status) return totalPorStatus[status];
    if (etapa) return contagemPorEtapa[etapa] ?? 0;
    return resumo.total;
  };

  /* Estado vazio: sem trilha não há métrica nem tabela para mostrar. */
  if (eventos.length === 0) {
    return (
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
        <div className="rounded-2xl border border-border/40 bg-card p-10 text-center shadow-xs">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <History className="h-6 w-6" />
          </span>
          <p className="font-display text-sm font-semibold text-foreground">Histórico de Auditoria – Admissões</p>
          <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-snug text-muted-foreground">
            O monitoramento de auditoria eSocial e admissão digital está ativo. Nenhum evento foi registrado ainda.
          </p>
          <Button variant="link" className="mt-2 text-xs text-primary" onClick={() => navigate(ROTA_LOGS_GLOBAIS)}>
            Ver Logs Globais
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* 1. KPIs — MESMO componente, mesma grade e mesmo chrome dos KPI Cards
            do Dashboard de Admissões (`MetricCard`, com a cascata do
            `cardVariants` vinda do próprio componente via `index`): ícone com o
            tom semântico, título em caixa de frase, valor claro e a frase de
            apoio. A ordem da cascata é Eventos → Sucesso → Pendentes → Falhas. */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CARDS_RESUMO.map((card, indice) => (
            <MetricCard
              key={card.chave}
              index={indice}
              title={card.label}
              value={String(valorDoCard[card.chave])}
              icon={card.icon}
              tone={card.tom}
              vividRed
              description={card.descricao}
              className="rounded-2xl border-border/40 shadow-elevated"
            />
          ))}
        </div>

        {/* 2. BUSCA E FILTROS — UMA ÚNICA LINHA (`flex` sem `wrap`): busca
            expansível à esquerda, os quatro selects com largura controlada no
            meio e as ações de largura fixa no fim. Se a tela ficar menor que a
            soma dos mínimos, o container rola na horizontal — nada desce. */}
        <div className="space-y-3 rounded-2xl border border-border/40 bg-card p-3 shadow-sm">
          <div className="overflow-x-auto">
            <div className="flex items-center gap-2.5">
              {/* Busca — cresce 3× mais que os selects e nunca abaixo de 180px.
                  A GEOMETRIA (largura/flex) vai para o wrapper Motion — ele é o
                  item do flex; o conteúdo interno só preenche. */}
              <motion.div
                custom={0}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="relative min-w-[180px] flex-[3_1_220px]"
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filtros.termo}
                    onChange={(e) => atualizar('termo', e.target.value)}
                    placeholder="Buscar por candidato, ação, responsável ou protocolo..."
                    aria-label="Buscar na trilha de auditoria"
                    className="h-9 w-full rounded-xl border-border/40 bg-background/70 pl-9"
                  />
                </div>
              </motion.div>
              {/* Selects — MESMOS limites (encolhem até 140px, crescem até 200px).
                  Os limites ficam no wrapper Motion; o trigger preenche (`w-full`). */}
              <motion.div
                custom={1}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex min-w-[140px] max-w-[200px] flex-1"
              >
                <Select value={filtros.status || VALOR_TODOS} onValueChange={atualizarDeSelect('status')}>
                  <SelectTrigger
                    aria-label="Filtrar por status"
                    className="h-9 w-full rounded-xl border-border/40 bg-background/70"
                  >
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VALOR_TODOS}>Todos os status</SelectItem>
                    <SelectItem value="sucesso">Sucesso</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="falha">Falha</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>

              <motion.div
                custom={2}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex min-w-[140px] max-w-[200px] flex-1"
              >
                <Select value={filtros.etapa || VALOR_TODOS} onValueChange={atualizarDeSelect('etapa')}>
                  <SelectTrigger
                    aria-label="Filtrar por etapa"
                    className="h-9 w-full rounded-xl border-border/40 bg-background/70"
                  >
                    <SelectValue placeholder="Etapa" />
                  </SelectTrigger>
                  {/* SEMPRE abre para BAIXO: `side="bottom"` + `avoidCollisions={false}`
                      desligam o flip automático do Popper (que subia este menu e cobria
                      o topo da interface). `align="start"` mantém o alinhamento pela
                      ESQUERDA do campo e `sideOffset={4}` o mesmo respiro dos demais
                      selects. Vale SÓ para este filtro. */}
                  <SelectContent position="popper" side="bottom" align="start" avoidCollisions={false} sideOffset={4}>
                    <SelectItem value={VALOR_TODOS}>Todas as etapas</SelectItem>
                    {OPCOES_ETAPA.map((etapa) => (
                      <SelectItem key={etapa.value} value={etapa.value}>
                        {etapa.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              <motion.div
                custom={3}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex min-w-[140px] max-w-[200px] flex-1"
              >
                <Select value={filtros.responsavel || VALOR_TODOS} onValueChange={atualizarDeSelect('responsavel')}>
                  <SelectTrigger
                    aria-label="Filtrar por responsável"
                    className="h-9 w-full rounded-xl border-border/40 bg-background/70"
                  >
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VALOR_TODOS}>Todos os responsáveis</SelectItem>
                    {opcoesResponsavel.map((nome) => (
                      <SelectItem key={nome} value={nome}>
                        {nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              <motion.div
                custom={4}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex min-w-[140px] max-w-[200px] flex-1"
              >
                <Select value={filtros.periodo} onValueChange={(v) => atualizar('periodo', v as PeriodoAuditoria)}>
                  <SelectTrigger
                    aria-label="Filtrar por período"
                    className="h-9 w-full rounded-xl border-border/40 bg-background/70"
                  >
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODOS_AUDITORIA.map((periodo) => (
                      <SelectItem key={periodo.value} value={periodo.value}>
                        {periodo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
              {/* Ações — largura fixa no fim da linha; o rótulo nunca quebra.
                  Cada botão ganha o PRÓPRIO wrapper Motion (itens 6 e 7 da
                  cascata); `shrink-0` vai para o wrapper, que passa a ser o item. */}
              <div className="flex shrink-0 items-center gap-2">
                <motion.div
                  custom={5}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex shrink-0"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    aria-expanded={painelAberto}
                    onClick={() => setPainelAberto((aberto) => !aberto)}
                    className="h-9 min-w-[136px] shrink-0 gap-1.5 whitespace-nowrap rounded-xl border-border/40 px-3 text-xs"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Mais filtros
                    <ChevronDown className={cn('h-3 w-3 transition-transform', painelAberto && 'rotate-180')} />
                  </Button>
                </motion.div>
                {/* "Limpar filtros" é o TERMÔMETRO dos filtros: com QUALQUER filtro
                    ativo (busca, selects, chips ou o painel avançado) ele assume o
                    visual primário LIME do sistema; sem nada a limpar, fica na ação
                    secundária neutra (fundo escuro, borda sutil, texto discreto) e
                    desabilitado. O flag é o `temFiltro` (`possuiFiltrosAtivos`), o
                    MESMO que já governa a lógica — nada de filtro mudou aqui. */}
                <motion.div
                  custom={6}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex shrink-0"
                >
                  <Button
                    variant={temFiltro ? 'default' : 'outline'}
                    size="sm"
                    disabled={!temFiltro}
                    onClick={limparFiltros}
                    className={cn(
                      // `border` nos DOIS estados: a caixa não muda de largura ao
                      // alternar (border-box) e a barra não sofre nenhum pulo.
                      'h-9 min-w-[146px] shrink-0 gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs',
                      temFiltro ? 'cursor-pointer border-transparent' : 'border-border/40 text-muted-foreground'
                    )}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Limpar filtros
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
          {/* Painel avançado — monta só quando "Mais filtros" está aberto */}
          {painelAberto && (
            <div className="flex flex-wrap items-end gap-2 border-t border-border/40 pt-3">
              <div className="flex w-[300px] flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de evento
                </span>
                <Select value={filtros.tipo || VALOR_TODOS} onValueChange={atualizarDeSelect('tipo')}>
                  <SelectTrigger
                    aria-label="Filtrar por tipo de evento"
                    className="h-9 rounded-xl border-border/40 bg-background/60"
                  >
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[440px]">
                    <SelectItem value={VALOR_TODOS}>Todos os tipos</SelectItem>
                    {opcoesTipo.map((tipo) => (
                      <SelectItem key={tipo.acao} value={tipo.acao}>
                        {tipo.acao} ({tipo.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">De</span>
                <Input
                  type="date"
                  value={filtros.de}
                  onChange={(e) => atualizar('de', e.target.value)}
                  aria-label="Data inicial"
                  className="h-9 w-[156px] rounded-xl border-border/40 bg-background/70"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Até</span>
                <Input
                  type="date"
                  value={filtros.ate}
                  onChange={(e) => atualizar('ate', e.target.value)}
                  aria-label="Data final"
                  className="h-9 w-[156px] rounded-xl border-border/40 bg-background/70"
                />
              </div>

              <Button
                variant={filtros.somenteComProtocolo ? 'default' : 'outline'}
                size="sm"
                aria-pressed={filtros.somenteComProtocolo}
                onClick={() => atualizar('somenteComProtocolo', !filtros.somenteComProtocolo)}
                className="h-9 gap-1.5 rounded-xl px-3 text-xs"
              >
                <FileCheck2 className="h-3.5 w-3.5" /> Somente com recibo eSocial
              </Button>
            </div>
          )}
        </div>

        {/* 3. CHIPS — filtros rápidos em faixa PRÓPRIA (fora da caixa de filtros),
            com contagem real. Clicar alterna o filtro; o ativo fica em destaque.
            A faixa OCUPA 100% da largura útil: cada chip cresce por igual
            (`flex-1`), então não sobra vão à direita — e, como cada chip tem
            `min-w-fit`, rótulos longos ("Docs Pendentes", "Em Validação") nunca
            são cortados; em telas estreitas a faixa rola na horizontal. */}
        <div className="overflow-x-auto py-0.5">
          <div className="flex items-center gap-2">
            {QUICK_FILTERS.map((quick, indice) => {
              const chip = chipQuickFilter(quick);
              return (
                // Wrapper Motion POR chip: a GEOMETRIA (`flex-1 min-w-fit`) fica
                // aqui (é ele quem é o item do flex) e o botão só preenche — click,
                // focus, hover e o estado ativo continuam no `ChipFiltro`.
                <motion.div
                  key={quick}
                  custom={7 + indice}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex min-w-fit flex-1"
                >
                  <ChipFiltro
                    label={chip.label}
                    total={totalDoChip(quick)}
                    // MUTUAMENTE EXCLUSIVO: o lime depende SÓ do id do chip, então
                    // no máximo um fica aceso por vez (nunca Status + Etapa juntos).
                    ativo={quickFilter === quick}
                    ponto={chip.ponto}
                    icone={chip.icone}
                    onClick={() => selecionarQuickFilter(quick)}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 4. BLOCO PRINCIPAL */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-xs">
            {/* Cabeçalho do bloco — ícone + título + subtítulo + "Ordenar por" */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 bg-muted/20 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <History className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    Histórico de Auditoria – Admissões
                  </h3>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                    Rastreie e acompanhe todas as ações realizadas no processo de admissão
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <ArrowUpDown className="h-3 w-3" /> Ordenar por
                </span>
                <Select value={ordem} onValueChange={(v) => setOrdem(v as OrdemAuditoria)}>
                  <SelectTrigger
                    aria-label="Ordenar a trilha de auditoria"
                    className="h-9 w-[214px] rounded-xl border-border/40 bg-background/60 text-[12px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDENS_AUDITORIA.map((opcao) => (
                      <SelectItem key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabela — largura mínima legível; rola na horizontal só se não couber */}
            <div className="overflow-x-auto">
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="w-[132px] pl-5 text-[10.5px] uppercase tracking-wider">Data/Hora</TableHead>
                    <TableHead className="min-w-[300px] text-[10.5px] uppercase tracking-wider">Evento</TableHead>
                    <TableHead className="w-[224px] text-[10.5px] uppercase tracking-wider">Candidato</TableHead>
                    <TableHead className="w-[168px] min-w-[168px] text-[10.5px] uppercase tracking-wider">
                      Etapa
                    </TableHead>
                    <TableHead className="w-[126px] text-[10.5px] uppercase tracking-wider">Status</TableHead>
                    <TableHead className="w-[204px] text-[10.5px] uppercase tracking-wider">Responsável</TableHead>
                    <TableHead className="w-[116px] pr-5 text-right text-[10.5px] uppercase tracking-wider">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                {/* CASCATA DAS LINHAS: mecanismo COMPARTILHADO (`CascadeTableBody`
                    + `CascadeTableRow`, de `ui/cascade-table.tsx`) — o MESMO que a
                    Auditoria Global (`/auditoria`) importa. Moldura
                    (`AnimatePresence` sem props + `tbody key`) + `motion.tr` com o
                    variant compartilhado. */}
                <CascadeTableBody cascadeKey={cascataChave}>
                  {lista.map((evento, index) => {
                    const etapa = etapaDaTrilha(evento.etapa);
                    const IconeEvento = evento.acao === ACAO_PROCESSO_CRIADO ? ICONE_EVENTO_CRIACAO : etapa.icon;
                    const IconeEtapa = etapa.icon;
                    const IconeStatus = ICONE_STATUS[evento.status];
                    const quando = formatarDataHora(evento.data_hora);
                    const cargoDepartamento = [evento.cargo, evento.departamento].filter(Boolean).join(' • ');
                    const abrirDetalhe = () => {
                      setEventoDetalhe(evento);
                      setDetalheAberto(true);
                    };

                    return (
                      <CascadeTableRow
                        key={evento.id}
                        index={index}
                        className="border-border/30 transition-colors hover:bg-muted/40"
                      >
                        {/* Data/Hora */}
                        <TableCell className="pl-5 align-top">
                          <span className="block text-[12px] font-medium tabular-nums text-foreground">
                            {quando.data}
                          </span>
                          <span className="block text-[11px] tabular-nums text-muted-foreground">
                            {quando.hora || '—'}
                          </span>
                        </TableCell>

                        {/* Evento — ícone do tipo + título + descrição (+ recibo) */}
                        <TableCell className="align-top">
                          <div className="flex items-start gap-3">
                            <span
                              className={cn(
                                'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg',
                                chipDoEvento(evento.etapa)
                              )}
                            >
                              <IconeEvento className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium leading-snug text-foreground">{evento.acao}</p>
                              <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                                {evento.detalhe}
                              </p>
                              {evento.evento_esocial && (
                                <span className="mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  <FileCheck2 className="h-3 w-3 shrink-0" />
                                  <span className="font-medium text-foreground">{evento.evento_esocial}</span>
                                  <span>{evento.protocolo ? `· recibo ${evento.protocolo}` : '· sem recibo'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Candidato — avatar + nome + cargo • departamento */}
                        <TableCell className="align-top">
                          <div className="flex items-start gap-2.5">
                            <AvatarIniciais nome={evento.candidato} className="mt-0.5 h-7 w-7" />
                            <div className="min-w-0">
                              <p className="text-[12.5px] font-medium leading-snug text-foreground">
                                {evento.candidato || '—'}
                              </p>
                              {cargoDepartamento && (
                                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                  {cargoDepartamento}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {/* Etapa — badge com o ícone canônico da coluna do board.
                            NUNCA quebra: `whitespace-nowrap` + `w-fit min-w-max
                            shrink-0` na badge (sem `truncate`/ellipsis/overflow) e
                            `min-w-[168px]` na coluna — largura suficiente para
                            "Docs Pendentes" inteiro em UMA linha. Em telas
                            estreitas a tabela rola na horizontal (o wrapper já tem
                            `overflow-x-auto`); nunca corta nem invade o vizinho. */}
                        <TableCell className="min-w-[168px] align-top">
                          <span
                            className={cn(
                              'inline-flex w-fit min-w-max shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                              etapa.badge
                            )}
                          >
                            <IconeEtapa className="h-3 w-3 shrink-0" /> {etapa.label}
                          </span>
                        </TableCell>

                        {/* Status — badge em caixa alta, como na referência */}
                        <TableCell className="align-top">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              seloStatus(evento.status)
                            )}
                          >
                            <IconeStatus className="h-3 w-3 shrink-0" /> {LABEL_STATUS[evento.status]}
                          </span>
                        </TableCell>

                        {/* Responsável — avatar + nome + função */}
                        <TableCell className="align-top">
                          <div className="flex items-start gap-2.5">
                            <AvatarIniciais nome={evento.responsavel} className="mt-0.5 h-7 w-7" />
                            <div className="min-w-0">
                              <p className="text-[12.5px] font-medium leading-snug text-foreground">
                                {evento.responsavel || 'Não atribuído'}
                              </p>
                              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                {evento.responsavel_cargo || '—'}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Ações — cada ícone tem função real: ver detalhes, abrir o
                            registro do eSocial (quando existe) e o menu completo. */}
                        <TableCell className="pr-5 align-top">
                          <div className="flex items-center justify-end gap-0.5">
                            <BotaoAcao label="Ver detalhes" icon={Eye} onClick={abrirDetalhe} />
                            <BotaoAcao
                              label={
                                evento.evento_esocial
                                  ? 'Abrir registro do eSocial'
                                  : 'Sem registro do eSocial para abrir'
                              }
                              icon={FileText}
                              disabled={!evento.evento_esocial}
                              onClick={abrirDetalhe}
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Mais ações"
                                  className="h-7 w-7 rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-60">
                                <DropdownMenuItem className="gap-2 text-xs" onSelect={abrirDetalhe}>
                                  <Eye className="h-3.5 w-3.5" /> Ver detalhes do evento
                                </DropdownMenuItem>
                                {evento.protocolo && (
                                  <DropdownMenuItem
                                    className="gap-2 text-xs"
                                    onSelect={() => copiarProtocolo(evento.protocolo as string)}
                                  >
                                    <Copy className="h-3.5 w-3.5" /> Copiar protocolo {evento.protocolo}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 text-xs"
                                  onSelect={() => atualizar('termo', evento.candidato)}
                                >
                                  <Filter className="h-3.5 w-3.5" /> Filtrar por este candidato
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-xs"
                                  onSelect={() => atualizar('responsavel', evento.responsavel)}
                                >
                                  <Filter className="h-3.5 w-3.5" /> Filtrar por este responsável
                                </DropdownMenuItem>
                                {/* Atalho da trilha global: ponto de navegação do
                                    sistema, sempre visível — a AUTORIZAÇÃO da página
                                    é decidida pelo guard da rota. */}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 text-xs"
                                  onSelect={() => navigate(ROTA_LOGS_GLOBAIS)}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> Ver logs globais
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </CascadeTableRow>
                    );
                  })}
                </CascadeTableBody>
              </Table>
            </div>

            {/* Nenhum resultado para o filtro atual (a trilha existe) */}
            {lista.length === 0 && (
              <div className="flex flex-col items-center gap-2 border-t border-border/40 px-4 py-12 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-[12.5px] font-medium text-foreground">Nenhum evento encontrado</p>
                <p className="max-w-sm text-[11.5px] leading-snug text-muted-foreground">
                  Nenhum evento corresponde aos filtros informados. Ajuste a busca ou limpe os filtros para ver a trilha
                  completa.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 h-8 gap-1.5 rounded-lg text-xs"
                  onClick={limparFiltros}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Limpar filtros
                </Button>
              </div>
            )}

            {/* Rodapé do bloco — contagem do recorte + atalho para os logs do sistema */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 bg-muted/20 px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">
                Exibindo <span className="font-medium tabular-nums text-foreground">{lista.length}</span> de{' '}
                <span className="font-medium tabular-nums text-foreground">{resumo.total}</span> evento
                {resumo.total === 1 ? '' : 's'}
                {temFiltro ? ' (filtrado)' : ''}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 rounded-lg px-2 text-[11px] text-muted-foreground"
                onClick={() => navigate(ROTA_LOGS_GLOBAIS)}
              >
                <ExternalLink className="h-3 w-3" /> Ver logs globais
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <DetalheEventoDialog evento={eventoDetalhe} aberto={detalheAberto} onOpenChange={setDetalheAberto} />
    </TooltipProvider>
  );
}
