/**
 * ============================================================================
 * CENTRAL DE AUDITORIA DO PONTO — derivações puras (sem React, sem rede).
 *
 * TUDO o que a aba "Auditoria" AFIRMA sobre a trilha sai daqui: os quatro KPIs,
 * a variação contra o período anterior, os títulos legíveis de cada evento, o
 * recorte de período/busca/operação/entidade/responsável, a paginação e — o
 * ponto mais delicado — o parecer de INTEGRIDADE da evidência.
 *
 * ── DE ONDE VÊM OS DADOS ───────────────────────────────────────────────────
 * A fonte é a tabela `audit_log` (a mesma que a trilha já consultava). O banco
 * tem DUAS gerações de escrita e o normalizador aceita as duas, porque
 * `audit_log` guarda linha legada (`acao`/`dados_novos` no topo) e linha nova
 * (`payload.dados_novos`, ver `registrar_auditoria`):
 *
 *   legado  { acao, tabela, registro_id, dados_anteriores, dados_novos, … }
 *   novo    { action, entity, entity_id, payload: { dados_anteriores, … }, … }
 *
 * Nenhum campo é inventado: o que não existe na linha fica `null` e a tela
 * mostra "—".
 *
 * ── INTEGRIDADE DA EVIDÊNCIA (leia antes de mexer) ─────────────────────────
 * "Verificada" NÃO é o padrão e NÃO é dado por ter um campo de hash. Existe UMA
 * receita de hash que o cliente sabe reproduzir, e ela é a de `batidas_ponto`,
 * gravada por `pontoService.registrarBatida`:
 *
 *     digest = SHA-256( `${colaborador_id}|${data}|${hora}|${dispositivo}` )
 *
 * O serviço calcula com `options.dispositivoId || 'web'` e grava na coluna
 * `dispositivo_id` o fallback `'web-browser'`; por isso, quando a linha guarda
 * exatamente esse fallback, o cálculo é refeito com `'web'` (é o valor que
 * entrou no digest). Com a linha completa em `dados_novos`, o digest é
 * RECALCULADO aqui e comparado com o gravado:
 *
 *   igual      → `verificada`       (criptografia de verdade, não simulação)
 *   diferente  → `divergente`       (alerta: a evidência não fecha)
 *   sem receita→ `sem_comprovacao`  (neutro: não há como confirmar no cliente)
 *
 * Exclusão (`DELETE`) de registro não tem digest a conferir e é irreversível:
 * o parecer é `revisao` — "Revisão recomendada", âmbar. É o único estado de
 * atenção que a tela afirma sem depender de hash.
 *
 * Os demais módulos (férias, CNAB, desligamentos…) têm receitas de hash
 * próprias no banco, mas NENHUMA é reproduzível no cliente sem as colunas da
 * tabela de origem — nesses casos o parecer é `sem_comprovacao`, jamais
 * "Verificada".
 * ============================================================================
 */
import CryptoJS from 'crypto-js';
import { addDaysLocal, formatDateLocalISO, parseDateLocalISO, todayLocalISO } from '@/utils/dateLocal';
import { intervaloAnterior, variacaoPercentual, type IntervaloGeo } from '@/utils/pontoGeofencing';

/* ─── Período ─────────────────────────────────────────────────────────────── */

/** Períodos oferecidos pelo seletor do cabeçalho. */
export type PeriodoAuditoria = '7d' | '30d' | '90d' | 'personalizado';

/** Pontas do recorte livre (`yyyy-MM-dd` local), usadas só em `personalizado`. */
export interface RecortePersonalizado {
  de: string;
  ate: string;
}

/** Opções do seletor de período, na ordem em que aparecem. */
export const PERIODOS_AUDITORIA: readonly { valor: PeriodoAuditoria; rotulo: string }[] = [
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
  { valor: '90d', rotulo: 'Últimos 90 dias' },
  { valor: 'personalizado', rotulo: 'Personalizado' },
] as const;

/** Dias de cada atalho (o dia de hoje conta como o último do intervalo). */
const DIAS_PERIODO: Record<Exclude<PeriodoAuditoria, 'personalizado'>, number> = {
  '7d': 6,
  '30d': 29,
  '90d': 89,
};

/** `yyyy-MM-dd` válido ou `null` — sem passar por `Date`, sem fuso. */
export function normalizarDataISO(valor: string | null | undefined): string | null {
  const bruto = String(valor ?? '')
    .trim()
    .slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return null;
  return bruto;
}

/**
 * Intervalo `yyyy-MM-dd` (fechado) do período selecionado.
 *
 * Em `personalizado` vale o recorte digitado; pontas vazias caem em "hoje", e
 * se as duas vierem invertidas elas são ordenadas (o usuário não deve ver uma
 * lista vazia por ter escolhido as datas ao contrário).
 */
export function intervaloDoPeriodoAuditoria(
  periodo: PeriodoAuditoria,
  personalizado?: Partial<RecortePersonalizado>,
  hoje: string = todayLocalISO()
): IntervaloGeo {
  if (periodo === 'personalizado') {
    const de = normalizarDataISO(personalizado?.de) ?? hoje;
    const ate = normalizarDataISO(personalizado?.ate) ?? hoje;
    return de <= ate ? { inicio: de, fim: ate } : { inicio: ate, fim: de };
  }
  const base = parseDateLocalISO(hoje) ?? new Date();
  return {
    inicio: formatDateLocalISO(addDaysLocal(base, -DIAS_PERIODO[periodo])),
    fim: formatDateLocalISO(base),
  };
}

/** Intervalo imediatamente anterior, com a mesma duração (base da variação). */
export function intervaloAnteriorAuditoria(intervalo: IntervaloGeo): IntervaloGeo {
  return intervaloAnterior(intervalo);
}

/** Data local (`yyyy-MM-dd`) de um timestamp ISO — o recorte é por dia local. */
export function dataLocalDoEvento(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return normalizarDataISO(iso);
  return formatDateLocalISO(data);
}

/** `true` quando o timestamp cai dentro do intervalo (fechado, por dia local). */
export function dentroDoIntervalo(iso: string | null | undefined, intervalo: IntervaloGeo): boolean {
  const dia = dataLocalDoEvento(iso);
  if (!dia) return false;
  return dia >= intervalo.inicio && dia <= intervalo.fim;
}

/** Rótulo do seletor — sempre derivado do recorte, nunca de um estado à parte. */
export function rotuloDoPeriodoAuditoria(
  periodo: PeriodoAuditoria,
  personalizado?: Partial<RecortePersonalizado>
): string {
  if (periodo !== 'personalizado') {
    return PERIODOS_AUDITORIA.find((opcao) => opcao.valor === periodo)?.rotulo ?? 'Últimos 30 dias';
  }
  const intervalo = intervaloDoPeriodoAuditoria(periodo, personalizado);
  return `${dataBR(intervalo.inicio)} – ${dataBR(intervalo.fim)}`;
}

/* ─── Evento normalizado ──────────────────────────────────────────────────── */

/** Operação normalizada — é o que a tela pinta e filtra. */
export type OperacaoAuditoria = 'INSERT' | 'UPDATE' | 'DELETE' | 'OUTRA';

/** Linha crua de `audit_log` (as duas gerações de escrita — ver o topo). */
export interface LinhaAuditoriaCrua {
  id?: string | null;
  tabela?: string | null;
  entity?: string | null;
  registro_id?: string | null;
  entity_id?: string | null;
  acao?: string | null;
  action?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  dados_anteriores?: Record<string, unknown> | null;
  dados_novos?: Record<string, unknown> | null;
  campos_alterados?: string[] | string | null;
  payload?: Record<string, unknown> | null;
  created_at?: string | null;
  occurred_at?: string | null;
}

/** Evento como a tela o consome: campos resolvidos, sem `undefined`. */
export interface EventoAuditoria {
  id: string;
  /** Operação crua como veio do banco (`INSERT`, `EXECUTE_CALC`…). */
  acao: string;
  operacao: OperacaoAuditoria;
  tabela: string;
  registroId: string | null;
  criadoEm: string;
  userEmail: string | null;
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  dadosAnteriores: Record<string, unknown> | null;
  dadosNovos: Record<string, unknown> | null;
  camposAlterados: string[] | null;
}

/** Objeto simples (o `jsonb` pode vir como array/escalar em linha antiga). */
function objetoJson(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null;
}

/** Texto não vazio ou `null`. */
function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim();
  return limpo === '' ? null : limpo;
}

/** Normaliza a operação crua (`INSERT`/`insert`/`EXECUTE_CALC`) no union da tela. */
export function operacaoDoEvento(acao: string | null | undefined): OperacaoAuditoria {
  const bruta = String(acao ?? '')
    .trim()
    .toUpperCase();
  if (bruta === 'INSERT' || bruta === 'CRIACAO' || bruta === 'CREATE') return 'INSERT';
  if (bruta === 'UPDATE' || bruta === 'ALTERACAO' || bruta === 'EDIT') return 'UPDATE';
  if (bruta === 'DELETE' || bruta === 'EXCLUSAO' || bruta === 'REMOCAO') return 'DELETE';
  return 'OUTRA';
}

/** `campos_alterados` aceita `text[]` ou string separada por vírgula. */
function listaDeCampos(valor: string[] | string | null | undefined): string[] | null {
  if (Array.isArray(valor)) {
    const campos = valor.map((item) => String(item).trim()).filter(Boolean);
    return campos.length > 0 ? campos : null;
  }
  const bruto = texto(valor);
  if (!bruto) return null;
  const campos = bruto
    .replace(/[{}[\]]/g, '')
    .split(',')
    .map((item) => item.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
  return campos.length > 0 ? campos : null;
}

/**
 * Converte uma linha crua em `EventoAuditoria`. Devolve `null` quando não há
 * id ou data — uma linha sem identidade não pode virar evento de trilha.
 */
export function normalizarEvento(cru: LinhaAuditoriaCrua): EventoAuditoria | null {
  const payload = objetoJson(cru.payload);
  const criadoEm = texto(cru.created_at) ?? texto(cru.occurred_at);
  const id = texto(cru.id);
  if (!criadoEm || !id) return null;

  const acao = texto(cru.acao) ?? texto(cru.action) ?? 'EVENTO';

  return {
    id,
    acao,
    operacao: operacaoDoEvento(acao),
    tabela: texto(cru.tabela) ?? texto(cru.entity) ?? '—',
    registroId: texto(cru.registro_id) ?? texto(cru.entity_id),
    criadoEm,
    userEmail: texto(cru.user_email) ?? texto(payload?.user_email),
    userId: texto(cru.user_id),
    ip: texto(cru.ip_address),
    userAgent: texto(cru.user_agent),
    dadosAnteriores: objetoJson(cru.dados_anteriores) ?? objetoJson(payload?.dados_anteriores),
    dadosNovos: objetoJson(cru.dados_novos) ?? objetoJson(payload?.dados_novos),
    camposAlterados: listaDeCampos(cru.campos_alterados),
  };
}

/** Normaliza a lista inteira, descartando as linhas sem identidade. */
export function normalizarEventos(crus: readonly LinhaAuditoriaCrua[] | null | undefined): EventoAuditoria[] {
  if (!crus || crus.length === 0) return [];
  return crus.map(normalizarEvento).filter((evento): evento is EventoAuditoria => evento !== null);
}

/* ─── Rótulos legíveis ────────────────────────────────────────────────────── */

/** Nome do recurso auditado + gênero gramatical do particípio. */
const RECURSOS: Record<string, { rotulo: string; genero: 'f' | 'm' }> = {
  batidas_ponto: { rotulo: 'batida de ponto', genero: 'f' },
  registros_ponto: { rotulo: 'registro de jornada', genero: 'm' },
  solicitacoes_ajuste_ponto: { rotulo: 'solicitação de ajuste', genero: 'f' },
  ponto_ajustes: { rotulo: 'ajuste de ponto', genero: 'm' },
  colaboradores: { rotulo: 'colaborador', genero: 'm' },
  empresas: { rotulo: 'empresa', genero: 'f' },
  desligamentos: { rotulo: 'desligamento', genero: 'm' },
  ferias: { rotulo: 'férias', genero: 'f' },
  folhas_pagamento: { rotulo: 'folha de pagamento', genero: 'f' },
};

/** Rótulo do recurso (tabela) para textos e para o filtro de entidade. */
export function rotuloDoRecurso(tabela: string | null | undefined): string {
  const bruta = String(tabela ?? '').trim();
  if (!bruta) return '—';
  const conhecido = RECURSOS[bruta.toLowerCase()];
  // Tabela desconhecida: mostra o nome técnico como veio (nada de inventar).
  return conhecido?.rotulo ?? bruta;
}

/**
 * Vogal do particípio: o gênero vem do recurso conhecido (tabela) e, para
 * tabelas fora do mapa, da última letra do nome (`a` → feminino).
 */
function vogalParticipo(evento: EventoAuditoria): 'a' | 'o' {
  const conhecido = RECURSOS[evento.tabela.toLowerCase()];
  if (conhecido) return conhecido.genero === 'f' ? 'a' : 'o';
  return /a$/i.test(evento.tabela.trim()) ? 'a' : 'o';
}

/** Primeira letra em maiúscula, resto intacto. */
function capitalizar(valor: string): string {
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

/** Título do que ACONTECEU, na voz do sistema (a linha principal da timeline). */
export function tituloDoEvento(evento: EventoAuditoria): string {
  const recurso = rotuloDoRecurso(evento.tabela);
  const vogal = vogalParticipo(evento);
  if (evento.operacao === 'INSERT') return `${capitalizar(recurso)} criad${vogal}`;
  if (evento.operacao === 'UPDATE') return `${capitalizar(recurso)} atualizad${vogal}`;
  if (evento.operacao === 'DELETE') return `${capitalizar(recurso)} excluíd${vogal}`;
  return `${evento.acao} em ${recurso}`;
}

/** Parágrafo do painel — o que a operação fez, sem json. */
export function resumoDaOperacao(evento: EventoAuditoria): string {
  const recurso = rotuloDoRecurso(evento.tabela);
  if (evento.operacao === 'INSERT') {
    return `Criação de um novo registro de ${recurso} na competência auditada.`;
  }
  if (evento.operacao === 'UPDATE') {
    const campos = evento.camposAlterados;
    if (campos && campos.length > 0) {
      const amostra = campos.slice(0, 5).join(', ');
      const resto = campos.length > 5 ? ` e mais ${campos.length - 5}` : '';
      return `Atualização de ${campos.length} campo(s) do registro de ${recurso}: ${amostra}${resto}.`;
    }
    return `Atualização de um registro de ${recurso} já existente.`;
  }
  if (evento.operacao === 'DELETE') {
    return `Exclusão de um registro de ${recurso}. A operação é irreversível e exige conferência da evidência.`;
  }
  return `${evento.acao} registrado em ${recurso}.`;
}

/** Tudo o que a busca textual varre (responsável, id, entidade, títulos, json). */
export function textoDoEvento(evento: EventoAuditoria): string {
  return [
    evento.userEmail,
    evento.userId,
    evento.registroId,
    evento.tabela,
    rotuloDoRecurso(evento.tabela),
    evento.acao,
    tituloDoEvento(evento),
    evento.ip,
    evento.camposAlterados?.join(' '),
    evento.dadosNovos ? JSON.stringify(evento.dadosNovos) : null,
    evento.dadosAnteriores ? JSON.stringify(evento.dadosAnteriores) : null,
  ]
    .filter((parte): parte is string => typeof parte === 'string' && parte !== '')
    .join(' ')
    .toLowerCase();
}

/* ─── Integridade da evidência ────────────────────────────────────────────── */

/** Parecer de integridade — quatro estados, nenhum deles "otimista". */
export type EstadoEvidencia = 'verificada' | 'divergente' | 'revisao' | 'sem_comprovacao';

/** Resultado da verificação de um evento. */
export interface EvidenciaAuditoria {
  estado: EstadoEvidencia;
  /** Texto do selo (`Verificada`, `Revisão recomendada`…). */
  rotulo: string;
  /** Explicação curta exibida no painel, abaixo do selo. */
  descricao: string;
  /** Algoritmo usado, quando houve digest. */
  algoritmo: 'SHA-256' | null;
  /** Digest gravado na evidência (o que o banco afirma). */
  hashRegistrado: string | null;
  /** Digest recalculado no cliente (o que a tela confere). */
  hashCalculado: string | null;
}

/** Fallback de dispositivo que entrou no digest das batidas web. */
const DISPOSITIVO_WEB_DIGEST = 'web';
/** Fallback gravado na coluna `dispositivo_id` (ver `pontoService`). */
const DISPOSITIVO_WEB_COLUNA = 'web-browser';

/** Digest de uma batida — a MESMA receita de `pontoService.registrarBatida`. */
export function digestDaBatida(colaboradorId: string, data: string, hora: string, dispositivo: string): string {
  return CryptoJS.SHA256(`${colaboradorId}|${data}|${hora}|${dispositivo}`).toString();
}

/** Candidatos de dispositivo: o gravado e, no fallback web, os dois nomes. */
function dispositivosCandidatos(valor: unknown): string[] {
  const gravado = texto(valor);
  if (!gravado) return [DISPOSITIVO_WEB_DIGEST];
  if (gravado === DISPOSITIVO_WEB_COLUNA) return [DISPOSITIVO_WEB_DIGEST, DISPOSITIVO_WEB_COLUNA];
  return [gravado];
}

/**
 * Verificação REAL de uma batida de ponto: recalcula o SHA-256 e compara com o
 * digest gravado. Devolve `null` quando a linha não traz os campos da receita
 * (aí a tela cai em "sem comprovação", nunca em "verificada").
 */
function verificarBatida(dados: Record<string, unknown> | null): {
  registrado: string;
  calculado: string;
  confere: boolean;
} | null {
  if (!dados) return null;
  const colaboradorId = texto(dados.colaborador_id);
  const data = normalizarDataISO(texto(dados.data));
  const hora = texto(dados.hora);
  const registrado = texto(dados.hash_integridade) ?? texto(dados.hash_sha256);
  if (!colaboradorId || !data || !hora || !registrado) return null;

  const candidatos = dispositivosCandidatos(dados.dispositivo_id).map((dispositivo) =>
    digestDaBatida(colaboradorId, data, hora, dispositivo)
  );
  const igual = registrado.toLowerCase();
  const calculado = candidatos.find((digest) => digest.toLowerCase() === igual) ?? candidatos[0];
  return { registrado, calculado, confere: calculado.toLowerCase() === igual };
}

/**
 * Parecer de integridade do evento.
 *
 * Ordem das regras (importa): (1) receita reproduzível → veredito criptográfico;
 * (2) exclusão sem digest → revisão recomendada; (3) qualquer outro caso —
 * inclusive "tem hash, mas não sei reproduzir" — → sem comprovação.
 */
export function evidenciaDoEvento(evento: EventoAuditoria): EvidenciaAuditoria {
  if (evento.tabela === 'batidas_ponto') {
    const resultado = verificarBatida(evento.dadosNovos) ?? verificarBatida(evento.dadosAnteriores);
    if (resultado) {
      return resultado.confere
        ? {
            estado: 'verificada',
            rotulo: 'Verificada',
            descricao: 'Hash SHA-256 da batida recalculado e igual ao gravado.',
            algoritmo: 'SHA-256',
            hashRegistrado: resultado.registrado,
            hashCalculado: resultado.calculado,
          }
        : {
            estado: 'divergente',
            rotulo: 'Divergente',
            descricao: 'O SHA-256 recalculado não corresponde ao digest gravado na evidência.',
            algoritmo: 'SHA-256',
            hashRegistrado: resultado.registrado,
            hashCalculado: resultado.calculado,
          };
    }
  }

  if (evento.operacao === 'DELETE') {
    return {
      estado: 'revisao',
      rotulo: 'Revisão recomendada',
      descricao:
        'Exclusão de registro: não há digest para conferir e a operação é irreversível. Confirme o caso com o solicitante.',
      algoritmo: null,
      hashRegistrado: null,
      hashCalculado: null,
    };
  }

  const temHash = Boolean(
    evento.dadosNovos &&
    (texto(evento.dadosNovos.hash_integridade) ||
      texto(evento.dadosNovos.hash_sha256) ||
      texto(evento.dadosNovos.sha256))
  );

  return {
    estado: 'sem_comprovacao',
    rotulo: 'Não verificada',
    descricao: temHash
      ? 'O registro traz um digest, mas a receita dele não é reproduzível neste cliente — a integridade não pode ser confirmada aqui.'
      : 'O evento não traz o digest de integridade do registro; não há o que conferir neste cliente.',
    algoritmo: null,
    hashRegistrado: null,
    hashCalculado: null,
  };
}

/* ─── Filtros ─────────────────────────────────────────────────────────────── */

/** Filtro de operação: `todas` ou uma operação normalizada. */
export type FiltroOperacao = 'todas' | OperacaoAuditoria;

/** Recorte combinável da barra de filtros. */
export interface FiltrosAuditoria {
  intervalo?: IntervaloGeo;
  busca?: string;
  operacao?: FiltroOperacao;
  entidade?: string;
  responsavel?: string;
}

/** Rótulo do autor quando a linha não tem e-mail (evento automático do banco). */
export const SISTEMA = 'Sistema (automático)';

/** `todas`/`todos` são a AUSÊNCIA de filtro — nunca um valor de dado. */
function semFiltro(valor: string | undefined): boolean {
  if (!valor) return true;
  const limpo = valor.trim().toLowerCase();
  return limpo === '' || limpo === 'todas' || limpo === 'todos';
}

/** Responsável exibido na linha e no painel. */
export function responsavelDoEvento(evento: EventoAuditoria): string {
  return evento.userEmail ?? SISTEMA;
}

/**
 * Aplica o recorte. Um evento precisa passar por TODOS os filtros ativos; a
 * busca é textual e cobre responsável, e-mail, id, entidade e o json.
 */
export function filtrarEventos(eventos: readonly EventoAuditoria[], filtros: FiltrosAuditoria = {}): EventoAuditoria[] {
  const busca = String(filtros.busca ?? '')
    .trim()
    .toLowerCase();
  const entidade = semFiltro(filtros.entidade) ? null : String(filtros.entidade).trim();
  const responsavel = semFiltro(filtros.responsavel) ? null : String(filtros.responsavel).trim();
  const operacao = filtros.operacao && filtros.operacao !== 'todas' ? filtros.operacao : null;

  return eventos.filter((evento) => {
    if (filtros.intervalo && !dentroDoIntervalo(evento.criadoEm, filtros.intervalo)) return false;
    if (operacao && evento.operacao !== operacao) return false;
    if (entidade && evento.tabela !== entidade) return false;
    if (responsavel && responsavelDoEvento(evento) !== responsavel) return false;
    if (busca && !textoDoEvento(evento).includes(busca)) return false;
    return true;
  });
}

/** Entidades presentes na lista — opções do filtro "Entidade". */
export function entidadesDosEventos(eventos: readonly EventoAuditoria[]): string[] {
  const nomes = new Set<string>();
  eventos.forEach((evento) => {
    if (evento.tabela && evento.tabela !== '—') nomes.add(evento.tabela);
  });
  return [...nomes].sort((a, b) => rotuloDoRecurso(a).localeCompare(rotuloDoRecurso(b)));
}

/** Responsáveis presentes na lista — opções do filtro "Responsável". */
export function responsaveisDosEventos(eventos: readonly EventoAuditoria[]): string[] {
  const nomes = new Set<string>();
  eventos.forEach((evento) => nomes.add(responsavelDoEvento(evento)));
  return [...nomes].sort((a, b) => a.localeCompare(b));
}

/** Operações presentes na lista — opções do filtro "Operação". */
export function operacoesDosEventos(eventos: readonly EventoAuditoria[]): OperacaoAuditoria[] {
  const presentes = new Set<OperacaoAuditoria>();
  eventos.forEach((evento) => presentes.add(evento.operacao));
  return (['INSERT', 'UPDATE', 'DELETE', 'OUTRA'] as const).filter((operacao) => presentes.has(operacao));
}

/* ─── Resumo e variação (KPIs) ────────────────────────────────────────────── */

/** Números dos quatro KPIs do topo. */
export interface ResumoAuditoria {
  total: number;
  criados: number;
  alterados: number;
  excluidos: number;
  /** Eventos que exigem revisão: digest divergente ou exclusão sem prova. */
  atencao: number;
}

/** Conta os eventos por operação e aplica o parecer de integridade. */
export function resumoAuditoria(eventos: readonly EventoAuditoria[]): ResumoAuditoria {
  let criados = 0;
  let alterados = 0;
  let excluidos = 0;
  let atencao = 0;

  eventos.forEach((evento) => {
    if (evento.operacao === 'INSERT') criados += 1;
    else if (evento.operacao === 'UPDATE') alterados += 1;
    else if (evento.operacao === 'DELETE') excluidos += 1;

    const estado = evidenciaDoEvento(evento).estado;
    if (estado === 'divergente' || estado === 'revisao') atencao += 1;
  });

  return { total: eventos.length, criados, alterados, excluidos, atencao };
}

/** Variação percentual de cada KPI contra o período anterior. */
export interface VariacoesAuditoria {
  total: number | null;
  criados: number | null;
  alterados: number | null;
  atencao: number | null;
}

/**
 * Variação de cada KPI contra o período anterior de mesma duração. Sem base
 * (período anterior vazio) o valor é `null` e o card NÃO mostra selo — a tela
 * nunca inventa movimento.
 */
export function variacoesAuditoria(atual: ResumoAuditoria, anterior: ResumoAuditoria): VariacoesAuditoria {
  const variar = (agora: number, antes: number) => (antes > 0 ? variacaoPercentual(agora, antes) : null);
  return {
    total: variar(atual.total, anterior.total),
    criados: variar(atual.criados, anterior.criados),
    alterados: variar(atual.alterados, anterior.alterados),
    atencao: variar(atual.atencao, anterior.atencao),
  };
}

/* ─── Dados técnicos e formatação ─────────────────────────────────────────── */

/**
 * JSON exibido no painel: o `dados_novos` (o estado que a operação gravou) e,
 * quando existe, o `dados_anteriores`. Nada é sintetizado.
 */
export function jsonDoEvento(evento: EventoAuditoria): string {
  const { dadosAnteriores: anteriores, dadosNovos: novos } = evento;
  if (novos && anteriores) return JSON.stringify({ anteriores, novos }, null, 2);
  if (novos) return JSON.stringify(novos, null, 2);
  if (anteriores) return JSON.stringify({ anteriores }, null, 2);
  return '{}';
}

/** Data `yyyy-MM-dd` em `dd/MM/yyyy` (sem passar por `Date`, sem fuso). */
export function dataBR(data: string | null | undefined): string {
  const iso = normalizarDataISO(data);
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Data e hora locais de um timestamp, no formato curto da tela. */
export function dataHoraDoEvento(iso: string | null | undefined): { data: string; hora: string } {
  if (!iso) return { data: '—', hora: '--:--' };
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return { data: dataBR(iso), hora: '--:--' };
  const hora = `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
  return { data: dataBR(formatDateLocalISO(data)), hora };
}

/** Primeiras letras do e-mail, para o avatar redondo da linha. */
export function iniciaisDoResponsavel(valor: string): string {
  const partes = valor
    .trim()
    .split(/[\s._@-]+/)
    .filter(Boolean);
  if (partes.length === 0) return '—';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

/* ─── Paginação ───────────────────────────────────────────────────────────── */

/**
 * Eventos por página. Cinco é o que cabe ao lado do painel de detalhes sem
 * obrigar a coluna a crescer — a régua vem da referência aprovada
 * ("1–5 de 18 eventos").
 */
export const TAMANHO_PAGINA_AUDITORIA = 5;

/** Total de páginas — nunca zero (uma lista vazia ainda é a página 1). */
export function totalPaginasAuditoria(total: number, tamanho: number = TAMANHO_PAGINA_AUDITORIA): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, tamanho)));
}

/** Recorte da página, com a página sempre dentro dos limites. */
export function paginarAuditoria<T>(
  lista: readonly T[],
  pagina: number,
  tamanho: number = TAMANHO_PAGINA_AUDITORIA
): T[] {
  const porPagina = Math.max(1, tamanho);
  const total = totalPaginasAuditoria(lista.length, porPagina);
  const atual = Math.min(Math.max(1, pagina), total);
  const inicio = (atual - 1) * porPagina;
  return lista.slice(inicio, inicio + porPagina);
}

/** Faixa exibida no rodapé (`1–5 de 18`). */
export function faixaExibidaAuditoria(pagina: number, tamanho: number, total: number): { inicio: number; fim: number } {
  if (total <= 0) return { inicio: 0, fim: 0 };
  const porPagina = Math.max(1, tamanho);
  const atual = Math.min(Math.max(1, pagina), totalPaginasAuditoria(total, porPagina));
  const inicio = (atual - 1) * porPagina + 1;
  return { inicio, fim: Math.min(total, inicio + porPagina - 1) };
}

/**
 * Botões de página do rodapé: no máximo CINCO números, com `null` marcando o
 * intervalo omitido (reticências). A página atual fica sempre visível, a
 * primeira e a última também, e as casas vizinhas acompanham o deslocamento.
 */
export function paginasVisiveisAuditoria(pagina: number, totalPaginas: number): (number | null)[] {
  const total = Math.max(1, totalPaginas);
  const atual = Math.min(Math.max(1, pagina), total);
  if (total <= 5) return Array.from({ length: total }, (_, indice) => indice + 1);

  const numeros = new Set<number>([1, total, atual]);
  if (atual <= 3) {
    [2, 3, 4].forEach((numero) => numero < total && numeros.add(numero));
  } else if (atual >= total - 2) {
    [total - 3, total - 2, total - 1].forEach((numero) => numero > 1 && numeros.add(numero));
  } else {
    numeros.add(atual - 1);
    numeros.add(atual + 1);
  }

  const ordenados = [...numeros].sort((a, b) => a - b);
  const resultado: (number | null)[] = [];
  ordenados.forEach((numero, indice) => {
    if (indice > 0 && numero - ordenados[indice - 1] > 1) resultado.push(null);
    resultado.push(numero);
  });
  return resultado;
}
