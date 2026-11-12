/**
 * Valor exibido na lista de simulações fiscais.
 * O SimuladorWhatIf salva `resultado.custoTotal`; registros legados usam `impacto_total`.
 */
export function resumoSimulacao(resultado: unknown): { rotulo: string; valor: number } {
  const r = (resultado ?? {}) as { custoTotal?: unknown; impacto_total?: unknown };
  if (typeof r.custoTotal === 'number' && Number.isFinite(r.custoTotal)) {
    return { rotulo: 'Custo Total Estimado', valor: r.custoTotal };
  }
  const impacto = typeof r.impacto_total === 'number' && Number.isFinite(r.impacto_total) ? r.impacto_total : 0;
  return { rotulo: 'Impacto Estimado', valor: impacto };
}
