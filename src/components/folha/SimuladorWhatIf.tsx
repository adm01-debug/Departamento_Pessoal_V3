import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Calculator, Loader2, Save, History, PieChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useEmpresas } from '@/hooks/useEmpresas';
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
}

export function SimuladorWhatIf() {
  const { empresaAtual } = useEmpresas();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: 'Nova Simulação de Impacto',
    salario: '5000',
    percentualInssPatronal: '27.8',
    percentualFgts: '8.0',
    percentualRat: '2.0',
    percentualTerceiros: '5.8',
    valeTransporte: '0',
    valeAlimentacao: '600',
    planoSaude: '350',
  });

  const [resultado, setResultado] = useState<Record<string, any> | null>(null);

  const calcularImpacto = () => {
    setLoading(true);
    const salario = parseFloat(form.salario) || 0;
    const inss = salario * (parseFloat(form.percentualInssPatronal) / 100);
    const fgts = salario * (parseFloat(form.percentualFgts) / 100);
    const rat = salario * (parseFloat(form.percentualRat) / 100);
    const terceiros = salario * (parseFloat(form.percentualTerceiros) / 100);
    
    const provisaoFerias = (salario * 1.3333) / 12;
    const provisao13 = salario / 12;
    
    const encargosProvisoes = (provisaoFerias + provisao13) * (
        (parseFloat(form.percentualInssPatronal) + 
         parseFloat(form.percentualFgts) + 
         parseFloat(form.percentualRat) + 
         parseFloat(form.percentualTerceiros)) / 100
    );

    const beneficios = parseFloat(form.valeTransporte) + parseFloat(form.valeAlimentacao) + parseFloat(form.planoSaude);
    
    const totalEncargos = inss + fgts + rat + terceiros;
    const totalProvisoes = provisaoFerias + provisao13 + encargosProvisoes;
    const custoTotal = salario + totalEncargos + totalProvisoes + beneficios;

    setResultado({
      salario,
      totalEncargos,
      totalProvisoes,
      beneficios,
      custoTotal,
      multiplicador: (custoTotal / salario).toFixed(2),
      breakdown: {
        inss, fgts, rat, terceiros, provisaoFerias, provisao13, encargosProvisoes
      }
    });
    setLoading(false);
  };

  const salvarSimulacao = async () => {
    if (!empresaAtual?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('simulacoes_fiscais').insert({
        empresa_id: empresaAtual.id,
        titulo: form.titulo,
        configuracao: form,
        resultado: resultado,
      });
      if (error) throw error;
      toast.success('Simulação salva com sucesso!');
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao salvar simulação.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 font-body border-primary/30 hover:bg-primary/5">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Simulador What-if</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Calculator className="h-5 w-5 text-primary" /> 
            Simulador "What-if" de Impacto Fiscal
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da Simulação</Label>
              <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            
            <div className="space-y-2">
              <Label>Salário Bruto Proposto (R$)</Label>
              <Input type="number" value={form.salario} onChange={e => setForm(p => ({ ...p, salario: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">INSS Patronal (%)</Label>
                <Input type="number" step="0.1" value={form.percentualInssPatronal} onChange={e => setForm(p => ({ ...p, percentualInssPatronal: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">FGTS (%)</Label>
                <Input type="number" step="0.1" value={form.percentualFgts} onChange={e => setForm(p => ({ ...p, percentualFgts: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">RAT/FAP (%)</Label>
                <Input type="number" step="0.1" value={form.percentualRat} onChange={e => setForm(p => ({ ...p, percentualRat: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Terceiros (%)</Label>
                <Input type="number" step="0.1" value={form.percentualTerceiros} onChange={e => setForm(p => ({ ...p, percentualTerceiros: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Benefícios Mensais (R$)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="VT" type="number" value={form.valeTransporte} onChange={e => setForm(p => ({ ...p, valeTransporte: e.target.value }))} />
                <Input placeholder="VA/VR" type="number" value={form.valeAlimentacao} onChange={e => setForm(p => ({ ...p, valeAlimentacao: e.target.value }))} />
                <Input placeholder="Saúde" type="number" value={form.planoSaude} onChange={e => setForm(p => ({ ...p, planoSaude: e.target.value }))} />
              </div>
            </div>

            <Button onClick={calcularImpacto} className="w-full rounded-xl gap-2 shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Calcular Impacto Real
            </Button>
          </div>

          <div className="space-y-4">
            {resultado ? (
              <Card className="border-primary/20 bg-primary/5 rounded-2xl overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="text-center pb-2 border-b border-primary/10">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Custo Total Mensal (Aprox.)</p>
                    <p className="text-3xl font-display font-bold text-primary">{formatCurrency(resultado.custoTotal)}</p>
                    <p className="text-xs text-primary/70 mt-1 font-medium">Equivale a {resultado.multiplicador}x o salário nominal</p>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Salário Nominal</span>
                      <span className="font-semibold">{formatCurrency(resultado.salario)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Encargos Diretos (INSS/FGTS)</span>
                      <span className="font-semibold">{formatCurrency(resultado.totalEncargos)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Provisões (Férias/13º)</span>
                      <span className="font-semibold">{formatCurrency(resultado.totalProvisoes)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Benefícios Estipulados</span>
                      <span className="font-semibold">{formatCurrency(resultado.beneficios)}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-lg gap-1.5" onClick={salvarSimulacao} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Salvar
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-lg p-2">
                      <History className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border/40 rounded-2xl bg-muted/20">
                <PieChart className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-body">Preencha os parâmetros e clique em calcular para visualizar o impacto fiscal detalhado.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
