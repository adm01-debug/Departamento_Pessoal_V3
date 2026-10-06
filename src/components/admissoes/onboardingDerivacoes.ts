/**
 * Derivações PURAS da JORNADA DE ONBOARDING (rota `/onboarding`) — a única
 * superfície de onboarding do produto (a aba "Onboarding" de Admissões foi
 * removida na consolidação). Mesma entrada → mesma saída, nada de JSX, nada de
 * classe CSS.
 *
 * POR QUE UM MÓDULO PRÓPRIO: `admissoesDerivacoes.ts` é a régua do processo
 * admissionAL (prazo da admissão, checklist de documentos, progresso por etapa).
 * A jornada de integração que esta aba mostra é outra coisa: lê `tarefas` de
 * `tarefas_onboarding`, avança por marcos de tempo (Pré-onboarding → 30 dias) e
 * mede risco por prazo de tarefa. Misturar as duas réguas num arquivo só
 * convidaria a UI a usar o checklist de admissão no lugar do de integração.
 *
 * O que é REAPROVEITADO de `admissoesDerivacoes` é só o que é genérico e já
 * testado: `dataValida`, `inicioDoDia`, `DIA_MS` e `iniciais`. Nada de uma
 * segunda cópia de parsing de data ou de avatar textual.
 */
import { DIA_MS, dataValida, inicioDoDia } from './admissoesDerivacoes';
import { formatDate } from '@/utils/format';

/** Linha de `tarefas_onboarding` como o card a consome (tolerante a campo nulo). */
export interface TarefaOnboarding {
  id?: string | number;
  titulo?: string | null;
  descricao?: string | null;
  /**
   * RESPONSÁVEL REAL: `tarefas_onboarding.responsavel_id` (UUID de `auth.users`).
   * `responsavel_nome` NÃO existe na tabela — é anotado EM MEMÓRIA pelo
   * `onboardingJornadaService` resolvendo o id em `profiles.user_id → nome`.
   */
  responsavel_id?: string | null;
  /** Só chega preenchido pela resolução em memória (ou pelo mock). */
  responsavel_nome?: string | null;
  /** Dias corridos somados ao `created_at` para achar o prazo da tarefa. */
  prazo_dias?: number | null;
  concluida?: boolean | null;
  concluida_em?: string | null;
  created_at?: string | null;
}

/** Registro de `admissoes` já com as tarefas aninhadas (a query do módulo). */
export interface ColaboradorOnboarding {
  id?: string | number;
  nome?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  etapa?: string | null;
  data_prevista?: string | null;
  created_at?: string | null;
  metadata?: { responsavel?: string | null } | null;
  tarefas?: TarefaOnboarding[] | null;
}

/** Espelho do default da coluna `prazo_dias` (`tarefas_onboarding`). */
const PRAZO_DIAS_PADRAO = 5;

export interface ProgressoOnboarding {
  total: number;
  concluidas: number;
  pendentes: number;
  /** 0-100 arredondado; 0 quando não há tarefas (nunca NaN). */
  valor: number;
}

/** Progresso do onboarding = tarefas concluídas ÷ total (0 quando vazio). */
export function progressoOnboarding(tarefas?: TarefaOnboarding[] | null): ProgressoOnboarding {
  const lista = tarefas ?? [];
  const total = lista.length;
  const concluidas = lista.filter((t) => t.concluida === true).length;
  return {
    total,
    concluidas,
    pendentes: total - concluidas,
    valor: total > 0 ? Math.round((concluidas / total) * 100) : 0,
  };
}

/**
 * Prazo de uma tarefa = `created_at` + `prazo_dias`. Devolve `null` quando a
 * base não traz `created_at` (não inventar data).
 */
export function prazoDaTarefa(tarefa: TarefaOnboarding): Date | null {
  const base = dataValida(tarefa.created_at);
  if (!base) return null;
  const dias =
    typeof tarefa.prazo_dias === 'number' && Number.isFinite(tarefa.prazo_dias) ? tarefa.prazo_dias : PRAZO_DIAS_PADRAO;
  const prazo = new Date(base.getTime());
  prazo.setDate(prazo.getDate() + dias);
  return prazo;
}

/**
 * ORDENAÇÃO CANÔNICA DAS TAREFAS — resolve o "a relação vem sem ordem" de uma
 * vez por todas. Critério (do mais forte ao desempate):
 *
 *   1. PRAZO (`created_at + prazo_dias`) mais próximo primeiro;
 *   2. tarefa sem prazo calculável vai para o FIM;
 *   3. `created_at` mais antigo antes;
 *   4. `id` como desempate final (ordem TOTAL — o resultado nunca depende do
 *      que o PostgREST devolveu).
 *
 * A MESMA ordem alimenta card, detalhe, filtros, contadores e risco: não existe
 * uma segunda regra em outro lugar. Não usa `Array.sort` mutável (copia).
 */
export function ordenarTarefas(tarefas?: TarefaOnboarding[] | null): TarefaOnboarding[] {
  const chavePrazo = (tarefa: TarefaOnboarding) => {
    const prazo = prazoDaTarefa(tarefa);
    return prazo ? prazo.getTime() : Number.POSITIVE_INFINITY;
  };
  const chaveCriacao = (tarefa: TarefaOnboarding) => {
    const criado = dataValida(tarefa.created_at);
    return criado ? criado.getTime() : Number.POSITIVE_INFINITY;
  };
  const chaveId = (tarefa: TarefaOnboarding) => String(tarefa.id ?? '');
  return [...(tarefas ?? [])].sort((a, b) => {
    const prazo = chavePrazo(a) - chavePrazo(b);
    if (prazo !== 0) return prazo;
    const criacao = chaveCriacao(a) - chaveCriacao(b);
    if (criacao !== 0) return criacao;
    return chaveId(a).localeCompare(chaveId(b));
  });
}

/**
 * Primeira tarefa ainda não concluída — a "próxima ação" concreta do card.
 * A lista é ORDENADA antes (ver `ordenarTarefas`), então "a primeira pendente" é
 * determinística: sempre a de prazo mais próximo.
 */
export function proximaTarefa(tarefas?: TarefaOnboarding[] | null): TarefaOnboarding | null {
  return ordenarTarefas(tarefas).find((t) => t.concluida !== true) ?? null;
}

/** Estado visual de cada marco da régua horizontal. */
export type EstadoMarco = 'concluido' | 'atual' | 'pendente';

/**
 * Distribui o progresso (0-100) pelos marcos: o índice "atual" anda de 0 a N-1
 * conforme o percentual sobe; o que ficou atrás é `concluido` e o que vem é
 * `pendente`. Com 100% TODOS viram `concluido` (não há marco "em andamento" num
 * onboarding terminado).
 */
export function estadosDosMarcos(valor: number, quantidade: number): EstadoMarco[] {
  if (quantidade <= 0) return [];
  if (valor >= 100) return Array.from({ length: quantidade }, () => 'concluido' as EstadoMarco);
  const atual = Math.min(quantidade - 1, Math.max(0, Math.round((valor / 100) * (quantidade - 1))));
  return Array.from({ length: quantidade }, (_, i) => (i < atual ? 'concluido' : i === atual ? 'atual' : 'pendente'));
}

/**
 * Índice do marco ATUAL na régua de integração (0 = Pré-onboarding … N-1 = 30
 * dias). Pura matemática: quem tem os rótulos é `onboardingComum.ts`
 * (`MARCOS_ONBOARDING`), quem monta o texto é a tela. Com 100% devolve o ÚLTIMO
 * marco (a régua não tem passo "depois de 30 dias").
 */
export function indiceMarco(valor: number, quantidade: number): number {
  if (quantidade <= 0) return 0;
  return Math.min(quantidade - 1, Math.max(0, Math.round((valor / 100) * (quantidade - 1))));
}

/** Quantidade de marcos da régua — espelha `MARCOS_ONBOARDING` (card/detalhe). */
const MARCOS = 4;

export interface ResumoOnboarding {
  concluidas: number;
  pendentes: number;
  /** Pendentes com prazo já vencido — o "em risco/atrasada" dos status pills. */
  atrasadas: number;
}

/** Contadores do rodapé do card (concluídas / pendentes / em risco). */
export function resumoOnboarding(tarefas: TarefaOnboarding[] | null | undefined, hoje: number): ResumoOnboarding {
  let concluidas = 0;
  let pendentes = 0;
  let atrasadas = 0;
  (tarefas ?? []).forEach((tarefa) => {
    if (tarefa.concluida === true) {
      concluidas += 1;
      return;
    }
    pendentes += 1;
    const prazo = prazoDaTarefa(tarefa);
    if (prazo && inicioDoDia(prazo) < hoje) atrasadas += 1;
  });
  return { concluidas, pendentes, atrasadas };
}

export type TomPrazo = 'atraso' | 'hoje' | 'proximo' | 'neutro';

export interface PrazoFormatado {
  texto: string;
  tom: TomPrazo;
}

/**
 * Rótulo humano do prazo: `Atrasado 3d` / `Hoje, 16:00` / `Amanhã, 09:00` /
 * `03/10/2026`, sempre comparando pelo INÍCIO do dia (a hora só enfeita o
 * "hoje/amanhã"). `null` quando não há prazo calculável.
 */
export function formatarPrazo(prazo: Date | null, hoje: number): PrazoFormatado | null {
  if (!prazo) return null;
  const dias = Math.round((inicioDoDia(prazo) - hoje) / DIA_MS);
  if (dias < 0) return { texto: `Atrasado ${Math.abs(dias)}d`, tom: 'atraso' };
  const hora = `${String(prazo.getHours()).padStart(2, '0')}:${String(prazo.getMinutes()).padStart(2, '0')}`;
  if (dias === 0) return { texto: `Hoje, ${hora}`, tom: 'hoje' };
  if (dias === 1) return { texto: `Amanhã, ${hora}`, tom: 'proximo' };
  return { texto: formatDate(prazo), tom: 'neutro' };
}

/**
 * SITUAÇÃO operacional de UM colaborador na jornada — a régua ÚNICA de status.
 * Toda a tela (chips, filtros, contadores, ordenação) consome esta função.
 *
 * Ordem de precedência:
 *   1. `concluido`          — 100% das tarefas concluídas;
 *   2. `sem_proxima_acao`   — nenhuma pendente (total 0);
 *   3. `atrasado`           — o prazo da PRÓXIMA ação já venceu (= há pendência
 *                             vencida; como a próxima ação é a de prazo mais
 *                             próximo — `ordenarTarefas` —, "ter vencida" e
 *                             "próxima vencida" são o MESMO conjunto);
 *   4. `em_risco`           — nada vencido, mas a próxima ação vence DENTRO da
 *                             janela de atenção (`JANELA_RISCO_DIAS`). Sem esta
 *                             janela, "em risco" seria sinônimo de "atrasado" e
 *                             o chip nunca acenderia;
 *   5. `em_dia`             — nada vencido e a próxima ação tem folga.
 *
 * Pura: mesma entrada → mesma saída. `hoje` já vem de `inicioDoDia`.
 */
export type SituacaoOnboarding = 'concluido' | 'em_dia' | 'em_risco' | 'atrasado' | 'sem_proxima_acao' | 'cancelado';

/** Antecedência (em dias) que caracteriza "em risco" antes do vencimento. */
export const JANELA_RISCO_DIAS = 3;

export function situacaoOnboarding(colaborador: ColaboradorOnboarding, hoje: number): SituacaoOnboarding {
  // REGRA EXPLÍCITA (PENDÊNCIA 5): admissão cancelada = jornada ENCERRADA sem
  // conclusão. Precede tudo: não é "atrasado" nem "em risco" (não há o que
  // cobrar de um processo cancelado) e não é "concluído" (não houve integração).
  // O registro CONTINUA existindo e visível — histórico preservado.
  if (colaborador.etapa === 'cancelada') return 'cancelado';

  const tarefas = colaborador.tarefas ?? [];
  const progresso = progressoOnboarding(tarefas);
  if (jornadaConcluida(progresso)) return 'concluido';
  const proxima = proximaTarefa(tarefas);
  if (!proxima) return 'sem_proxima_acao';
  const prazo = prazoDaTarefa(proxima);
  if (!prazo) return 'em_dia';
  const dias = Math.round((inicioDoDia(prazo) - hoje) / DIA_MS);
  if (dias < 0) return 'atrasado';
  return dias <= JANELA_RISCO_DIAS ? 'em_risco' : 'em_dia';
}

/**
 * A jornada foi CANCELADA (admissão em `etapa = 'cancelada'`)?
 *
 * Efeitos (todos explícitos, nenhum implícito):
 *   • NÃO conta como risco nem como atraso (`resumoGeralOnboarding`);
 *   • NÃO aceita operação (a tela não oferece "Concluir" para ela);
 *   • CONTINUA listada e continua no histórico — nada é apagado;
 *   • aparece só em "Todos" (não tem chip próprio, para não mexer no desenho).
 *
 * Desligamento de colaborador NÃO é inferível aqui: o domínio da Jornada é a
 * ADMISSÃO (`admissoes` não tem `colaborador_id`), então um desligamento
 * posterior não remove nem altera a jornada — o histórico permanece.
 */
export function jornadaCancelada(colaborador: ColaboradorOnboarding): boolean {
  return colaborador.etapa === 'cancelada';
}

/** Um colaborador já com a leitura operacional resolvida (evita recálculo na UI). */
export interface LinhaOnboarding {
  colaborador: ColaboradorOnboarding;
  progresso: ProgressoOnboarding;
  resumo: ResumoOnboarding;
  situacao: SituacaoOnboarding;
  /** Marco atual da régua (índice em `MARCOS_ONBOARDING`). */
  marco: number;
  concluido: boolean;
  /**
   * Responsável pela jornada: o da PRÓXIMA ação; quando não há próxima (jornada
   * fechada), o último nome registrado em qualquer tarefa; em último caso o
   * `metadata.responsavel`. `''` quando nada foi atribuído — nunca "Não
   * atribuído" (esse texto é do card, não do dado).
   */
  responsavel: string;
  /** Início do dia da última conclusão; `null` sem histórico de conclusão. */
  ultimaConclusaoEm: number | null;
  /** Fechou alguma tarefa depois do prazo — ver `concluidoForaDoPrazo`. */
  foraDoPrazo: boolean;
  /** Início do dia em que a jornada começou (`created_at`) — filtro de período. */
  inicioEm: number | null;
  /**
   * Maior atraso em DIAS entre as pendências vencidas (0 quando nada venceu).
   * Alimenta o chip "Atrasados" e a ordenação "Mais atrasados".
   */
  diasDeAtraso: number;
  /** Admissão cancelada — jornada encerrada sem conclusão (regra da PENDÊNCIA 5). */
  cancelada: boolean;
}

/**
 * Projeta a lista crua na leitura que a tela operacional precisa. Roda UMA vez
 * por lista (a tela memoiza) — os cards, os contadores do topo, os filtros e os
 * chips passam a ler da MESMA projeção, então nada na tela discorda do card.
 */
export function projetarOnboarding(lista: ColaboradorOnboarding[], hoje: number): LinhaOnboarding[] {
  return lista.map((colaborador) => {
    const tarefas = colaborador.tarefas;
    const progresso = progressoOnboarding(tarefas);
    const proxima = proximaTarefa(tarefas);
    const ultima = ultimaConclusao(tarefas);
    const criadoEm = dataValida(colaborador.created_at);
    const responsavel =
      proxima?.responsavel_nome ||
      [...(tarefas ?? [])].reverse().find((t) => t.responsavel_nome)?.responsavel_nome ||
      colaborador.metadata?.responsavel ||
      '';
    return {
      colaborador,
      progresso,
      resumo: resumoOnboarding(tarefas, hoje),
      situacao: situacaoOnboarding(colaborador, hoje),
      marco: indiceMarco(progresso.valor, MARCOS),
      concluido: jornadaConcluida(progresso),
      responsavel,
      ultimaConclusaoEm: ultima ? inicioDoDia(ultima) : null,
      foraDoPrazo: concluidoForaDoPrazo(colaborador, hoje),
      inicioEm: criadoEm ? inicioDoDia(criadoEm) : null,
      diasDeAtraso: maiorAtrasoEmDias(tarefas, hoje),
      cancelada: jornadaCancelada(colaborador),
    };
  });
}

/** Maior atraso (em dias) entre as pendências vencidas; 0 quando nada venceu. */
export function maiorAtrasoEmDias(tarefas: TarefaOnboarding[] | null | undefined, hoje: number): number {
  let maior = 0;
  (tarefas ?? []).forEach((tarefa) => {
    if (tarefa.concluida === true) return;
    const prazo = prazoDaTarefa(tarefa);
    if (!prazo) return;
    const dias = Math.round((hoje - inicioDoDia(prazo)) / DIA_MS);
    if (dias > maior) maior = dias;
  });
  return maior;
}

export interface ResumoGeralOnboarding {
  total: number;
  emAndamento: number;
  concluidos: number;
  emRisco: number;
}

/**
 * Contadores do topo da Jornada (migrados da tela antiga de Admissões, que era
 * a única a mostrá-los).
 *
 * REGRA PRESERVADA: "em risco" = "tem pendência VENCIDA" (`diasDeAtraso > 0`),
 * exatamente o `resumoOnboarding(...).atrasadas > 0` do cabeçalho antigo — a
 * janela de `JANELA_RISCO_DIAS` NÃO entra aqui, senão o contador divergiria do
 * número que o sistema sempre mostrou. "Em andamento" = total − concluídos.
 */
export function resumoGeralOnboarding(linhas: LinhaOnboarding[]): ResumoGeralOnboarding {
  let concluidos = 0;
  let emRisco = 0;
  linhas.forEach((linha) => {
    // CANCELADA: fora dos dois contadores de atenção (não se cobra integração de
    // processo cancelado). Continua contando no `total`/`em andamento`, como
    // sempre contou.
    if (linha.cancelada) return;
    if (linha.concluido) {
      concluidos += 1;
      return;
    }
    if (linha.diasDeAtraso > 0) emRisco += 1;
  });
  return { total: linhas.length, emAndamento: linhas.length - concluidos, concluidos, emRisco };
}

/** Data da última conclusão registrada (para o estado 100% concluído). */
export function ultimaConclusao(tarefas?: TarefaOnboarding[] | null): Date | null {
  const datas = (tarefas ?? [])
    .map((t) => t.concluida_em)
    .filter((v): v is string => !!v)
    .map((v) => new Date(v))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (datas.length === 0) return null;
  return new Date(Math.max(...datas.map((d) => d.getTime())));
}

/**
 * A jornada FECHOU fora do prazo? Única leitura de "No prazo / Fora do prazo"
 * dos chips da aba Concluídos.
 *
 * Para cada tarefa o limite é `created_at + prazo_dias` e a referência é:
 *   • concluída com `concluida_em` → a data em que FOI concluída;
 *   • concluída sem `concluida_em`  → não dá para julgar (ignora — não inventar);
 *   • ainda pendente                → HOJE (ainda vai atrasar se não fechar hoje).
 *
 * Comparação pelo início do dia, como o resto da régua. Basta UMA tarefa fora do
 * prazo para a jornada ser "fora do prazo".
 */
export function concluidoForaDoPrazo(colaborador: ColaboradorOnboarding, hoje: number): boolean {
  return (colaborador.tarefas ?? []).some((tarefa) => {
    const prazo = prazoDaTarefa(tarefa);
    if (!prazo) return false;
    const referencia = tarefa.concluida === true ? dataValida(tarefa.concluida_em) : new Date(hoje);
    if (!referencia) return false;
    return inicioDoDia(referencia) > inicioDoDia(prazo);
  });
}


/**
 * CONCLUSÃO FORMAL DA JORNADA — regra ÚNICA do sistema: existe pelo menos uma
 * tarefa e 100% dela está concluída. Derivada (não há coluna de status), como
 * sempre foi. Toda leitura de "concluído" (aba, contadores, chips, ordenação)
 * passa por aqui — nenhuma segunda expressão espalhada.
 */
export function jornadaConcluida(progresso: ProgressoOnboarding): boolean {
  return progresso.total > 0 && progresso.valor >= 100;
}

/** Ordenações oferecidas pela Jornada. */
export type OrdemOnboarding =
  | 'criticos'
  | 'atrasados'
  | 'inicio_recente'
  | 'inicio_antigo'
  | 'maior_progresso'
  | 'menor_progresso'
  | 'nome';

export const ORDENS_ONBOARDING: { value: OrdemOnboarding; label: string }[] = [
  { value: 'criticos', label: 'Mais críticos' },
  { value: 'atrasados', label: 'Mais atrasados' },
  { value: 'inicio_recente', label: 'Início mais recente' },
  { value: 'inicio_antigo', label: 'Início mais antigo' },
  { value: 'maior_progresso', label: 'Maior progresso' },
  { value: 'menor_progresso', label: 'Menor progresso' },
  { value: 'nome', label: 'Nome (A–Z)' },
];

export const ORDEM_ONBOARDING_PADRAO: OrdemOnboarding = 'criticos';

/**
 * Peso de criticidade da situação — a régua do "Mais críticos":
 * atrasado → em risco → sem próxima ação → em dia → concluído → cancelado.
 */
const PESO_CRITICIDADE: Record<SituacaoOnboarding, number> = {
  atrasado: 0,
  em_risco: 1,
  sem_proxima_acao: 2,
  em_dia: 3,
  concluido: 4,
  cancelado: 5,
};

/**
 * ORDENAÇÃO DA LISTA — determinística e estável em TODOS os modos (desempates
 * fixos por `id`, então duas execuções nunca divergem).
 *
 * "Mais críticos" usa a classe de situação e, DENTRO da mesma classe, o atraso
 * em dias (maior primeiro) e depois o prazo/início mais antigo.
 */
export function ordenarLinhas(linhas: LinhaOnboarding[], ordem: OrdemOnboarding): LinhaOnboarding[] {
  const id = (linha: LinhaOnboarding) => String(linha.colaborador.id ?? '');
  const nome = (linha: LinhaOnboarding) => (linha.colaborador.nome ?? '').toLowerCase();
  const inicio = (linha: LinhaOnboarding) => linha.inicioEm ?? Number.POSITIVE_INFINITY;
  const desempate = (a: LinhaOnboarding, b: LinhaOnboarding) => id(a).localeCompare(id(b));
  const copia = [...linhas];

  switch (ordem) {
    case 'atrasados':
      return copia.sort(
        (a, b) => b.diasDeAtraso - a.diasDeAtraso || PESO_CRITICIDADE[a.situacao] - PESO_CRITICIDADE[b.situacao] || desempate(a, b),
      );
    case 'inicio_recente':
      return copia.sort((a, b) => (b.inicioEm ?? -1) - (a.inicioEm ?? -1) || desempate(a, b));
    case 'inicio_antigo':
      return copia.sort((a, b) => inicio(a) - inicio(b) || desempate(a, b));
    case 'maior_progresso':
      return copia.sort((a, b) => b.progresso.valor - a.progresso.valor || desempate(a, b));
    case 'menor_progresso':
      return copia.sort((a, b) => a.progresso.valor - b.progresso.valor || desempate(a, b));
    case 'nome':
      return copia.sort((a, b) => nome(a).localeCompare(nome(b)) || desempate(a, b));
    default:
      return copia.sort(
        (a, b) =>
          PESO_CRITICIDADE[a.situacao] - PESO_CRITICIDADE[b.situacao] ||
          b.diasDeAtraso - a.diasDeAtraso ||
          inicio(a) - inicio(b) ||
          desempate(a, b),
      );
  }
}
