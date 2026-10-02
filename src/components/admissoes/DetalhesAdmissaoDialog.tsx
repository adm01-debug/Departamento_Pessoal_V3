/**
 * ============================================================================
 * Janela de detalhes da admissão — UMA janela consolidada, SEM abas.
 *
 * Antes: um modal com três abas (Geral / Documentos / Histórico) que espalhava
 * a leitura do processo. Agora: uma única janela compacta (~1040px, 85vh) que
 * reúne, na ordem em que o RH decide, tudo o que antes estava separado:
 *   1. HEADER     — avatar, nome, etapa, cargo/departamento, datas, responsável
 *                   e "Ver Portal" (a janela tem o X próprio do Radix).
 *   2. PROGRESSO  — stepper horizontal de 7 etapas + "Concluída", com o número
 *                   real de etapas concluídas e o percentual do processo.
 *   3. PRÓXIMA AÇÃO — bloco destacado; o texto vem de `proximaAcaoDaEtapa`
 *                   (`admissoesDashboardModais.tsx`) — a MESMA fonte dos modais
 *                   do dashboard, nunca um texto inventado aqui.
 *   4. GRID       — esquerda "Dados da admissão"; direita "Documentos (X/Y)" com
 *                   TODOS os documentos numa lista compacta (a linha abre os
 *                   detalhes inline).
 *   5. LINHA FINAL — esquerda "eSocial" (evento/protocolo/transmissão/retorno);
 *                   direita "Histórico" — a linha do tempo COMPLETA do workflow
 *                   (descrição longa abre inline).
 *   6. FOOTER     — "Cancelar admissão" | "Fechar" e "Editar informações".
 *
 * REGRA DE IDENTIDADE: só permanecem fiéis ao sistema as CORES (tokens de
 * `src/index.css`), os ÍCONES (`lucide-react`) e a TIPOGRAFIA
 * (`font-display`/`font-body`). Layout, densidade e hierarquia foram refeitos.
 *
 * SEM MODAL DENTRO DE MODAL: Documentos e Histórico eram consultados em janelas
 * aninhadas ("Ver todos"/"Ver histórico"); as duas foram eliminadas e o conteúdo
 * completo passou a viver DENTRO destes cards. ROLAGEM ÚNICA: quem rola é só o
 * corpo do modal (`min-h-0 flex-1 overflow-y-auto`) — nenhum card tem scroll
 * próprio, então a roda do mouse move o miolo em QUALQUER ponto dele (ver a nota
 * "ROLAGEM DO MIOLO" junto ao corpo).
 *
 * FUNCIONALIDADE: nenhum botão é decorativo — cada um reusa um caminho real:
 *   • Ver Portal            → `contratacaoService.enviarLinkCandidato` + rota
 *                             pública `/contratacao?token=…` (portal do candidato);
 *   • Ir para ação         → salto DENTRO desta janela até a seção onde a próxima
 *                             ação acontece (ver `DESTINO_POR_ETAPA`), com
 *                             destaque temporário; some quando a etapa não tem
 *                             destino real (nunca um botão morto);
 *   • Editar / Editar infos → `NovaAdmissaoDialog` em modo edição (reusa
 *                             `useAdmissoes().atualizar`);
 *   • Transmitir agora      → `useESocial().enviarEvento` (S-2200);
 *   • Ver detalhes (eSocial)→ rota `/esocial` (módulo real do evento/protocolo);
 *   • Validar / Rejeitar    → `useContratacaoDigital().validarDocumento` (a MESMA
 *                             ação que o antigo diálogo de documentos oferecia,
 *                             agora dentro da linha expandida do documento);
 *   • Cancelar admissão     → `admissaoService.cancelar` com confirmação;
 *   • Fechar                → fecha o modal.
 * ============================================================================
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
/**
 * Só o TIPO do checklist é reaproveitado: a lista compacta de documentos vive
 * agora dentro do card, com as suas próprias linhas (o `AdmissaoChecklist` monta
 * um card inteiro — header, barra de progresso e linhas de `p-4` — grosso demais
 * para o painel do modal; o que ele oferecia de ação útil, Validar/Rejeitar, foi
 * preservado inline na expansão da linha).
 */
import type { Documento } from '@/components/admissao/AdmissaoChecklist';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';
import { NovaAdmissaoDialog } from './NovaAdmissaoDialog';
import { useContratacaoDigital } from '@/hooks/useContratacaoDigital';
import { useAdmissaoWorkflow } from '@/hooks/useAdmissaoWorkflow';
import { useESocial } from '@/hooks/useESocial';
import { useEmpresas } from '@/hooks/useEmpresas';
import { admissaoService } from '@/services/admissaoService';
import { contratacaoService } from '@/services/contratacaoService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, formatDateLong, formatDateTime } from '@/utils/format';
import { safeErrorMessage } from '@/utils/safeError';
import { ETAPA_BADGE, ETAPA_LABELS, proximaAcaoDaEtapa } from './admissoesComum';
import { diasAteHoje, iniciais, inicioDoDia } from './admissoesDerivacoes';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  History,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
  X,
  XCircle,
  Zap,
} from 'lucide-react';

/* ─── Contrato de dados e derivações (puras — mesma entrada, mesma saída) ──── */

interface DetalhesAdmissaoDialogProps {
  admissao: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * As 7 etapas operacionais do processo + o nó terminal "Concluída".
 * Mesma sequência do Kanban/`ETAPA_FLUXO`, menos a trava `pendente` (ela não é
 * um nó linear — acontece DENTRO de Documentos, ver `ETAPA_PARA_PROGRESSO`).
 */
const ETAPAS_PROGRESSO = [
  { key: 'solicitacao', label: 'Solicitação' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'validacao', label: 'Validação' },
  { key: 'exame', label: 'Exame' },
  { key: 'contrato', label: 'Contrato' },
  { key: 'assinatura', label: 'Assinatura' },
  { key: 'esocial', label: 'eSocial' },
] as const;

/** A etapa `pendente` não é um nó do fluxo — é uma trava dentro de Documentos. */
const ETAPA_PARA_PROGRESSO: Record<string, string> = { pendente: 'documentos' };

/** Rótulo + tinta de cada status possível de documento da admissão. */
const DOC_STATUS: Record<string, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  validado: { label: 'Concluído', className: 'text-success', Icon: CheckCircle2 },
  enviado: { label: 'Enviado', className: 'text-info', Icon: Clock },
  pendente: { label: 'Pendente', className: 'text-warning', Icon: Clock },
  rejeitado: { label: 'Rejeitado', className: 'text-destructive-vivid', Icon: XCircle },
};

/** Checklist real da admissão (colunas booleanas) na forma que o checklist espera. */
function documentosDaAdmissao(a: any): Documento[] {
  const item = (id: string, nome: string, campo: string, obrigatorio: boolean, tipo: string): Documento => ({
    id,
    nome,
    obrigatorio,
    tipo,
    status: a?.[campo] === true ? 'validado' : 'pendente',
  });
  return [
    item('doc_pessoais', 'RG / CPF', 'checklist_documentos_pessoais', true, 'documentos_pessoais'),
    item(
      'comprovante_res',
      'Comprovante de residência',
      'checklist_comprovante_endereco',
      true,
      'comprovante_endereco'
    ),
    item('foto', 'Foto 3x4', 'checklist_foto', false, 'foto'),
    item('ctps', 'CTPS / PIS', 'checklist_ctps', false, 'ctps'),
    item('exame', 'Exame admissional (ASO)', 'checklist_exame_admissional', true, 'exame_admissional'),
    item('contrato', 'Contrato', 'checklist_contrato_assinado', true, 'contrato_assinado'),
  ];
}

/**
 * Progresso REAL do processo a partir da etapa atual (a mesma coluna que o
 * Kanban move): etapas antes da atual = concluídas, a atual = ativa, as demais
 * futuro. `concluida` fecha em 100%; `cancelada` zera.
 */
function progressoDaAdmissao(a: any) {
  const etapa = a?.etapa ?? 'solicitacao';
  if (etapa === 'cancelada') {
    return { concluidas: 0, indiceAtual: -1, percentual: 0, cancelada: true, concluida: false };
  }
  if (etapa === 'concluida') {
    return {
      concluidas: ETAPAS_PROGRESSO.length,
      indiceAtual: ETAPAS_PROGRESSO.length,
      percentual: 100,
      cancelada: false,
      concluida: true,
    };
  }
  const chave = ETAPA_PARA_PROGRESSO[etapa] ?? etapa;
  const encontrado = ETAPAS_PROGRESSO.findIndex((e) => e.key === chave);
  const indiceAtual = encontrado < 0 ? 0 : encontrado;
  return {
    concluidas: indiceAtual,
    indiceAtual,
    percentual: Math.round((indiceAtual / ETAPAS_PROGRESSO.length) * 100),
    cancelada: false,
    concluida: false,
  };
}

/** Texto curto de prazo a partir de `data_prevista` (usa a mesma régua `diasAteHoje`). */
function prazoTexto(dias: number | null): string {
  if (dias === null) return 'Sem prazo';
  if (dias === 0) return 'Vence hoje';
  if (dias > 0) return `Em ${dias} dia${dias > 1 ? 's' : ''}`;
  const atraso = Math.abs(dias);
  return `${atraso} dia${atraso > 1 ? 's' : ''} em atraso`;
}

/**
 * Autor do evento do histórico, QUANDO o registro traz um valor legível.
 *
 * A tabela real (`workflows_historico`) guarda apenas `usuario_id` — um UUID — e
 * os próprios inserts do `useAdmissaoWorkflow` nem chegam a preenchê-lo, então
 * expor esse campo cru encheria a linha de um hash sem dizer quem agiu. Aqui só
 * passa um nome/e-mail JÁ resolvido, se a consulta vier a trazer o autor (o
 * `select` do hook pede `historico:workflows_historico(*)`, então um campo
 * textual novo apareceria sozinho). Sem valor legível, a linha simplesmente não
 * mostra "Responsável" — nada é inventado e nenhuma consulta nova é feita.
 */
function responsavelDoEvento(h: any): string {
  const candidato = h?.responsavel ?? h?.responsavel_nome ?? h?.usuario_nome ?? h?.usuario_email ?? '';
  const texto = typeof candidato === 'string' ? candidato.trim() : '';
  // Um UUID não é um nome: melhor omitir do que exibir o hash.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(texto) ? '' : texto;
}

/** Data curta `dd/MM` (reusa `formatDate` do sistema, que devolve `dd/MM/aaaa`). */
function dataCurta(iso?: string | null): string | null {
  if (!iso) return null;
  const formatada = formatDate(iso, '');
  return formatada ? formatada.slice(0, 5) : null;
}

/**
 * Data exibida sob CADA nó do stepper (as 7 etapas + o nó terminal "Concluída"),
 * quando existir. Nenhum valor é inventado — só fontes reais, sem tocar na régua
 * de progresso (`progressoDaAdmissao`):
 *   • linha do tempo do workflow (`historico`, já carregado): o k-ésimo evento em
 *     ordem cronológica data a k-ésima etapa — a MESMA sequência em que o
 *     processo avançou;
 *   • campos diretos da admissão como reforço (`created_at` em "Solicitação",
 *     `data_transmissao_esocial` em "eSocial", `updated_at` em "Concluída").
 * Sem data → `''` (a UI mostra "–").
 */
function datasDasEtapas(a: any, historico: any[]): string[] {
  const timeline = [...historico]
    .map((h) => h?.created_at as string | undefined)
    .filter((v): v is string => !!v)
    .sort();

  const operacionais = ETAPAS_PROGRESSO.map((etapa, i) => {
    if (etapa.key === 'solicitacao') return dataCurta(a?.created_at) ?? dataCurta(timeline[i]) ?? '';
    if (etapa.key === 'esocial') return dataCurta(a?.data_transmissao_esocial) ?? dataCurta(timeline[i]) ?? '';
    return dataCurta(timeline[i]) ?? '';
  });

  const concluida = a?.etapa === 'concluida' ? (dataCurta(a?.updated_at) ?? '') : '';
  return [...operacionais, concluida];
}

/** Par rótulo/valor com ícone — o mesmo casco nos dois lados do grid. */
function LinhaCampo({
  icon: Icon,
  rotulo,
  valor,
  valorClassName,
}: {
  icon: typeof Briefcase;
  rotulo: string;
  valor: React.ReactNode;
  valorClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <dt className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {rotulo}
      </dt>
      <dd className={cn('truncate text-sm font-medium text-foreground', valorClassName)}>{valor}</dd>
    </div>
  );
}

/**
 * Superfície dos painéis internos do modal (Dados / Documentos / eSocial /
 * Histórico recente).
 *
 * O fundo do modal é `bg-card` (hsl 214 42% 12%). Estes painéis usam
 * `bg-background/50` — e `--background` (hsl 216 48% 8%) é MAIS ESCURO que o
 * `--card` — então os cards ficam um degrau ABAIXO da superfície do modal, como
 * painéis discretos embutidos no mesmo plano, em vez de "caixas claras"
 * flutuando. A separação vem de uma borda sutil (`border-border/40`) e de uma
 * sombra curta e quase imperceptível; SEM gradiente, SEM realce claro e SEM
 * glow. O destaque deve vir do CONTEÚDO, não do fundo.
 */
const CARD_PANEL = 'rounded-2xl border border-border/40 bg-background/50 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.35)]';

/**
 * Preenchimento do painel "Progresso da Admissão" — o ÚNICO bloco "herói" do
 * corpo do modal (o cabeçalho com o candidato e a barra de ações são FAIXAS).
 *
 * Antes ele usava `bg-muted/20` — exatamente o mesmo tratamento das faixas de
 * header/footer do diálogo (`bg-muted/20` e `bg-muted/30`). Resultado: como
 * faixa e card compartilhavam a mesma tinta, o bloco do stepper lia como FUNDO,
 * não como seção, e "sumia" dentro do modal. Aqui ele ganha superfície própria:
 * `bg-background/60` é um degrau ABAIXO do `bg-card` do modal (Δ ≈ 4/6/8 por
 * canal) — mais fechado, sem clarear nada e sem sair do navy — e a moldura sobe
 * de `border/30` (Δ ≈ 3 contra o próprio fundo: imperceptível) para `border/70`
 * (Δ ≈ 9/11/15: contorno claro, porém suave). Uma sombra curta de 1px fecha o
 * bloco. Sem gradiente, sem glow, sem tinta colorida.
 *
 * É uma constante (e não um literal no JSX) porque o MIOLO dos círculos vazados
 * do stepper PRECISA ser a MESMA composição deste fundo — ver
 * `COMPOSICAO_FUNDO_STEPPER` abaixo. Separadas, as duas poderiam divergir num
 * passe de estilo futuro e o círculo viraria um remendo visível sobre a track.
 */
const FUNDO_PROGRESSO = 'bg-background/60';

const CARD_PROGRESSO = `rounded-2xl border border-border/70 ${FUNDO_PROGRESSO} px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.4)]`;

/**
 * Base OPAQUE do miolo dos nós do stepper. O visual vazado do círculo depende de
 * duas camadas EMPILHADAS EM ELEMENTOS SEPARADOS: `bg-card` (tapa a track) e,
 * por cima, `FUNDO_PROGRESSO` (repõe o degrau de profundidade do painel) — juntas
 * reproduzem exatamente a tinta que o painel tem sobre o `bg-card` do modal.
 *
 * ⚠️ NÃO juntar as duas num único `className` passado por `cn()`: `bg-card` e
 * `bg-background/60` pertencem ao MESMO grupo do tailwind-merge (`bg-*`), então o
 * merge descarta a primeira e o círculo fica translúcido — a track passa a
 * aparecer por dentro dele (medido: +5 por canal de vazamento). Por isso são
 * dois elementos, cada um com a sua classe; o acoplamento com o painel continua
 * garantido por `FUNDO_PROGRESSO`, usado nos dois lugares.
 */
const MIOLO_STEPPER_OPACO = 'bg-card';

/* ROLAGEM DO MIOLO — uma viewport só para o modal inteiro.
 *
 * "Documentos" e "Histórico" já tiveram viewport própria (`max-h-[200px]` +
 * `overflow-y-auto` + `scroll-interno` — a receita dos widgets do
 * `OnboardingDashboard`). O efeito colateral era a roda do mouse morrer em cima
 * das duas listas: `.scroll-interno` traz `overscroll-behavior: contain`, que
 * impede o encadeamento do scroll, então ao chegar ao fim da lista a roda parava
 * ali em vez de continuar no corpo do modal — quem passava o cursor sobre
 * "Documentos"/"Histórico" e rolava não via o modal mexer (zona morta).
 *
 * A viewport interna não é necessária aqui: o casco do modal já é `max-h-[85vh]`
 * com `overflow-hidden` e o miolo é `min-h-0 flex-1 overflow-y-auto`, com
 * cabeçalho e rodapé FORA dele (fixos). Sem nenhum `overflow` nos cards, o miolo
 * INTEIRO rola de forma contínua e a roda funciona sobre cards, listas, textos,
 * botões, documentos, histórico e eSocial — sem handler de wheel, sem
 * `stopPropagation` e sem `preventDefault`.
 *
 * A classe `.scroll-interno` continua existindo para quem realmente precisa dela
 * (as três listas dos widgets de altura fixa do `OnboardingDashboard`) — este
 * modal simplesmente não é esse caso.
 */

/**
 * A partir de quantos caracteres a descrição de um evento do histórico ganha o
 * "Ver mais". A coluna da timeline tem ~420px úteis com `text-xs` (~64
 * caracteres por linha), então até 120 o texto cabe em DUAS linhas — o mesmo
 * corte do `line-clamp-2` — e o botão seria ruído. Acima disso o texto é
 * recolhido e a linha se expande no lugar, sem abrir nenhuma janela.
 */
const LIMITE_DESCRICAO = 120;

/**
 * Faixa reservada ao botão X do Radix, para o "Ver Portal" NÃO encostar nele.
 *
 * O X não é nosso: ele vem do `DialogContent` (`src/components/ui/dialog.tsx`)
 * como `absolute right-3 top-3 h-7 w-7` — 28px de lado a 12px da borda, com o
 * ícone de 16px centralizado. Ou seja, a partir da borda direita: a CAIXA
 * clicável ocupa de 12px a 40px e o DESENHO do X de 18px a 34px, sempre no
 * `top-3` (o centro vertical cai a 26px do topo do modal).
 *
 * Com o `px-6` do header (24px), o "Ver Portal" terminava a 24px da borda — só
 * 10px do desenho do X, e era isso que fazia os dois parecerem um único grupo de
 * ações. Somando `pr-9` (36px) ao grupo de ações, o botão passa a terminar a
 * 60px da borda: 20px da caixa do X e 26px do desenho — separação clara, com o
 * fechar isolado no extremo direito.
 */
const ACOES_HEADER = 'shrink-0 pr-9';

/**
 * Alinha o "Ver Portal" ao MESMO eixo do X: o centro do X está a 26px do topo,
 * então o botão de 36px (`h-9`) precisa começar em 26 − 18 = 8px, ou seja, 8px
 * acima do `py-4` (16px) do header. Margem negativa não mexe na ALTURA do header
 * (quem manda nela continua sendo o avatar de 48px) — só reencosta o botão no
 * eixo do fechar em vez de deixá-lo 8px abaixo dele.
 */
const ACOES_HEADER_EIXO = '-mt-2';

/**
 * Quantos blocos cascateiam nesta janela: cabeçalho, corpo e rodapé. É esse
 * número que a coreografia compartilhada usa para saber por quanto tempo o
 * conteúdo ainda some antes de a caixa começar a encolher (ver
 * `cascadeShellVariants`) — trocar a contagem aqui reajusta o fechamento inteiro.
 */
const BLOCOS_CASCATA = 3;

/**
 * A MESMA coreografia do popup "Pendências" (`ui/animated-cascade-dialog.tsx`),
 * importada — nenhum valor é repetido aqui: a caixa nasce pequena, estica as
 * laterais, depois a altura e só então o conteúdo cascateia; no fechamento a
 * cascata corre de trás para frente e a caixa encolhe por último.
 */
const SHELL_CASCATA = cascadeShellVariants(BLOCOS_CASCATA);
const OVERLAY_CASCATA = cascadeOverlayVariants(BLOCOS_CASCATA);

/**
 * Cabeçalho e rodapé animáveis SEM trocar de componente: `motion.create`
 * preserva as classes base do `DialogHeader`/`DialogFooter` e só acrescenta a
 * animação — mesmo padrão do `motion.create(Card)` em `dashboard/MetricCard.tsx`.
 */
const MotionDialogHeader = motion.create(DialogHeader);
const MotionDialogFooter = motion.create(DialogFooter);

/**
 * Seções do corpo da Central que podem ser DESTINO do "Ir para ação". São
 * exatamente os cards que existem hoje: nenhum destino fora daqui, para não
 * existir botão que aponte para lugar nenhum.
 */
type SecaoDestino = 'dados' | 'documentos' | 'esocial' | 'historico';

/**
 * Destino de cada etapa — pela CHAVE REAL da etapa (`a.etapa`), nunca pelo texto
 * da próxima ação. A chave é o MESMO identificador que o Kanban move e que
 * `proximaAcaoDaEtapa` consulta; comparar a copy quebraria na primeira revisão de
 * texto (era exatamente o defeito do botão antigo).
 *
 * `null` = a etapa não tem o que executar DENTRO desta janela: o "Ir para ação"
 * simplesmente NÃO é renderizado (nunca um botão morto). Etapa desconhecida cai
 * no mesmo caso, via `?? null`.
 *
 * Por que cada etapa cai onde cai:
 *   • solicitacao — a ação é conferir a REQUISIÇÃO/cadastro → "Dados da admissão";
 *   • documentos / validacao / pendente — coleta, conferência e destrave do
 *     checklist → "Documentos" (`pendente` é uma trava DENTRO de Documentos, a
 *     mesma régua de `ETAPA_PARA_PROGRESSO`);
 *   • exame / contrato / assinatura — os artefatos dessas etapas são itens DO
 *     checklist que vive no card "Documentos" (ASO, Contrato, Contrato
 *     assinado) → "Documentos";
 *   • esocial — transmissão/protocolo do S-2200 → "eSocial";
 *   • concluida / cancelada — estados terminais: não há próxima ação a executar.
 */
const DESTINO_POR_ETAPA: Record<string, SecaoDestino | null> = {
  solicitacao: 'dados',
  documentos: 'documentos',
  validacao: 'documentos',
  pendente: 'documentos',
  exame: 'documentos',
  contrato: 'documentos',
  assinatura: 'documentos',
  esocial: 'esocial',
  concluida: null,
  cancelada: null,
};

/** Nome da seção de destino — vira o `title` do botão ("Ir para Documentos"). */
const DESTINO_LABEL: Record<SecaoDestino, string> = {
  dados: 'Dados da admissão',
  documentos: 'Documentos',
  esocial: 'eSocial',
  historico: 'Histórico',
};

/** Quanto tempo a seção de destino fica destacada depois do salto (~1s). */
const DESTAQUE_MS = 1000;

/** Respiro entre o topo da viewport do corpo e a seção posicionada. */
const RECUO_SCROLL = 12;

/**
 * Destaque TEMPORÁRIO do destino: linha da `--primary` sobre o fundo do próprio
 * card (nenhum glow, nenhuma faixa nova). As duas classes vencem as do
 * `CARD_PANEL` no `cn()` — `border-primary/40` sobre `border-border/40` e
 * `bg-primary/5` sobre `bg-background/50` —, então o card continua idêntico
 * quando o destaque sai.
 */
const DESTAQUE_DESTINO = 'border-primary/40 bg-primary/5';

/* ─── Componente ──────────────────────────────────────────────────────────── */

export function DetalhesAdmissaoDialog({ admissao, open, onOpenChange }: DetalhesAdmissaoDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { validarDocumento } = useContratacaoDigital();
  const { workflow } = useAdmissaoWorkflow(admissao?.id);
  const { enviarEvento, isSending } = useESocial();
  const { empresaAtual } = useEmpresas();

  // Cópia local para refletir a edição sem esperar o refetch do pai (a página
  // remonta esta janela por `key` a cada admissão — ver `AdmissoesPage.tsx`).
  const [registroLocal, setRegistroLocal] = useState<any>(admissao);

  const [docExpandido, setDocExpandido] = useState<string | null>(null);
  const [eventoExpandido, setEventoExpandido] = useState<string | null>(null);
  const [cancelamentoAberto, setCancelamentoAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [gerandoPortal, setGerandoPortal] = useState(false);

  /** Viewport rolável do corpo — é ELA que o "Ir para ação" movimenta. */
  const corpoRef = useRef<HTMLDivElement>(null);
  /** Cada seção-destino se registra aqui pelo seu id (ver `SecaoDestino`). */
  const secoesRef = useRef<Partial<Record<SecaoDestino, HTMLElement | null>>>({});
  /** Destino destacado agora (o realce sai sozinho depois de `DESTAQUE_MS`). */
  const [destaque, setDestaque] = useState<SecaoDestino | null>(null);
  const destaqueTimer = useRef<number | null>(null);

  // O timer do destaque não pode sobreviver ao modal (ele desmonta ao fechar).
  useEffect(
    () => () => {
      if (destaqueTimer.current) window.clearTimeout(destaqueTimer.current);
    },
    []
  );

  const a = registroLocal ?? admissao;

  const documentos = useMemo(() => documentosDaAdmissao(a), [a]);
  const progresso = useMemo(() => progressoDaAdmissao(a), [a]);
  const historico = (workflow?.historico ?? []) as any[];

  /**
   * Histórico COMPLETO do workflow, do mais recente para o mais antigo — a MESMA
   * ordem que o card já usava, agora sem o `slice(0, 3)` que obrigava a abrir a
   * janela aninhada para ver o resto. `datasDasEtapas` continua consumindo o
   * `historico` cru (ele ordena crescente por conta própria).
   */
  const historicoCompleto = useMemo(
    () => [...historico].sort((x, y) => String(y.created_at).localeCompare(String(x.created_at))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflow]
  );

  // Data real de cada nó do stepper (7 etapas + "Concluída"); `''` quando não há.
  const datasEtapas = useMemo(
    () => datasDasEtapas(a, historico),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [a, workflow]
  );

  if (!admissao) return null;

  const responsavel = (a?.metadata?.responsavel ?? '').trim() || 'Não atribuído';
  const proximaAcao = proximaAcaoDaEtapa(a?.etapa);
  const docsConcluidos = documentos.filter((d) => d.status === 'validado').length;
  /**
   * Janela do RH: o antigo diálogo aninhado de documentos passava `isAdmin` fixo
   * ao checklist, e é isso que habilita a validação do documento enviado. A ação
   * continua sendo a MESMA (`handleValidar` → `validarDocumento`), só mudou de
   * lugar — agora vive na linha expandida do próprio documento.
   */
  const isAdmin = true;
  const esocialEnviado = a?.status_esocial === 'enviado';
  const terminal = a?.etapa === 'concluida' || a?.etapa === 'cancelada';
  const dias = diasAteHoje(a?.data_prevista, inicioDoDia(new Date()));

  // Nós do stepper: as 7 etapas operacionais + o nó terminal "Concluída", cada um
  // com seu estado visual (mesma régua de `progresso` — nada é recalculado aqui).
  const nosStepper = [
    ...ETAPAS_PROGRESSO.map((etapa, i) => ({
      key: etapa.key,
      label: etapa.label,
      concluida: progresso.concluida || i < progresso.indiceAtual,
      ativa: !progresso.concluida && !progresso.cancelada && i === progresso.indiceAtual,
      data: datasEtapas[i] ?? '',
    })),
    {
      key: 'concluida',
      label: 'Concluída',
      concluida: progresso.concluida,
      ativa: false,
      data: datasEtapas[ETAPAS_PROGRESSO.length] ?? '',
    },
  ];
  // Transições verdes da trilha: do centro do 1º nó até o centro do último nó
  // concluído = (nós concluídos − 1). Em 0% → 0 (nenhum trecho verde).
  const transicoesVerdes = Math.max(0, nosStepper.filter((no) => no.concluida).length - 1);

  /**
   * Seção onde a próxima ação desta admissão acontece — derivada da CHAVE da
   * etapa (`a.etapa`), não do texto. `null` quando não há destino real dentro
   * desta janela (etapa terminal ou desconhecida): o "Ir para ação" some.
   */
  const destino = DESTINO_POR_ETAPA[a?.etapa] ?? null;

  const handleVerPortal = async () => {
    if (!a?.email) {
      toast.error('Candidato sem e-mail cadastrado');
      return;
    }
    setGerandoPortal(true);
    try {
      // Mesmo service usado pelo "Enviar link" da listagem: gera/reaproveita o
      // token do candidato e abre o portal público em nova aba.
      const token = await contratacaoService.enviarLinkCandidato(a.id, a.email);
      const url = `${window.location.origin}/contratacao?token=${token?.token ?? ''}`;
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      toast.error(safeErrorMessage(error, 'Erro ao abrir o portal do candidato.'));
    } finally {
      setGerandoPortal(false);
    }
  };

  const handleValidar = (docType: string, status: 'validado' | 'rejeitado') => {
    validarDocumento.mutate({ admissaoId: a.id, docType, status });
  };

  const handleTransmitir = () => {
    if (!empresaAtual?.id || !a) return;
    // Transmissão real do S-2200 (mesmo caminho do botão da aba geral antiga).
    enviarEvento({ eventoId: a.id, empresaId: empresaAtual.id });
  };

  const handleCancelar = async () => {
    if (!empresaAtual?.id) return;
    try {
      await admissaoService.cancelar(a.id, empresaAtual.id);
      await queryClient.invalidateQueries({ queryKey: ['admissoes'] });
      toast.success('Admissão cancelada.');
      setCancelamentoAberto(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(safeErrorMessage(error, 'Erro ao cancelar a admissão.'));
    }
  };

  const handleEdicaoSalva = (dados: Record<string, unknown>) =>
    setRegistroLocal((prev: any) => ({ ...prev, ...dados }));

  /**
   * "Ir para ação" — leva a viewport do corpo até a seção onde a próxima ação
   * acontece e a destaca por ~1s. Não fecha a janela, não troca de aba e não
   * abre nada: o destino é uma seção REAL deste modal (ver `DESTINO_POR_ETAPA`).
   */
  const handleIrParaAcao = () => {
    if (!destino) return;
    const corpo = corpoRef.current;
    const alvo = secoesRef.current[destino];
    if (!corpo || !alvo) return;
    // Delta por `getBoundingClientRect` (e não `offsetTop`): o `offsetParent` do
    // card é a casca fixa do modal, não o corpo rolável, então `offsetTop` viria
    // contaminado pelo scroll atual. Aqui o delta é exatamente o quanto falta
    // para a seção encostar no topo da viewport, com o `RECUO_SCROLL` de respiro.
    const delta = alvo.getBoundingClientRect().top - corpo.getBoundingClientRect().top;
    corpo.scrollTo({ top: Math.max(0, corpo.scrollTop + delta - RECUO_SCROLL), behavior: 'smooth' });
    setDestaque(destino);
    if (destaqueTimer.current) window.clearTimeout(destaqueTimer.current);
    destaqueTimer.current = window.setTimeout(() => setDestaque(null), DESTAQUE_MS);
  };

  return (
    <>
      {/* RADIX + FRAMER na MESMA montagem do popup "Pendências": `AnimatePresence`
          + `forceMount` mantêm a árvore viva durante o exit, e as variants vêm
          de `ui/animated-cascade-dialog.tsx` (coreografia única do sistema).
          Véu (`bg-black/60` + `backdrop-blur-sm`), casca, botão X e cascata de
          entrada/saída são os mesmos — o que muda é só o TAMANHO e a tinta desta
          janela, que são dela (o conjunto de classes da casca é o MESMO que o
          `DialogContent` produzia, `sm:rounded-lg` inclusive). */}
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <AnimatePresence>
          {open && (
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
                  className="fixed left-[50%] top-[50%] z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-[1040px] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden rounded-3xl border border-border/40 bg-card p-0 shadow-2xl sm:rounded-lg"
                  style={{ transformOrigin: 'top center' }}
                  variants={SHELL_CASCATA}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  {/* CONTÊINER da cascata: cabeçalho, corpo e rodapé entram em
                      sequência (e somem de trás para frente). Ele ocupa o lugar
                      que a casca ocupava no flex — as classes dos filhos não
                      mudam, então layout/scroll seguem idênticos. */}
                  <motion.div
                    className="flex min-h-0 flex-1 flex-col gap-0"
                    variants={cascadeContainerVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                  >
                    {/* HEADER (fixo) */}
                    <MotionDialogHeader
                      variants={cascadeItemVariants}
                      className="shrink-0 space-y-0 border-b border-border/30 bg-muted/20 px-6 py-4 text-left"
                    >
                      <div className="flex items-start gap-4">
                        {/* BLOCO PRINCIPAL (esquerda) — avatar + identificação do
                  candidato. Fica com todo o espaço livre; as ações vêm depois. */}
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-lg text-primary">
                            {iniciais(a.nome)}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <DialogTitle className="truncate font-display text-lg">{a.nome}</DialogTitle>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'shrink-0 border-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest',
                                  ETAPA_BADGE[a.etapa] ?? 'bg-muted/60 text-muted-foreground'
                                )}
                              >
                                {ETAPA_LABELS[a.etapa] ?? a.etapa}
                              </Badge>
                            </div>
                            <DialogDescription className="flex flex-wrap items-center gap-1.5 text-[13px]">
                              <span className="inline-flex items-center gap-1">
                                <Briefcase className="h-3.5 w-3.5" />
                                {a.cargo || 'Cargo não informado'}
                              </span>
                              <span className="text-border">•</span>
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {a.departamento || 'Departamento não informado'}
                              </span>
                            </DialogDescription>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Iniciada em {formatDateLong(a.created_at)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="h-3.5 w-3.5" />
                                Início previsto{' '}
                                <b className="font-medium text-foreground">{formatDate(a.data_prevista)}</b>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                Responsável <b className="font-medium text-foreground">{responsavel}</b>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* AÇÕES (direita) — o grupo reserva a faixa do X (`ACOES_HEADER`)
                  e se alinha ao eixo dele (`ACOES_HEADER_EIXO`); o X continua
                  sozinho no extremo, desenhado pela própria casca. */}
                        <div className={cn('flex items-center', ACOES_HEADER, ACOES_HEADER_EIXO)}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 shrink-0 gap-2 text-xs"
                            onClick={handleVerPortal}
                            disabled={gerandoPortal || !a.email}
                            title={!a.email ? 'Candidato sem e-mail cadastrado' : undefined}
                          >
                            {gerandoPortal ? <Spinner size="sm" /> : <ExternalLink className="h-4 w-4" />}
                            Ver Portal
                          </Button>
                        </div>
                      </div>
                    </MotionDialogHeader>

                    {/* CORPO — é A viewport de rolagem do modal (o único
                        `overflow-y` da janela: cabeçalho e rodapé ficam FORA
                        dela e não rolam). O `min-h-0` é o que permite este
                        flex-item encolher dentro do casco `max-h-[85vh]` em vez
                        de esticar; sem ele o `overflow-y-auto` não teria efeito.
                        Também é a viewport que o "Ir para ação" movimenta
                        (`corpoRef`). */}
                    <motion.div
                      ref={corpoRef}
                      variants={cascadeItemVariants}
                      className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5"
                    >
                      {/* 2. PROGRESSO DA ADMISSÃO — painel "herói" do corpo (ver
                `CARD_PROGRESSO`): superfície mais fechada que o modal, moldura
                perceptível e sombra curta, para o bloco ser lido como SEÇÃO e não
                se confundir com as faixas de header/footer. */}
                      <section className={CARD_PROGRESSO}>
                        {/* HEADER — título à esquerda; resumo à direita com o percentual em
                  destaque. Tudo numa ÚNICA linha, centralizado na vertical. */}
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <h3 className="inline-flex items-center gap-2 whitespace-nowrap font-display text-sm font-medium leading-none">
                            <Zap className="h-4 w-4 text-primary" /> Progresso da Admissão
                          </h3>
                          <p className="flex items-center gap-3 whitespace-nowrap leading-none">
                            <span className="text-[11px] font-normal text-muted-foreground">
                              {progresso.concluidas} de {ETAPAS_PROGRESSO.length} etapas concluídas
                            </span>
                            <span className="text-base font-semibold text-foreground">{progresso.percentual}%</span>
                          </p>
                        </div>

                        {/*
                STEPPER — 8 nós em `grid-cols-8` (= `repeat(8, minmax(0,1fr))`):
                cada etapa ocupa exatamente 1/8 da largura e a posição vem SÓ do
                grid (nenhuma medida à mão). As duas linhas absolutas atravessam
                o CENTRO dos círculos: `left/right-[6.25%]` é a METADE de uma
                coluna (1/16) — o centro do 1º e do último nó — então a linha
                começa e termina dentro dos círculos, sem gaps nem "segmentos".
                Os círculos são opacos (`z-10`) e cobrem a linha por baixo.
              */}
                        <div className="relative">
                          {/* TRACK ÚNICO (elemento absoluto independente): linha neutra do
                    CENTRO do 1º ao CENTRO do último círculo, com o topo na
                    altura do centro dos círculos (22px → 11px), 2px de altura.
                    NÃO existe linha por etapa — é um único fio contínuo. */}
                          <div className="pointer-events-none absolute left-[6.25%] right-[6.25%] top-[11px] h-0.5 -translate-y-1/2 rounded-full bg-border/70" />
                          {/* Sobre a track: o trecho CONCLUÍDO em `success`, do centro do 1º
                    nó até o centro do último nó concluído. */}
                          <div
                            className="pointer-events-none absolute left-[6.25%] top-[11px] h-0.5 -translate-y-1/2 rounded-full bg-success"
                            style={{ width: `${(transicoesVerdes / (nosStepper.length - 1)) * 87.5}%` }}
                          />
                          <div className="grid grid-cols-8 justify-items-center">
                            {nosStepper.map((no) => (
                              <div key={no.key} className="flex flex-col items-center">
                                {/* ESTADO 1 — CONCLUÍDA: 22px, fundo+borda `success`, check ~12px. */}
                                {no.concluida ? (
                                  <span className="relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-success bg-success text-success-foreground">
                                    <Check className="h-3 w-3" />
                                  </span>
                                ) : (
                                  /* ESTADO 2 — ATUAL: vazada (interior = fundo do card),
                           borda lime 2px + ponto central lime de 6px.
                           ESTADO 3 — FUTURA: vazada, borda neutra 2px, sem nada. */
                                  <span
                                    className={cn(
                                      'relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2',
                                      no.ativa ? 'border-primary' : 'border-border'
                                    )}
                                  >
                                    {/* Miolo vazado = DUAS camadas em elementos SEPARADOS
                              (`MIOLO_STEPPER_OPACO` ⊕ `FUNDO_PROGRESSO`), que
                              juntas dão a MESMA tinta do painel: a base opaca
                              tapa a track e a segunda repõe a profundidade. Num
                              só `cn()` o tailwind-merge descartaria a base — ver
                              o comentário da constante. */}
                                    <span
                                      aria-hidden
                                      className={cn('absolute inset-0 rounded-full', MIOLO_STEPPER_OPACO)}
                                    />
                                    <span
                                      aria-hidden
                                      className={cn('absolute inset-0 rounded-full', FUNDO_PROGRESSO)}
                                    />
                                    {no.ativa && <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    'mt-2 whitespace-nowrap text-center text-[10px] leading-tight',
                                    no.ativa
                                      ? 'font-medium text-primary'
                                      : no.concluida
                                        ? 'text-foreground'
                                        : 'text-muted-foreground'
                                  )}
                                >
                                  {no.label}
                                </span>
                                <span className="mt-0.5 text-center text-[10px] leading-none tabular-nums text-muted-foreground">
                                  {no.data || '–'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      {/* 3. PRÓXIMA AÇÃO */}
                      <section className="flex items-center gap-4 rounded-2xl border border-info/30 bg-info/10 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/15 text-info">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium uppercase tracking-widest text-info">Próxima ação</p>
                          <p className="truncate text-sm font-medium text-foreground">{proximaAcao}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.observacoes || 'Siga a etapa atual para destravar o processo.'}
                          </p>
                        </div>
                        <div className="hidden shrink-0 flex-col gap-0.5 text-xs md:flex">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <User className="h-3.5 w-3.5" /> Responsável
                          </span>
                          <span className="font-medium text-foreground">{responsavel}</span>
                        </div>
                        <div className="hidden shrink-0 flex-col gap-0.5 border-l border-border/40 pl-4 pr-1 text-xs md:flex">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <CalendarClock className="h-3.5 w-3.5" /> Prazo
                          </span>
                          <span
                            className={cn(
                              'font-medium',
                              dias !== null && dias < 0 ? 'text-destructive-vivid' : 'text-foreground'
                            )}
                          >
                            {prazoTexto(dias)}
                          </span>
                        </div>
                        {destino && (
                          <Button
                            size="sm"
                            className="shrink-0 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            title={`Ir para ${DESTINO_LABEL[destino]}`}
                            onClick={handleIrParaAcao}
                          >
                            Ir para ação <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </section>

                      {/* 4. GRID PRINCIPAL */}
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Dados da admissão — destino do "Ir para ação" quando a
                            próxima ação é conferir a requisição/cadastro. */}
                        <section
                          data-secao="dados"
                          ref={(el) => {
                            secoesRef.current.dados = el;
                          }}
                          className={cn(CARD_PANEL, 'flex flex-col', destaque === 'dados' && DESTAQUE_DESTINO)}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="inline-flex items-center gap-2 font-display text-sm font-medium">
                              <Briefcase className="h-4 w-4 text-info" /> Dados da admissão
                            </h3>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => setEditando(true)}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </Button>
                          </div>
                          <dl className="grid grid-cols-1 gap-2">
                            <LinhaCampo icon={Briefcase} rotulo="Cargo" valor={a.cargo || '—'} />
                            <LinhaCampo icon={Building2} rotulo="Departamento" valor={a.departamento || '—'} />
                            <LinhaCampo
                              icon={Wallet}
                              rotulo="Salário proposto"
                              valor={formatCurrency(a.salario_proposto)}
                              valorClassName="text-success"
                            />
                            <LinhaCampo
                              icon={CalendarClock}
                              rotulo="Início previsto"
                              valor={formatDate(a.data_prevista)}
                            />
                            <LinhaCampo
                              icon={FileCheck2}
                              rotulo="Tipo de contratação"
                              valor={a.metadata?.tipo_contratacao || a.tipo_contratacao || '—'}
                            />
                          </dl>
                        </section>

                        {/* Documentos — TODOS os documentos aqui dentro; o card não abre
                  mais a janela aninhada ("Ver todos" removido) e NÃO tem scroll
                  próprio: a lista vai inteira e rola junto com o corpo do modal.
                  Cada linha expande os detalhes no lugar em vez de navegar. */}
                        <section
                          data-secao="documentos"
                          ref={(el) => {
                            secoesRef.current.documentos = el;
                          }}
                          className={cn(CARD_PANEL, 'flex flex-col', destaque === 'documentos' && DESTAQUE_DESTINO)}
                        >
                          <div className="mb-3 flex items-center">
                            <h3 className="inline-flex items-center gap-2 font-display text-sm font-medium">
                              <FileText className="h-4 w-4 text-info" /> Documentos
                              <span className="text-muted-foreground">
                                ({docsConcluidos}/{documentos.length})
                              </span>
                            </h3>
                          </div>
                          <ul className="-mx-2 divide-y divide-border/10">
                            {documentos.map((doc) => {
                              const st = DOC_STATUS[doc.status] ?? DOC_STATUS.pendente;
                              const aberto = docExpandido === doc.id;
                              return (
                                <li key={doc.id}>
                                  {/* Linha compacta (nome + status). Ela MESMA é o
                            acionador da expansão: nada de modal, nada de
                            navegação. */}
                                  <button
                                    type="button"
                                    aria-expanded={aberto}
                                    onClick={() => setDocExpandido(aberto ? null : doc.id)}
                                    className="flex w-full items-center gap-3 px-2 py-1.5 text-left transition-colors hover:bg-background/70"
                                  >
                                    <st.Icon className={cn('h-4 w-4 shrink-0', st.className)} />
                                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{doc.nome}</span>
                                    <span className={cn('shrink-0 text-xs', st.className)}>{st.label}</span>
                                    <ChevronRight
                                      className={cn(
                                        'h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform',
                                        aberto && 'rotate-90'
                                      )}
                                    />
                                  </button>
                                  {/* Detalhes NA PRÓPRIA LINHA: obrigatoriedade, observação
                            e — exatamente como o antigo diálogo aninhado fazia —
                            as ações de validação do documento enviado. */}
                                  {aberto && (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pb-2 pl-9">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider',
                                          doc.obrigatorio
                                            ? 'border-destructive-vivid/20 bg-destructive-vivid/5 text-destructive-vivid'
                                            : 'text-muted-foreground'
                                        )}
                                      >
                                        {doc.obrigatorio ? 'Obrigatório' : 'Opcional'}
                                      </Badge>
                                      {doc.observacao && (
                                        <span className="inline-flex items-center gap-1 text-[10px] italic text-muted-foreground">
                                          <AlertCircle className="h-3 w-3" /> {doc.observacao}
                                        </span>
                                      )}
                                      {isAdmin && doc.status === 'enviado' && (
                                        <TooltipProvider>
                                          <div className="ml-auto flex items-center gap-1">
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  aria-label="Aprovar"
                                                  className="h-7 w-7 rounded-lg text-success hover:bg-success/10"
                                                  onClick={() => handleValidar(doc.tipo || doc.id, 'validado')}
                                                >
                                                  <CheckCircle2 className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="text-[10px]">Validar Documento</p>
                                              </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  aria-label="Rejeitar"
                                                  className="h-7 w-7 rounded-lg text-destructive-vivid hover:bg-destructive-vivid/10"
                                                  onClick={() => handleValidar(doc.tipo || doc.id, 'rejeitado')}
                                                >
                                                  <XCircle className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="text-[10px]">Rejeitar Documento</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </div>
                                        </TooltipProvider>
                                      )}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      </div>

                      {/* 5. LINHA INFERIOR — eSocial + Histórico */}
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <section
                          data-secao="esocial"
                          ref={(el) => {
                            secoesRef.current.esocial = el;
                          }}
                          className={cn(CARD_PANEL, destaque === 'esocial' && DESTAQUE_DESTINO)}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="inline-flex items-center gap-2 font-display text-sm font-medium">
                              <ShieldCheck className="h-4 w-4 text-success" /> eSocial
                            </h3>
                            <Badge
                              variant={esocialEnviado ? 'success' : 'warning'}
                              size="sm"
                              className="text-[10px] uppercase tracking-wider"
                            >
                              {esocialEnviado ? 'Transmitido' : 'Não transmitido'}
                            </Badge>
                          </div>
                          <dl className="grid grid-cols-1 gap-2">
                            <LinhaCampo icon={FileText} rotulo="Evento" valor="S-2200 (Admissão)" />
                            <LinhaCampo icon={FileCheck2} rotulo="Protocolo" valor={a.protocolo_esocial || '—'} />
                            <LinhaCampo
                              icon={Clock}
                              rotulo="Transmitido em"
                              valor={a.data_transmissao_esocial ? formatDateTime(a.data_transmissao_esocial) : '—'}
                            />
                            <LinhaCampo icon={ShieldCheck} rotulo="Retorno" valor={a.status_esocial || 'Pendente'} />
                          </dl>
                          <div className="flex gap-2 pt-3">
                            {!esocialEnviado && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-1.5"
                                onClick={handleTransmitir}
                                disabled={isSending}
                              >
                                {isSending ? <Spinner size="sm" /> : <Send className="h-3.5 w-3.5" />} Transmitir agora
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn('gap-1.5', esocialEnviado && 'flex-1')}
                              onClick={() => navigate('/esocial')}
                            >
                              <FileText className="h-3.5 w-3.5" /> Ver detalhes
                            </Button>
                          </div>
                        </section>

                        {/* Histórico — a linha do tempo COMPLETA do workflow dentro
                  do card (botão "Ver histórico" e a janela aninhada removidos).
                  Sem scroll próprio: a timeline inteira rola com o corpo do
                  modal. */}
                        <section
                          data-secao="historico"
                          ref={(el) => {
                            secoesRef.current.historico = el;
                          }}
                          className={cn(CARD_PANEL, destaque === 'historico' && DESTAQUE_DESTINO)}
                        >
                          <div className="mb-3 flex items-center">
                            <h3 className="inline-flex items-center gap-2 font-display text-sm font-medium">
                              <History className="h-4 w-4 text-primary" /> Histórico
                            </h3>
                          </div>
                          {historicoCompleto.length === 0 ? (
                            <p className="py-4 text-center text-xs text-muted-foreground">
                              Nenhum evento registrado para esta admissão.
                            </p>
                          ) : (
                            <ol className="-mx-2">
                              {historicoCompleto.map((h, i) => {
                                const descricao = String(h.observacoes ?? '').trim();
                                const longo = descricao.length > LIMITE_DESCRICAO;
                                const expandido = eventoExpandido === h.id;
                                const autor = responsavelDoEvento(h);
                                return (
                                  <li key={h.id} className="relative flex gap-3 px-2 py-1.5">
                                    {/* Fio vertical da timeline: desce do PÉ do marcador
                              (py-1.5 = 6px + mt-0.5 = 2px + 16px de altura = 24px
                              → `top-6`) até o fim da linha. O marcador tem
                              `z-10` e cobre o fio na sua altura. */}
                                    {i < historicoCompleto.length - 1 && (
                                      <span aria-hidden className="absolute bottom-0 left-4 top-6 w-px bg-border/30" />
                                    )}
                                    <span className="relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20">
                                      <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline gap-2">
                                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                                          {h.acao}
                                        </span>
                                        <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
                                          {formatDateTime(h.created_at)}
                                        </span>
                                      </div>
                                      {descricao && (
                                        <>
                                          <p
                                            className={cn(
                                              'text-xs text-muted-foreground',
                                              longo && !expandido && 'line-clamp-2'
                                            )}
                                          >
                                            {descricao}
                                          </p>
                                          {/* Descrição longa abre NA PRÓPRIA linha. */}
                                          {longo && (
                                            <button
                                              type="button"
                                              aria-expanded={expandido}
                                              onClick={() => setEventoExpandido(expandido ? null : h.id)}
                                              className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline"
                                            >
                                              {expandido ? 'Ver menos' : 'Ver mais'}
                                              <ChevronRight
                                                className={cn('h-3 w-3 transition-transform', expandido && 'rotate-90')}
                                              />
                                            </button>
                                          )}
                                        </>
                                      )}
                                      {autor && (
                                        <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <User className="h-3 w-3" /> {autor}
                                        </span>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ol>
                          )}
                        </section>
                      </div>
                    </motion.div>

                    {/* FOOTER (fixo) */}
                    <MotionDialogFooter
                      variants={cascadeItemVariants}
                      className="shrink-0 flex-row items-center justify-between gap-3 space-x-0 border-t border-border/40 bg-muted/30 px-6 py-3 shadow-[0_-1px_2px_rgba(0,0,0,0.35)] sm:justify-between"
                    >
                      <Button
                        variant="ghost"
                        className="gap-2 text-destructive-vivid hover:bg-destructive-vivid/10"
                        onClick={() => setCancelamentoAberto(true)}
                        disabled={terminal}
                        title={terminal ? 'Processo já encerrado' : undefined}
                      >
                        <Trash2 className="h-4 w-4" /> Cancelar admissão
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                          Fechar
                        </Button>
                        <Button
                          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => setEditando(true)}
                        >
                          <Pencil className="h-4 w-4" /> Editar informações
                        </Button>
                      </div>
                    </MotionDialogFooter>
                  </motion.div>

                  {/* X no extremo direito — mesmas classes/posição de antes
                      (`right-3 top-3`, 28px) para o header continuar com a faixa
                      reservada (`ACOES_HEADER`). Fica por último no DOM, como no
                      `DialogContent`, para não mudar a ordem de foco. */}
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

      {/* Documentos e Histórico NÃO têm mais diálogo aninhado: os dois são
          consultados por inteiro dentro dos próprios cards do modal principal
          (listas com rolagem própria), sem abrir janela sobre janela. */}

      {/* Edição real: reaproveita o formulário de admissão (NovaAdmissaoDialog) */}
      {editando && (
        <NovaAdmissaoDialog admissao={a} open onOpenChange={(v) => setEditando(v)} onSaved={handleEdicaoSalva} />
      )}

      {/* Confirmação do cancelamento real (`admissaoService.cancelar`) */}
      <AlertDialog open={cancelamentoAberto} onOpenChange={setCancelamentoAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar admissão</AlertDialogTitle>
            <AlertDialogDescription>
              A admissão de {a.nome} será marcada como cancelada. Esta ação exige confirmação e pode ser retomada depois
              pela Gestão de Candidatos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive-vivid text-white hover:bg-destructive-vivid/90"
              onClick={handleCancelar}
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
