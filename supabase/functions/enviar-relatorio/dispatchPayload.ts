export type ReportPayloadDescriptor = {
  tipoRelatorio: string;
  formato: string;
};

export function scheduledReportPath(
  empresaId: string,
  tipoRelatorio: string,
  dispatchKeyHash: string,
  contentHash: string,
  formato: string,
): string {
  // Including the content digest prevents two concurrent collectors for the
  // same occurrence from overwriting one path with different bytes.
  return `${empresaId}/${tipoRelatorio}/scheduled-${dispatchKeyHash}-${contentHash}.${formato}`;
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function reportEmailPayload(
  body: ReportPayloadDescriptor,
  totalRegistros: number,
  signedUrl: string,
  generatedAt: Date,
): { subject: string; html: string } {
  return {
    subject: `Relatório: ${body.tipoRelatorio} — ${generatedAt.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`,
    html: `
      <h1>Relatório disponível</h1>
      <p><strong>Tipo:</strong> ${body.tipoRelatorio}</p>
      <p><strong>Formato:</strong> ${body.formato}</p>
      <p><strong>Total de registros:</strong> ${totalRegistros}</p>
      <p><strong>Gerado em:</strong> ${generatedAt.toLocaleString('pt-BR', { timeZone: 'UTC' })}</p>
      <p><strong>Validade do link:</strong> 24 horas</p>
      <p><a href="${signedUrl}" style="background:#84cc16;color:#111;padding:10px 16px;border-radius:6px;text-decoration:none;">Baixar relatório</a></p>
      <p style="color:#666;font-size:12px;">Este e-mail contém apenas metadados. Os dados sensíveis estão protegidos por link assinado e requerem acesso autorizado.</p>
    `,
  };
}
