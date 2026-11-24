/**
 * ============================================================================
 * COMPETÊNCIAS — CORES DETERMINÍSTICAS DAS TAGS DO CARD DE VAGA.
 *
 * A mesma competência recebe SEMPRE a mesma cor, independentemente da vaga, da
 * posição da tag no card ou da ordem em que os requisitos foram cadastrados.
 * Nada é sorteado por render: o nome é normalizado (sem acentos/caixa) e
 * consultado primeiro no mapa explícito; o que não estiver lá cai num hash
 * estável do próprio texto.
 *
 * As nove competências da referência visual têm hex FIXO (tabela aprovada). As
 * demais usam uma paleta fechada de tons igualmente suaves, escolhidos para
 * conviver com o navy do card e com os tokens do Design System (info, success,
 * warning, chart-4, aqua). Nenhuma classe é montada por interpolação: o scanner
 * do Tailwind precisa ler os literais em build-time.
 *
 * As tags são pills de 24px (`h-6`): fundo translúcido (12%), borda discreta
 * (30%) e texto na cor cheia — sem glow e sem sombra.
 * ============================================================================
 */
export interface TemaCompetencia {
  /** Texto na cor cheia da família. */
  texto: string;
  /** Fundo translúcido da MESMA família. */
  fundo: string;
  /** Borda colorida discreta. */
  borda: string;
}

type FamiliaCompetencia =
  | 'ciano'
  | 'ambar'
  | 'lavanda'
  | 'aqua'
  | 'azul'
  | 'verde'
  | 'violeta'
  | 'teal'
  | 'esmeralda'
  | 'indigo'
  | 'rosa'
  | 'laranja'
  | 'lima'
  | 'ceu'
  | 'magenta';

const TEMAS: Record<FamiliaCompetencia, TemaCompetencia> = {
  // ── Nove competências da referência (hex exatos) ──────────────────────────
  ciano: { texto: 'text-[#38bdf8]', fundo: 'bg-[#38bdf8]/12', borda: 'border-[#38bdf8]/30' },
  ambar: { texto: 'text-[#facc15]', fundo: 'bg-[#facc15]/12', borda: 'border-[#facc15]/30' },
  lavanda: { texto: 'text-[#a78bfa]', fundo: 'bg-[#a78bfa]/12', borda: 'border-[#a78bfa]/30' },
  aqua: { texto: 'text-[#22d3ee]', fundo: 'bg-[#22d3ee]/12', borda: 'border-[#22d3ee]/30' },
  azul: { texto: 'text-[#60a5fa]', fundo: 'bg-[#60a5fa]/12', borda: 'border-[#60a5fa]/30' },
  verde: { texto: 'text-[#4ade80]', fundo: 'bg-[#4ade80]/12', borda: 'border-[#4ade80]/30' },
  violeta: { texto: 'text-[#c084fc]', fundo: 'bg-[#c084fc]/12', borda: 'border-[#c084fc]/30' },
  teal: { texto: 'text-[#2dd4bf]', fundo: 'bg-[#2dd4bf]/12', borda: 'border-[#2dd4bf]/30' },
  esmeralda: { texto: 'text-[#34d399]', fundo: 'bg-[#34d399]/12', borda: 'border-[#34d399]/30' },
  // ── Reserva determinística (mesma linguagem, matizes ainda não usados) ────
  indigo: { texto: 'text-[#818cf8]', fundo: 'bg-[#818cf8]/12', borda: 'border-[#818cf8]/30' },
  rosa: { texto: 'text-[#f472b6]', fundo: 'bg-[#f472b6]/12', borda: 'border-[#f472b6]/30' },
  laranja: { texto: 'text-[#fb923c]', fundo: 'bg-[#fb923c]/12', borda: 'border-[#fb923c]/30' },
  lima: { texto: 'text-[#a3e635]', fundo: 'bg-[#a3e635]/12', borda: 'border-[#a3e635]/30' },
  ceu: { texto: 'text-[#7dd3fc]', fundo: 'bg-[#7dd3fc]/12', borda: 'border-[#7dd3fc]/30' },
  magenta: { texto: 'text-[#e879f9]', fundo: 'bg-[#e879f9]/12', borda: 'border-[#e879f9]/30' },
};

/** Chave normalizada → família. Só as competências com cor aprovada. */
const CORES_APROVADAS: Record<string, FamiliaCompetencia> = {
  sql: 'ciano',
  'power bi': 'ambar',
  powerbi: 'ambar',
  python: 'lavanda',
  react: 'aqua',
  typescript: 'azul',
  'node.js': 'verde',
  'node js': 'verde',
  nodejs: 'verde',
  recrutamento: 'violeta',
  'people analytics': 'teal',
  'excel avancado': 'esmeralda',
  // "Excel" sozinho é a mesma família semântica da planilha — mantém o verde
  // mesmo quando o cadastro não escreve "avançado".
  excel: 'esmeralda',
};

/** Ordem fixa da reserva — o hash sempre aponta para a mesma posição. */
const FAMILIAS_RESERVA: FamiliaCompetencia[] = [
  'indigo',
  'rosa',
  'laranja',
  'lima',
  'ceu',
  'magenta',
  'ciano',
  'lavanda',
  'teal',
];

/** Minúsculas, sem acentos e com espaços colapsados — chave estável por nome. */
export function normalizarCompetencia(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tema da competência. Competências aprovadas usam o mapa explícito; as demais
 * caem num hash determinístico (soma polinomial dos caracteres) da reserva.
 * O índice da tag no card NÃO participa da decisão.
 */
export function temaDaCompetencia(competencia: string): TemaCompetencia {
  const chave = normalizarCompetencia(competencia);
  const aprovada = CORES_APROVADAS[chave];
  if (aprovada) return TEMAS[aprovada];

  let hash = 0;
  for (let i = 0; i < chave.length; i += 1) {
    hash = (hash * 31 + chave.charCodeAt(i)) >>> 0;
  }
  return TEMAS[FAMILIAS_RESERVA[hash % FAMILIAS_RESERVA.length]];
}
