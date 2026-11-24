/**
 * @fileoverview Conversões de duração do módulo de Controle de Ponto.
 *
 * O domínio de ponto guarda tempo em dois formatos diferentes:
 *  - `registros_ponto.horas_trabalhadas | horas_extras | horas_falta` como
 *    TEXTO `HH:MM` (gerado pela edge function `processar-ponto` com
 *    `String(...).padStart(2, '0')`);
 *  - `registros_ponto.atraso_minutos` como INTEIRO de minutos.
 *
 * Cada card que precisava somar esses valores reimplementava o parser — e as
 * versões divergiam (uma fazia `split(':')`, outra `Number(texto)` e obtinha
 * `NaN`), então o mesmo dia aparecia com totais diferentes em cards vizinhos.
 * Aqui existe uma única regra, coberta por
 * `src/utils/__tests__/pontoDuracao.test.ts`.
 *
 * Contrato defensivo: entrada ausente/inválida devolve `0`, para o card exibir
 * `00:00` em vez de `NaN:NaN`.
 */

/** Minutos em uma hora — evita o número solto `60` espalhado nos conversores. */
export const MINUTOS_POR_HORA = 60;

/**
 * Converte uma duração para minutos.
 *
 * Aceita `'HH:MM'`, `'HH:MM:SS'`, `'-HH:MM'` (débito) e número de horas
 * decimais (`7.5` → 450).
 */
export function minutosDeDuracao(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined || valor === '') return 0;

  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? Math.round(valor * MINUTOS_POR_HORA) : 0;
  }

  const texto = String(valor).trim();
  const negativo = texto.startsWith('-');
  const partes = (negativo ? texto.slice(1) : texto).split(':');

  const horas = Number(partes[0] ?? 0);
  if (!Number.isFinite(horas)) return 0;

  const minutos = Number(partes[1] ?? 0);
  const total = horas * MINUTOS_POR_HORA + (Number.isFinite(minutos) ? minutos : 0);

  return negativo ? -total : total;
}

/**
 * Formata minutos como `HH:MM` (sempre dois dígitos de hora e minuto).
 *
 * `opcoes.sinal` prefixa `+` em valores positivos — usado em saldos, onde o
 * sinal é informação (crédito × débito) e não decoração. Negativos já saem
 * com `-` sempre.
 */
export function formatarMinutosDuracao(minutos: number, opcoes: { sinal?: boolean } = {}): string {
  if (!Number.isFinite(minutos)) return '--:--';

  const total = Math.round(minutos);
  const absoluto = Math.abs(total);
  const horas = Math.floor(absoluto / MINUTOS_POR_HORA);
  const resto = absoluto % MINUTOS_POR_HORA;
  const corpo = `${String(horas).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;

  if (total < 0) return `-${corpo}`;
  return opcoes.sinal && total > 0 ? `+${corpo}` : corpo;
}

/**
 * Duração em horas decimais — formato que os gráficos do Recharts consomem
 * (eixo numérico). Arredonda em 2 casas para o tooltip não exibir dízima.
 */
export function horasDecimaisDeMinutos(minutos: number): number {
  if (!Number.isFinite(minutos)) return 0;
  return Math.round((minutos / MINUTOS_POR_HORA) * 100) / 100;
}
