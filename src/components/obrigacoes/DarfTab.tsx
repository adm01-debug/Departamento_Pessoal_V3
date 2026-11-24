import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface DarfTabProps {
  totalFgts: number;
  totalInss: number;
}

export function DarfTab({ totalFgts, totalInss }: DarfTabProps) {
  const darfs = [
    { label: 'IRRF (Código 0561)', value: formatCurrency(totalInss * 0.15), color: 'text-warning', venc: 'Venc. dia 20 do mês seguinte' },
    { label: 'PIS/COFINS (Código 8109)', value: formatCurrency(totalFgts * 0.065 + totalInss * 0.03), color: 'text-info', venc: 'Venc. dia 25 do mês seguinte' },
    { label: 'CSLL (Código 2372)', value: formatCurrency(totalInss * 0.09), color: 'text-primary', venc: 'Venc. último dia útil do mês' },
  ];

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Shield className="h-4 w-4 text-warning" />DARF — Documento de Arrecadação de Receitas Federais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {darfs.map(({ label, value, color, venc }) => (
              <Card key={label} className="border-border/30 rounded-xl">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground font-body mb-1">{label}</p>
                  <p className={`text-xl font-medium font-display ${color}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground font-body mt-1">{venc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground font-body flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-warning" />
              Os valores de DARF são estimativas baseadas nos encargos da folha. Consulte seu contador para valores exatos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
