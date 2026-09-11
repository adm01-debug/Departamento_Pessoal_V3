/**
 * Métricas derivadas precisam usar contagens do mesmo universo amostral.
 * Latência não é denominador de taxa de erro.
 */
export function calculateErrorRate(errorCount: number, totalQueryCount: number): number {
  if (!Number.isFinite(errorCount) || !Number.isFinite(totalQueryCount) || errorCount < 0 || totalQueryCount < 0) {
    throw new TypeError('Contagens de telemetria devem ser números finitos não negativos');
  }
  if (totalQueryCount === 0) return 0;
  return Math.min(errorCount / totalQueryCount, 1);
}
