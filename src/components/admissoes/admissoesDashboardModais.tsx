/**
 * Modais de detalhe dos quatro widgets do Dashboard de Admissões.
 *
 * Cada card do dashboard tem um atalho no cabeçalho ("Ver todas" / "Ver
 * detalhes"). Esses atalhos abrem ESTES modais — que reutilizam o MESMO
 * componente-base do popup "Pendências" da área de Colaboradores
 * (`ui/animated-cascade-dialog.tsx`): mesmo overlay `bg-black/60` +
 * `backdrop-blur-sm`, mesma coreografia de abertura/fechamento (a caixa nasce
 * pequena, estica as laterais, depois a altura e só então o conteúdo cascateia),
 * mesmo botão X, mesmo tamanho (`max-w-[460px]`), mesmo raio/sombra/borda e o
 * mesmo scroll interno do miolo (`max-h-[65vh] overflow-y-auto`). Não existe um
 * segundo padrão de modal nesta tela.
 *
 * O que muda de um modal para o outro é só o CONTEÚDO — sempre os dados
 * detalhados do card, sem o corte de exibição: todas as admissões/áreas/processos
 * por trás dos números, com os campos que o RH precisa para agir. O modal abre
 * DIRETO nesses dados: o bloco de explicação que precedia a lista (as seções "O
 * que é", "De onde vêm os dados", "Como é calculado", …, com a caixa, a borda
 * `border-border/30` e o fundo `bg-muted/20` próprios) foi removido a pedido —
 * não sobra título intermediário nem faixa vazia no lugar dele.
 *
 * Toda a matemática (contagens, ordenações, dias, SLA) fica no dashboard, que já
 * calcula os cards — assim o número do card e a lista do modal saem SEMPRE da
 * mesma fonte. Este arquivo é só apresentação: recebe dados já derivados e os
 * formata/rotula.
 */
import { type LucideIcon } from 'lucide-react';
import { AlertCircle, AlertTriangle, Calendar, CheckCircle, Gauge, PieChart, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/format';
import { ETAPA_BADGE, ETAPA_LABELS, TONE_BADGE, TONE_TEXT, type Tone, type ToneSelo } from './admissoesComum';

/* ─── Contrato de dados (o dashboard deriva, o modal exibe) ───────────────── */

/** Classificação de prazo de uma admissão em andamento (mesma régua do card). */
export type SlaSegmento = 'dentro' | 'risco' | 'atrasada';

/** Uma admissão já "traduzida" para leitura — cards e modais leem destes campos. */
export interface AdmissaoDetalhe {
  id: string;
  nome: string;
  cargo?: string | null;
  departamento?: string | null;
  etapa?: string | null;
  dataPrevista?: string | null;
  /**
   * Dias entre a data prevista e o início de HOJE, arredondados para cima:
   * `0` = vence hoje, `> 0` = ainda faltam N dias, `< 0` = N dias de atraso,
   * `null` = sem data prevista cadastrada.
   */
  dias: number | null;
  sla: SlaSegmento;
  /** `metadata.responsavel` da admissão; `'Não atribuído'` quando vazio. */
  responsavel: string;
  /** 0-100 — checklist quando a base preenche, senão posição da etapa no fluxo. */
  progresso: number;
  /** De onde veio o `progresso` (ex.: `checklist 5/7` ou `etapa 4/8`). */
  progressoBase: string;
  /** Itens do checklist ainda não marcados (ou o aviso de checklist vazio). */
  pendencias: string[];
  /** `observacoes` da admissão (texto registrado pelo RH), quando houver. */
  observacao?: string | null;
  statusEsocial?: string | null;
  protocoloEsocial?: string | null;
}

/** Uma família de pendência do card "Ações Prioritárias", com a fila inteira. */
export interface PrioridadeDetalhe {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  /** Mesmo número exibido no card. */
  total: number;
  candidatos: AdmissaoDetalhe[];
  /**
   * Ação de destino REAL no sistema — só é definida quando existe uma tela que
   * resolve aquela família (aba interna de Admissões, `/exames` ou `/esocial`).
   * Sem destino, o modal simplesmente não mostra o botão (em vez de oferecer um
   * atalho que não leva a lugar nenhum).
   */
  resolver?: () => void;
}

/** Uma área do card "Distribuição por Área" (a lista completa, sem "Outros"). */
export interface AreaDetalhe {
  nome: string;
  count: number;
  percentual: number;
  /** 1 = área com mais admissões. */
  posicao: number;
  /** Variação % dos últimos 30 dias contra os 30 anteriores; `null` sem base. */
  variacao: number | null;
}

/* ─── Helpers de formatação ───────────────────────────────────────────────── */

/** `3` → `faltam 3 dias`; `0` → `vence hoje`; `-2` → `2 dias de atraso`. */
function diasTexto(dias: number | null): string {
  if (dias === null) return 'sem data prevista cadastrada';
  if (dias === 0) return 'vence hoje';
  if (dias > 0) return dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`;
  const atraso = Math.abs(dias);
  return atraso === 1 ? '1 dia de atraso' : `${atraso} dias de atraso`;
}

/** Primeira letra maiúscula — os rótulos das linhas do card são minúsculos. */
function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Rótulo, selo e tinta de cada classificação de prazo. */
const SLA_INFO: Record<SlaSegmento, { label: string; badge: ToneSelo; tone: Tone }> = {
  dentro: { label: 'Dentro do SLA', badge: 'success', tone: 'success' },
  risco: { label: 'Em risco', badge: 'warning', tone: 'warning' },
  atrasada: { label: 'Atrasado', badge: 'destructive', tone: 'destructive' },
};

/** Próxima ação recomendada por etapa (orientação de processo, não dado do banco). */
const ETAPA_PROXIMA_ACAO: Record<string, string> = {
  solicitacao: 'Confirmar os dados da requisição com o gestor e abrir a coleta de documentos.',
  documentos: 'Cobrar do candidato os documentos do checklist abaixo e conferir os recebidos.',
  validacao: 'Validar os documentos enviados e liberar o exame admissional.',
  pendente: 'Retomar a pendência registrada na observação da admissão e destravar a etapa.',
  exame: 'Confirmar o agendamento/resultado do ASO admissional e anexar o documento.',
  contrato: 'Gerar/enviar o contrato para assinatura (link por e-mail ou WhatsApp).',
  assinatura: 'Acompanhar a assinatura digital e cobrar o candidato quando o prazo vencer.',
  esocial: 'Transmitir o evento S-2200 e conferir o protocolo devolvido.',
  concluida: 'Nada a fazer: o processo está concluído.',
  cancelada: 'Revisar o motivo do cancelamento e reabrir a admissão, se for o caso.',
};

function proximaAcaoDaEtapa(etapa?: string | null): string {
  return ETAPA_PROXIMA_ACAO[etapa ?? ''] ?? 'Conferir a etapa da admissão no módulo e definir o próximo passo.';
}

/* ─── Blocos de UI compartilhados pelos quatro modais ─────────────────────── */

/**
 * Par rótulo/valor em FLUXO NORMAL de texto: os dois na mesma linha e, na
 * primeira quebra (observação registrada, ação recomendada, "como ler",
 * pendências…), as linhas seguintes usam a largura INTEIRA do card.
 *
 * Por isso NÃO existe coluna fixa para o rótulo: `flex` com `shrink-0`,
 * `grid-cols-[…]`, `w-*`/`basis-*` no rótulo ou `pl-*` no valor deixariam um vão
 * vazio à esquerda a partir da 2ª linha. Campo curto — que não quebra — continua
 * compacto, porque o valor fica na MESMA linha do rótulo.
 */
function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <p className="break-words text-xs leading-relaxed">
      <span className="text-muted-foreground">{rotulo}:</span> <span className="text-foreground/90">{children}</span>
    </p>
  );
}

/** Texto curto usado quando uma lista do modal está vazia. */
function VazioLista({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

/**
 * Bloco de uma admissão. Os campos extras entram por flag porque cada modal
 * precisa de um recorte diferente do MESMO registro: "Ações Prioritárias" quer
 * prazo/pendências (o que cobrar), "Próximas Admissões" quer o progresso, e
 * "SLA & Alertas" quer a classificação de prazo e a próxima ação.
 */
function BlocoAdmissao({
  admissao,
  mostrarProgresso = false,
  mostrarSla = false,
}: {
  admissao: AdmissaoDetalhe;
  mostrarProgresso?: boolean;
  mostrarSla?: boolean;
}) {
  const etapa = admissao.etapa ?? '';
  const sla = SLA_INFO[admissao.sla];
  const contexto = [admissao.cargo, admissao.departamento].filter(Boolean).join(' · ');
  const esocial = [
    admissao.statusEsocial ? `status ${admissao.statusEsocial}` : null,
    admissao.protocoloEsocial ? `protocolo ${admissao.protocoloEsocial}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-1.5 rounded-lg border border-border/30 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-snug">{admissao.nome}</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {contexto || 'Cargo e departamento não informados nesta admissão'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {mostrarSla && (
            <Badge variant="outline" size="sm" className={cn('border-0', TONE_BADGE[sla.badge])}>
              {sla.label}
            </Badge>
          )}
          <Badge
            variant="outline"
            size="sm"
            className={cn('border-0', ETAPA_BADGE[etapa] ?? 'bg-muted/50 text-muted-foreground')}
          >
            {ETAPA_LABELS[etapa] ?? admissao.etapa ?? '—'}
          </Badge>
        </div>
      </div>

      <Campo rotulo="Data prevista">
        {admissao.dataPrevista ? formatDate(admissao.dataPrevista) : 'não cadastrada'}
      </Campo>
      <Campo rotulo="Tempo restante">{diasTexto(admissao.dias)}</Campo>

      {mostrarProgresso && (
        <div className="space-y-1">
          <Campo rotulo="Progresso">
            <span className="font-medium tabular-nums">{admissao.progresso}%</span>{' '}
            <span className="text-muted-foreground">({admissao.progressoBase})</span>
          </Campo>
          <Progress value={admissao.progresso} className="h-1.5" />
        </div>
      )}

      <Campo rotulo="Responsável">{admissao.responsavel}</Campo>
      <Campo rotulo="Pendências">
        {admissao.pendencias.length > 0 ? admissao.pendencias.join(' · ') : 'checklist completo'}
      </Campo>
      {admissao.observacao && <Campo rotulo="Observação registrada">{admissao.observacao}</Campo>}
      {esocial && <Campo rotulo="eSocial">{esocial}</Campo>}
      {mostrarSla && <Campo rotulo="Próxima ação">{proximaAcaoDaEtapa(admissao.etapa)}</Campo>}
    </div>
  );
}

/** Título de grupo com o total (mesmos ícones e tons das linhas do card). */
function TituloGrupo({
  icon: Icon,
  tone,
  label,
  total,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  total: number;
}) {
  return (
    <p className="flex items-center gap-2 pt-1 text-caption font-semibold">
      <Icon className={cn('h-3.5 w-3.5 shrink-0', TONE_TEXT[tone])} />
      {label}
      <span className={cn('tabular-nums', TONE_TEXT[tone])}>{total}</span>
    </p>
  );
}

/** Botão de ação do item — mesmas classes do "Resolver agora" de Pendências. */
function BotaoResolver({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="flex justify-end pt-0.5">
      <button type="button" onClick={onClick} className="text-xs font-medium text-primary hover:underline">
        {label}
      </button>
    </div>
  );
}

/* ─── 1. Ações Prioritárias ──────────────────────────────────────────────── */

/**
 * Leitura de processo de cada família de pendência: por que o item é
 * prioritário, qual é a gravidade, qual é o prazo de referência, em que etapa
 * ele vive, o que fazer e ONDE resolver. É texto de processo (não vem do
 * banco) — por isso não mora no dashboard, que só entrega os números e a fila.
 */
const CONTEXTO_PRIORIDADE: Record<
  string,
  {
    motivo: string;
    gravidade: 'Alta' | 'Média';
    gravidadeBadge: 'destructive' | 'warning';
    prazo: string;
    etapa: string;
    acaoRecomendada: string;
    ondeResolver: string;
  }
> = {
  documentos: {
    motivo: 'Sem os documentos não há como validar o cadastro, gerar o contrato nem transmitir o eSocial.',
    gravidade: 'Alta',
    gravidadeBadge: 'destructive',
    prazo: 'Antes de gerar o contrato — o quanto antes, e no máximo até 3 dias úteis da data prevista.',
    etapa: 'Docs Pendentes (`etapa = documentos`)',
    acaoRecomendada:
      'Reenviar o link de contratação, conferir o checklist abaixo e validar cada documento recebido (os reprovados voltam para o candidato).',
    ondeResolver: 'Aba "Gestão de Candidatos" → detalhe da admissão → Documentos.',
  },
  exames: {
    motivo: 'O ASO admissional é exigência legal (NR-7) e sem ele a admissão não pode ser concluída.',
    gravidade: 'Média',
    gravidadeBadge: 'warning',
    prazo: 'Data prevista já vencida e ASO pendente.',
    etapa: 'Exame (`etapa = exame`)',
    acaoRecomendada: 'Confirmar o agendamento com a clínica, cobrar o resultado e anexar o ASO na admissão.',
    ondeResolver: 'Módulo Exames (`/exames`) — registre/agende o ASO do tipo "Admissional".',
  },
  contratos: {
    motivo: 'Contrato sem assinatura deixa o vínculo sem prova documental e trava o passo seguinte (eSocial).',
    gravidade: 'Média',
    gravidadeBadge: 'warning',
    prazo: 'Antes do início — o link de assinatura tem validade e precisa ser renovado quando vence.',
    etapa: 'Contrato ou Assinatura (`etapa = contrato` / `etapa = assinatura`)',
    acaoRecomendada:
      'Conferir a minuta gerada e reenviar o link de assinatura (e-mail ou WhatsApp) quando o candidato não assinar no prazo.',
    ondeResolver: 'Aba "Gestão de Candidatos" → detalhe da admissão / botão "Enviar Link" do card.',
  },
  esocial: {
    motivo: 'Admissão não transmitida (ou transmitida e depois encerrada) deixa o vínculo fora do eSocial.',
    gravidade: 'Alta',
    gravidadeBadge: 'destructive',
    prazo: 'Antes do início das atividades — a transmissão atrasada gera multa.',
    etapa: 'Canceladas (`etapa = cancelada`).',
    acaoRecomendada:
      'Conferir o protocolo abaixo, transmitir o S-2200 da admissão correta e, se o processo foi encerrado por erro, reabrir a admissão.',
    ondeResolver: 'Módulo eSocial (`/esocial`).',
  },
};

/** Fallback para uma família sem contexto mapeado (a lista de ids é fixa). */
const CONTEXTO_PRIORIDADE_PADRAO = {
  motivo: 'Item apontado como prioritário pelo card.',
  gravidade: 'Média' as const,
  gravidadeBadge: 'warning' as const,
  prazo: 'Conferir a data prevista da admissão.',
  etapa: 'Conferir a etapa no módulo.',
  acaoRecomendada: 'Abrir a admissão no módulo e concluir a etapa pendente.',
  ondeResolver: 'Módulo de Admissões.',
};

/** Junta os responsáveis distintos da fila (ou diz que nenhum está preenchido). */
function responsaveisDaFila(candidatos: AdmissaoDetalhe[]): string {
  const nomes = [...new Set(candidatos.map((c) => c.responsavel).filter((nome) => nome && nome !== 'Não atribuído'))];
  return nomes.length > 0
    ? nomes.join(', ')
    : 'Não atribuído — nenhuma admissão desta fila tem responsável preenchido.';
}

/**
 * Item de uma família de pendência: identificação + os campos de processo
 * (quantidade, motivo, gravidade, prazo, etapa, responsável, ação recomendada e
 * onde resolver) + a lista de candidatos afetados + o "Resolver agora" quando —
 * e somente quando — existe destino real no sistema.
 */
function ItemPrioridade({ item, onOpenChange }: { item: PrioridadeDetalhe; onOpenChange: (open: boolean) => void }) {
  const contexto = CONTEXTO_PRIORIDADE[item.id] ?? CONTEXTO_PRIORIDADE_PADRAO;
  /**
   * Mesma coreografia do popup de Pendências: o modal FECHA antes de executar a
   * ação, para a tela de destino aparecer sem modal por cima.
   */
  const resolver = item.resolver;
  return (
    <div className="space-y-2.5 rounded-xl border border-border/30 p-3.5">
      <div className="flex items-center gap-3">
        <item.icon className={cn('h-4 w-4 shrink-0', TONE_TEXT[item.tone])} />
        <span className="min-w-0 flex-1 text-sm font-semibold">{capitalizar(item.label)}</span>
        <Badge variant="outline" size="sm" className={cn('border-0', TONE_BADGE[contexto.gravidadeBadge])}>
          {contexto.gravidade}
        </Badge>
      </div>

      <Campo rotulo="Quantidade">
        <span className={cn('font-medium tabular-nums', TONE_TEXT[item.tone])}>{item.total}</span>{' '}
        {item.total === 1 ? 'admissão nesta condição' : 'admissões nesta condição'}
      </Campo>
      <Campo rotulo="Por que é prioritário">{contexto.motivo}</Campo>
      <Campo rotulo="Gravidade">{contexto.gravidade}</Campo>
      <Campo rotulo="Etapa">{contexto.etapa}</Campo>
      <Campo rotulo="Prazo">{contexto.prazo}</Campo>
      <Campo rotulo="Responsável">{responsaveisDaFila(item.candidatos)}</Campo>
      <Campo rotulo="Ação recomendada">{contexto.acaoRecomendada}</Campo>
      <Campo rotulo="Onde resolver">{contexto.ondeResolver}</Campo>

      <div className="space-y-2">
        <p className="text-caption font-semibold text-foreground">Candidatos afetados</p>
        {item.candidatos.length === 0 ? (
          <VazioLista>Nenhuma admissão nesta condição agora.</VazioLista>
        ) : (
          item.candidatos.map((candidato) => <BlocoAdmissao key={candidato.id} admissao={candidato} />)
        )}
      </div>

      {resolver && (
        <BotaoResolver
          label="Resolver agora"
          onClick={() => {
            onOpenChange(false);
            resolver();
          }}
        />
      )}
    </div>
  );
}

interface AcoesPrioritariasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itens: PrioridadeDetalhe[];
}

/**
 * Modal "Ver todas" do card Ações Prioritárias — mesma base/coreografia do popup
 * de Pendências. Vai direto ao dado: as QUATRO famílias com a fila completa (o
 * card corta a exibição pela altura, aqui nada é cortado).
 */
export function AcoesPrioritariasDialog({ open, onOpenChange, itens }: AcoesPrioritariasDialogProps) {
  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ações Prioritárias"
      titleIcon={Zap}
      titleIconClassName="h-5 w-5 text-primary"
      emptyMessage="Nenhuma pendência aberta."
      items={[...itens.map((item) => <ItemPrioridade key={item.id} item={item} onOpenChange={onOpenChange} />)]}
    />
  );
}

/* ─── 2. Próximas Admissões ──────────────────────────────────────────────── */

/**
 * Modal "Ver todas" do card Próximas Admissões.
 *
 * Os blocos das admissões vão num ÚNICO item do popup (e não um item por
 * admissão): a fila pode passar de 20 processos e a cascata do
 * `AnimatedCascadeDialog` tem 0,1s por item — item a item, a lista levaria
 * segundos para entrar e outros tantos para sair. Como a coreografia é a mesma
 * (cabeçalho → dados), a lista junta preserva a animação e a leitura.
 */
export function ProximasAdmissoesDialog({
  open,
  onOpenChange,
  admissoes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admissoes: AdmissaoDetalhe[];
}) {
  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Próximas Admissões"
      titleIcon={Calendar}
      titleIconClassName="h-5 w-5 text-primary"
      emptyMessage="Sem admissões agendadas."
      items={[
        <div key="lista" className="space-y-2.5">
          <p className="text-caption font-semibold text-foreground">
            {admissoes.length === 1 ? '1 admissão em andamento' : `${admissoes.length} admissões em andamento`}
          </p>
          {admissoes.length === 0 ? (
            <VazioLista>Nenhuma admissão em andamento com data prevista cadastrada.</VazioLista>
          ) : (
            admissoes.map((admissao) => (
              <BlocoAdmissao key={admissao.id} admissao={admissao} mostrarProgresso mostrarSla />
            ))
          )}
        </div>,
      ]}
    />
  );
}

/* ─── 3. Distribuição por Área ───────────────────────────────────────────── */

/**
 * Modal "Ver detalhes" do card Distribuição por Área.
 *
 * Lista TODAS as áreas (sem "Outros" e sem corte de nome), com posição,
 * quantidade, percentual e a variação contra os 30 dias anteriores quando há
 * base para comparar.
 */
export function DistribuicaoAreaDialog({
  open,
  onOpenChange,
  areas,
  total,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: AreaDetalhe[];
  total: number;
}) {
  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Distribuição por Área"
      titleIcon={PieChart}
      titleIconClassName="h-5 w-5 text-primary"
      emptyMessage="Sem áreas com admissões."
      items={[
        <div key="lista" className="space-y-2.5">
          <Campo rotulo="Total de admissões consideradas">
            <span className="font-medium tabular-nums">{total}</span> em{' '}
            <span className="font-medium tabular-nums">{areas.length}</span> {areas.length === 1 ? 'área' : 'áreas'}
          </Campo>
          {areas.length === 0 ? (
            <VazioLista>Nenhuma admissão carregada para distribuir por área.</VazioLista>
          ) : (
            <ul className="space-y-1.5">
              {areas.map((area) => (
                <li key={area.nome} className="space-y-1 rounded-lg border border-border/30 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-muted/60 font-display text-[10px] font-medium tabular-nums text-muted-foreground">
                      {area.posicao}
                    </span>
                    {/* Sem `truncate`: o nome da área aparece sempre inteiro. */}
                    <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-foreground">
                      {area.nome}
                    </span>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">{area.count}</span>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {area.percentual}%
                    </span>
                  </div>
                  {/* Sem `pl-7` (alinhamento pelo selo de posição): o texto é um
                      valor e, quando quebra, as linhas seguintes precisam usar a
                      largura inteira do card — indentação à esquerda no valor era
                      justamente o que deixava o vão vazio. */}
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {area.posicao === 1 ? 'Área com mais admissões' : `${area.posicao}ª área em volume`}
                    {' · '}
                    {area.variacao === null
                      ? 'sem base nos 30 dias anteriores para comparar'
                      : `${area.variacao >= 0 ? '+' : ''}${area.variacao}% vs. 30 dias anteriores`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>,
      ]}
    />
  );
}

/* ─── 4. SLA & Alertas ───────────────────────────────────────────────────── */

/** Um grupo do card: título com ícone/tom + a lista completa daquele status. */
function GrupoSla({
  icon,
  tone,
  label,
  admissoes,
  vazio,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  admissoes: AdmissaoDetalhe[];
  vazio: string;
}) {
  return (
    <div className="space-y-2.5">
      <TituloGrupo icon={icon} tone={tone} label={label} total={admissoes.length} />
      {admissoes.length === 0 ? (
        <VazioLista>{vazio}</VazioLista>
      ) : (
        admissoes.map((admissao) => <BlocoAdmissao key={admissao.id} admissao={admissao} mostrarSla />)
      )}
    </div>
  );
}

/**
 * Modal "Ver detalhes" do card SLA & Alertas.
 *
 * Mantém a MESMA ordem do card (Dentro do SLA → Em risco → Atrasadas) e lista
 * todos os processos de cada grupo com etapa, prazo, tempo restante/atraso,
 * responsável, próxima ação e status.
 */
export function SlaAlertasDialog({
  open,
  onOpenChange,
  dentro,
  risco,
  atrasadas,
  taxaConclusao,
  variacaoConclusao,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dentro: AdmissaoDetalhe[];
  risco: AdmissaoDetalhe[];
  atrasadas: AdmissaoDetalhe[];
  taxaConclusao: number;
  /** Variação da taxa em %, ou `null` quando não há base anterior de comparação. */
  variacaoConclusao: number | null;
}) {
  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="SLA & Alertas"
      titleIcon={Gauge}
      titleIconClassName="h-5 w-5 text-primary"
      emptyMessage="Nenhum processo em andamento."
      items={[
        <div key="resumo" className="space-y-1 rounded-xl border border-border/30 p-3.5">
          <p className="text-caption font-semibold text-foreground">Resumo agora</p>
          <Campo rotulo="Processos em andamento">
            <span className="font-medium tabular-nums">{dentro.length + risco.length + atrasadas.length}</span>
          </Campo>
          <Campo rotulo="Taxa de conclusão">
            <span className="font-medium tabular-nums">{taxaConclusao}%</span>{' '}
            <span className="text-muted-foreground">
              {variacaoConclusao === null
                ? '(sem base nos 30 dias anteriores para comparar)'
                : `(${variacaoConclusao >= 0 ? '+' : ''}${variacaoConclusao}% vs. 30 dias anteriores)`}
            </span>
          </Campo>
          <Campo rotulo="Como ler">
            Cada processo abaixo traz a etapa, o prazo (`data_prevista`), quanto tempo falta ou há de atraso, o
            responsável e a próxima ação recomendada para a etapa atual.
          </Campo>
        </div>,
        <GrupoSla
          key="dentro"
          icon={CheckCircle}
          tone="success"
          label="Dentro do SLA"
          admissoes={dentro}
          vazio="Nenhum processo dentro do prazo (ou sem data prevista cadastrada)."
        />,
        <GrupoSla
          key="risco"
          icon={AlertTriangle}
          tone="warning"
          label="Em risco"
          admissoes={risco}
          vazio="Nenhum processo vencendo nos próximos 7 dias."
        />,
        <GrupoSla
          key="atrasadas"
          icon={AlertCircle}
          tone="destructive"
          label="Atrasadas"
          admissoes={atrasadas}
          vazio="Nenhum processo com prazo vencido."
        />,
      ]}
    />
  );
}
