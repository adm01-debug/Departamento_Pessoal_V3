import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutGrid } from 'lucide-react';
import { usePcsGrades } from '@/hooks/usePcs';

const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Matriz salarial: gerada no banco a partir de amplitude, overlap e pontuação. */
export function PcsGradesTab({ planoId }: { planoId: string | null }) {
  const { grades, isLoading, gerar } = usePcsGrades(planoId);
  const [numGrades, setNumGrades] = useState('8');
  const [salarioBase, setSalarioBase] = useState('');

  if (!planoId) return <p className="p-6 text-sm text-muted-foreground">Selecione um plano para gerar a matriz.</p>;

  const executar = () => {
    const n = Number(numGrades);
    const base = salarioBase.trim() === '' ? null : Number(salarioBase);
    if (!Number.isFinite(n) || n < 2 || n > 30) return;
    if (base !== null && (!Number.isFinite(base) || base <= 0)) return;
    gerar.mutate({ numGrades: Math.trunc(n), salarioBase: base });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/30 rounded-2xl bg-card/50">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="pcs-grades-n">Número de grades</Label>
            <Input id="pcs-grades-n" type="number" min={2} max={30} value={numGrades} onChange={(e) => setNumGrades(e.target.value)} className="md:w-40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pcs-grades-base">Salário do menor cargo (opcional)</Label>
            <Input id="pcs-grades-base" type="number" min={0} value={salarioBase} onChange={(e) => setSalarioBase(e.target.value)} placeholder="Deriva da folha atual" className="md:w-64" />
          </div>
          <Button onClick={executar} disabled={gerar.isPending}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Gerar matriz
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner size="lg" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/30">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Grade</TableHead>
                <TableHead>Faixa de pontos</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Médio</TableHead>
                <TableHead className="text-right">Máximo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((g) => (
                <TableRow key={g.id} className="border-b border-border/10 last:border-0">
                  <TableCell className="py-3 pl-6 text-sm font-bold">{g.nome}</TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {Number(g.pontos_min).toLocaleString('pt-BR')} – {Number(g.pontos_max).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right text-sm">{brl(g.salario_min)}</TableCell>
                  <TableCell className="text-right text-sm font-bold">{brl(g.salario_medio)}</TableCell>
                  <TableCell className="text-right text-sm">{brl(g.salario_max)}</TableCell>
                </TableRow>
              ))}
              {grades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma grade gerada. Avalie os cargos e gere a matriz.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
