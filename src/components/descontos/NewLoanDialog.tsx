import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Info, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { todayLocalISO } from '@/utils/dateLocal';

export function NewLoanDialog({ colaboradores, onSave }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    colaborador_id: '',
    instituicao_financeira: '',
    valor_total: '',
    numero_parcelas: '',
    data_inicio: todayLocalISO()
  });

  // Compliance Engine: Calculate Margin
  const { data: colaboradorData } = useQuery({
    queryKey: ['colaborador-margin', form.colaborador_id],
    queryFn: async () => {
      if (!form.colaborador_id) return null;
      const { data, error } = await supabase
        .from('colaboradores')
        .select('salario_base')
        .eq('id', form.colaborador_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!form.colaborador_id
  });

  const marginData = useMemo(() => {
    if (!colaboradorData?.salario_base) return { margin: 0, percent: 0, isValid: true };
    const valor_parcela = Number(form.valor_total) / (Number(form.numero_parcelas) || 1);
    const margin = colaboradorData.salario_base * 0.3; // 30% Law
    const currentPercent = (valor_parcela / colaboradorData.salario_base) * 100;

    return {
      margin,
      percent: currentPercent,
      isValid: valor_parcela <= margin
    };
  }, [colaboradorData, form.valor_total, form.numero_parcelas]);

  const handleSubmit = () => {
    if (!marginData.isValid) return;
    const valor_parcela = Number(form.valor_total) / Number(form.numero_parcelas);
    onSave({
      ...form,
      valor_total: Number(form.valor_total),
      numero_parcelas: Number(form.numero_parcelas),
      valor_parcela
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> Novo Empréstimo</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Registrar Empréstimo Consignado
            <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider">Compliance L10.820</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Colaborador</Label>
            <Select value={form.colaborador_id} onValueChange={(v) => setForm(p => ({ ...p, colaborador_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
              <SelectContent>
                {colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Instituição Financeira</Label>
            <Input value={form.instituicao_financeira} onChange={e => setForm(p => ({ ...p, instituicao_financeira: e.target.value }))} placeholder="Ex: Banco do Brasil" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Total (R$)</Label>
              <Input type="number" value={form.valor_total} onChange={e => setForm(p => ({ ...p, valor_total: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Número de Parcelas</Label>
              <Input type="number" value={form.numero_parcelas} onChange={e => setForm(p => ({ ...p, numero_parcelas: e.target.value }))} />
            </div>
          </div>

          {form.colaborador_id && (
            <div className={`p-3 rounded-lg border flex flex-col gap-2 ${marginData.isValid ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3" /> Margem Consignável (30%)
                </span>
                <span>Max: R$ {marginData.margin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${marginData.isValid ? 'bg-success' : 'bg-destructive'}`} 
                  style={{ width: `${Math.min(marginData.percent, 100)}%` }}
                />
              </div>
              {!marginData.isValid && (
                <p className="text-[10px] text-destructive flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3" /> Alerta: Parcela excede a margem permitida por lei.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!marginData.isValid || !form.colaborador_id}>
            Confirmar Registro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Badge({ children, variant, className }: any) {
  const variants: any = {
    outline: "border border-muted-foreground/30 text-muted-foreground",
    default: "bg-primary text-primary-foreground"
  };
  return <span className={`px-2 py-0.5 rounded-full ${variants[variant] || variants.default} ${className}`}>{children}</span>;
}
