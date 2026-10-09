/**
 * ============================================================================
 * Derivações PURAS da Trilha de Auditoria do módulo de Desligamentos.
 * Mesma entrada → mesma saída: nada de JSX, nada de classe CSS.
 *
 * POR QUE UM MÓDULO PRÓPRIO: `desligamentosDerivacoes.ts` é a régua do PROCESSO
 * (prazo legal, variação, série do gráfico); a trilha lê outra coisa — eventos
 * JÁ CONSUMADOS, com carimbo de data/hora, autor e o payload `antes`/`depois` da
 * operação. Misturar as réguas convidaria a tela a medir evento com a régua de
 * processo.
 *
 * O que é REAPROVEITADO (nunca recriado): `DIA_MS`, `dataValida`,
 * `inicioDoDia` e `formatCurrencyBRL` de `desligamentosDerivacoes` — a mesma
 * aritmética de dia/moeda que o módulo inteiro usa; e `STATUS_LABELS`,
 * `ETAPA_LABELS`, `TIPO_LABELS`, `STATUS_BADGE` e `ETAPA_BADGE` de
 * `desligamentosComum` — os mesmos rótulos e tintas do badge da Gestão.
 *
 * NADA É INVENTADO: título, descrição, metadados, categoria e nível saem SEMPRE
 * de campos reais do log (`acao`, `created_at`, `registro_id`, `user_email` e o
 * payload `antes`/`depois`). Chave desconhecida no payload não desaparece: cai
 * no fallback de pares escalares com a chave humanizada.
 * ============================================================================
 */
import { DIA_MS, dataValida, formatCurrencyBRL, inicioDoDia } from './desligamentosDerivacoes';
import { ETAPA_BADGE, ETAPA_LABELS, STATUS_BADGE, STATUS_LABELS, TIPO_LABELS } from './desligamentosComum';
import { ACOES_DOCUMENTO, ACOES_TECNICAS, type CategoriaTrilha, type NivelTrilha } from './trilhaComum';

/** Recorte mínimo de um registro cru da trilha (linha de `audit_log`). */
export interface TrilhaLinhaCrua {
  [chave: string]: unknown;
}

/* ─── Evento normalizado ──────────────────────────────────────────────────── */

/**
 * Evento já normalizado (payload desembrulhado) como a tela o consome. É o
 * formato tanto da LINHA do `audit_log` (mock/consulta `select('*')`) quanto do
 * registro do RPC `listar_auditoria`, que entrega `dados_anteriores`/
 * `dados_novos` dentro de `payload`.
 */
export interface EventoTrilha {
  id: string;
  criadoEm: string;
  tabela: string | null;
  registroId: string | null;
  acao: string | null;
  userId: string | null;
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
}

/** Objeto simples (nem array, nem `null`) — o único formato aceito em payload. */
function objeto(valor: unknown): Record<string, unknown> | null {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

/** String não vazia ou `null` (aceita número e converte). */
function texto(valor: unknown): string | null {
  if (typeof valor === 'string' && valor.trim().length > 0) return valor;
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return null;
}

/** Normaliza uma linha crua da auditoria (aceita payload achatado E aninhado). */
export function normalizarEvento(cru: TrilhaLinhaCrua): EventoTrilha {
  const payload = objeto(cru.payload) ?? {};
  return {
    id: texto(cru.id) ?? '',
    criadoEm: texto(cru.created_at) ?? '',
    tabela: texto(cru.tabela),
    registroId: texto(cru.registro_id),
    acao: texto(cru.acao),
    userId: texto(cru.user_id) ?? texto(payload.user_id),
    userEmail: texto(cru.user_email) ?? texto(payload.user_email),
    ip: texto(cru.ip_address) ?? texto(payload.ip_address),
    userAgent: texto(cru.user_agent) ?? texto(payload.user_agent),
    antes: objeto(cru.dados_anteriores) ?? objeto(payload.dados_anteriores) ?? objeto(payload.anteriores),
    depois: objeto(cru.dados_novos) ?? objeto(payload.dados_novos) ?? objeto(payload.novos),
  };
}

/* ─── Datas do evento ─────────────────────────────────────────────────────── */

/** Data `YYYY-MM-DD`/ISO → `dd/mm/aaaa` (fuso local, sem day-shift do UTC). */
export function formatarData(valor?: string | null): string {
  const data = dataValida(valor);
  return data ? data.toLocaleDateString('pt-BR') : '—';
}

/** Hora `HH:mm` do carimbo do evento. */
export function formatarHora(iso: string): string {
  const data = dataValida(iso);
  return data ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
}

/** Data e hora completas (bloco de identificação do detalhe). */
export function formatarDataHora(iso: string): string {
  const data = dataValida(iso);
  return data
    ? `${data.toLocaleDateString('pt-BR')} · ${data.toLocaleTimeString('pt-BR')}`
    : '—';
}

/* ─── Rótulos e formatação de valores do payload ──────────────────────────── */

/**
 * Rótulo humano de cada chave do payload. Só entra aqui a chave cujo nome
 * técnico NÃO diz nada ao operador (`data_pagamento` → "Data de pagamento");
 * chave fora do mapa segue no fallback genérico com o nome humanizado.
 */
export const ROTULOS_CAMPO: Record<string, string> = {
  status: 'Status',
  etapa: 'Etapa',
  tipo: 'Motivo',
  motivo: 'Motivo',
  responsavel: 'Responsável',
  homologado_por: 'Homologado por',
  data_pagamento: 'Data de pagamento',
  data_desligamento: 'Prev. desligamento',
  data_aviso_previo: 'Aviso prévio',
  data_homologacao: 'Data de homologação',
  data_efetiva: 'Data efetiva',
  data_calculo: 'Data do cálculo',
  valor_liquido: 'Valor líquido',
  valor_bruto: 'Valor bruto',
  valor_simulado: 'Valor simulado',
  valor_total: 'Valor total',
  valor_ferias: 'Valor de férias',
  valor_decimo_terceiro: 'Valor de 13º',
  documento: 'Documento',
  tipo_documento: 'Documento',
  formato: 'Formato',
  secao: 'Seção',
  origem: 'Origem',
  documentos: 'Documentos',
  documentos_validados: 'Documentos',
  quantidade_documentos: 'Documentos',
  evento: 'Evento eSocial',
  recibo: 'Recibo eSocial',
  competencia: 'Competência',
  colaborador: 'Colaborador',
  perfil: 'Perfil',
  departamento: 'Departamento',
};

/** Chaves formatadas como data, como moeda e como contagem de documentos. */
const CAMPOS_DATA = new Set([
  'data_pagamento',
  'data_desligamento',
  'data_aviso_previo',
  'data_homologacao',
  'data_efetiva',
  'data_calculo',
]);

const CAMPOS_MOEDA = new Set([
  'valor_liquido',
  'valor_bruto',
  'valor_simulado',
  'valor_total',
  'valor_ferias',
  'valor_decimo_terceiro',
]);

const CAMPOS_CONTAGEM = new Set(['documentos', 'documentos_validados', 'quantidade_documentos']);

/** Chave fora do mapa → texto legível (`data_extracao` → "Data extracao"). */
export function humanizarChave(chave: string): string {
  const limpo = chave.replace(/_/g, ' ').trim();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

/** Rótulo humano de uma chave do payload. */
export function rotuloCampo(chave: string): string {
  return ROTULOS_CAMPO[chave] ?? humanizarChave(chave);
}

/**
 * Valor do payload em texto legível. Objetos e arrays NUNCA viram JSON cru na
 * linha do evento — viram contagem ("3 campos", "2 itens"), que é o resumo
 * honesto do que existe.
 */
export function formatarValor(chave: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (typeof valor === 'number') {
    if (CAMPOS_MOEDA.has(chave)) return formatCurrencyBRL(valor);
    if (CAMPOS_CONTAGEM.has(chave)) return `${valor} validado${valor === 1 ? '' : 's'}`;
    return valor.toLocaleString('pt-BR');
  }
  if (typeof valor === 'string') {
    if (CAMPOS_DATA.has(chave)) return formatarData(valor);
    if (chave === 'status') return STATUS_LABELS[valor] ?? humanizarChave(valor);
    if (chave === 'etapa') return ETAPA_LABELS[valor] ?? humanizarChave(valor);
    if (chave === 'tipo' || chave === 'motivo') return TIPO_LABELS[valor] ?? humanizarChave(valor);
    if (chave === 'competencia' && /^\d{4}-\d{2}$/.test(valor)) {
      const [ano, mes] = valor.split('-');
      return `${mes}/${ano}`;
    }
    return valor;
  }
  if (Array.isArray(valor)) return `${valor.length} ${valor.length === 1 ? 'item' : 'itens'}`;
  const chaves = Object.keys(valor as Record<string, unknown>).length;
  return `${chaves} campo${chaves === 1 ? '' : 's'}`;
}

/** Tinta do selo do "novo valor" da transição (a mesma régua do badge da Gestão). */
function badgeDoValor(chave: string, valorBruto: unknown): string {
  const bruto = typeof valorBruto === 'string' ? valorBruto : null;
  if (chave === 'status' && bruto && STATUS_BADGE[bruto]) return STATUS_BADGE[bruto];
  if (chave === 'etapa' && bruto && ETAPA_BADGE[bruto]) return ETAPA_BADGE[bruto];
  return 'bg-success/15 text-success';
}

/* ─── Metadados do evento (as colunas de apoio da linha) ──────────────────── */

/** Par rótulo/valor exibido ao lado do evento (máx. 2 por linha). */
export interface MetaTrilha {
  /** Chave real do payload (ou `acao` no pseudo-metadado técnico). */
  chave: string;
  label: string;
  /** Valor exibido (o "depois", quando há transição). */
  valor: string;
  /** Valor anterior — só quando o evento informa uma transição. */
  de?: string;
  /** `true` quando `de`/`valor` formam um "de → para". */
  transicao: boolean;
  /** Tinta do selo do novo valor (só quando `transicao`). */
  badge?: string;
  /** Valor em R$: a linha destaca o número, como na referência. */
  destaque?: boolean;
  /** Pseudo-metadado "Evento técnico" (código cru da ação). */
  tecnico?: boolean;
}

/** Transição "de → para" de um campo real (base do título e da descrição). */
export interface AlteracaoTrilha {
  chave: string;
  label: string;
  de: string;
  para: string;
}

/**
 * Campos cujo "de → para" é o núcleo semântico do evento — vêm primeiro.
 * `tipo`/`motivo` entram porque a troca do motivo altera a natureza rescisória.
 */
const ORDEM_TRANSICAO: readonly string[] = ['status', 'etapa', 'responsavel', 'tipo', 'motivo'];

/**
 * Grupos de campos simples, do mais para o menos relevante. A ordem dos grupos
 * define QUAIS dois metadados aparecem na linha — é ela que garante que
 * "Valor líquido" vença "Origem", por exemplo.
 */
const GRUPOS_CAMPOS: readonly (readonly string[])[] = [
  ['valor_liquido', 'valor_bruto', 'valor_simulado', 'valor_total', 'valor_ferias', 'valor_decimo_terceiro'],
  ['motivo', 'tipo'],
  ['data_desligamento', 'data_pagamento', 'data_aviso_previo', 'data_homologacao', 'data_efetiva', 'data_calculo'],
  ['documento', 'tipo_documento', 'formato'],
  ['evento', 'recibo', 'competencia'],
  ['secao', 'origem', 'documentos', 'documentos_validados', 'quantidade_documentos', 'homologado_por', 'colaborador'],
  ['status', 'etapa', 'responsavel'],
];

/**
 * TODAS as transições "de → para" do evento, na ordem de relevância. Um campo
 * que só existe no payload NOVO conta como transição a partir de `—`, que é
 * exatamente como a referência exibe "Data de pagamento: — → 01/10/2026".
 *
 * Regra: só há transição quando o payload ANTERIOR existe (é um UPDATE); em
 * criação/exclusão o payload é único e os campos viram valores simples.
 */
export function alteracoesDoEvento(evento: EventoTrilha): AlteracaoTrilha[] {
  const { antes, depois } = evento;
  if (!antes || !depois) return [];

  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  const alteracoes: AlteracaoTrilha[] = [];
  chaves.forEach((chave) => {
    const de = chave in antes ? formatarValor(chave, antes[chave]) : '—';
    const para = chave in depois ? formatarValor(chave, depois[chave]) : '—';
    if (de === para) return;
    alteracoes.push({ chave, label: rotuloCampo(chave), de, para });
  });

  // Transições do núcleo primeiro, depois as demais na ordem em que apareceram.
  const nucleo = ORDEM_TRANSICAO.map((chave) => alteracoes.find((a) => a.chave === chave)).filter(
    (a): a is AlteracaoTrilha => !!a
  );
  const resto = alteracoes.filter((a) => !ORDEM_TRANSICAO.includes(a.chave));
  return [...nucleo, ...resto];
}

/** Metadado simples de um campo presente em UM dos lados do payload. */
function metaDoCampo(evento: EventoTrilha, chave: string): MetaTrilha | null {
  const { antes, depois } = evento;
  const temAntes = !!antes && chave in antes;
  const temDepois = !!depois && chave in depois;
  // Campo nos DOIS lados é transição e já foi tratado por `alteracoesDoEvento`.
  if (temAntes && temDepois) return null;
  const fonte = (temDepois ? depois : antes) as Record<string, unknown> | null;
  if (!fonte) return null;
  const bruto = fonte[chave];
  if (bruto === null || bruto === undefined) return null;
  const valor = formatarValor(chave, bruto);

  // Campo INFORMADO agora (payload anterior existe): a linha mostra "— → valor".
  if (temDepois && antes) {
    return {
      chave,
      label: rotuloCampo(chave),
      valor,
      de: '—',
      transicao: true,
      badge: badgeDoValor(chave, bruto),
      destaque: CAMPOS_MOEDA.has(chave),
    };
  }

  return {
    chave,
    label: rotuloCampo(chave),
    valor,
    transicao: false,
    destaque: CAMPOS_MOEDA.has(chave),
  };
}

/** Pseudo-metadado do código cru da ação (só para ações executadas pelo app). */
function metaEventoTecnico(evento: EventoTrilha): MetaTrilha | null {
  if (!evento.acao || !ACOES_TECNICAS.has(evento.acao)) return null;
  return { chave: 'acao', label: 'Evento técnico', valor: evento.acao, transicao: false, tecnico: true };
}

/** Pares escalares do payload com a chave humanizada (último recurso). */
function paresGenericos(evento: EventoTrilha): MetaTrilha[] {
  const fonte = evento.depois ?? evento.antes ?? {};
  return Object.keys(fonte)
    .filter((chave) => !ROTULOS_CAMPO[chave] && typeof fonte[chave] !== 'object')
    .slice(0, 2)
    .map((chave) => ({
      chave,
      label: humanizarChave(chave),
      valor: formatarValor(chave, fonte[chave]),
      transicao: false,
    }));
}

/**
 * Até DOIS metadados para a linha do evento — a largura das duas colunas da
 * referência. Nenhum dado é escondido: o que não couber aqui aparece inteiro no
 * "Ver detalhes".
 */
export function metadadosDoEvento(evento: EventoTrilha): MetaTrilha[] {
  const metas: MetaTrilha[] = [];
  const vistos = new Set<string>();
  const push = (meta: MetaTrilha | null) => {
    if (!meta || metas.length >= 2 || vistos.has(meta.label)) return;
    vistos.add(meta.label);
    metas.push(meta);
  };

  // (1) Transições reais — o núcleo semântico do evento.
  alteracoesDoEvento(evento)
    .slice(0, 2)
    .forEach((alteracao) => {
      const bruto = evento.depois ? evento.depois[alteracao.chave] : undefined;
      push({
        chave: alteracao.chave,
        label: alteracao.label,
        valor: alteracao.para,
        de: alteracao.de,
        transicao: true,
        badge: badgeDoValor(alteracao.chave, bruto),
        destaque: CAMPOS_MOEDA.has(alteracao.chave),
      });
    });

  // (2) Valores simples na ordem de relevância; o "Evento técnico" entra logo
  //     depois do grupo de valores em R$ — a posição da referência.
  const tecnico = metaEventoTecnico(evento);
  GRUPOS_CAMPOS.forEach((grupo, indice) => {
    grupo.forEach((chave) => push(metaDoCampo(evento, chave)));
    if (indice === 0) push(tecnico);
  });
  push(tecnico);

  // (3) Nada reconhecido: mostra os pares escalares do payload, sem esconder.
  if (metas.length === 0) paresGenericos(evento).forEach(push);

  return metas.slice(0, 2);
}

/* ─── Título e descrição do evento (derivados do payload) ─────────────────── */

/**
 * Título legível do evento. Sai SEMPRE de `acao` + campos reais do payload novo
 * (status/etapa/valores) — nunca de um texto fixo por linha. Ação desconhecida
 * cai no nome humanizado do próprio código técnico, que continua visível.
 */
export function tituloDoEvento(evento: EventoTrilha): string {
  const depois = evento.depois ?? {};
  switch (evento.acao) {
    case 'INSERT':
      return 'Processo de desligamento iniciado';
    case 'DELETE':
      return 'Desligamento excluído';
    case 'EXECUTE_CALC':
      return 'Cálculo da rescisão executado';
    case 'SIMULATION_CALC':
      return 'Simulação de cálculo realizada';
    case 'VIEW':
    case 'VISUALIZACAO':
      return 'Visualização de dados';
    case 'EXPORT':
      return 'Trilha exportada';
    case 'SIGN':
      return 'Documento assinado';
    case 'GENERATE_DOC':
      return 'Carta de rescisão gerada';
    case 'UPDATE': {
      const status = texto(depois.status);
      if (status === 'finalizado') return 'Desligamento finalizado';
      if (status === 'concluido') return 'Desligamento concluído';
      if (status === 'homologado') return 'Rescisão homologada';
      if (status === 'calculado') return 'Rescisão calculada';
      if (status === 'comunicado') return 'Aviso prévio comunicado';
      if (status === 'pagamento') return 'Pagamento registrado';
      if (status === 'cancelado') return 'Desligamento cancelado';
      if (texto(depois.responsavel)) return 'Responsável atualizado';
      if (texto(depois.documento) || texto(depois.documentos) || texto(depois.documentos_validados)) {
        return 'Documentos conferidos';
      }
      if (texto(depois.etapa)) return 'Etapa do processo atualizada';
      return 'Desligamento atualizado';
    }
    default:
      return evento.acao ? humanizarChave(evento.acao) : 'Evento registrado';
  }
}

/** Colaborador citado no payload (criação/exclusão do processo). */
function colaboradorDoEvento(evento: EventoTrilha): string | null {
  return texto(evento.depois?.colaborador) ?? texto(evento.antes?.colaborador);
}

/**
 * Frase de apoio do evento. Em UPDATE ela é a leitura HUMANA do diff real
 * ("Status alterado de Em Pagamento para Finalizado e data de pagamento: …") —
 * o JSON cru fica só no detalhe.
 */
export function descricaoDoEvento(evento: EventoTrilha): string {
  const alteracoes = alteracoesDoEvento(evento);
  if (alteracoes.length > 0) {
    const [principal, ...resto] = alteracoes;
    const frase = `${principal.label} alterado de ${principal.de} para ${principal.para}`;
    const complementos = resto.map((a) =>
      a.de === '—' ? `${a.label.toLowerCase()}: ${a.para}` : `${a.label.toLowerCase()} de ${a.de} para ${a.para}`
    );
    return `${[frase, ...complementos].join(' e ')}.`;
  }

  const depois = evento.depois ?? {};
  const colaborador = colaboradorDoEvento(evento);
  switch (evento.acao) {
    case 'INSERT': {
      const motivo = texto(depois.motivo) ?? texto(depois.tipo);
      const motivoLegivel = motivo ? (TIPO_LABELS[motivo] ?? humanizarChave(motivo)) : null;
      return `Processo criado${colaborador ? ` para ${colaborador}` : ''}${motivoLegivel ? ` (${motivoLegivel})` : ''}.`;
    }
    case 'DELETE':
      return `Registro removido do módulo${colaborador ? ` — ${colaborador}` : ''}.`;
    case 'EXECUTE_CALC': {
      const eventoESocial = texto(depois.evento);
      const situacao = texto(depois.status);
      if (eventoESocial) {
        return `Evento ${eventoESocial}${situacao ? ` ${situacao}` : ''} no eSocial.`;
      }
      return 'Cálculo realizado com sucesso para o colaborador.';
    }
    case 'SIMULATION_CALC':
      return 'Simulação executada para conferência de valores.';
    case 'VIEW':
    case 'VISUALIZACAO':
      return 'Usuário visualizou as informações do processo.';
    case 'EXPORT':
      return 'Trilha de auditoria exportada para conferência externa.';
    case 'SIGN':
      return 'Assinatura registrada para o documento do processo.';
    case 'GENERATE_DOC':
      return 'Documento gerado automaticamente para o processo.';
    default: {
      if (evento.acao) return `Evento "${evento.acao}" registrado no módulo de desligamentos.`;
      return 'Evento registrado no módulo de desligamentos.';
    }
  }
}

/* ─── Classificação (chips, nível e selo de resultado) ────────────────────── */

/** Ação contém "CALC" — o recorte técnico de cálculo rescisório. */
function acaoDeCalculo(acao?: string | null): boolean {
  return /CALC/.test((acao ?? '').toUpperCase());
}

/** Houve mudança REAL de status ou etapa (diferença entre antes e depois). */
function mudouStatusOuEtapa(evento: EventoTrilha): boolean {
  const { antes, depois } = evento;
  if (!antes || !depois) return false;
  return ['status', 'etapa'].some(
    (chave) => chave in antes && chave in depois && JSON.stringify(antes[chave]) !== JSON.stringify(depois[chave])
  );
}

/** O payload trata de documento (conferência, emissão, contagem). */
const CAMPOS_DOCUMENTO = ['documento', 'tipo_documento', 'documentos', 'documentos_validados', 'quantidade_documentos'];

function payloadDocumental(evento: EventoTrilha): boolean {
  const alvo = evento.depois ?? evento.antes ?? {};
  return CAMPOS_DOCUMENTO.some((chave) => chave in alvo);
}

/**
 * Categoria do evento — MUTUAMENTE EXCLUSIVA, para a soma dos chips ser o total
 * exibido. A ordem de decisão (a MESMA de `CATEGORIAS_TRILHA`) é:
 *   1. Cálculo  — a ação é de cálculo rescisório (mais específica que "Sistema");
 *   2. Sistema  — não há autor: foi a própria aplicação que executou;
 *   3. Documentos — leitura/emissão/assinatura OU payload de documento;
 *   4. Status   — mudou `status`/`etapa` do desligamento;
 *   5. Alterações — todo o resto (criação, edição e exclusão de registro).
 */
export function categoriaDoEvento(evento: EventoTrilha): CategoriaTrilha {
  const acao = (evento.acao ?? '').toUpperCase();
  if (acaoDeCalculo(acao)) return 'calculos';
  if (!evento.userEmail && !evento.userId) return 'sistema';
  if (ACOES_DOCUMENTO.has(acao) || payloadDocumental(evento)) return 'documentos';
  if (mudouStatusOuEtapa(evento)) return 'status';
  return 'alteracoes';
}

/**
 * Nível do evento: `crítico` para exclusão/cancelamento, `atenção` quando o
 * processo ficou num estado que ainda exige ação, `informativo` no resto.
 * Derivado do próprio log — não existe coluna de severidade na auditoria.
 */
export function nivelDoEvento(evento: EventoTrilha): NivelTrilha {
  const status = texto(evento.depois?.status) ?? texto(evento.antes?.status);
  if ((evento.acao ?? '').toUpperCase() === 'DELETE' || status === 'cancelado') return 'critico';
  if (evento.antes && (evento.depois || evento.acao === 'UPDATE')) {
    const terminal = status === 'finalizado' || status === 'concluido';
    if (!terminal) return 'atencao';
  }
  return 'informativo';
}

/** Selo de resultado da coluna de ações (a pill da direita na referência). */
export interface ResultadoTrilha {
  label: string;
  badge: string;
}

/**
 * Resultado do evento: "Concluído" quando ele encerra o processo e "Sistema"
 * quando não houve autor humano. Nada além disso — a referência também deixa a
 * maioria das linhas sem selo.
 */
export function resultadoDoEvento(evento: EventoTrilha): ResultadoTrilha | null {
  const status = texto(evento.depois?.status);
  if (status === 'finalizado' || status === 'concluido') {
    return { label: 'Concluído', badge: 'bg-success/15 text-success' };
  }
  if (!evento.userEmail && !evento.userId) {
    return { label: 'Sistema', badge: 'bg-info/15 text-info' };
  }
  return null;
}

/* ─── Responsável do evento ───────────────────────────────────────────────── */

export interface ResponsavelTrilha {
  /** Chave estável do autor (id → e-mail → "sistema"). */
  chave: string;
  /** Nome exibido: cadastro de `profiles` → e-mail → "Sistema (Automático)". */
  nome: string;
  email: string | null;
  /** `true` quando não há autor humano: foi a aplicação. */
  sistema: boolean;
}

/**
 * Autor do evento. O nome só é "bonito" quando o cadastro real (`profiles`,
 * lido pela tela) o resolve; caso contrário mostramos o próprio e-mail e, sem
 * e-mail, "Sistema (Automático)" — nunca um nome inventado.
 */
export function responsavelDoEvento(
  evento: EventoTrilha,
  nomePorId?: Map<string, string> | null
): ResponsavelTrilha {
  const nomePerfil = evento.userId && nomePorId ? nomePorId.get(evento.userId) : undefined;
  if (nomePerfil) {
    return { chave: evento.userId ?? nomePerfil, nome: nomePerfil, email: evento.userEmail, sistema: false };
  }
  if (evento.userEmail) {
    return { chave: evento.userEmail, nome: evento.userEmail, email: null, sistema: false };
  }
  if (evento.userId) {
    return { chave: evento.userId, nome: evento.userId, email: null, sistema: false };
  }
  return { chave: 'sistema', nome: 'Sistema (Automático)', email: null, sistema: true };
}

/** Iniciais para o avatar textual (aceita nome OU e-mail). */
export function iniciaisDoAutor(nome: string): string {
  if (!nome) return '—';
  const limpo = nome.includes('@') ? nome.split('@')[0] : nome;
  const partes = limpo.split(/[.\s_-]+/).filter(Boolean);
  if (partes.length === 0) return '—';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  const segunda = partes[1][0] ?? '';
  return /[a-z0-9]/i.test(segunda)
    ? `${partes[0][0]}${segunda}`.toUpperCase()
    : partes[0].slice(0, 2).toUpperCase();
}

/**
 * Origem da sessão do autor — `Sistema` sem autor, o departamento real quando o
 * payload o traz, senão a plataforma deduzida do `user_agent` do próprio log.
 */
export function origemDoAutor(evento: EventoTrilha): string | null {
  const departamento = texto(evento.depois?.departamento) ?? texto(evento.antes?.departamento);
  if (departamento) return departamento;
  if (!evento.userEmail && !evento.userId) return 'Sistema';
  if (evento.userAgent) return 'Web';
  return 'API';
}

/* ─── Agrupamento por dia (a espinha editorial da timeline) ───────────────── */

export interface GrupoTrilha {
  /** Início do dia (timestamp local) — chave do grupo. */
  diaMs: number;
  /** "Hoje" · "Ontem" · "07 de outubro de 2026". */
  rotulo: string;
  eventos: EventoTrilha[];
}

/**
 * Rótulo do bloco de dia: os dois primeiros dias ganham nome relativo (como na
 * referência) e do terceiro em diante a data por extenso em pt-BR.
 */
export function rotuloDoDia(diaMs: number, hojeMs: number): string {
  if (diaMs === hojeMs) return 'Hoje';
  if (diaMs === hojeMs - DIA_MS) return 'Ontem';
  return new Date(diaMs).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Agrupa os eventos por dia, do mais recente para o mais antigo, preservando a
 * ordem recebida dentro de cada dia. Evento sem data válida cai no grupo de
 * `hojeMs` (nunca some da tela).
 */
export function agruparPorDia(eventos: EventoTrilha[] | null | undefined, hojeMs: number): GrupoTrilha[] {
  const grupos = new Map<number, EventoTrilha[]>();
  (eventos ?? []).forEach((evento) => {
    const data = dataValida(evento.criadoEm);
    const diaMs = data ? inicioDoDia(data) : hojeMs;
    const atual = grupos.get(diaMs);
    if (atual) atual.push(evento);
    else grupos.set(diaMs, [evento]);
  });

  return [...grupos.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([diaMs, lista]) => ({ diaMs, rotulo: rotuloDoDia(diaMs, hojeMs), eventos: lista }));
}

/* ─── Ordenação ───────────────────────────────────────────────────────────── */

export type OrdemTrilha = 'recentes' | 'antigos';

/** Ordena a trilha pelo carimbo do evento (mais recente primeiro por padrão). */
export function ordenarTrilha(
  eventos: EventoTrilha[] | null | undefined,
  ordem: OrdemTrilha = 'recentes'
): EventoTrilha[] {
  const lista = [...(eventos ?? [])];
  return ordem === 'antigos'
    ? lista.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
    : lista.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

/* ─── Filtros ─────────────────────────────────────────────────────────────── */

export interface FiltrosTrilha {
  /** Busca textual livre (ação, autor, registro, entidade, título). */
  busca?: string;
  /** Categoria (chip) ou `todos`. */
  categoria?: CategoriaTrilha | 'todos';
  /** Chave do autor (id/e-mail) ou `todos`. */
  usuario?: string;
  /** Nível derivado ou `todos`. */
  nivel?: NivelTrilha | 'todos';
  /** Ação técnica exata ou `todas`. */
  acao?: string;
  /** Trecho do ID do registro auditado (`registro_id`). */
  registro?: string;
  /** Início do período (`YYYY-MM-DD`, inclusivo). */
  de?: string;
  /** Fim do período (`YYYY-MM-DD`, inclusivo). */
  ate?: string;
}

/** Filtra a trilha por TODAS as dimensões informadas (AND). */
export function filtrarTrilha(
  eventos: EventoTrilha[] | null | undefined,
  filtros: FiltrosTrilha,
  nomePorId?: Map<string, string> | null
): EventoTrilha[] {
  const busca = (filtros.busca ?? '').trim().toLowerCase();
  const de = dataValida(filtros.de)?.getTime();
  const ate = filtros.ate ? (dataValida(filtros.ate)?.getTime() ?? 0) + DIA_MS : undefined;

  return (eventos ?? []).filter((evento) => {
    if (filtros.categoria && filtros.categoria !== 'todos' && categoriaDoEvento(evento) !== filtros.categoria) {
      return false;
    }
    if (filtros.nivel && filtros.nivel !== 'todos' && nivelDoEvento(evento) !== filtros.nivel) return false;
    if (filtros.acao && filtros.acao !== 'todas' && evento.acao !== filtros.acao) return false;
    if (filtros.registro && filtros.registro.trim()) {
      const alvo = (evento.registroId ?? '').toLowerCase();
      if (!alvo.includes(filtros.registro.trim().toLowerCase())) return false;
    }
    if (filtros.usuario && filtros.usuario !== 'todos') {
      const responsavel = responsavelDoEvento(evento, nomePorId);
      if (responsavel.chave !== filtros.usuario) return false;
    }
    if (de !== undefined || ate !== undefined) {
      const quando = dataValida(evento.criadoEm)?.getTime();
      if (quando === undefined) return false;
      if (de !== undefined && quando < de) return false;
      if (ate !== undefined && quando > ate) return false;
    }
    if (busca) {
      const responsavel = responsavelDoEvento(evento, nomePorId);
      const alvo = [
        tituloDoEvento(evento),
        descricaoDoEvento(evento),
        evento.acao,
        evento.tabela,
        evento.registroId,
        evento.id,
        evento.userEmail,
        responsavel.nome,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

/* ─── Resumo (contadores dos chips e do cabeçalho) ────────────────────────── */

export interface ResumoTrilha {
  total: number;
  /** Quantos eventos por categoria — a soma é exatamente `total`. */
  porCategoria: Record<CategoriaTrilha, number>;
  /** Quantos eventos por nível. */
  porNivel: Record<NivelTrilha, number>;
  /** Dias distintos cobertos pela trilha (os blocos da timeline). */
  dias: number;
}

/** Contadores dos chips: nada é inventado — o que não existe conta zero. */
export function resumoTrilha(eventos: EventoTrilha[] | null | undefined): ResumoTrilha {
  const lista = eventos ?? [];
  const porCategoria: Record<CategoriaTrilha, number> = {
    alteracoes: 0,
    calculos: 0,
    documentos: 0,
    status: 0,
    sistema: 0,
  };
  const porNivel: Record<NivelTrilha, number> = { critico: 0, atencao: 0, informativo: 0 };
  const dias = new Set<number>();

  lista.forEach((evento) => {
    porCategoria[categoriaDoEvento(evento)] += 1;
    porNivel[nivelDoEvento(evento)] += 1;
    const data = dataValida(evento.criadoEm);
    if (data) dias.add(inicioDoDia(data));
  });

  return { total: lista.length, porCategoria, porNivel, dias: dias.size };
}

/* ─── Autores e ações disponíveis (opções dos filtros) ────────────────────── */

export interface UsuarioTrilha {
  chave: string;
  nome: string;
  email: string | null;
  total: number;
}

/** Autores presentes na trilha, em ordem alfabética, com a contagem real. */
export function usuariosDaTrilha(
  eventos: EventoTrilha[] | null | undefined,
  nomePorId?: Map<string, string> | null
): UsuarioTrilha[] {
  const mapa = new Map<string, UsuarioTrilha>();
  (eventos ?? []).forEach((evento) => {
    const responsavel = responsavelDoEvento(evento, nomePorId);
    const atual = mapa.get(responsavel.chave);
    if (atual) atual.total += 1;
    else mapa.set(responsavel.chave, { ...responsavel, total: 1 });
  });
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export interface AcaoTrilhaOpcao {
  acao: string;
  total: number;
}

/** Ações técnicas distintas na trilha, da mais para a menos frequente. */
export function acoesDaTrilha(eventos: EventoTrilha[] | null | undefined): AcaoTrilhaOpcao[] {
  const contagem = new Map<string, number>();
  (eventos ?? []).forEach((evento) => {
    if (!evento.acao) return;
    contagem.set(evento.acao, (contagem.get(evento.acao) ?? 0) + 1);
  });
  return [...contagem.entries()]
    .map(([acao, total]) => ({ acao, total }))
    .sort((a, b) => b.total - a.total || a.acao.localeCompare(b.acao, 'pt-BR'));
}

/* ─── Payload técnico (documento do "Ver detalhes", nunca a linha da UI) ──── */

/** Texto completo do evento para área de transferência / evidência técnica. */
export function textoDoEvento(evento: EventoTrilha): string {
  return [
    `Evento: ${tituloDoEvento(evento)}`,
    `Ação: ${evento.acao ?? '—'}`,
    `Data/hora: ${formatarDataHora(evento.criadoEm)}`,
    `Autor: ${evento.userEmail ?? evento.userId ?? 'Sistema (Automático)'}`,
    `Entidade: ${evento.tabela ?? '—'}${evento.registroId ? ` · ${evento.registroId}` : ''}`,
    `ID do log: ${evento.id || '—'}`,
    '',
    'Payload anterior:',
    JSON.stringify(evento.antes ?? null, null, 2),
    '',
    'Payload novo:',
    JSON.stringify(evento.depois ?? null, null, 2),
  ].join('\n');
}

