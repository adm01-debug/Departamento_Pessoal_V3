/**
 * ============================================================================
 * GEOFENCING DO CONTROLE DE PONTO — derivações puras (sem React, sem rede).
 *
 * Tudo o que o painel de Geofencing AFIRMA sobre os registros é calculado aqui:
 * distância até a unidade, situação (dentro/fora do raio), faixas de distância,
 * conformidade do período, variação contra o período anterior e a série diária
 * dos KPIs. Nenhum componente repete essas contas — assim os quatro KPIs, o
 * mapa, o gráfico de distância e a tabela nunca divergem entre si.
 *
 * ── DE ONDE VEM A DISTÂNCIA ─────────────────────────────────────────────────
 * `batidas_ponto` tem a coluna `distancia_local_metros`, mas o RPC
 * `registrar_batida_ponto` NUNCA a preenche (ele grava apenas `dentro_raio`).
 * Logo, a distância é DERIVADA das coordenadas reais: `distancia_local_metros`
 * quando existir (dado gravado manda) e, no caso normal, a distância geodésica
 * entre a batida e a unidade — a MESMA fórmula de `pontoService` (Haversine,
 * raio terrestre de 6.371 km), para o número da tela bater com o que decidiu a
 * conformidade no momento do registro.
 *
 * A situação (`dentroRaio`) é recalculada por `distancia <= raio` em vez de
 * confiar só no booleano gravado: o raio pode ter sido alterado depois da
 * batida, e o painel desenha o perímetro do raio ATUAL — usar o booleano
 * histórico faria marcador, KPI e barra discordarem do círculo na tela.
 * ============================================================================
 */
import { addDaysLocal, formatDateLocalISO, parseDateLocalISO, todayLocalISO } from '@/utils/dateLocal';

/** Raio da Terra em metros — idêntico ao `R` de `pontoService`. */
const RAIO_TERRA_METROS = 6371e3;

/** Períodos oferecidos pelo filtro do mapa. */
export type PeriodoGeo = 'hoje' | '7d' | '30d' | 'personalizado';

/** Intervalo fechado de datas locais no formato `yyyy-MM-dd`. */
export interface IntervaloGeo {
  inicio: string;
  fim: string;
}

/** Opções do filtro de período, na ordem em que aparecem no seletor. */
export const PERIODOS_GEO: readonly { valor: PeriodoGeo; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
  { valor: 'personalizado', rotulo: 'Período personalizado' },
];

/** Unidade geográfica usada como referência do perímetro autorizado. */
export interface UnidadeGeografica {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  /** Raio autorizado em metros (`configuracoes_ponto.raio_maximo_metros`). */
  raioMetros: number;
}

/** Batida já posicionada geograficamente (o que o mapa e os cards consomem). */
export interface PontoGeografico {
  /** Identidade estável para listas/keys (`id` da batida quando existe). */
  id: string;
  colaboradorId: string | null;
  colaboradorNome: string;
  colaboradorFoto: string | null;
  /** Data local `yyyy-MM-dd`. */
  data: string | null;
  /** Hora `HH:mm`. */
  hora: string | null;
  tipo: string | null;
  origem: string | null;
  latitude: number;
  longitude: number;
  /** Distância até a unidade, em metros (arredondada). */
  distanciaMetros: number;
  /** `true` quando a batida está dentro do raio autorizado atual. */
  dentroRaio: boolean;
}

/** Faixa de distância do gráfico de distribuição. */
export interface FaixaDistancia {
  chave: string;
  rotulo: string;
  minimo: number;
  /** Limite superior INCLUSIVO; `null` na última faixa (acima do raio). */
  maximo: number | null;
  quantidade: number;
  /** Participação no total de registros (0–100, com decimais preservados). */
  percentual: number;
  /** `true` na faixa que representa os registros além do raio autorizado. */
  foraDoRaio: boolean;
}

/** Resumo do período — numerador/denominador de todos os KPIs. */
export interface ResumoGeo {
  total: number;
  dentro: number;
  fora: number;
  /** Percentual de registros dentro do raio (0–100, com decimais). */
  percentualConformidade: number;
  /** Percentual de registros fora do raio (0–100, com decimais). */
  percentualFora: number;
  /** Distância média em metros (0 quando não há registros). */
  distanciaMedia: number;
}

/** Linha crua de `batidas_ponto` (com o embed do colaborador). */
export interface BatidaGeograficaCrua {
  id?: string | null;
  colaborador_id?: string | null;
  colaborador?: { nome_completo?: string | null; foto_url?: string | null } | null;
  data?: string | null;
  hora?: string | null;
  tipo?: string | null;
  origem?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  dentro_raio?: boolean | null;
  distancia_local_metros?: number | string | null;
}

/** Converte um valor cru (numeric do Postgres vem como string) em número finito. */
function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

/**
 * Distância geodésica em metros entre dois pontos (Haversine).
 *
 * Mesma implementação de `pontoService.getDistance` — se a fórmula daqui
 * divergisse da usada no registro, uma batida poderia aparecer como "dentro" no
 * mapa e ter sido gravada como "fora" no banco.
 */
export function distanciaEmMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return RAIO_TERRA_METROS * c;
}

/**
 * Intervalo de datas do período escolhido.
 *
 * `hoje` é o PRÓPRIO dia; `7d`/`30d` são janelas fechadas que TERMINAM hoje e
 * incluem o dia de hoje (7 dias = hoje + 6 anteriores), como o card "Últimas
 * Batidas" faz com o dia corrente.
 */
export function intervaloDoPeriodo(periodo: PeriodoGeo, hoje: string = todayLocalISO()): IntervaloGeo {
  const base = parseDateLocalISO(hoje) ?? new Date();
  const dias = periodo === '7d' ? 6 : periodo === '30d' ? 29 : 0;
  return {
    inicio: formatDateLocalISO(addDaysLocal(base, -dias)),
    fim: formatDateLocalISO(base),
  };
}

/**
 * Intervalo imediatamente ANTERIOR, com a mesma duração — base do indicador de
 * variação percentual dos KPIs. Sem ele não há comparação, e o painel omite o
 * indicador em vez de inventar um número.
 */
export function intervaloAnterior(intervalo: IntervaloGeo): IntervaloGeo {
  const inicio = parseDateLocalISO(intervalo.inicio);
  const fim = parseDateLocalISO(intervalo.fim);
  if (!inicio || !fim) return intervalo;
  const dias = Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 86_400_000));
  return {
    inicio: formatDateLocalISO(addDaysLocal(inicio, -(dias + 1))),
    fim: formatDateLocalISO(addDaysLocal(inicio, -1)),
  };
}

/** Normaliza a hora do Postgres (`08:12:00`) para o rótulo da tela (`08:12`). */
export function horaCurta(hora: string | null | undefined): string {
  const bruta = String(hora ?? '').trim();
  if (!bruta) return '--:--';
  return bruta.slice(0, 5);
}

/** Iniciais do colaborador para o avatar (2 letras, como no card de batidas). */
export function iniciaisDoNome(nome: string | null | undefined, alternativa = '—'): string {
  const partes = String(nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return alternativa;
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/** Distância legível: metros até 999, quilômetros a partir de 1 km. */
export function formatarDistancia(metros: number | null | undefined): string {
  const valor = numero(metros);
  if (valor === null) return '—';
  if (valor < 1000) return `${Math.round(valor)} m`;
  return `${(valor / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/**
 * Converte as batidas cruas em pontos geográficos, calculando distância e
 * situação. Registros sem coordenada válida são DESCARTADOS (não há como
 * posicioná-los no mapa) — quem chama compara o tamanho das duas listas para
 * avisar quantos ficaram de fora, em vez de fingir uma posição.
 */
export function montarPontos(batidas: readonly BatidaGeograficaCrua[], unidade: UnidadeGeografica): PontoGeografico[] {
  const pontos: PontoGeografico[] = [];

  batidas.forEach((batida, indice) => {
    const latitude = numero(batida.latitude);
    const longitude = numero(batida.longitude);
    if (latitude === null || longitude === null) return;
    // Coordenada (0, 0) é o "sem GPS" que muitos aparelhos gravam: não é um
    // ponto no Golfo da Guiné, é ausência de leitura.
    if (latitude === 0 && longitude === 0) return;

    const distanciaGravada = numero(batida.distancia_local_metros);
    const distancia =
      distanciaGravada !== null
        ? distanciaGravada
        : distanciaEmMetros(unidade.latitude, unidade.longitude, latitude, longitude);

    const identidade =
      batida.id ?? `${batida.colaborador_id ?? 'batida'}-${batida.data ?? ''}-${batida.hora ?? ''}-${indice}`;

    pontos.push({
      id: String(identidade),
      colaboradorId: batida.colaborador_id ?? null,
      colaboradorNome: String(batida.colaborador?.nome_completo ?? '').trim() || 'Colaborador',
      colaboradorFoto: batida.colaborador?.foto_url ?? null,
      data: batida.data ?? null,
      hora: horaCurta(batida.hora),
      tipo: batida.tipo ?? null,
      origem: batida.origem ?? null,
      latitude,
      longitude,
      distanciaMetros: Math.round(distancia),
      dentroRaio: distancia <= unidade.raioMetros,
    });
  });

  return pontos;
}

/** Resumo (totais, conformidade e distância média) de uma lista de pontos. */
export function resumoGeo(pontos: readonly PontoGeografico[]): ResumoGeo {
  const total = pontos.length;
  if (total === 0) {
    return { total: 0, dentro: 0, fora: 0, percentualConformidade: 0, percentualFora: 0, distanciaMedia: 0 };
  }

  const dentro = pontos.filter((ponto) => ponto.dentroRaio).length;
  const fora = total - dentro;
  const somaDistancias = pontos.reduce((soma, ponto) => soma + ponto.distanciaMetros, 0);

  return {
    total,
    dentro,
    fora,
    percentualConformidade: (dentro / total) * 100,
    percentualFora: (fora / total) * 100,
    distanciaMedia: somaDistancias / total,
  };
}

/**
 * Passo (largura) das faixas de distância.
 *
 * A referência desenha cinco faixas de 20 m para um raio de 100 m. Para raios
 * maiores o passo cresce para que o gráfico continue com ~5 colunas legíveis em
 * vez de 20 colunas ilegíveis — nunca assumindo 100 m, que é só a configuração
 * padrão do sistema (`configuracoes_ponto.raio_maximo_metros`).
 */
export function passoDaFaixa(raioMetros: number): number {
  const raio = numero(raioMetros);
  if (raio === null || raio <= 0) return 20;
  if (raio <= 100) return 20;
  if (raio <= 250) return 50;
  if (raio <= 500) return 100;
  if (raio <= 1000) return 200;
  return Math.ceil(raio / 5 / 100) * 100;
}

/**
 * Faixas de distância do período, com a ÚLTIMA faixa sempre representando os
 * registros além do raio autorizado (`foraDoRaio: true`) — é o que permite ao
 * gráfico mostrar irregularidade em vez de escondê-la.
 */
export function faixasDeDistancia(pontos: readonly PontoGeografico[], raioMetros: number): FaixaDistancia[] {
  const passo = passoDaFaixa(raioMetros);
  const limite = Math.max(1, Math.ceil(raioMetros / passo)) * passo;
  // Faixas DENTRO do raio + a faixa final (além do raio).
  const faixasInternas = Math.max(1, Math.ceil(limite / passo));
  const total = pontos.length;

  const contagens = new Array<number>(faixasInternas + 1).fill(0);

  pontos.forEach((ponto) => {
    const distancia = Math.max(0, ponto.distanciaMetros);
    // Distância exatamente igual ao raio ainda está DENTRO da última faixa;
    // só o que passa do limite cai na faixa "acima do raio".
    const indice = distancia > limite ? faixasInternas : Math.min(Math.floor(distancia / passo), faixasInternas - 1);
    contagens[indice] += 1;
  });

  return contagens.map((quantidade, indice) => {
    const minimo = indice * passo;
    const ultima = indice === contagens.length - 1;
    return {
      chave: ultima ? 'acima' : `${minimo}`,
      rotulo: ultima ? `> ${limite} m` : `${minimo} – ${minimo + passo} m`,
      minimo,
      maximo: ultima ? null : minimo + passo,
      quantidade,
      percentual: total > 0 ? (quantidade / total) * 100 : 0,
      foraDoRaio: ultima,
    };
  });
}

/**
 * Variação percentual entre dois períodos, arredondada em pontos inteiros.
 *
 * Regras (as mesmas em todo o painel):
 *   • `anterior = 0` e `atual = 0` → `0` (nada mudou: nenhuma irregularidade
 *     nos dois períodos é estabilidade de fato, não ausência de dado);
 *   • `anterior = 0` e `atual > 0` → `null` (não existe base percentual;
 *     qualquer número seria invenção);
 *   • demais casos → variação arredondada, podendo ser negativa.
 * Com `null`, o KPI esconde o indicador em vez de exibir "0%".
 */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior)) return null;
  if (anterior === 0) return atual === 0 ? 0 : null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

/**
 * Contagem de registros por dia do intervalo (para o sparkline dos KPIs).
 *
 * Devolve um valor por dia, inclusive os dias sem batida (zero), para o traço
 * não distorcer a leitura do período.
 */
export function serieDiaria(pontos: readonly PontoGeografico[], intervalo: IntervaloGeo): number[] {
  const inicio = parseDateLocalISO(intervalo.inicio);
  const fim = parseDateLocalISO(intervalo.fim);
  if (!inicio || !fim || fim < inicio) return [];

  const dias: string[] = [];
  for (let atual = inicio; atual <= fim; atual = addDaysLocal(atual, 1)) {
    dias.push(formatDateLocalISO(atual));
    if (dias.length > 366) break;
  }

  const contagem = new Map<string, number>(dias.map((dia) => [dia, 0]));
  pontos.forEach((ponto) => {
    if (ponto.data && contagem.has(ponto.data)) contagem.set(ponto.data, (contagem.get(ponto.data) ?? 0) + 1);
  });

  return dias.map((dia) => contagem.get(dia) ?? 0);
}

/**
 * Registros recentes: os mais novos primeiro (data desc, hora desc).
 *
 * A hora já vem normalizada em `HH:mm` por `montarPontos`, então comparar as
 * strings é suficiente para ordenar dentro do mesmo dia.
 */
export function registrosRecentes(pontos: readonly PontoGeografico[], limite?: number): PontoGeografico[] {
  const ordenados = [...pontos].sort((a, b) => {
    const data = String(b.data ?? '').localeCompare(String(a.data ?? ''));
    if (data !== 0) return data;
    return String(b.hora ?? '').localeCompare(String(a.hora ?? ''));
  });
  return typeof limite === 'number' ? ordenados.slice(0, Math.max(0, limite)) : ordenados;
}

/** Data curta da tabela: `Hoje` no dia corrente, `dd/MM` nos demais. */
export function rotuloDataCurta(data: string | null | undefined, hoje: string = todayLocalISO()): string {
  const iso = String(data ?? '').trim();
  if (!iso) return '—';
  if (iso === hoje) return 'Hoje';
  const partes = iso.split('-');
  if (partes.length !== 3) return iso;
  return `${partes[2]}/${partes[1]}`;
}

/** Rótulo da origem do registro, com os mesmos nomes do card "Últimas Batidas". */
export function rotuloOrigemGeo(origem: string | null | undefined): string {
  const chave = String(origem ?? '')
    .trim()
    .toLowerCase();
  if (!chave) return 'Registrado';
  if (chave.includes('offline')) return 'Offline';
  if (chave.includes('kiosk') || chave.includes('totem')) return 'Kiosk';
  if (chave.includes('mobile') || chave.includes('app')) return 'Mobile';
  if (chave.includes('afd') || chave.includes('import')) return 'Importado';
  if (chave.includes('web')) return 'Web';
  return chave.charAt(0).toUpperCase() + chave.slice(1);
}
