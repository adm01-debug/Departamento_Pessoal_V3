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

/**
 * A métricas de disponibilidade só pode declarar o sistema saudável quando
 * todas as dependências que ela própria publica como obrigatórias responderam.
 * Retornar 0/1 mantém o contrato Prometheus das gauges.
 */
export function calculateOverallHealthStatus(
  databaseOk: boolean,
  telemetryOk: boolean,
  bridgeHealthCheckOk: boolean,
): 0 | 1 {
  return databaseOk && telemetryOk && bridgeHealthCheckOk ? 1 : 0;
}

/**
 * Falha fechada: um scrape parcial ou degradado recebe resposta HTTP 503,
 * impedindo que monitores interpretem métricas incompletas como saudáveis.
 */
export function calculateMetricsHttpStatus(
  overallHealthStatus: number,
  telemetryCollectionStatus: number,
): 200 | 503 {
  return overallHealthStatus === 1 && telemetryCollectionStatus === 1 ? 200 : 503;
}
