/**
 * Contrato visual do Kanban de Admissões.
 *
 * FONTE ÚNICA da identidade de cada coluna (ícone, tom, descrição) e das
 * microinformações que o card mostra. O board (`AdmissoesKanban.tsx`), a coluna
 * (`KanbanColumn.tsx`) e o card (`KanbanCard.tsx`) leem tudo daqui: nenhum dos
 * três tem cópia própria de rótulo, cor, ícone ou texto de status.
 *
 * POR QUE UM ARQUIVO PRÓPRIO, e não `admissoesComum.ts`: aquele módulo é o
 * contrato COMPARTILHADO com o dashboard e os modais (rótulo de etapa, selo,
 * ordem do fluxo, checklist). O que vive aqui é exclusivo do board — descrição de
 * coluna, ícone da coluna e leitura de status do card só existem nesta tela,
 * então mudá-los não pode mexer em nenhuma outra.
 *
 * IDENTIDADE DE COR (mesma linguagem da referência do Dashboard Executivo): a cor
 * nunca pinta bloco cheio. Ela aparece em tinta translúcida no chip do ícone da
 * coluna, na fita/glow do topo, no véu dos pills de status e na barra fina de
 * progresso do card — o fundo da coluna e do card continuam escuros. `teal`
 * (Validação) e `violet` (Exame) saem de `--chart-2`/`--chart-4`; `aqua`
 * (eSocial) é o único token novo, exclusivo do board e irmão do
 * `--destructive-vivid` (ver a nota em `src/index.css`).
 *
 * CONTEÚDO DO CARD: `statusDoCard` continua sendo a linha de "onde está" (lida de
 * dado real — checklist, pendência, recibo do eSocial) e `contextoDoCard` monta o
 * bloco contextual da etapa (rótulo, barra de progresso, alertas e protocolo). O
 * card é só apresentação: nenhuma das duas inventa dado que a linha de
 * `admissoes` não tenha.
 */

import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileSignature,
  Files,
  Hash,
  PenLine,
  Send,
  Stethoscope,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { formatDateTime } from '@/utils/format';

/**
 * Linha de `public.admissoes` como o board a consome. Deliberadamente frouxa nos
 * campos que o registro real traz e o mock de demonstração não: todo derivado
 * abaixo tolera campo faltando em vez de quebrar o card.
 */
export interface AdmissaoKanban {
  id: string;
  nome: string;
  cargo?: string | null;
  departamento?: string | null;
  etapa: string;
  data_prevista?: string | null;
  email?: string | null;
  metadata?: { responsavel?: string | null; pendencia?: string | null } | null;
  [campo: string]: unknown;
}

/* ─── Identidade por tom ──────────────────────────────────────────────────── */

export type TomEtapa = 'info' | 'warning' | 'teal' | 'violet' | 'success' | 'primary' | 'destructive' | 'aqua';

export interface TomKanban {
  /** Chip do ícone da coluna (quadrado arredondado, tinta translúcida). */
  chip: string;
  /** Tinta pura — ícone de status do card e detalhes de uma cor só. */
  tinta: string;
  /**
   * Fundo da COLUNA INTEIRA (valor de `background-image`, aplicado por `style`
   * na raiz da coluna): brilho radial no topo + gradiente vertical que dilui a
   * cor da etapa do topo à base, por cima do `bg-card` do painel. É AQUI que a
   * identidade da etapa vive — não há faixa, fita ou filete no cabeçalho.
   */
  fundo: string;
  /** Borda estática de identidade da coluna (a cor como acento, nunca chapada). */
  borda: string;
  /** Borda de acento no hover do card. */
  bordaHover: string;
  /** Véu translúcido — fundo de pills/chips na cor da etapa. */
  veu: string;
  /** Preenchimento das barras de progresso (cor cheia, área minúscula). */
  barra: string;
}

/**
 * Fundo da COLUNA INTEIRA — o `background-image` que a coluna aplica inline.
 * Combina um brilho radial no topo (dá o "acendimento" do painel) com um
 * gradiente vertical que dilui a cor da etapa do topo à base, ambos por cima do
 * `bg-card`. É assim que a identidade da etapa aparece no painel TODO, e não só
 * no cabeçalho: sem fita, sem filete e sem corte brusco depois do topo.
 * `variavel` é o nome do token HSL do projeto (ex.: `--info`, `--chart-2`).
 */
function superficieDaEtapa(variavel: string): string {
  return [
    `radial-gradient(130% 60% at 50% -10%, hsl(var(${variavel}) / 0.15), transparent 68%)`,
    `linear-gradient(180deg, hsl(var(${variavel}) / 0.08) 0%, hsl(var(${variavel}) / 0.03) 48%, hsl(var(${variavel}) / 0.01) 100%)`,
  ].join(', ');
}

/**
 * A cor NUNCA pinta bloco cheio: ela aparece em tinta translúcida no chip do
 * ícone, no FUNDO DO PAINEL INTEIRO (via `fundo`), no véu dos pills de status e
 * na barra fina de progresso — o fundo da coluna e do card continuam escuros.
 * `teal` (Validação) e `violet` (Exame) saem de `--chart-2`/`--chart-4`; `aqua`
 * (eSocial) é o token turquesa exclusivo do board (ver a nota em `src/index.css`).
 * Nenhum outro token novo foi criado para o board.
 */
export const TOM_KANBAN: Record<TomEtapa, TomKanban> = {
  info: {
    chip: 'bg-info/12 text-info',
    tinta: 'text-info',
    fundo: superficieDaEtapa('--info'),
    borda: 'border-info/20',
    bordaHover: 'hover:border-info/45',
    veu: 'bg-info/12 text-info',
    barra: 'bg-info',
  },
  warning: {
    chip: 'bg-warning/12 text-warning',
    tinta: 'text-warning',
    fundo: superficieDaEtapa('--warning'),
    borda: 'border-warning/20',
    bordaHover: 'hover:border-warning/45',
    veu: 'bg-warning/12 text-warning',
    barra: 'bg-warning',
  },
  // `--chart-2` = ciano/teal (pedido da referência para "Validação").
  teal: {
    chip: 'bg-[hsl(var(--chart-2)/0.14)] text-[hsl(var(--chart-2))]',
    tinta: 'text-[hsl(var(--chart-2))]',
    fundo: superficieDaEtapa('--chart-2'),
    borda: 'border-[hsl(var(--chart-2)/0.22)]',
    bordaHover: 'hover:border-[hsl(var(--chart-2)/0.5)]',
    veu: 'bg-[hsl(var(--chart-2)/0.14)] text-[hsl(var(--chart-2))]',
    barra: 'bg-[hsl(var(--chart-2))]',
  },
  // `--chart-4` = roxo (pedido da referência para "Exame").
  violet: {
    chip: 'bg-[hsl(var(--chart-4)/0.14)] text-[hsl(var(--chart-4))]',
    tinta: 'text-[hsl(var(--chart-4))]',
    fundo: superficieDaEtapa('--chart-4'),
    borda: 'border-[hsl(var(--chart-4)/0.22)]',
    bordaHover: 'hover:border-[hsl(var(--chart-4)/0.5)]',
    veu: 'bg-[hsl(var(--chart-4)/0.14)] text-[hsl(var(--chart-4))]',
    barra: 'bg-[hsl(var(--chart-4))]',
  },
  success: {
    chip: 'bg-success/12 text-success',
    tinta: 'text-success',
    fundo: superficieDaEtapa('--success'),
    borda: 'border-success/20',
    bordaHover: 'hover:border-success/45',
    veu: 'bg-success/12 text-success',
    barra: 'bg-success',
  },
  primary: {
    chip: 'bg-primary/12 text-primary',
    tinta: 'text-primary',
    fundo: superficieDaEtapa('--primary'),
    borda: 'border-primary/20',
    bordaHover: 'hover:border-primary/45',
    veu: 'bg-primary/12 text-primary',
    barra: 'bg-primary',
  },
  destructive: {
    chip: 'bg-destructive-vivid/12 text-destructive-vivid',
    tinta: 'text-destructive-vivid',
    fundo: superficieDaEtapa('--destructive-vivid'),
    borda: 'border-destructive-vivid/20',
    bordaHover: 'hover:border-destructive-vivid/45',
    veu: 'bg-destructive-vivid/12 text-destructive-vivid',
    barra: 'bg-destructive-vivid',
  },
  // `--aqua` = turquesa exclusiva do board (pedido da referência para "eSocial").
  aqua: {
    chip: 'bg-[hsl(var(--aqua)/0.14)] text-[hsl(var(--aqua))]',
    tinta: 'text-[hsl(var(--aqua))]',
    fundo: superficieDaEtapa('--aqua'),
    borda: 'border-[hsl(var(--aqua)/0.22)]',
    bordaHover: 'hover:border-[hsl(var(--aqua)/0.5)]',
    veu: 'bg-[hsl(var(--aqua)/0.14)] text-[hsl(var(--aqua))]',
    barra: 'bg-[hsl(var(--aqua))]',
  },
};

/* ─── As colunas do board ─────────────────────────────────────────────────── */

export interface ColunaKanban {
  /** Valor REAL de `admissoes.etapa` — é a chave que o drag-and-drop grava. */
  key: string;
  label: string;
  /** Frase curta da função da etapa (subtítulo do cabeçalho da coluna). */
  descricao: string;
  icon: LucideIcon;
  tom: TomEtapa;
}

/**
 * Ordem do board: as CINCO etapas principais primeiro (Solicitação, Documentos,
 * Validação, Exame, Contrato), depois as demais do fluxo real e os dois estados
 * terminais. É a leitura principal do processo — a mesma régua de `ETAPA_FLUXO`,
 * com `pendente` (que é uma TRAVA dentro de Documentos, não um nó linear) e os
 * terminais empurrados para o fim.
 *
 * `concluida` e `cancelada` existem aqui porque NÃO existiam em lugar nenhum do
 * board: sem elas, uma admissão concluída ou cancelada desaparecia do Kanban (o
 * agrupamento só tem coluna para as etapas listadas).
 */
export const COLUNAS_KANBAN: readonly ColunaKanban[] = [
  {
    key: 'solicitacao',
    label: 'Solicitação',
    descricao: 'Aguardando aprovação da vaga',
    icon: ClipboardList,
    tom: 'info',
  },
  {
    key: 'documentos',
    label: 'Documentos',
    descricao: 'Coleta e conferência de documentos',
    icon: Files,
    tom: 'warning',
  },
  {
    key: 'validacao',
    label: 'Validação',
    descricao: 'Análise e validação das informações',
    icon: ClipboardCheck,
    tom: 'teal',
  },
  {
    key: 'exame',
    label: 'Exame',
    descricao: 'Exames médicos e complementares',
    icon: Stethoscope,
    tom: 'violet',
  },
  {
    key: 'contrato',
    label: 'Contrato',
    descricao: 'Elaboração e assinatura',
    icon: FileSignature,
    tom: 'success',
  },
  {
    key: 'pendente',
    label: 'Pendente',
    descricao: 'Pendências que travam a etapa',
    icon: AlertTriangle,
    tom: 'destructive',
  },
  {
    key: 'assinatura',
    label: 'Assinatura',
    descricao: 'Assinatura digital do contrato',
    icon: PenLine,
    tom: 'primary',
  },
  {
    key: 'esocial',
    label: 'eSocial',
    descricao: 'Transmissão do evento S-2200',
    icon: Send,
    tom: 'aqua',
  },
  {
    key: 'concluida',
    label: 'Concluída',
    descricao: 'Admissões finalizadas',
    icon: CheckCircle2,
    tom: 'success',
  },
  {
    key: 'cancelada',
    label: 'Cancelada',
    descricao: 'Processos encerrados',
    icon: XCircle,
    tom: 'destructive',
  },
];

/** Coluna de uma etapa — `undefined` para etapa fora do board (não deve ocorrer). */
export function colunaDaEtapa(etapa?: string | null): ColunaKanban | undefined {
  return COLUNAS_KANBAN.find((c) => c.key === etapa);
}

/* ─── Microinformação contextual do card ──────────────────────────────────── */

/**
 * Os documentos do checklist — os MESMOS SEIS que a janela de detalhes conta em
 * "Documentos (X/6)" (`DetalhesAdmissaoDialog`). Fica de fora o
 * `checklist_esocial_enviado`: ele é a etapa do eSocial, não um documento a
 * coletar, e por isso não entra no numerador/denominador do card.
 */
export const DOCS_CHECKLIST = [
  'checklist_documentos_pessoais',
  'checklist_comprovante_endereco',
  'checklist_foto',
  'checklist_ctps',
  'checklist_exame_admissional',
  'checklist_contrato_assinado',
] as const;

/** Quantos dos 6 documentos do checklist já foram marcados na admissão. */
export function documentosConcluidos(a: AdmissaoKanban): number {
  return DOCS_CHECKLIST.filter((campo) => !!a?.[campo]).length;
}

/** True quando a admissão já foi transmitida ao eSocial (S-2200). */
export function esocialTransmitido(a: AdmissaoKanban): boolean {
  return a?.status_esocial === 'enviado' || !!a?.protocolo_esocial || !!a?.data_transmissao_esocial;
}

export interface StatusCard {
  icone: LucideIcon;
  texto: string;
}

/**
 * Linha de status do card — o "onde está" daquela etapa, lido de DADO REAL
 * quando existe (checklist, pendência registrada, recibo do eSocial) e de uma
 * frase-guia quando o dado não existe.
 *
 * O que fica de fora de propósito: "Agendado para 02/10" (exemplo da referência
 * para Exame). A linha de `admissoes` não tem data de exame — o agendamento vive
 * em outra tabela (`exames_agendamentos`) que o board não carrega. Usar
 * `data_prevista` (início previsto do trabalho, que o card já mostra no rodapé)
 * aqui seria dizer "agendado" sobre o campo errado; a etapa mostra o que é
 * verdadeiro: exame realizado ou ainda pendente.
 */
export function statusDoCard(a: AdmissaoKanban): StatusCard {
  const pendencia = String(a?.metadata?.pendencia ?? '').trim();
  const docs = documentosConcluidos(a);

  switch (a?.etapa) {
    case 'solicitacao':
      return pendencia
        ? { icone: AlertTriangle, texto: 'Aguardando documentação' }
        : { icone: Clock, texto: 'Aguardando aprovação' };
    case 'documentos':
      return docs > 0
        ? { icone: CheckCircle2, texto: `${docs}/${DOCS_CHECKLIST.length} documentos` }
        : { icone: Clock, texto: 'Aguardando documentos' };
    case 'validacao':
      return docs === DOCS_CHECKLIST.length
        ? { icone: CheckCircle2, texto: 'Documentos validados' }
        : { icone: Clock, texto: 'Em validação' };
    case 'exame':
      return a?.checklist_exame_admissional
        ? { icone: CheckCircle2, texto: 'Exame realizado' }
        : { icone: CalendarClock, texto: 'Aguardando exame' };
    case 'contrato':
      return a?.checklist_contrato_assinado
        ? { icone: CheckCircle2, texto: 'Contrato assinado' }
        : { icone: FileSignature, texto: 'Contrato em elaboração' };
    case 'pendente':
      return { icone: AlertTriangle, texto: pendencia || 'Etapa travada por pendência' };
    case 'assinatura':
      return a?.checklist_contrato_assinado
        ? { icone: CheckCircle2, texto: 'Assinatura concluída' }
        : { icone: Clock, texto: 'Aguardando assinatura' };
    case 'esocial':
      return esocialTransmitido(a)
        ? { icone: CheckCircle2, texto: 'Transmitido ao eSocial' }
        : { icone: Clock, texto: 'Aguardando transmissão' };
    case 'concluida':
      return { icone: CheckCircle2, texto: 'Processo concluído' };
    case 'cancelada':
      return { icone: XCircle, texto: 'Processo cancelado' };
    default:
      return { icone: Clock, texto: 'Em andamento' };
  }
}

/**
 * Iniciais para o avatar do card (e do responsável): primeira letra do primeiro e
 * do último nome — "Carlos Ferreira" → "CF", "Ana Lima" → "AL". Nome de uma
 * palavra rende uma letra só; nome vazio rende "—" para o círculo nunca ficar sem
 * conteúdo.
 */
export function iniciais(nome?: string | null): string {
  const partes = String(nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return '—';
  if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Responsável da admissão — mesma leitura e mesmo texto do modal de detalhes. */
export function responsavelDaAdmissao(a: AdmissaoKanban): string {
  return String(a?.metadata?.responsavel ?? '').trim() || 'Não atribuído';
}

/* ─── Bloco contextual do card (muda por etapa) ───────────────────────────── */

export type TomLinha = 'neutro' | 'acento' | 'alerta' | 'ok';

export interface LinhaContexto {
  icone: LucideIcon;
  texto: string;
  tom: TomLinha;
}

/**
 * O "mini painel" que o card mostra abaixo do nome: o rótulo do bloco, uma barra
 * de progresso opcional (feito/total) e as linhas de contexto daquela etapa.
 *
 * TUDO vem de dado real da linha de `admissoes` — a pendência registrada em
 * `metadata.pendencia`, os documentos do checklist, o protocolo/data do eSocial e
 * o `data_prevista`. Quando o dado não existe, o bloco encolhe em vez de inventar
 * um texto: `concluida`/`cancelada` não têm progresso, e `pendente` não repete a
 * pendência (ela já é a linha de status).
 */
export interface ContextoEtapa {
  /** Rótulo do bloco no card (ex.: "Próxima ação", "Documentação"). */
  rotulo: string;
  /** Barra fina de progresso — só nas etapas com avanço medível pelo checklist. */
  progresso?: { feito: number; total: number };
  /** Linhas extras abaixo do status principal. */
  linhas: LinhaContexto[];
}

/** Próxima ação CURTA por etapa (o board mostra a frase, não o parágrafo do modal). */
const PROXIMA_ACAO_CURTA: Record<string, string> = {
  solicitacao: 'Confirmar a requisição com o gestor',
  documentos: 'Cobrar os documentos pendentes do candidato',
  validacao: 'Revisar as informações e liberar o exame',
  exame: 'Confirmar o agendamento do ASO admissional',
  contrato: 'Enviar o contrato para assinatura',
  esocial: 'Transmitir o evento S-2200',
  pendente: 'Resolver a pendência registrada',
  assinatura: 'Acompanhar a assinatura do contrato',
  concluida: 'Processo finalizado — nada a fazer',
  cancelada: 'Revisar o motivo do cancelamento',
};

/** Próxima ação curta de uma etapa — cai num texto-guia quando a etapa é desconhecida. */
export function proximaAcaoCurtaDaEtapa(etapa?: string | null): string {
  return PROXIMA_ACAO_CURTA[etapa ?? ''] ?? 'Definir o próximo passo da etapa';
}

/**
 * Bloco contextual do card por etapa — ver a nota de `ContextoEtapa`. A linha de
 * status em si continua vindo de `statusDoCard`; aqui só ficam o rótulo, o
 * progresso e as linhas de apoio.
 */
export function contextoDoCard(a: AdmissaoKanban): ContextoEtapa {
  const etapa = a?.etapa;
  const pendencia = String(a?.metadata?.pendencia ?? '').trim();
  const docs = documentosConcluidos(a);

  switch (etapa) {
    case 'solicitacao':
      return {
        rotulo: 'Próxima ação',
        linhas: [{ icone: ArrowRight, texto: proximaAcaoCurtaDaEtapa(etapa), tom: 'acento' }],
      };
    case 'documentos':
      return {
        rotulo: 'Documentação',
        progresso: { feito: docs, total: DOCS_CHECKLIST.length },
        linhas: pendencia ? [{ icone: AlertTriangle, texto: pendencia, tom: 'alerta' }] : [],
      };
    case 'validacao':
      return {
        rotulo: 'Validação',
        progresso: { feito: docs, total: DOCS_CHECKLIST.length },
        linhas: pendencia ? [{ icone: AlertTriangle, texto: pendencia, tom: 'alerta' }] : [],
      };
    case 'exame':
      return {
        rotulo: 'Exame admissional',
        linhas: [
          a?.checklist_exame_admissional
            ? { icone: CheckCircle2, texto: 'ASO anexado ao dossiê', tom: 'ok' }
            : { icone: CalendarClock, texto: 'ASO ainda não realizado', tom: 'neutro' },
        ],
      };
    case 'contrato':
      return {
        rotulo: 'Contrato',
        progresso: { feito: docs, total: DOCS_CHECKLIST.length },
        linhas: [{ icone: FileSignature, texto: proximaAcaoCurtaDaEtapa(etapa), tom: 'acento' }],
      };
    case 'esocial': {
      const protocolo = String(a?.protocolo_esocial ?? '').trim();
      const enviadoEm = a?.data_transmissao_esocial ? formatDateTime(a.data_transmissao_esocial as string | null) : '';
      return {
        rotulo: 'eSocial',
        linhas: [
          protocolo
            ? { icone: Hash, texto: `Protocolo ${protocolo}`, tom: 'neutro' }
            : { icone: Send, texto: 'Sem protocolo de transmissão', tom: 'neutro' },
          ...(enviadoEm ? [{ icone: Clock, texto: `Enviado em ${enviadoEm}`, tom: 'neutro' as const }] : []),
        ],
      };
    }
    case 'assinatura':
      return {
        rotulo: 'Assinatura',
        linhas: [{ icone: PenLine, texto: proximaAcaoCurtaDaEtapa(etapa), tom: 'acento' }],
      };
    case 'pendente':
      // A pendência (ou a frase-guia) já é a linha de status — não repetir aqui.
      return { rotulo: 'Pendência', linhas: [] };
    case 'concluida':
      return { rotulo: 'Conclusão', linhas: [] };
    case 'cancelada':
      return { rotulo: 'Cancelamento', linhas: [] };
    default:
      return {
        rotulo: 'Contexto',
        linhas: [{ icone: ArrowRight, texto: proximaAcaoCurtaDaEtapa(etapa), tom: 'neutro' }],
      };
  }
}
