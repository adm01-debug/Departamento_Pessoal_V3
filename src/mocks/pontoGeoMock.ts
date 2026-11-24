/**
 * ============================================================================
 * MOCK VISUAL — painel de Geofencing (Controle de Ponto → Gestão da Equipe →
 * Geofencing).
 *
 * ESCOPO: dados DEMONSTRATIVOS de batidas ao redor de UMA unidade, usados
 * SOMENTE quando o modo real não tem o que mostrar (nenhuma batida no período
 * selecionado). Com registros reais, o painel usa os reais e este arquivo não
 * entra em cena.
 *
 * POR QUE EXISTE: o mapa só faz sentido com coordenadas. Em ambiente sem
 * registros (ou sem `latitude/longitude` gravadas — o app só grava coordenada
 * quando o navegador entrega a leitura), o painel ficaria vazio e a vitrine
 * aprovada desapareceria. Aqui a série é claramente rotulada como demonstração
 * na interface (selo "Demonstração") e NUNCA se mistura com dados reais: ou o
 * painel mostra a vitrine, ou mostra os registros — jamais os dois somados.
 *
 * GATE (mesmo padrão de `pontoFluxoMock.ts` e dos demais `src/mocks/*Mock.ts`):
 * liga somente com as DUAS condições abaixo — logo, nunca em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento);
 *   2. `VITE_PONTO_MOCK=true` no `.env`/`.env.local`.
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env` do
 * `vite dev` — sem ela os testes receberiam estes dados em vez das fixtures.
 *
 * COORDENADAS: a unidade demo fica na Av. Paulista (São Paulo) e cada batida é
 * gerada a uma DISTÂNCIA e um RUMO declarados, com a mesma fórmula inversa de
 * Haversine — assim a série atravessa de fato o pipeline real de cálculo
 * (distância, faixa, situação) e os números do painel são DERIVADOS, não
 * digitados. Não há nenhuma localização fictícia apresentada como registro
 * real: o selo de demonstração acompanha o painel.
 *
 * ── CALIBRAGEM (bate com a referência aprovada) ────────────────────────────
 * Últimos 7 dias : 27 batidas, 0 fora, média 29 m, faixas 8 / 12 / 5 / 2 / 0
 * 7 dias anteriores: 25 batidas, 0 fora, média 33 m
 *   → variações reais do mock: total +8%, dentro +8%, fora 0%, distância -12%
 * Últimos 30 dias: 74 batidas, 2 fora do raio (exercita o estado de alerta)
 *
 * PARA DESATIVAR: defina `VITE_PONTO_MOCK=false` no `.env` e reinicie o
 * `vite dev` — o painel passa a depender exclusivamente dos registros reais.
 * PARA REMOVER DE VEZ: apague este arquivo e o trecho marcado com
 * "MOCK VISUAL — ver src/mocks/pontoGeoMock.ts" em
 * `src/components/ponto/PontoGeofencingPainel.tsx`.
 * ============================================================================
 */
import { addDaysLocal, formatDateLocalISO, parseDateLocalISO, todayLocalISO } from '@/utils/dateLocal';
import type { BatidaGeograficaCrua, UnidadeGeografica } from '@/utils/pontoGeofencing';

/** Raio autorizado da unidade demo (o mesmo padrão de `configuracoes_ponto`). */
export const RAIO_GEO_DEMO_METROS = 100;

/** Unidade de referência da vitrine (Av. Paulista, São Paulo — coordenada real). */
export const UNIDADE_GEO_DEMO: UnidadeGeografica = {
  id: 'unidade-demo-matriz',
  nome: 'Unidade Matriz',
  latitude: -23.561414,
  longitude: -46.655881,
  raioMetros: RAIO_GEO_DEMO_METROS,
};

/** Nomes dos colaboradores da vitrine (mesma ordem usada pelas marcas). */
const NOMES_DEMO = [
  'Carlos Silva',
  'Ana Martins',
  'Rafael Pereira',
  'Juliana Souza',
  'Marcos Lima',
  'Patrícia Alves',
  'Diego Rocha',
  'Fernanda Costa',
  'Bruno Nunes',
] as const;

/**
 * Uma batida da vitrine: dia (atrás de hoje), hora, distância em metros, rumo
 * em graus (0 = norte), índice do nome e origem do registro.
 */
type MarcaDemo = readonly [
  diasAtras: number,
  hora: string,
  distancia: number,
  rumo: number,
  nome: number,
  origem: string,
];

/** Últimos 7 dias — 27 batidas, todas dentro do raio (faixas 8 / 12 / 5 / 2). */
const MARCAS_7_DIAS: readonly MarcaDemo[] = [
  [0, '07:58', 5, 10, 0, 'web'],
  [0, '08:00', 21, 300, 1, 'web'],
  [0, '08:00', 44, 190, 2, 'kiosk'],
  [0, '07:55', 68, 250, 3, 'web'],
  [1, '08:02', 11, 45, 4, 'web'],
  [1, '08:05', 23, 120, 5, 'mobile'],
  [1, '08:01', 7, 80, 6, 'web'],
  [1, '08:10', 48, 330, 7, 'web'],
  [2, '07:57', 13, 220, 8, 'web'],
  [2, '08:03', 25, 15, 0, 'web'],
  [2, '08:00', 52, 140, 1, 'web'],
  [2, '08:07', 9, 280, 2, 'mobile'],
  [3, '08:00', 27, 95, 3, 'web'],
  [3, '08:04', 31, 200, 4, 'web'],
  [3, '08:06', 15, 20, 5, 'kiosk'],
  [3, '07:59', 72, 320, 6, 'web'],
  [4, '08:01', 22, 60, 7, 'web'],
  [4, '08:08', 28, 170, 8, 'web'],
  [4, '08:00', 17, 255, 0, 'web'],
  [4, '08:02', 56, 110, 1, 'mobile'],
  [5, '08:09', 20, 30, 2, 'web'],
  [5, '08:00', 32, 205, 3, 'web'],
  [5, '07:56', 4, 300, 4, 'web'],
  [5, '08:03', 58, 150, 5, 'web'],
  [6, '08:00', 24, 240, 6, 'web'],
  [6, '08:05', 29, 90, 7, 'web'],
  [6, '08:02', 26, 340, 8, 'web'],
];

/** Os 7 dias anteriores — 25 batidas, média 33 m (base da variação real). */
const MARCAS_7_DIAS_ANTERIORES: readonly MarcaDemo[] = [
  [7, '08:01', 5, 35, 0, 'web'],
  [7, '07:58', 6, 315, 1, 'web'],
  [7, '08:04', 7, 160, 2, 'kiosk'],
  [7, '08:00', 9, 240, 3, 'web'],
  [8, '08:06', 11, 80, 4, 'web'],
  [8, '08:02', 13, 290, 5, 'mobile'],
  [8, '07:59', 15, 15, 6, 'web'],
  [8, '08:03', 17, 195, 7, 'web'],
  [9, '08:00', 21, 130, 8, 'web'],
  [9, '08:08', 23, 340, 0, 'web'],
  [9, '08:05', 25, 60, 1, 'kiosk'],
  [9, '08:01', 27, 220, 2, 'web'],
  [10, '08:00', 29, 100, 3, 'web'],
  [10, '08:07', 31, 265, 4, 'web'],
  [10, '08:03', 33, 30, 5, 'mobile'],
  [10, '07:57', 35, 175, 6, 'web'],
  [11, '08:02', 37, 305, 7, 'web'],
  [11, '08:00', 44, 145, 8, 'web'],
  [11, '08:09', 48, 20, 0, 'web'],
  [11, '08:04', 52, 235, 1, 'kiosk'],
  [12, '08:01', 56, 85, 2, 'web'],
  [12, '08:06', 58, 350, 3, 'web'],
  [12, '08:00', 68, 110, 4, 'web'],
  [13, '08:03', 76, 200, 5, 'mobile'],
  [13, '08:00', 79, 300, 6, 'web'],
];

/** Dias 14–29 — 22 batidas, incluindo 2 FORA do raio (estado de alerta). */
const MARCAS_ANTIGAS: readonly MarcaDemo[] = [
  [14, '08:02', 6, 25, 7, 'web'],
  [14, '08:00', 8, 210, 8, 'web'],
  [15, '07:58', 10, 330, 0, 'kiosk'],
  [15, '08:05', 12, 75, 1, 'web'],
  [16, '08:01', 14, 155, 2, 'web'],
  [16, '08:00', 16, 285, 3, 'web'],
  [17, '08:07', 21, 45, 4, 'mobile'],
  [17, '08:03', 24, 260, 5, 'web'],
  [18, '08:00', 27, 120, 6, 'web'],
  [19, '08:04', 30, 340, 7, 'web'],
  [20, '08:01', 33, 190, 8, 'kiosk'],
  [21, '08:06', 36, 15, 0, 'web'],
  [22, '08:00', 38, 230, 1, 'web'],
  [23, '08:02', 42, 100, 2, 'web'],
  [24, '08:05', 47, 310, 3, 'mobile'],
  [25, '08:00', 52, 65, 4, 'web'],
  [26, '08:03', 57, 245, 5, 'web'],
  [27, '08:01', 63, 135, 6, 'kiosk'],
  [28, '08:00', 75, 355, 7, 'web'],
  [28, '08:07', 85, 205, 8, 'web'],
  [29, '08:04', 128, 40, 0, 'web'],
  [29, '08:00', 143, 290, 1, 'mobile'],
];

/**
 * Coordenada de uma marca: a mesma projeção plana (metros → graus) nos dois
 * eixos, com a longitude corrigida pelo cosseno da latitude. Serve para gerar a
 * vitrine em torno da unidade; o painel depois MEDE a distância de volta pelo
 * Haversine real — nenhum valor de distância é entregue pronto.
 */
function coordenadaDaMarca(distanciaMetros: number, rumoGraus: number): { latitude: number; longitude: number } {
  const rad = (rumoGraus * Math.PI) / 180;
  const metrosPorGrau = 111_320;
  const deltaLat = (distanciaMetros * Math.cos(rad)) / metrosPorGrau;
  const deltaLon =
    (distanciaMetros * Math.sin(rad)) / (metrosPorGrau * Math.cos((UNIDADE_GEO_DEMO.latitude * Math.PI) / 180));
  return {
    latitude: UNIDADE_GEO_DEMO.latitude + deltaLat,
    longitude: UNIDADE_GEO_DEMO.longitude + deltaLon,
  };
}

/** Converte uma marca em linha no formato de `batidas_ponto` (com o embed). */
function linhaDaMarca(marca: MarcaDemo, hoje: string): BatidaGeograficaCrua {
  const [diasAtras, hora, distancia, rumo, indiceNome, origem] = marca;
  const base = parseDateLocalISO(hoje) ?? new Date();
  const posicao = coordenadaDaMarca(distancia, rumo);
  const nome = NOMES_DEMO[indiceNome % NOMES_DEMO.length];

  return {
    id: `demo-geo-${diasAtras}-${hora.replace(':', '')}-${indiceNome}-${distancia}`,
    colaborador_id: `demo-colaborador-${indiceNome % NOMES_DEMO.length}`,
    colaborador: { nome_completo: nome, foto_url: null },
    data: formatDateLocalISO(addDaysLocal(base, -diasAtras)),
    // Coluna `time` do Postgres: a hora viaja com segundos, como no banco.
    hora: `${hora}:00`,
    tipo: 'entrada',
    origem,
    latitude: posicao.latitude,
    longitude: posicao.longitude,
    // O booleano gravado é o que o RPC salvaria; o painel recalcula pela
    // distância medida (ver `montarPontos`) — os dois coincidem no raio demo.
    dentro_raio: distancia <= RAIO_GEO_DEMO_METROS,
  };
}

/** Só liga em dev e com opt-in explícito; nunca em produção nem no Vitest. */
export function isPontoGeoMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_PONTO_MOCK === 'true';
}

/**
 * Série demonstrativa de batidas (60 dias de histórico, 74 registros).
 *
 * Devolve linhas no MESMO formato de `batidas_ponto` para que o painel rode o
 * pipeline real (distância, faixa, situação, conformidade) sobre elas — é o que
 * garante que a vitrine não seja um conjunto de números à parte do código.
 */
export function batidasGeoDemonstrativas(hoje: string = todayLocalISO()): BatidaGeograficaCrua[] {
  return [...MARCAS_7_DIAS, ...MARCAS_7_DIAS_ANTERIORES, ...MARCAS_ANTIGAS].map((marca) => linhaDaMarca(marca, hoje));
}
