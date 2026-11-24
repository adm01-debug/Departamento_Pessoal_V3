export interface FolhaItemResumo {
  folha_id: string;
  total_proventos: number | null;
  total_descontos: number | null;
  inss_mes: number | null;
  fgts_mes: number | null;
  irrf_mes: number | null;
}

export interface FolhaCabecalhoResumo {
  id: string;
  status: string;
  folha_itens: FolhaItemResumo[] | null;
}

export interface FolhaResumo {
  id?: string;
  colaboradores: number;
  totalProventos: number;
  totalDescontos: number;
  liquido: number;
  inss: number;
  fgts: number;
  irrf: number;
  custoTotalEmpresa: number;
  status: Record<string, string>;
}

const sum = (items: FolhaItemResumo[], key: keyof FolhaItemResumo): number =>
  items.reduce((total, item) => {
    const value = item[key];
    return total + (typeof value === 'number' ? value : 0);
  }, 0);

/**
 * Derives the dashboard aggregate from the one, already tenant-scoped payroll
 * header. Keeping this pure prevents a relationship filter from accidentally
 * aggregating item rows outside the selected empresa/competência.
 */
export function buildFolhaResumo(folha: FolhaCabecalhoResumo | null): FolhaResumo {
  const items = folha?.folha_itens ?? [];
  const colaboradores = items.length;
  const totalProventos = sum(items, 'total_proventos');
  const totalDescontos = sum(items, 'total_descontos');
  const inss = sum(items, 'inss_mes');
  const irrf = sum(items, 'irrf_mes');
  const fgts = sum(items, 'fgts_mes');
  const hasData = colaboradores > 0;

  return {
    id: folha?.id,
    colaboradores,
    totalProventos,
    totalDescontos,
    inss,
    fgts,
    irrf,
    liquido: totalProventos - totalDescontos,
    custoTotalEmpresa: totalProventos + totalProventos * 0.278 + fgts,
    status: {
      ponto: hasData ? 'importado' : 'pendente',
      lancamentos: hasData ? 'conferido' : 'pendente',
      beneficios: hasData ? 'processado' : 'pendente',
      calculo: hasData ? 'executado' : 'pendente',
      conferencia: 'pendente',
      fechamento: folha?.status ?? 'aberto',
    },
  };
}
