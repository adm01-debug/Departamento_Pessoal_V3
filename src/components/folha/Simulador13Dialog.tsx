import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Calculator, Loader2 } from 'lucide-react';
import { useCalcular13Salario } from '@/hooks/useCalcular13Salario';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
}

export function Simulador13Dialog() {
  const { calcular, loading, resultado } = useCalcular13Salario();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ salario: '', dataAdmissao: '', parcela: '1' as '1' | '2', dependentes: '0' });

  const handleCalc = async () => {
    await calcular({
      colaboradorId: 'simulacao',
      salario: parseFloat(form.salario) || 0,
      mediaVariaveis: 0,
      dataAdmissao: form.dataAdmissao,
      anoReferencia: new Date().getFullYear(),
      parcela: parseInt(form.parcela) as 1 | 2,
      mesesAfastamento: 0,
      dependentesIRRF: parseInt(form.dependentes) || 0,
      pensaoAlimenticia: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 font-body">
          <Gift className="h-4 w-4" />
          <span className="hidden sm:inline">13º Salário</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Simulador 13º Salário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Salário Base (R$)</Label>
            <Input type="number" placeholder="5000.00" value={form.salario} onChange={e => setForm(p => ({ ...p, salario: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Data de Admissão</Label>
            <Input type="date" value={form.dataAdmissao} onChange={e => setForm(p => ({ ...p, dataAdmissao: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Parcela</Label>
              <Select value={form.parcela} onValueChange={v => setForm(p => ({ ...p, parcela: v as '1' | '2' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1ª Parcela</SelectItem>
                  <SelectItem value="2">2ª Parcela</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dependentes IRRF</Label>
              <Input type="number" min="0" value={form.dependentes} onChange={e => setForm(p => ({ ...p, dependentes: e.target.value }))} />
            </div>
          </div>
          <Button onClick={handleCalc} disabled={loading || !form.salario || !form.dataAdmissao} className="w-full rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
            Calcular 13º
          </Button>
          {resultado && (
            <Card className="border border-border/30 rounded-xl">
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Avos:</span><span className="font-medium">{resultado.avos}/12</span></div>
                <div className="flex justify-between"><span>Valor Bruto:</span><span className="font-medium">{formatCurrency(resultado.proventos.valorBruto)}</span></div>
                <div className="flex justify-between"><span>INSS:</span><span className="text-destructive">-{formatCurrency(resultado.descontos.inss)}</span></div>
                <div className="flex justify-between"><span>IRRF:</span><span className="text-destructive">-{formatCurrency(resultado.descontos.irrf)}</span></div>
                {resultado.descontos.adiantamento1Parcela > 0 && (
                  <div className="flex justify-between"><span>Adiant. 1ª Parcela:</span><span className="text-destructive">-{formatCurrency(resultado.descontos.adiantamento1Parcela)}</span></div>
                )}
                <div className="border-t border-border/30 pt-2 flex justify-between text-base font-medium">
                  <span>Líquido:</span><span className="text-primary">{formatCurrency(resultado.liquido)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Pagamento até: {new Date(resultado.dataLimitePagamento).toLocaleDateString('pt-BR')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
