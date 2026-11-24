/**
 * ============================================================================
 * TURNOS & ESCALAS — COR DO TURNO → TINTA DA CÉLULA (puro, sem React).
 * ============================================================================
 *
 * As cores dos turnos são um dado do CLIENTE (`turnos.cor`, hex escolhido no
 * cadastro) e são identificadores visuais aprovados — o calendário precisa
 * pintar a célula com a cor REAL de cada turno, não com uma paleta fixa do
 * Design System. Como o fundo da célula é translúcido (a referência usa tinta
 * suave, não cor cheia), aqui mora a ÚNICA conversão `#rrggbb` → `rgba(...)`.
 *
 * Por que `rgba` e não `color-mix`/`opacity`:
 *   • `opacity` no contêiner apagaria o texto junto com o fundo;
 *   • `color-mix` exige o navegador resolver a mistura a cada pintura e não
 *     aceita hex de origem sem `color-mix(in srgb, #hex 14%, transparent)` —
 *     funciona, mas o resultado é o mesmo por um caminho menos previsível em
 *     impressão/PDF;
 *   • `rgba` é a forma que qualquer navegador do parque entende e a que o
 *     resto do app já usa em estilos inline com cor de banco.
 *
 * Cor ausente/inválida cai no cinza do `--muted-foreground` do tema: a célula
 * continua legível em vez de virar transparente ou preta.
 * ============================================================================
 */

/** Cinza neutro do tema — fallback para turno sem cor cadastrada. */
export const COR_TURNO_PADRAO = '#64748b';

/** `#abc` → `#aabbcc`; qualquer coisa fora de hex válido → cor padrão. */
export function normalizarHex(cor?: string | null): string {
  if (!cor) return COR_TURNO_PADRAO;
  const limpa = cor.trim();
  const curta = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(limpa);
  if (curta) return `#${curta[1]}${curta[1]}${curta[2]}${curta[2]}${curta[3]}${curta[3]}`.toLowerCase();
  const longa = /^#?([0-9a-f]{6})$/i.exec(limpa);
  if (longa) return `#${longa[1]}`.toLowerCase();
  return COR_TURNO_PADRAO;
}

/**
 * Matiz / saturação / brilho — a base do seletor de cor do cadastro de turnos.
 *
 * `h` em GRAUS (0–360), `s` e `v` normalizados em 0–1. HSV (e não HSL) porque é
 * o modelo em que a área de saturação/brilho e a faixa de matiz do seletor são
 * desenhadas: dois gradientes (`branco → matiz → preto`) e um arco-íris.
 */
export interface CorHsv {
  h: number;
  s: number;
  v: number;
}

/** `#rrggbb` → HSV. Cor ausente/inválida cai na cor padrão (nunca `NaN`). */
export function hexParaHsv(cor?: string | null): CorHsv {
  const hex = normalizarHex(cor);
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const maximo = Math.max(r, g, b);
  const minimo = Math.min(r, g, b);
  const delta = maximo - minimo;

  let h = 0;
  if (delta > 0) {
    if (maximo === r) h = 60 * (((g - b) / delta) % 6);
    else if (maximo === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;

  return { h, s: maximo === 0 ? 0 : delta / maximo, v: maximo };
}

/** HSV → `#rrggbb` minúsculo. Valores fora da faixa são limitados, não rejeitados. */
export function hsvParaHex({ h, s, v }: CorHsv): string {
  const matiz = ((h % 360) + 360) % 360;
  const saturacao = Math.min(1, Math.max(0, s));
  const brilho = Math.min(1, Math.max(0, v));

  const c = brilho * saturacao;
  const x = c * (1 - Math.abs(((matiz / 60) % 2) - 1));
  const m = brilho - c;

  let rgb: [number, number, number];
  if (matiz < 60) rgb = [c, x, 0];
  else if (matiz < 120) rgb = [x, c, 0];
  else if (matiz < 180) rgb = [0, c, x];
  else if (matiz < 240) rgb = [0, x, c];
  else if (matiz < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const canal = (valor: number) =>
    Math.round(Math.min(1, Math.max(0, valor + m)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${canal(rgb[0])}${canal(rgb[1])}${canal(rgb[2])}`;
}

/**
 * Hex → `rgba()` com o alfa pedido (0–1).
 *
 * `hexParaRgba('#22c55e', 0.14)` → `rgba(34, 197, 94, 0.14)`.
 * O alfa é limitado a [0, 1] para um valor inválido nunca gerar cor ilegível.
 */
export function hexParaRgba(cor: string | null | undefined, alfa: number): string {
  const hex = normalizarHex(cor);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = Math.min(1, Math.max(0, Number.isFinite(alfa) ? alfa : 1));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
