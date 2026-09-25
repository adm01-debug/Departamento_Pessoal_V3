import type { ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColaboradorStatus } from '@/components/ui/status-badge';

const TIPO_CONTRATO_LABEL: Record<string, string> = {
  clt: 'CLT', pj: 'PJ', estagio: 'Estágio', temporario: 'Temporário',
  intermitente: 'Intermitente', jovem_aprendiz: 'Jovem Aprendiz',
};

// Mesmo cálculo de "tempo de casa" já usado no cabeçalho do Dossiê
// (ColaboradorDetalhesPage.tsx) — derivado da data de admissão real.
function formatTempoCasa(dataAdmissao?: string | null): string | null {
  if (!dataAdmissao) return null;
  const inicio = new Date(dataAdmissao);
  if (Number.isNaN(inicio.getTime())) return null;
  const hoje = new Date();
  let anos = hoje.getFullYear() - inicio.getFullYear();
  let meses = hoje.getMonth() - inicio.getMonth();
  if (hoje.getDate() < inicio.getDate()) meses -= 1;
  if (meses < 0) { anos -= 1; meses += 12; }
  if (anos < 0) return null;
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
  if (meses > 0 || anos === 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ');
}

function formatDateBR(iso?: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return null;
  return `${d}/${m}/${y}`;
}

interface JourneySummaryProps {
  colaborador?: { data_admissao?: string; status?: string; tipo_contrato?: string } | null;
  totalEventos: number;
  ultimaMovimentacao?: string;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function JourneySummary({ colaborador, totalEventos, ultimaMovimentacao }: JourneySummaryProps) {
  const tempoCasa = formatTempoCasa(colaborador?.data_admissao);
  const ultimaData = formatDateBR(ultimaMovimentacao);
  const vinculo = colaborador?.tipo_contrato ? (TIPO_CONTRATO_LABEL[colaborador.tipo_contrato] ?? colaborador.tipo_contrato) : null;

  return (
    <Card className="rounded-xl border-border/30">
      <CardHeader className="pt-4 pb-1.5">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <BarChart3 className="h-5 w-5 text-primary" /> Resumo da Jornada
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/20 pt-0">
        <Row label="Tempo de empresa" value={tempoCasa} />
        <Row label="Total de eventos" value={totalEventos} />
        <Row label="Última movimentação" value={ultimaData} />
        <Row label="Vínculo atual" value={vinculo} />
        {colaborador?.status && <Row label="Status" value={<ColaboradorStatus status={colaborador.status} />} />}
      </CardContent>
    </Card>
  );
}
