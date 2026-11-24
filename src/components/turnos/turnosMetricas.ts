/**
 * ============================================================================
 * TURNOS & ESCALAS — CÁLCULOS DO PAINEL (puro, sem React, sem I/O).
 * ============================================================================
 *
 * Tudo o que a tela AGREGA a partir das duas tabelas reais vive aqui, para
 * poder ser testado sem DOM e para os componentes ficarem só com apresentação:
 *
 *   • janela do turno em minutos (com virada de dia — 22:00 → 06:00);
 *   • duração líquida (já descontando o intervalo) e formatação;
 *   • CONFLITOS: duas escalas do MESMO colaborador no MESMO dia cujos horários
 *     se sobrepõem. É a única regra aplicada, e ela é de consistência de dados
 *     (o registro duplicado/sobreposto é um erro operacional), NÃO uma
 *     validação trabalhista — o sistema não tem, e este módulo não inventa,
 *     regras de descanso/limite legal;
 *   • série diária, distribuição por turno, próximas datas com escala;
 *   • filtros combinados (busca por nome, departamento, turno, status) e as
 *     linhas do calendário (colaborador × dia → escalas);
 *   • os quatro KPI Cards, incluindo a variação contra o período anterior.
 *
 * Nada aqui cria dado: todo número sai das escalas/turnos/equipe recebidos.
 * ============================================================================
 */
import { chaveData } from './turnosCalendario';

/** Linha de `turnos` (as colunas que a tela usa). */
export interface TurnoRegistro {
  id: string;
  nome: string;
  cor: string | null;
  horario_inicio: string;
  horario_fim: string;
  intervalo_minutos: number | null;
  ativo: boolean | null;
  created_at?: string | null;
}

/** Linha de `escalas_trabalho` com os relacionamentos embutidos. */
export interface EscalaRegistro {
  id: string;
  /** `yyyy-MM-dd` (coluna `date`). */
  data: string;
  status: string | null;
  colaborador_id: string;
  turno_id: string;
  colaborador?: { nome_completo?: string | null; departamento?: string | null } | null;
  turno?: {
    nome?: string | null;
    horario_inicio?: string | null;
    horario_fim?: string | null;
    cor?: string | null;
  } | null;
}

/** Colaborador ativo da empresa (a "equipe considerada" dos KPIs). */
export interface MembroEquipe {
  id: string;
  nome_completo: string;
  departamento?: string | null;
}

/** Filtros da barra acima do calendário. `'todos'` = sem filtro. */
export interface FiltrosEscalas {
  busca: string;
  departamento: string;
  turnoId: string;
  status: string;
  /** Só colaboradores com pelo menos uma escala no período. */
  somenteComEscala: boolean;
}

export const FILTROS_ESCALAS_INICIAIS: FiltrosEscalas = {
  busca: '',
  departamento: 'todos',
  turnoId: 'todos',
  status: 'todos',
  somenteComEscala: false,
};

/** "HH:MM" (ou "HH:MM:SS") → minutos desde a meia-noite. `null` se inválido. */
export function minutosDoHorario(horario?: string | null): number | null {
  if (!horario) return null;
  const [hora, minuto] = horario.slice(0, 5).split(':');
  const horas = Number(hora);
  const minutos = Number(minuto);
  if (!Number.isFinite(horas) || !Number.isFinite(minutos)) return null;
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;
  return horas * 60 + minutos;
}

/** Janela de trabalho em minutos — `fim` pode passar de 1440 (turno noturno). */
export interface JanelaTurno {
  inicio: number;
  fim: number;
}

/**
 * Janela de um turno. Quando a saída é menor ou igual à entrada, o turno vira
 * o dia (22:00 → 06:00 = 1320 → 1800), que é como `Noturno`/`12x36` são
 * cadastrados no sistema.
 */
export function janelaDoTurno(
  turno?: { horario_inicio?: string | null; horario_fim?: string | null } | null
): JanelaTurno | null {
  if (!turno) return null;
  const inicio = minutosDoHorario(turno.horario_inicio);
  const fim = minutosDoHorario(turno.horario_fim);
  if (inicio === null || fim === null) return null;
  return { inicio, fim: fim <= inicio ? fim + 24 * 60 : fim };
}

/** Duração líquida em minutos (janela menos o intervalo cadastrado). */
export function duracaoLiquidaMinutos(
  turno?: { horario_inicio?: string | null; horario_fim?: string | null; intervalo_minutos?: number | null } | null
): number | null {
  const janela = janelaDoTurno(turno);
  if (!janela) return null;
  const intervalo = Math.max(0, turno?.intervalo_minutos ?? 0);
  return Math.max(0, janela.fim - janela.inicio - intervalo);
}

/** `480` → `8h`; `510` → `8h30`; `45` → `45min`; inválido → `—`. */
export function formatarDuracaoMinutos(minutos: number | null): string {
  if (minutos === null || !Number.isFinite(minutos)) return '—';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto}min`;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`;
}

/** `60` → `60min`; `0`/nulo → `Sem intervalo`. */
export function formatarIntervaloMinutos(minutos: number | null | undefined): string {
  if (!minutos || minutos <= 0) return 'Sem intervalo';
  return `${minutos}min`;
}

/** Horário curto `08:00` (o banco pode devolver `08:00:00`). */
export function formatarHorario(horario?: string | null): string {
  if (!horario) return '--:--';
  return horario.slice(0, 5);
}

/** `08:00 – 17:00` — a faixa que aparece na célula e nos cards laterais. */
export function faixaHoraria(turno?: { horario_inicio?: string | null; horario_fim?: string | null } | null): string {
  return `${formatarHorario(turno?.horario_inicio)} – ${formatarHorario(turno?.horario_fim)}`;
}

/**
 * Versão COMPACTA da faixa (`08:00–17:00`, sem espaços em volta do traço).
 * É a que cabe na célula do calendário semanal: a célula é estreita e o traço
 * com espaços custa ~10px de largura útil em cada dia.
 */
export function faixaHorariaCompacta(
  turno?: { horario_inicio?: string | null; horario_fim?: string | null } | null
): string {
  return `${formatarHorario(turno?.horario_inicio)}–${formatarHorario(turno?.horario_fim)}`;
}

/**
 * Duas janelas se sobrepõem quando cada uma começa antes do fim da outra.
 * Um turno que termina 08:00 e outro que começa 08:00 NÃO conflitam (é o
 * revezamento normal da operação).
 */
export function janelasSeSobrepoem(a: JanelaTurno | null, b: JanelaTurno | null): boolean {
  if (!a || !b) return false;
  return a.inicio < b.fim && b.inicio < a.fim;
}

/** Status que representa folga explicitamente cadastrada (não "sem escala"). */
export function escalaEhFolga(escala: { status?: string | null }): boolean {
  return (escala.status ?? '').toLowerCase().includes('folga');
}

/** Nome do colaborador embutido na escala (fallback para o id). */
export function nomeDoColaborador(escala: EscalaRegistro, equipe?: readonly MembroEquipe[]): string {
  const nome = escala.colaborador?.nome_completo;
  if (nome) return nome;
  const membro = equipe?.find((m) => m.id === escala.colaborador_id);
  return membro?.nome_completo ?? 'Colaborador';
}

/* ────────────────────────────────────────────────────────────────────────────
 * CONFLITOS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Um dia de um colaborador com duas ou mais escalas que se sobrepõem. */
export interface ConflitoEscala {
  /** Chave estável (`colaborador|data`) — usada como `key` e para deduplicar. */
  chave: string;
  colaboradorId: string;
  colaboradorNome: string;
  /** `yyyy-MM-dd` do dia em conflito. */
  data: string;
  /** Só as escalas envolvidas na sobreposição (não o dia inteiro). */
  escalas: EscalaRegistro[];
}

/** Janela da escala: usa o turno embutido; sem ele, cai no catálogo de turnos. */
function janelaDaEscala(escala: EscalaRegistro, turnosPorId: Map<string, TurnoRegistro>): JanelaTurno | null {
  if (escala.turno) {
    const embutida = janelaDoTurno(escala.turno);
    if (embutida) return embutida;
  }
  return janelaDoTurno(turnosPorId.get(escala.turno_id));
}

/**
 * Conflitos de escala = sobreposição de horários do MESMO colaborador no MESMO
 * dia.
 *
 * Duas escalas iguais no mesmo dia (mesmo turno, dois registros) também caem
 * aqui, porque dois turnos idênticos se sobrepõem por definição. Turnos que não
 * se tocam (manhã 06–14 e noite 22–06 do dia seguinte) NÃO são conflito: a
 * regra é sobreposição, não quantidade.
 *
 * O resultado sai ordenado por data e depois por nome, para a lista do diálogo
 * "Resolver" ficar estável entre renders.
 */
export function detectarConflitos(
  escalas: readonly EscalaRegistro[],
  turnos: readonly TurnoRegistro[],
  equipe?: readonly MembroEquipe[]
): ConflitoEscala[] {
  const turnosPorId = new Map(turnos.map((t) => [t.id, t]));
  const porColaboradorDia = new Map<string, EscalaRegistro[]>();

  for (const escala of escalas) {
    const chave = `${escala.colaborador_id}|${escala.data.slice(0, 10)}`;
    const lista = porColaboradorDia.get(chave);
    if (lista) lista.push(escala);
    else porColaboradorDia.set(chave, [escala]);
  }

  const conflitos: ConflitoEscala[] = [];
  for (const [chave, lista] of porColaboradorDia) {
    if (lista.length < 2) continue;

    const envolvidas = new Set<string>();
    for (let i = 0; i < lista.length; i += 1) {
      for (let j = i + 1; j < lista.length; j += 1) {
        const a = janelaDaEscala(lista[i], turnosPorId);
        const b = janelaDaEscala(lista[j], turnosPorId);
        if (janelasSeSobrepoem(a, b)) {
          envolvidas.add(lista[i].id);
          envolvidas.add(lista[j].id);
        }
      }
    }
    if (envolvidas.size === 0) continue;

    const emConflito = lista.filter((e) => envolvidas.has(e.id));
    const primeira = emConflito[0];
    conflitos.push({
      chave,
      colaboradorId: primeira.colaborador_id,
      colaboradorNome: nomeDoColaborador(primeira, equipe),
      data: primeira.data.slice(0, 10),
      escalas: emConflito,
    });
  }

  return conflitos.sort((a, b) =>
    a.data === b.data ? a.colaboradorNome.localeCompare(b.colaboradorNome, 'pt-BR') : a.data.localeCompare(b.data)
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * AGREGAÇÕES DO PAINEL
 * ──────────────────────────────────────────────────────────────────────────── */

/** Contagem de escalas por dia do período (fonte do mini gráfico de barras). */
export interface PontoSerieDiaria {
  chave: string;
  total: number;
}

export function contarEscalasPorDia(escalas: readonly EscalaRegistro[], dias: readonly string[]): PontoSerieDiaria[] {
  const contagem = new Map<string, number>(dias.map((dia) => [dia, 0]));
  for (const escala of escalas) {
    const chave = escala.data.slice(0, 10);
    if (!contagem.has(chave)) continue;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return dias.map((dia) => ({ chave: dia, total: contagem.get(dia) ?? 0 }));
}

/** Fatia da rosca "Resumo da semana" — usa a cor REAL do turno. */
export interface FatiaTurno {
  turnoId: string;
  nome: string;
  cor: string | null;
  total: number;
}

/**
 * Distribuição das escalas do período por turno. Turnos sem escala ficam de
 * fora (uma fatia de zero não desenha nada e só polui a legenda); a ordem é
 * decrescente por volume, com o nome como desempate.
 */
export function distribuicaoPorTurno(
  escalas: readonly EscalaRegistro[],
  turnos: readonly TurnoRegistro[]
): FatiaTurno[] {
  const porTurno = new Map<string, number>();
  for (const escala of escalas) {
    porTurno.set(escala.turno_id, (porTurno.get(escala.turno_id) ?? 0) + 1);
  }

  const turnosPorId = new Map(turnos.map((t) => [t.id, t]));
  const fatias: FatiaTurno[] = [];
  for (const [turnoId, total] of porTurno) {
    const turno = turnosPorId.get(turnoId);
    // Escala de um turno que não está no catálogo carregado (foi excluído):
    // entra com o nome embutido na própria escala, para o total do gráfico
    // nunca divergir do total de escalas do período.
    const referencia = escalas.find((e) => e.turno_id === turnoId)?.turno;
    fatias.push({
      turnoId,
      nome: turno?.nome ?? referencia?.nome ?? 'Turno removido',
      cor: turno?.cor ?? referencia?.cor ?? null,
      total,
    });
  }

  return fatias.sort((a, b) => (b.total === a.total ? a.nome.localeCompare(b.nome, 'pt-BR') : b.total - a.total));
}

/** Data futura (ou hoje) com escalas — item do card "Próximas escalas". */
export interface DiaComEscalas {
  chave: string;
  total: number;
}

export function proximasDatasComEscalas(
  escalas: readonly EscalaRegistro[],
  hoje: string = chaveData(new Date()),
  limite = 5
): DiaComEscalas[] {
  const contagem = new Map<string, number>();
  for (const escala of escalas) {
    const chave = escala.data.slice(0, 10);
    if (chave < hoje) continue;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([chave, total]) => ({ chave, total }))
    .sort((a, b) => a.chave.localeCompare(b.chave))
    .slice(0, limite);
}

/**
 * Escalas agrupadas por dia — a lista completa do modal "Próximas escalas".
 *
 * `proximasDatasComEscalas` devolve só `{ chave, total }` (o resumo do card).
 * O modal precisa dos REGISTROS de cada dia (colaborador, departamento, turno e
 * horário), então este agrupador parte das mesmas escalas já carregadas —
 * nenhum registro é criado e nenhum dia aparece duas vezes.
 *
 *   • `aPartirDe` descarta o passado (o card só fala de hoje em diante);
 *   • os dias saem em ordem CRESCENTE e, dentro do dia, por nome do colaborador;
 *   • `total` é sempre `escalas.length` do grupo (nunca um contador paralelo).
 */
export interface GrupoDiaEscalas {
  /** `yyyy-MM-dd` do grupo. */
  chave: string;
  total: number;
  escalas: EscalaRegistro[];
}

export function agruparEscalasPorDia(escalas: readonly EscalaRegistro[], aPartirDe?: string): GrupoDiaEscalas[] {
  const grupos = new Map<string, EscalaRegistro[]>();

  for (const escala of escalas) {
    const chave = escala.data.slice(0, 10);
    if (aPartirDe && chave < aPartirDe.slice(0, 10)) continue;
    const lista = grupos.get(chave);
    if (lista) lista.push(escala);
    else grupos.set(chave, [escala]);
  }

  return [...grupos.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([chave, lista]) => ({
      chave,
      total: lista.length,
      escalas: [...lista].sort((a, b) =>
        (a.colaborador?.nome_completo ?? '').localeCompare(b.colaborador?.nome_completo ?? '', 'pt-BR')
      ),
    }));
}

/** Variação percentual; `null` quando não há base de comparação (> 0). */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (!Number.isFinite(anterior) || anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

/** Quantos turnos já existiam ao fim de uma data (`created_at` <= fim). */
export function turnosCriadosAte(turnos: readonly TurnoRegistro[], fim: string): number {
  return turnos.filter((turno) => {
    if (!turno.created_at) return false;
    return turno.created_at.slice(0, 10) <= fim;
  }).length;
}

/* ────────────────────────────────────────────────────────────────────────────
 * FILTROS E LINHAS DO CALENDÁRIO
 * ──────────────────────────────────────────────────────────────────────────── */

/** Comparação de nome sem acento/caixa — "jose" acha "José". */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtros combinados das escalas. `departamento` compara com o departamento do
 * colaborador embutido na escala (o mesmo texto que aparece na linha do
 * calendário); sem departamento embutido, o filtro não descarta a escala.
 */
export function filtrarEscalas(escalas: readonly EscalaRegistro[], filtros: FiltrosEscalas): EscalaRegistro[] {
  const busca = normalizarTexto(filtros.busca);
  return escalas.filter((escala) => {
    if (filtros.turnoId !== 'todos' && escala.turno_id !== filtros.turnoId) return false;
    if (filtros.status !== 'todos' && (escala.status ?? '') !== filtros.status) return false;
    if (filtros.departamento !== 'todos') {
      const departamento = escala.colaborador?.departamento ?? null;
      if (departamento && departamento !== filtros.departamento) return false;
    }
    if (busca) {
      const nome = normalizarTexto(escala.colaborador?.nome_completo ?? '');
      if (!nome.includes(busca)) return false;
    }
    return true;
  });
}

/** Departamentos existentes na equipe (fonte do select da barra de filtros). */
export function departamentosDaEquipe(equipe: readonly MembroEquipe[]): string[] {
  return Array.from(new Set(equipe.map((m) => m.departamento).filter((d): d is string => !!d))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
}

/** Status presentes nas escalas carregadas (fonte do select de status). */
export function statusDasEscalas(escalas: readonly EscalaRegistro[]): string[] {
  return Array.from(new Set(escalas.map((e) => e.status).filter((s): s is string => !!s))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
}

/**
 * Quantos filtros além da busca estão ativos — vira o contador do badge do
 * botão "Mais filtros". Mora aqui (e não na barra) porque é regra de estado,
 * não de apresentação: assim pode ser testada sozinha.
 */
export function contarFiltrosAvancados(filtros: FiltrosEscalas): number {
  let total = 0;
  if (filtros.departamento !== 'todos') total += 1;
  if (filtros.turnoId !== 'todos') total += 1;
  if (filtros.status !== 'todos') total += 1;
  if (filtros.somenteComEscala) total += 1;
  return total;
}

/** Uma linha do calendário: o colaborador e o que ele tem em cada dia. */
export interface LinhaCalendario {
  colaborador: MembroEquipe;
  /** `chave da data` → escalas daquele dia (vazio = sem escala cadastrada). */
  escalasPorDia: Map<string, EscalaRegistro[]>;
  /** Total de escalas do colaborador no período. */
  totalNoPeriodo: number;
}

/**
 * Linhas do calendário: a equipe filtrada (busca/departamento), com as escalas
 * do período já agrupadas por dia. A ordem é "quem tem escala primeiro" e
 * depois alfabética — é o que faz a grade abrir mostrando movimento, e não
 * uma lista de folgas.
 */
export function montarLinhasCalendario({
  equipe,
  escalas,
  filtros,
}: {
  equipe: readonly MembroEquipe[];
  escalas: readonly EscalaRegistro[];
  filtros: FiltrosEscalas;
}): LinhaCalendario[] {
  const busca = normalizarTexto(filtros.busca);

  const equipeFiltrada = equipe.filter((membro) => {
    if (filtros.departamento !== 'todos' && membro.departamento !== filtros.departamento) return false;
    if (busca && !normalizarTexto(membro.nome_completo).includes(busca)) return false;
    return true;
  });

  const linhas = equipeFiltrada.map((colaborador) => {
    const escalasPorDia = new Map<string, EscalaRegistro[]>();
    let totalNoPeriodo = 0;
    for (const escala of escalas) {
      if (escala.colaborador_id !== colaborador.id) continue;
      const chave = escala.data.slice(0, 10);
      const lista = escalasPorDia.get(chave);
      if (lista) lista.push(escala);
      else escalasPorDia.set(chave, [escala]);
      totalNoPeriodo += 1;
    }
    return { colaborador, escalasPorDia, totalNoPeriodo };
  });

  const visiveis = filtros.somenteComEscala ? linhas.filter((linha) => linha.totalNoPeriodo > 0) : linhas;

  return visiveis.sort((a, b) => {
    if (a.totalNoPeriodo !== b.totalNoPeriodo) return b.totalNoPeriodo - a.totalNoPeriodo;
    return a.colaborador.nome_completo.localeCompare(b.colaborador.nome_completo, 'pt-BR');
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * OS QUATRO KPI CARDS
 * ──────────────────────────────────────────────────────────────────────────── */

/** Números da faixa de indicadores — todos derivados dos dados reais. */
export interface MetricasPainelTurnos {
  /** Turnos cadastrados hoje (catálogo inteiro, independente de filtro). */
  totalTurnos: number;
  turnosAtivos: number;
  /** Variação de turnos cadastrados contra o fim do período anterior. */
  variacaoTurnos: number | null;
  /** Escalas no período (já filtradas). */
  escalasNoPeriodo: number;
  variacaoEscalas: number | null;
  /** Colaboradores distintos escalados no período QUE ESTÃO na equipe ativa. */
  colaboradoresEscalados: number;
  /** Equipe considerada (colaboradores ativos da empresa). */
  tamanhoEquipe: number;
  /**
   * `colaboradoresEscalados / tamanhoEquipe` em %, limitado a 100
   * (`null` quando não há equipe carregada).
   */
  percentualEquipe: number | null;
  conflitos: ConflitoEscala[];
  serieDiaria: PontoSerieDiaria[];
  distribuicao: FatiaTurno[];
}

/**
 * Consolida os quatro indicadores.
 *
 * `escalasPeriodoAnterior` já deve vir com os MESMOS filtros aplicados
 * (a variação compara laranja com laranja). Para "turnos cadastrados" a base é
 * `created_at`: quantos turnos já existiam ao fim do período ANTERIOR — a única
 * série histórica real disponível para esse número. Sem base (`0`), a variação
 * é `null` e o card simplesmente não mostra a linha de tendência.
 *
 * ── DENOMINADOR DO KPI DE COLABORADORES (correção) ──────────────────────────
 * `colaboradoresEscalados` conta os distintos escalados no período, e o
 * percentual dividia esse número pelo tamanho da EQUIPE ATIVA. Como as escalas
 * do período são TODOS os registros da empresa — inclusive de quem já foi
 * desligado/inativado (que não estão na lista de ativos) —, o numerador podia
 * passar do denominador e o card exibia coisas como "122% da equipe".
 *
 * Agora o numerador é a INTERSEÇÃO com a equipe carregada (só quem é elegível
 * entra na conta) e o percentual fica limitado a 100. Nenhum dado é alterado:
 * as escalas de colaboradores fora da equipe continuam aparecendo no
 * calendário/lista; elas só não inflam a razão "escalados / equipe".
 */
export function calcularMetricasPainel({
  turnos,
  escalasPeriodo,
  escalasPeriodoAnterior,
  fimPeriodoAnterior,
  equipe,
  dias,
  conflitos,
}: {
  turnos: readonly TurnoRegistro[];
  escalasPeriodo: readonly EscalaRegistro[];
  escalasPeriodoAnterior: readonly EscalaRegistro[];
  /** Última data do período anterior (`yyyy-MM-dd`) — base da variação de turnos. */
  fimPeriodoAnterior: string;
  equipe: readonly MembroEquipe[];
  dias: readonly string[];
  conflitos?: readonly ConflitoEscala[];
}): MetricasPainelTurnos {
  const tamanhoEquipe = equipe.length;
  const idsDaEquipe = new Set(equipe.map((membro) => membro.id));
  const colaboradoresEscalados = new Set(
    escalasPeriodo.map((escala) => escala.colaborador_id).filter((id) => idsDaEquipe.has(id))
  ).size;

  return {
    totalTurnos: turnos.length,
    turnosAtivos: turnos.filter((t) => t.ativo !== false).length,
    variacaoTurnos: variacaoPercentual(turnos.length, turnosCriadosAte(turnos, fimPeriodoAnterior)),
    escalasNoPeriodo: escalasPeriodo.length,
    variacaoEscalas: variacaoPercentual(escalasPeriodo.length, escalasPeriodoAnterior.length),
    colaboradoresEscalados,
    tamanhoEquipe,
    percentualEquipe:
      tamanhoEquipe > 0 ? Math.min(100, Math.round((colaboradoresEscalados / tamanhoEquipe) * 100)) : null,
    conflitos: [...(conflitos ?? [])],
    serieDiaria: contarEscalasPorDia(escalasPeriodo, dias),
    distribuicao: distribuicaoPorTurno(escalasPeriodo, turnos),
  };
}
