export interface FolhaHistoricoRow {
  competencia: string;
  total_proventos: number | null;
  total_colaboradores: number | null;
}

export interface FolhaDashboardResumo {
  totalProventos: number;
  totalDescontos: number;
  fgts: number;
}

export function competenciaParaBanco(competencia: string): string | null {
  if (/^\d{4}-\d{2}$/.test(competencia)) return competencia;

  const match = /^(\d{2})\/(\d{4})$/.exec(competencia);
  if (!match) return null;
  const [, mes, ano] = match;
  return `${ano}-${mes}`;
}

export function competenciaAnterior(competencia: string, meses: number): string | null {
  const databaseCompetencia = competenciaParaBanco(competencia);
  if (!databaseCompetencia) return null;

  const [ano, mes] = databaseCompetencia.split('-').map(Number);
  const date = new Date(Date.UTC(ano, mes - 1 - meses, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function criarDadosTendencia(rows: FolhaHistoricoRow[]) {
  return [...rows]
    .sort((a, b) => a.competencia.localeCompare(b.competencia))
    .map((row) => {
      const total = Number(row.total_proventos ?? 0);
      const colaboradores = Number(row.total_colaboradores ?? 0);
      return {
        month: `${row.competencia.slice(5, 7)}/${row.competencia.slice(2, 4)}`,
        total,
        colaboradores,
        proventosMedios: colaboradores > 0 ? total / colaboradores : 0,
      };
    });
}

export function criarDadosComposicao(resumo?: FolhaDashboardResumo) {
  if (!resumo) return [];

  return [
    { name: 'Proventos', value: Math.max(0, resumo.totalProventos), color: 'hsl(var(--primary))' },
    { name: 'Descontos', value: Math.max(0, resumo.totalDescontos), color: '#f59e0b' },
    { name: 'FGTS', value: Math.max(0, resumo.fgts), color: '#10b981' },
  ].filter((item) => item.value > 0);
}
