/**
 * ============================================================================
 * APROVAÇÃO DO GESTOR — CAMADA PURA (derivação, regras e rótulos).
 *
 * Implementa, no front, o MESMO fluxo da migration
 * `20261017090000_ninebox_aprovacao_gestor.sql`:
 *
 *   RH prepara (1) → RH conclui os feedbacks (2) → RH envia ao gestor (3) →
 *   gestor aprova ou devolve com justificativa (4) → RH corrige e reenvia (5) →
 *   RH valida o Potencial (6) → o Nine-Box classifica automaticamente (7).
 *
 * ── O QUE ESTE ARQUIVO É (E NÃO É) ─────────────────────────────────────────
 *  • É a fonte ÚNICA da leitura de status no front: `situacaoAprovacao` espelha
 *    `public.situacao_aprovacao(colaborador, ciclo)` para que a tela e o banco
 *    NUNCA discordem;
 *  • NÃO autoriza nada: as funções `pode*` só evitam OFERECER um controle que o
 *    servidor vai recusar (a RPC revalida papel, vínculo gestor↔colaborador e
 *    empresa). `disponivel: true` não é permissão;
 *  • NÃO fala com o Supabase (sem React, sem I/O) — por isso é testável.
 *
 * ── TIPOS × STATUS (não se misturam) ───────────────────────────────────────
 * `gestor`/`par`/`auto`/`subordinado` são CATEGORIAS de avaliação 360°.
 * `aguardando_gestor`/`devolvida`/... são STATUS de APROVAÇÃO. Este módulo só
 * conhece os segundos; a categoria do feedback aparece somente na COLUNA de
 * origem, nunca como status.
 * ============================================================================
 */

import { notaNaEscala } from './nineBoxConsolidacao';
import { ROTULO_TIPO_FEEDBACK, tipoFeedback, type TipoFeedback } from './feedbacksComum';
import { capacidadesAvaliacao, type PapeisAvaliacao } from './papeisAvaliacao';
import { ehAvaliadorDesignado, ehGestorResponsavel, type VinculoGestor } from './acoesFeedback';
import { idDemonstrativo } from './escritaOperacional';

/* ─── Status de aprovação (o CHECK da tabela é a autoridade) ──────────────── */

export const STATUS_APROVACAO = {
  /** Nenhuma avaliação válida no conjunto (nada a encaminhar). */
  EM_PREPARACAO: 'em_preparacao',
  /** Existe consolidação, mas o colaborador NÃO tem gestor identificado. */
  SEM_GESTOR: 'sem_gestor',
  AGUARDANDO_GESTOR: 'aguardando_gestor',
  DEVOLVIDA: 'devolvida',
  APROVADA_GESTOR: 'aprovada_gestor',
  AGUARDANDO_RH: 'aguardando_rh',
  CONCLUIDA_VALIDADA: 'concluida_validada',
} as const;

export type StatusAprovacao = (typeof STATUS_APROVACAO)[keyof typeof STATUS_APROVACAO];
export type StatusAprovacaoLido = StatusAprovacao | 'desconhecido';

/** Normaliza o status cru (texto livre no banco até o CHECK ser encontrado). */
export function normalizarStatusAprovacao(valor: unknown): StatusAprovacaoLido {
  const s = String(valor ?? '')
    .trim()
    .toLowerCase();
  return (Object.values(STATUS_APROVACAO) as string[]).includes(s) ? (s as StatusAprovacao) : 'desconhecido';
}

export const ROTULO_STATUS_APROVACAO: Record<StatusAprovacaoLido, string> = {
  em_preparacao: 'Em preparação',
  sem_gestor: 'Gestor não atribuído',
  aguardando_gestor: 'Aguardando gestor',
  devolvida: 'Devolvida para correção',
  aprovada_gestor: 'Aprovada pelo gestor',
  aguardando_rh: 'Aguardando validação do RH',
  concluida_validada: 'Concluída e validada',
  desconhecido: 'Status desconhecido',
};

/**
 * Pele do badge de status — os MESMOS tokens semânticos já usados pelos badges
 * do módulo (`--warning`, `--info`, `--success`, `--destructive-vivid`).
 * Nenhuma cor nova entra no Design System.
 */
export const TOM_STATUS_APROVACAO: Record<StatusAprovacaoLido, string> = {
  em_preparacao: 'border-border/50 bg-muted/40 text-muted-foreground',
  sem_gestor: 'border-warning/45 bg-warning/20 text-warning',
  aguardando_gestor: 'border-warning/45 bg-warning/20 text-warning',
  devolvida: 'border-destructive-vivid/45 bg-destructive-vivid/20 text-destructive-vivid',
  aprovada_gestor: 'border-info/45 bg-info/20 text-info',
  aguardando_rh: 'border-info/45 bg-info/20 text-info',
  concluida_validada: 'border-success/45 bg-success/20 text-success',
  desconhecido: 'border-border/50 bg-muted/40 text-muted-foreground',
};

/** Ordem de urgência da fila (o que exige ação aparece primeiro). */
export const ORDEM_FILA_APROVACAO: StatusAprovacaoLido[] = [
  'sem_gestor',
  'aguardando_gestor',
  'devolvida',
  'em_preparacao',
  'aguardando_rh',
  'aprovada_gestor',
  'concluida_validada',
  'desconhecido',
];

/* ─── Regra de situação (espelho exato de `public.situacao_aprovacao`) ────── */

export interface DecisaoAprovacaoLida {
  decisao?: unknown;
  versao_avaliacao?: unknown;
  decidido_em?: unknown;
  justificativa?: unknown;
}

/**
 * Estado do fluxo de aprovação, na MESMA ordem da função SQL (e devolvendo o
 * mesmo subconjunto de valores):
 *
 *   0. colaborador SEM gestor identificado → `sem_gestor` (pendência de
 *      ATRIBUIÇÃO: visível ao RH, sem fingir que foi encaminhada a alguém);
 *   1. sem versão consolidada (nenhuma avaliação válida) → `em_preparacao`;
 *   2. decisão VIGENTE da MESMA versão:
 *      a. `aprovado` + validação do RH → `concluida_validada`;
 *      b. `aprovado`                    → `aprovada_gestor`;
 *      c. `devolvido`                   → `devolvida`;
 *   3. sem decisão vigente               → `aguardando_gestor`.
 *
 * INVALIDAÇÃO: decisão de OUTRA versão NÃO é aplicada (é ignorada) e a
 * consolidação volta a aguardar o gestor — é o que faz "avaliação nova ou
 * modificada depois da decisão" invalidar a aprovação anterior e reencaminhar
 * automaticamente, sem clique do RH.
 *
 * `aguardando_rh` existe no CHECK da tabela mas NUNCA é derivado aqui — o SQL
 * também não o devolve; fica reservado para uso futuro.
 */
export function situacaoAprovacao({
  versaoGestor,
  decisao,
  validada,
  gestorIdentificado = true,
  avaliacaoGestorValida = true,
  autorizadoServidor = false,
}: {
  /** Versão CONSOLIDADA vigente do conjunto (colaborador × ciclo). */
  versaoGestor: string | null;
  decisao: DecisaoAprovacaoLida | null;
  validada: boolean;
  /** `false` = não há gestor responsável resolvido para o colaborador. */
  gestorIdentificado?: boolean;
  /** A avaliação do GESTOR (obrigatória) existe e está concluída? */
  avaliacaoGestorValida?: boolean;
  /** Exceção/vínculo confirmado pelo servidor (`pode_aprovar_colaborador`). */
  autorizadoServidor?: boolean;
}): StatusAprovacaoLido {
  /**
   * ORDEM DE AUTORIDADE (a MESMA do servidor — `public.situacao_aprovacao`):
   *   1. `sem_gestor` — sem gestor responsável NÃO existe aprovação válida. Uma
   *      decisão histórica gravada sem vínculo é INVÁLIDA (não é aprovação);
   *   2. `em_preparacao` — nenhuma avaliação no conjunto;
   *   3. DECISÃO VIGENTE:
   *      • devolvido → `devolvida`;
   *      • sem a avaliação do GESTOR concluída → `aguardando_gestor` (a RPC
   *        `decidir_aprovacao_gestor` recusa sem ela; nada é "aprovado" antes do
   *        requisito obrigatório);
   *      • com validação vigente do RH → `concluida_validada`;
   *      • senão → `aprovada_gestor`.
   *
   * O status do REGISTRO (`concluido`, `pendente`) e o TIPO da avaliação nunca
   * entram aqui: conclusão ≠ aprovação gerencial e aprovação é do CONJUNTO.
   */
  if (!gestorIdentificado && !autorizadoServidor) return 'sem_gestor';
  if (!versaoGestor) return 'em_preparacao';
  const versaoDecidida = String(decisao?.versao_avaliacao ?? '').trim();
  const vigente = decisao && versaoDecidida === versaoGestor ? decisao : null;
  if (vigente) {
    if (
      String(vigente.decisao ?? '')
        .trim()
        .toLowerCase() !== 'aprovado'
    )
      return 'devolvida';
    if (!avaliacaoGestorValida) return 'aguardando_gestor';
    if (validada) return 'concluida_validada';
    return 'aprovada_gestor';
  }
  // Antes da decisão, a ausência de gestor oficial continua visível mesmo com
  // exceção autorizada; depois da decisão o estado avança para aprovação/RH.
  if (!gestorIdentificado) return 'sem_gestor';
  return 'aguardando_gestor';
}

/* ─── Permissões (espelho do front; o servidor revalida) ─────────────────── */

/**
 * Enviar/reenviar ao gestor: mesma dupla de `pode_gerir_avaliacoes()` (RH/admin).
 *
 * Aceita a LISTA de papéis (`user_roles` → `['admin','gestor']`) ou um papel
 * único: ter `admin` não anula os demais papéis da conta.
 */
export function podeEnviarParaGestor(papeis: PapeisAvaliacao): boolean {
  return capacidadesAvaliacao(papeis).podeGerirAvaliacoes;
}

/** Decidir (aprovar/devolver): SOMENTE o gestor — o RH não substitui (RPC §5). */
export function podeDecidirAprovacao(papeis: PapeisAvaliacao): boolean {
  return capacidadesAvaliacao(papeis).podeDecidirAprovacao;
}

/** Mínimo de caracteres da devolução (igual ao `length(v_just) < 10` do SQL). */
export const MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO = 10;

export interface ValidacaoJustificativa {
  pode: boolean;
  /** Código estável para teste/diagnóstico. */
  motivo: 'ok' | 'vazia' | 'curta';
  /** Texto para o usuário. */
  descricao: string;
}

/** Justificativa é OBRIGATÓRIA na devolução (regra do fluxo aprovado). */
export function validarJustificativaDevolucao(texto: unknown): ValidacaoJustificativa {
  const t = String(texto ?? '').trim();
  if (!t) return { pode: false, motivo: 'vazia', descricao: 'Informe a justificativa da devolução.' };
  if (t.length < MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO) {
    return {
      pode: false,
      motivo: 'curta',
      descricao: `A justificativa precisa de pelo menos ${MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO} caracteres.`,
    };
  }
  return { pode: true, motivo: 'ok', descricao: '' };
}

/* ─── Utilitários de leitura (nunca inventam campo) ─────────────────────── */

const texto = (valor: unknown): string => String(valor ?? '').trim();

/** ID real do Supabase é UUID; `mock-*`/`demo-*` e fixtures de teste não são. */
const ID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ehIdUuid = (valor: unknown): boolean => ID_UUID.test(texto(valor));

const instante = (valor: unknown): number => {
  const t = new Date(String(valor ?? '')).getTime();
  return Number.isFinite(t) ? t : 0;
};

export interface OpcoesPendencias {
  /** Feedbacks do ciclo (mocks e/ou reais — a MESMA derivação serve aos dois). */
  feedbacks: unknown[];
  colaboradores?: {
    id?: string | null;
    nome_completo?: string | null;
    cargo?: string | null;
    departamento?: string | null;
  }[];
  ciclos?: { id?: string | null; nome?: string | null }[];
  /** Versão canônica por feedback (`vw_feedbacks_360_versao`) — vazia na demonstração. */
  versoesPorFeedback?: Record<string, string>;
  /** Histórico append-only das decisões do gestor. */
  aprovacoes?: unknown[];
  /** Cabeçalho do fluxo (1 linha por colaborador+ciclo): traz `enviado_em`. */
  consolidacoes?: unknown[];
  /** Validações de Potencial do RH (a vigente casa com a versão da avaliação). */
  validacoes?: unknown[];
  /** Classificação do Nine-Box por colaborador (saída de `pontos360`). */
  classificacoes?: Record<string, ClassificacaoNineBox>;
  /**
   * Vínculos do colaborador (`id`, `user_id`, `supervisor_id`) — a ÚNICA prova
   * de quem é o gestor responsável. Vazio = o ambiente não expôs vínculo algum
   * (vitrine sem `supervisor_id`): a fila então NÃO julga a responsabilidade.
   */
  vinculos?: VinculoGestor[];
  /** Usuário autenticado — entra na prova de responsabilidade (como no rodapé). */
  usuarioId?: string | null;
  /**
   * ESCOPO ADMINISTRATIVO apenas para ENCAMINHAMENTO/CONCLUSÃO do registro.
   * NÃO autoriza aprovação: a decisão é exclusiva do gestor vinculado (ou
   * exceção confirmada pelo servidor).
   */
  podeGerirAvaliacoes?: boolean;
  /** Papéis efetivos da conta; usados apenas para autorizar a conclusão. */
  papeis?: PapeisAvaliacao;
  /**
   * VITRINE: encaminhamentos automáticos já registrados (`chave → { em }`).
   * É o que dá data ao "Enviado em" sem depender de clique do RH.
   */
  encaminhamentos?: Record<string, { em?: string | null } | undefined>;
  /**
   * `colaborador_id` → `pode_aprovar_colaborador` confirmado pelo banco.
   * A decisão de oferecer Aprovar/Devolver usa esta confirmação; o servidor
   * revalida a cada chamada (expiração/revogação têm efeito imediato).
   */
  autorizacoesAprovacao?: Record<string, boolean>;
  /**
   * `demonstracao` (PADRÃO): fora do modo real a view de versão não existe, então
   * a avaliação do gestor CONCLUÍDA é tratada como "avaliação pronta" (versão
   * sintetizada) e a data do próprio registro vale como data de envio. É a MESMA
   * regra sobre a lista já carregada — nenhuma fixture nova e nenhuma gravação.
   * `real`: só vale a versão canônica lida do banco.
   */
  modo?: 'real' | 'demonstracao';
}

/* ─── Pendência (uma linha da fila de aprovação) ─────────────────────────── */

/**
 * Relato individual preservado no conjunto consolidado. A fila continua sendo
 * UMA linha por colaborador × ciclo (a aprovação é do conjunto), mas os textos
 * exibidos no card mantêm o avaliador e a categoria de origem de cada registro.
 */
export interface RelatoFeedbackPendencia {
  id: string;
  tipo: TipoFeedback;
  tipoRotulo: string;
  avaliador: string;
  pontos_fortes: string | null;
  pontos_melhoria: string | null;
  comentarios: string | null;
}

export interface PendenciaAprovacao {
  /** Chave estável da linha (`ciclo:colaborador`). */
  id: string;
  /**
   * ORIGEM da linha — separa com clareza a pendência DEMONSTRATIVA (local, sem
   * gravação) da pendência REAL (persistida e atribuída ao gestor no Supabase).
   */
  origem: 'demonstracao' | 'real';
  colaboradorId: string;
  colaborador: string;
  cargo: string | null;
  departamento: string | null;
  cicloId: string | null;
  cicloNome: string;
  /** Gestor responsável (quem avalia e aprova) — nunca o avaliador Par/Auto. */
  gestorResponsavel: string;
  /** Colaborador do gestor responsável (o `supervisor_id` do avaliado). */
  gestorResponsavelId: string | null;
  /** Usuário (`user_id`) do gestor responsável — quem aprova de fato. */
  gestorResponsavelUserId: string | null;
  /**
   * O usuário autenticado É o gestor responsável (vínculo provado)?
   * `null` = não avaliável neste ambiente (nenhum vínculo carregado) — nesse caso
   * a fila mantém o comportamento por PAPEL, como na vitrine aprovada.
   */
  responsavel: boolean | null;
  /**
   * Autorização para CONCLUIR o feedback desta linha (avaliador designado,
   * gestor responsável, exceção ou RH/admin). Não interfere na aprovação.
   */
  autorizadoConcluir?: boolean;
  /**
   * Autorização confirmada pelo SERVIDOR (`pode_aprovar_colaborador`) para este
   * colaborador. Cobre exceção temporária de homologação e vínculo. Não é uma
   * lista de e-mails e não altera o gestor oficial.
   */
  autorizadoServidor?: boolean;
  /**
   * Quantas avaliações de CADA categoria existem para (colaborador × ciclo) —
   * é a consolidação que o RH encaminha. O GESTOR é obrigatório; as demais
   * (`par`, `auto`, `subordinado`) são fontes opcionais.
   */
  fontes: Record<TipoFeedback, number>;
  /** Impossível encaminhar (colaborador ou gestor responsável não identificado). */
  impedimentoEnvio: string | null;
  /**
   * A avaliação do GESTOR (obrigatória) existe e está concluída? `false` = a
   * pendência existe, mas a aprovação final está BLOQUEADA.
   */
  avaliacaoGestorValida: boolean;
  /** Motivo pronto do bloqueio da aprovação (o que falta para aprovar). */
  motivoBloqueioAprovacao: string | null;
  /** Havia decisão de uma versão anterior, invalidada pela mudança do conjunto. */
  aprovacaoInvalidada: boolean;
  /** Feedback CANÔNICO da avaliação do gestor — âncora de toda a decisão. */
  feedbackId: string;
  /** Registro completo (o dialog "Ver avaliação" o consome sem nova consulta). */
  feedback: Record<string, unknown>;
  /**
   * TODOS os relatos do conjunto (gestor, par, auto, subordinado), com autoria.
   * `feedback` continua sendo a referência canônica da decisão; esta lista é
   * somente de LEITURA e evita que o card resuma o conjunto no último registro.
   */
  relatos?: RelatoFeedbackPendencia[];
  /** Versão CONSOLIDADA do conjunto — âncora da DECISÃO do gestor. */
  versaoAvaliacao: string | null;
  /**
   * Versão da AVALIAÇÃO DO GESTOR — âncora da VALIDAÇÃO do Potencial pelo RH.
   *
   * É a MESMA âncora do banco (`versao_avaliacao_feedback(gestor)`) e do motor
   * do Nine-Box (`consolidarNineBox360`). Comparar a validação com a versão do
   * CONJUNTO nunca casaria e o fluxo ficaria eternamente em `aprovada_gestor`.
   */
  versaoValidacao?: string | null;
  /** Desempenho CONSOLIDADO (motor 360°) ou a nota do gestor como fallback. */
  desempenho: number | null;
  /** Potencial ATRIBUÍDO pelo gestor (o motor só classifica após o RH validar). */
  potencial: number | null;
  /** Data do envio ao gestor (ISO) — `null` enquanto o RH não enviou. */
  enviadoEm: string | null;
  /** Última justificativa registrada (devolução). */
  justificativa: string | null;
  decididoEm: string | null;
  status: StatusAprovacaoLido;
  /** REGRA ÚNICA: o mesmo estado que a fila, o contador e o modal consomem. */
  estado: EstadoAprovacao;
  /** Classificação do Nine-Box — preenchida quando o fluxo chega em `concluida_validada`. */
  quadrante: string | null;
  /** Por que ainda NÃO classifica (texto do motor 360°). */
  motivoNaoClassificado: string | null;
}

/** Classificação oficial por colaborador (saída de `pontos360`). */
export interface ClassificacaoNineBox {
  desempenho?: number | null;
  potencial?: number | null;
  quadrante?: string | null;
  nomeQuadrante?: string | null;
  motivoNaoClassificado?: string | null;
}

/* ─── REGRA ÚNICA DE ESTADO DA APROVAÇÃO (§5 do pedido) ──────────────────── */

/**
 * Estado da APROVAÇÃO FORMAL do gestor para UMA avaliação (colaborador+ciclo).
 *
 * É a ÚNICA fonte da verdade compartilhada por:
 *   1. a fila/subaba "Aguardando gestor" (quem aparece e por quê);
 *   2. o contador dinâmico da subaba;
 *   3. as ações e o badge do modal "Ver feedback" (`FeedbackAcoesRodape`);
 *   4. a etapa do RH (quando o Potencial pode ser validado);
 *   5. a elegibilidade ao Nine-Box (só com a validação vigente).
 *
 * NÃO é `tipo = 'gestor'` nem `status = 'pendente'`: uma avaliação
 * `status = 'concluido'` continua AGUARDANDO APROVAÇÃO enquanto não existir
 * decisão para a VERSÃO canônica vigente (é o contrato do fluxo).
 */
export interface EstadoAprovacao {
  /** Já existe solicitação de aprovação aguardando decisão do gestor? */
  pendente: boolean;
  /** Situação derivada (mesma régua do banco). */
  status: StatusAprovacaoLido;
  /**
   * Versão CONSOLIDADA vigente (colaborador × ciclo) no momento da leitura
   * (`null` = o conjunto ainda não tem avaliação válida). É a âncora da decisão:
   * guardar/validar usa ESTE valor.
   */
  versaoAvaliacao: string | null;
  /** Rótulo pronto para badge (fonte única). */
  rotulo: string;
  /** Pele do badge (tokens semânticos já existentes). */
  tom: string;
  /**
   * Já existe REGISTRO de aprovação para esta avaliação (pendente, aprovada ou
   * devolvida)? `false` = o fluxo de aprovação não foi iniciado.
   */
  iniciada: boolean;
  /** Última justificativa registrada na versão VIGENTE (devolução). */
  justificativa: string | null;
  /** Quando a decisão vigente foi registrada (ISO) — `null` se não houver. */
  decididoEm: string | null;
  /** Existe gestor responsável resolvido para o colaborador? */
  gestorIdentificado: boolean;
  /**
   * A avaliação do GESTOR (obrigatória) existe e está concluída? Sem ela a
   * pendência APARECE, mas a aprovação final NÃO pode ser executada.
   */
  avaliacaoGestorValida: boolean;
  /**
   * A decisão pode ser EXECUTADA agora? (pendência + requisitos + escopo)
   * Inclui a autorização EXCEPCIONAL confirmada pelo servidor.
   */
  aprovacaoPermitida: boolean;
  /**
   * Autorização confirmada por `pode_aprovar_colaborador` (exceção de
   * homologação, vínculo ou autoaprovação permitida). É a ÚNICA forma de a
   * interface reconhecer uma exceção — nunca uma lista fixa de e-mails.
   */
  autorizadoServidor?: boolean;
  /** Por que a aprovação final ainda não pode ocorrer (texto pronto). */
  motivoBloqueio: string | null;
  /** Havia decisão de uma versão anterior, invalidada pela mudança do conjunto. */
  aprovacaoInvalidada: boolean;
  /**
   * O RH pode validar o Potencial AGORA? Só com a aprovação do gestor vigente
   * (mesma versão) e sem validação aplicável — o servidor recusa fora disso.
   */
  podeValidarPotencial: boolean;
  /** Só com a validação vigente o Nine-Box classifica (motor exige a versão). */
  elegivelNineBox: boolean;
  /**
   * O usuário autenticado pode EXECUTAR a decisão agora? Exige pendência + ser o
   * gestor responsável (vínculo provado no front; reconferido no servidor por
   * `pode_aprovar_colaborador`) + a avaliação do gestor válida.
   */
  podeDecidir: boolean;
}

/** Texto único do bloqueio por falta da avaliação obrigatória do gestor. */
export const MOTIVO_FALTA_AVALIACAO_GESTOR =
  'Falta Desempenho e Potencial válidos na avaliação consolidada para este colaborador e ciclo.';

/** Texto único do bloqueio por ausência de gestor responsável (atribuição). */
export const MOTIVO_GESTOR_NAO_ATRIBUIDO =
  'Gestor responsável não atribuído — vincule um gestor (supervisor_id) ao colaborador antes de aprovar.';

/**
 * Deriva o estado da aprovação a partir das MESMAS entradas do banco:
 * versão consolidada do conjunto (colaborador × ciclo), decisão vigente e
 * validação do RH.
 *
 * `responsavel` é o vínculo provado no front (`ehGestorResponsavel`) e serve
 * apenas para decidir se o CONTROLE pode ser oferecido — a autorização real é
 * do servidor.
 */
export function estadoAprovacao({
  versaoGestor,
  decisao,
  validada,
  responsavel = null,
  gestorIdentificado = true,
  avaliacaoGestorValida = true,
  autorizadoServidor = false,
}: {
  versaoGestor: string | null;
  decisao: DecisaoAprovacaoLida | null;
  validada: boolean;
  /**
   * ESCOPO PROVADO: `true` = esta conta é o gestor vinculado; `false` = há
   * vínculo e não é esta conta (bloqueia); `null` = ambiente sem vínculo
   * carregado (vitrine) — o PAPEL decide (o servidor revalida no modo real).
   */
  responsavel?: boolean | null;
  /** `false` = nenhum gestor resolvido para o colaborador (pendência de atribuição). */
  gestorIdentificado?: boolean;
  /**
   * A proposta consolidada possui Desempenho E Potencial válidos (1–5)? Não é
   * exigido que exista um feedback separado `tipo='gestor'`: o RH prepara o
   * conjunto e o gestor confirma os dois valores.
   */
  avaliacaoGestorValida?: boolean;
  /**
   * AUTORIZAÇÃO DO SERVIDOR: `pode_aprovar_colaborador` confirmou a exceção
   * (vínculo, autoaprovação permitida ou homologação temporária). A interface
   * NÃO replica listas de e-mails: apenas confia nesta confirmação, sempre
   * escopada por empresa e revalidada a cada decisão.
   */
  autorizadoServidor?: boolean;
  /**
   * ESCOPO AMPLO (RH/admin — `pode_gerir_avaliacoes`).
   *
   * NÃO concede a decisão: o servidor (`decidir_aprovacao_gestor` →
   * `pode_aprovar_colaborador`) é a autoridade. Mantido no contrato por
   * compatibilidade dos chamadores.
   */
  autorizadoAmplo?: boolean;
}): EstadoAprovacao {
  const status = situacaoAprovacao({
    versaoGestor,
    decisao,
    validada,
    gestorIdentificado,
    avaliacaoGestorValida,
    autorizadoServidor,
  });
  const iniciada = status !== 'em_preparacao';
  const versaoDecidida = texto(decisao?.versao_avaliacao);
  const decisaoVigente = decisao && versaoDecidida === texto(versaoGestor) ? decisao : null;
  const decididoEm = texto(decisaoVigente?.decidido_em) || null;
  /**
   * PENDENTE inclui `sem_gestor`: a linha continua aguardando decisão (a
   * ausência de vínculo é um aviso, não um encerramento do fluxo).
   */
  const pendente = status === 'aguardando_gestor' || status === 'sem_gestor';
  /**
   * POR QUE A APROVAÇÃO AINDA NÃO PODE ACONTECER — a MESMA razão para qualquer
   * papel (inclusive RH/admin): o servidor exige gestor vinculado E avaliação do
   * gestor concluída. Sem esses requisitos o controle fica desabilitado.
   */
  const motivoBloqueio = !pendente
    ? null
    : !gestorIdentificado && !autorizadoServidor
      ? MOTIVO_GESTOR_NAO_ATRIBUIDO
      : !avaliacaoGestorValida
        ? MOTIVO_FALTA_AVALIACAO_GESTOR
        : null;

  /**
   * HABILITAÇÃO (escopo): a decisão é do GESTOR vinculado OU de uma conta
   * autorizada pelo SERVIDOR (exceção de homologação). O front não inventa
   * gestor responsável: apenas reflete a confirmação de
   * `pode_aprovar_colaborador`.
   */
  const escopoAutorizado = autorizadoServidor || (responsavel === null ? gestorIdentificado : responsavel === true);
  const aprovacaoPermitida = pendente && (gestorIdentificado || autorizadoServidor) && avaliacaoGestorValida;
  return {
    status,
    versaoAvaliacao: versaoGestor,
    rotulo: ROTULO_STATUS_APROVACAO[status],
    tom: TOM_STATUS_APROVACAO[status],
    pendente,
    iniciada,
    gestorIdentificado,
    avaliacaoGestorValida,
    aprovacaoPermitida,
    autorizadoServidor,
    motivoBloqueio,
    aprovacaoInvalidada: Boolean(decisao) && !decisaoVigente,
    justificativa: texto(decisaoVigente?.justificativa) || null,
    decididoEm,
    // A APROVAÇÃO DO GESTOR é a decisão final: não existe validação posterior.
    podeValidarPotencial: false,
    elegivelNineBox: status === 'aprovada_gestor' || status === 'concluida_validada',
    podeDecidir: aprovacaoPermitida && escopoAutorizado,
  };
}

/* ─── Versão CONSOLIDADA do conjunto (colaborador × ciclo) ───────────────── */

/**
 * Impressão digital DETERMINÍSTICA de um conjunto de avaliações — muda sempre
 * que QUALQUER avaliação do conjunto é criada, alterada, cancelada ou reaberta.
 * É a âncora da decisão: aprovação registrada em outra versão é INVALIDADA.
 *
 * IMPORTANTE (bug real corrigido): a versão NÃO pode depender de `updated_at`.
 * As fixtures da vitrine usam datas RELATIVAS ("há 3 dias"), então o mesmo
 * conjunto gerava hashes diferentes a cada carga da página — e a aprovação era
 * invalidada sozinha ao abrir outra aba/perfil. A versão passa a ser calculada
 * sobre os campos que definem o CONTEÚDO da avaliação (id, status, nota,
 * potencial e textos), que são estáveis entre cargas e mudam quando alguém
 * edita o registro de fato.
 *
 * FNV-1a de 32 bits: estável, curto e comparável por igualdade simples.
 */
export function versaoConsolidadaDemo(grupo: unknown[]): string | null {
  const partes = (grupo ?? [])
    .map((bruto) => {
      const f = (bruto ?? {}) as Record<string, unknown>;
      const conteudo = [f.nota_geral, f.potencial, f.comentarios, f.pontos_fortes, f.pontos_melhoria]
        .map((v) => texto(v))
        .join('~');
      return `${texto(f.id)}|${texto(f.status).toLowerCase()}|${conteudo}`;
    })
    .filter((p) => p !== '|~')
    .sort();
  if (partes.length === 0) return null;
  let hash = 0x811c9dc5;
  const entrada = partes.join(';');
  for (let i = 0; i < entrada.length; i += 1) {
    hash ^= entrada.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `demo:${hash.toString(16)}:${partes.length}`;
}

/**
 * Avaliação do GESTOR do conjunto — a OBRIGATÓRIA do fluxo (a mais recente,
 * excluindo canceladas). É dela que sai a versão de VALIDAÇÃO do RH.
 */
export function feedbackDoGestor(grupo: unknown[]): Record<string, unknown> | null {
  const gestores = (grupo ?? [])
    .map((bruto) => (bruto ?? {}) as Record<string, unknown>)
    .filter(
      (f) => tipoFeedback(f.tipo) === 'gestor' && texto(f.id) !== '' && texto(f.status).toLowerCase() !== 'cancelado'
    );
  if (gestores.length === 0) return null;
  return gestores.sort(
    (a, b) => (instante(b.updated_at) || instante(b.created_at)) - (instante(a.updated_at) || instante(a.created_at))
  )[0];
}

/** A avaliação do GESTOR existe e está CONCLUÍDA? (requisito da aprovação) */
export function avaliacaoDoGestorConcluida(grupo: unknown[]): boolean {
  const gestor = feedbackDoGestor(grupo);
  return !!gestor && texto(gestor.status).toLowerCase() === 'concluido';
}

/**
 * Versão canônica da AVALIAÇÃO DO GESTOR — âncora da validação do RH.
 * Espelha `public.versao_avaliacao_feedback(feedback_do_gestor)` no modo real.
 */
export function versaoValidacaoDemo(grupo: unknown[]): string | null {
  const gestor = feedbackDoGestor(grupo);
  return gestor ? versaoConsolidadaDemo([gestor]) : null;
}

/**
 * Deriva a fila de aprovação: UMA linha por (colaborador × ciclo) — a
 * CONSOLIDAÇÃO da avaliação 360°. A primeira avaliação de QUALQUER categoria
 * (gestor, par, auto, subordinado) já cria a pendência; registros adicionais
 * do mesmo colaborador/ciclo apenas ATUALIZAM a mesma linha (idempotente).
 *
 * A avaliação do GESTOR continua OBRIGATÓRIA, mas como requisito da APROVAÇÃO
 * FINAL: sem ela a pendência aparece (`requisitos.avaliacaoGestorValida:
 * false`) e o Aprovar fica bloqueado com o motivo explícito.
 *
 * Fontes (todas já carregadas pela página; nenhuma consulta nova):
 *   • feedbacks do ciclo    → fontes, versão consolidada, desempenho/potencial;
 *   • `versoesPorFeedback`  → versão canônica do banco (autoridade);
 *   • `consolidacoes`       → `versao_consolidada` + `enviado_em` (modo real);
 *   • `encaminhamentos`     → envio automático da vitrine (data do envio);
 *   • `aprovacoes`          → decisão vigente (mais recente por `decidido_em`);
 *   • `validacoes`          → validação do RH NA MESMA versão;
 *   • `classificacoes`      → desempenho consolidado + quadrante do Nine-Box.
 */
export function derivarPendencias({
  feedbacks,
  colaboradores = [],
  ciclos = [],
  versoesPorFeedback = {},
  aprovacoes = [],
  consolidacoes = [],
  validacoes = [],
  classificacoes = {},
  modo = 'demonstracao',
  vinculos = [],
  usuarioId = null,
  encaminhamentos = {},
  autorizacoesAprovacao = {},
  podeGerirAvaliacoes = false,
  papeis = null,
}: OpcoesPendencias): PendenciaAprovacao[] {
  const pessoa = new Map<string, { nome: string; cargo: string | null; departamento: string | null }>();
  colaboradores.forEach((c) => {
    const id = texto(c?.id);
    if (!id) return;
    pessoa.set(id, {
      nome: texto(c?.nome_completo) || 'Sem nome',
      cargo: texto(c?.cargo) || null,
      departamento: texto(c?.departamento) || null,
    });
  });

  /* ─── VÍNCULO DO GESTOR (a autoridade de quem aprova) ─────────────────────
     O gestor responsável NÃO sai do feedback: sai do vínculo do colaborador
     (`supervisor_id` → colaborador → `user_id`). É a MESMA prova que o rodapé
     do modal usa (`ehGestorResponsavel`, espelho de `pode_aprovar_colaborador`).
     `vinculoDisponivel = false` significa que o ambiente não trouxe vínculo
     algum (vitrine): aí a fila não julga responsabilidade — só o PAPEL, como
     sempre foi — e a tela informa a origem da linha. */
  const vinculoDisponivel = vinculos.length > 0;
  const vinculoPorColaborador = new Map<string, VinculoGestor>();
  vinculos.forEach((v) => {
    const id = texto(v?.id);
    if (id) vinculoPorColaborador.set(id, v);
  });
  const nomeDoColaborador = (id: string | null): string | null => (id ? (pessoa.get(id)?.nome ?? null) : null);

  const nomeDoCiclo = new Map<string, string>();
  ciclos.forEach((c) => {
    const id = texto(c?.id);
    if (id) nomeDoCiclo.set(id, texto(c?.nome) || 'Ciclo');
  });

  // 1) CONSOLIDAÇÃO por (ciclo, colaborador) — a chave da aprovação é
  //    empresa + ciclo + colaborador, e a empresa já é o escopo da página/fila
  //    (uma consulta por empresa; a RLS garante o isolamento no modo real).
  //    TODAS as categorias entram: a PRIMEIRA avaliação já cria a pendência.
  //    O GESTOR deixa de ser pré-requisito da LINHA — ele é requisito da
  //    APROVAÇÃO FINAL (`avaliacaoGestorValida`).
  const gruposPorChave = new Map<string, Record<string, unknown>[]>();
  const fontesPorChave = new Map<string, Record<TipoFeedback, number>>();
  const gestorPorChave = new Map<string, Record<string, unknown>>();
  feedbacks.forEach((bruto) => {
    const f = (bruto ?? {}) as Record<string, unknown>;
    const avaliado = texto(f.avaliado_id);
    if (!avaliado) return;
    // Avaliação CANCELADA não é fonte (o registro é preservado, mas não conta).
    if (texto(f.status).toLowerCase() === 'cancelado') return;
    const chave = `${texto(f.ciclo_id)}::${avaliado}`;
    const categoria = tipoFeedback(f.tipo);
    const contagem = fontesPorChave.get(chave) ?? { gestor: 0, par: 0, auto: 0, subordinado: 0 };
    contagem[categoria] += 1;
    fontesPorChave.set(chave, contagem);

    const grupo = gruposPorChave.get(chave) ?? [];
    grupo.push(f);
    gruposPorChave.set(chave, grupo);

    if (categoria !== 'gestor') return;
    const atual = gestorPorChave.get(chave);
    const quando = instante(f.updated_at) || instante(f.created_at);
    const quandoAtual = atual ? instante(atual.updated_at) || instante(atual.created_at) : -1;
    if (!atual || quando >= quandoAtual) gestorPorChave.set(chave, f);
  });

  // 2) Índices das tabelas do fluxo (decisão vigente / envio).
  const decisaoPorChave = new Map<string, DecisaoAprovacaoLida>();
  aprovacoes.forEach((bruto) => {
    const a = (bruto ?? {}) as Record<string, unknown>;
    if (!texto(a.colaborador_id)) return;
    const chave = `${texto(a.ciclo_id)}::${texto(a.colaborador_id)}`;
    const atual = decisaoPorChave.get(chave);
    if (!atual || instante(a.decidido_em) >= instante(atual.decidido_em)) decisaoPorChave.set(chave, a);
  });

  const enviadoPorChave = new Map<string, string>();
  const versaoConsolidadaReal = new Map<string, string>();
  consolidacoes.forEach((bruto) => {
    const c = (bruto ?? {}) as Record<string, unknown>;
    if (!texto(c.colaborador_id)) return;
    const enviado = texto(c.enviado_em);
    const chave = `${texto(c.ciclo_id)}::${texto(c.colaborador_id)}`;
    if (enviado && !enviadoPorChave.has(chave)) enviadoPorChave.set(chave, enviado);
    const versao = texto(c.versao_consolidada);
    if (versao) versaoConsolidadaReal.set(chave, versao);
  });

  const validacoesLidas = validacoes.map((bruto) => {
    const v = (bruto ?? {}) as Record<string, unknown>;
    return { chave: `${texto(v.ciclo_id)}::${texto(v.colaborador_id)}`, versao: texto(v.versao_avaliacao) };
  });

  const linhas: PendenciaAprovacao[] = [];
  gruposPorChave.forEach((grupo, chave) => {
    const [cicloId, colaboradorId] = chave.split('::');
    const gestor = gestorPorChave.get(chave) ?? null;
    /**
     * Registro de REFERÊNCIA da linha: a avaliação do GESTOR quando existe (é a
     * que o fluxo aprova); senão a mais recente do conjunto. É o que permite a
     * pendência nascer na PRIMEIRA avaliação — de qualquer categoria.
     */
    const referencia =
      gestor ??
      [...grupo].sort(
        (a, b) =>
          (instante(b.updated_at) || instante(b.created_at)) - (instante(a.updated_at) || instante(a.created_at))
      )[0];
    const feedbackId = texto(referencia?.id);
    /**
     * ORIGEM DO CONJUNTO (por grupo, não pela tela): basta UM registro com ID
     * real (UUID) para o conjunto ser REAL. Só conjuntos 100% `mock-*`/`demo-*`
     * usam versão sintética e persistência local. Isso permite a tela MISTA
     * (mocks + registros reais) sem que uma decisão local seja lida como real.
     */
    const grupoReal =
      grupo.some((f) => ehIdUuid(f.id)) || (!grupo.some((f) => idDemonstrativo(f.id)) && modo === 'real');
    const origemGrupo: PendenciaAprovacao['origem'] = grupoReal ? 'real' : 'demonstracao';
    const autorizadoServidor = grupoReal && autorizacoesAprovacao[colaboradorId] === true;
    /**
     * VERSÃO CONSOLIDADA do conjunto:
     *   • REAL  → coluna mantida pelo servidor (trigger da migration) + versão
     *             canônica da view; sem versão real o fluxo fica em preparação;
     *   • DEMO  → impressão digital determinística do conjunto.
     */
    const versao =
      versaoConsolidadaReal.get(chave) ||
      texto(versoesPorFeedback[feedbackId]) ||
      (grupoReal ? null : versaoConsolidadaDemo(grupo));

    const decisao = decisaoPorChave.get(chave) ?? null;
    /**
     * ÂNCORA DA VALIDAÇÃO DO RH — a versão da AVALIAÇÃO DO GESTOR, nunca a do
     * conjunto. É a mesma âncora do banco (`versao_avaliacao_feedback`) e do
     * motor do Nine-Box (`consolidarNineBox360`). Sem isso a validação gravada
     * pelo RH (versão canônica do gestor) nunca casaria com a versão do conjunto
     * e o status ficaria eternamente em `aprovada_gestor`.
     */
    const versaoValidacao = gestor
      ? texto(versoesPorFeedback[texto(gestor.id)]) || (grupoReal ? null : versaoConsolidadaDemo([gestor]))
      : null;
    const validada =
      !!versaoValidacao && validacoesLidas.some((v) => v.chave === chave && v.versao === versaoValidacao);
    // REGRA ÚNICA: a linha da fila carrega o estado já derivado — o modal, o
    // contador e a etapa do RH consomem EXATAMENTE esta instância.
    //
    // A PROVA DE RESPONSABILIDADE entra na MESMA instância: `responsavel` é o
    // vínculo (não o tipo da avaliação). Sem vínculo carregado no ambiente
    // (`null`) a decisão continua sendo por PAPEL, como na vitrine aprovada.
    const responsavel = vinculoDisponivel
      ? ehGestorResponsavel({ avaliadoId: colaboradorId, vinculos, usuarioId })
      : null;

    const quem = pessoa.get(colaboradorId);
    /**
     * GESTOR RESPONSÁVEL = o `supervisor_id` do avaliado (vínculo) — NUNCA o
     * avaliador de uma avaliação de Pares. Sem vínculo carregado (vitrine) a
     * tela usa a avaliação do GESTOR como evidência de quem é o gestor; se não
     * houver nem isso, assume `Não identificado` (pendência de atribuição).
     */
    const vinculoDoAvaliado = vinculoPorColaborador.get(colaboradorId);
    const gestorResponsavelId = texto(vinculoDoAvaliado?.supervisor_id) || null;
    const avaliadorDoGestor = pessoa.get(texto(gestor?.avaliador_id))?.nome ?? null;
    const gestorResponsavel =
      nomeDoColaborador(gestorResponsavelId) ??
      (vinculoDisponivel ? 'Não identificado' : (avaliadorDoGestor ?? 'Não identificado'));
    const gestorResponsavelUserId = texto(vinculoPorColaborador.get(gestorResponsavelId ?? '')?.user_id) || null;
    const gestorIdentificado = gestorResponsavel !== 'Não identificado';

    /**
     * REQUISITO DA APROVAÇÃO: a proposta consolidada precisa ter Desempenho E
     * Potencial válidos (1–5) e estar concluída. NÃO é exigido um feedback
     * separado `tipo='gestor'`: o RH prepara o conjunto e o gestor confirma os
     * dois valores. Prioriza o registro do gestor; sem ele, usa a avaliação
     * consolidada mais recente que tenha os dois valores.
     */
    const concluidaComValores = [...grupo].filter((f) => {
      const nota = Number(f?.nota_geral);
      const potencial = Number(f?.potencial);
      return (
        texto(f?.status).toLowerCase() === 'concluido' &&
        Number.isFinite(nota) &&
        nota >= 1 &&
        nota <= 5 &&
        Number.isFinite(potencial) &&
        potencial >= 1 &&
        potencial <= 5
      );
    });
    const referenciaValida =
      concluidaComValores.find((f) => texto(f?.tipo).toLowerCase() === 'gestor') ??
      concluidaComValores.sort(
        (a, b) =>
          (instante(b.updated_at) || instante(b.created_at)) - (instante(a.updated_at) || instante(a.created_at))
      )[0] ??
      null;
    const avaliacaoGestorValida = Boolean(referenciaValida);
    const autorizadoConcluir =
      podeGerirAvaliacoes === true ||
      autorizadoServidor ||
      (responsavel === true && (papeis === null || capacidadesAvaliacao(papeis).gestor)) ||
      ehAvaliadorDesignado({ avaliadorId: referencia?.avaliador_id, vinculos, usuarioId });

    const estado = estadoAprovacao({
      versaoGestor: versao,
      decisao,
      validada,
      responsavel,
      gestorIdentificado,
      avaliacaoGestorValida,
      autorizadoServidor,
      // ESCOPO ADMINISTRATIVO (RH/admin) NÃO aprova: serve apenas para
      // encaminhamento/conclusão do registro. A decisão é do gestor vinculado.
    });
    const status = estado.status;
    const classificacao = classificacoes[colaboradorId];
    const enviado = enviadoPorChave.get(chave) || texto(encaminhamentos[chave]?.em) || '';
    const notaBase = referenciaValida?.nota_geral ?? gestor?.nota_geral ?? referencia?.nota_geral;
    const potencialBase = referenciaValida?.potencial ?? gestor?.potencial ?? referencia?.potencial;
    /**
     * IMPEDIMENTO DE ENVIO — sem gestor identificado o RH não encaminha (e a
     * linha aparece como `sem_gestor`, sem fingir que foi enviada a alguém).
     */
    const impedimentoEnvio = gestorIdentificado
      ? null
      : 'Gestor responsável não identificado (colaborador sem supervisor_id)';

    /**
     * Relatos do conjunto para a PRÉVIA do card. A ordem é determinística
     * (categoria → data → id), nunca “último registro”; cada item mantém o
     * avaliador e o tipo do próprio feedback. Nenhum texto é concatenado.
     */
    const prioridadeTipo: Record<TipoFeedback, number> = {
      gestor: 0,
      auto: 1,
      par: 2,
      subordinado: 3,
    };
    const relatos: RelatoFeedbackPendencia[] = [...grupo]
      .sort((a, b) => {
        const tipoA = tipoFeedback(a.tipo);
        const tipoB = tipoFeedback(b.tipo);
        const porTipo = prioridadeTipo[tipoA] - prioridadeTipo[tipoB];
        if (porTipo !== 0) return porTipo;
        const dataA = instante(a.created_at) || 0;
        const dataB = instante(b.created_at) || 0;
        if (dataA !== dataB) return dataA - dataB;
        return texto(a.id).localeCompare(texto(b.id));
      })
      .map((f, indice) => {
        const tipo = tipoFeedback(f.tipo);
        const embed = (f.avaliador ?? {}) as { nome_completo?: string | null };
        const avaliador = pessoa.get(texto(f.avaliador_id))?.nome || texto(embed.nome_completo) || 'Não informado';
        return {
          id: texto(f.id) || `${chave}:${indice}`,
          tipo,
          tipoRotulo: ROTULO_TIPO_FEEDBACK[tipo],
          avaliador,
          pontos_fortes: texto(f.pontos_fortes) || null,
          pontos_melhoria: texto(f.pontos_melhoria) || null,
          comentarios: texto(f.comentarios) || null,
        };
      });

    linhas.push({
      id: chave,
      origem: origemGrupo,
      colaboradorId,
      colaborador: quem?.nome ?? 'Sem nome',
      cargo: quem?.cargo ?? null,
      departamento: quem?.departamento ?? null,
      cicloId: cicloId || null,
      cicloNome: nomeDoCiclo.get(cicloId) ?? 'Ciclo',
      gestorResponsavel,
      gestorResponsavelId,
      gestorResponsavelUserId,
      responsavel,
      autorizadoServidor,
      autorizadoConcluir,
      fontes: fontesPorChave.get(chave) ?? { gestor: 0, par: 0, auto: 0, subordinado: 0 },
      avaliacaoGestorValida,
      motivoBloqueioAprovacao: estado.motivoBloqueio,
      aprovacaoInvalidada: estado.aprovacaoInvalidada,
      impedimentoEnvio,
      feedbackId,
      feedback: referencia ?? {},
      relatos,
      versaoAvaliacao: versao,
      versaoValidacao,
      desempenho: classificacao?.desempenho ?? notaNaEscala(notaBase),
      potencial: classificacao?.potencial ?? notaNaEscala(potencialBase),
      enviadoEm:
        enviado ||
        (origemGrupo === 'demonstracao' ? texto(referencia?.updated_at) || texto(referencia?.created_at) : null),
      justificativa: estado.justificativa,
      decididoEm: estado.decididoEm,
      status,
      estado,
      quadrante: status === 'concluida_validada' ? (classificacao?.nomeQuadrante ?? null) : null,
      motivoNaoClassificado: classificacao?.motivoNaoClassificado ?? null,
    });
  });

  return ordenarPendencias(linhas);
}

/* ─── Ordenação e contadores da subaba ───────────────────────────────────── */

/** Ordem da fila: status por urgência e, dentro do status, envio mais recente. */
export function ordenarPendencias(lista: PendenciaAprovacao[]): PendenciaAprovacao[] {
  const peso = (s: StatusAprovacaoLido) => {
    const i = ORDEM_FILA_APROVACAO.indexOf(s);
    return i === -1 ? ORDEM_FILA_APROVACAO.length : i;
  };
  return [...lista].sort((a, b) => {
    const d = peso(a.status) - peso(b.status);
    if (d !== 0) return d;
    const e = instante(b.enviadoEm) - instante(a.enviadoEm);
    if (e !== 0) return e;
    return a.colaborador.localeCompare(b.colaborador, 'pt-BR');
  });
}

/** Contador dinâmico da subaba: quantas avaliações aguardam o GESTOR agora. */
export function contarAguardandoGestor(lista: PendenciaAprovacao[]): number {
  // `sem_gestor` também AGUARDA decisão (é pendência de atribuição, não um
  // estado encerrado) — o contador e a fila usam a MESMA definição de pendente.
  return lista.filter((p) => p.status === 'aguardando_gestor' || p.status === 'sem_gestor').length;
}

/** Quantas linhas ainda exigem ação de alguém (nem concluída, nem desconhecida). */
export function contarEmAndamento(lista: PendenciaAprovacao[]): number {
  return lista.filter((p) => p.status !== 'concluida_validada' && p.status !== 'desconhecido').length;
}

/** Histograma por status — base de leituras rápidas sem consulta nova. */
export function resumoPorStatus(lista: PendenciaAprovacao[]): Record<StatusAprovacaoLido, number> {
  const base = ORDEM_FILA_APROVACAO.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<StatusAprovacaoLido, number>);
  lista.forEach((p) => {
    base[p.status] = (base[p.status] ?? 0) + 1;
  });
  return base;
}
