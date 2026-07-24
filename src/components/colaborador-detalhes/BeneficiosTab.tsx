import { todayLocalISO } from '@/utils/dateLocal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBeneficiosColaborador } from '@/hooks/useBeneficiosColaborador';
import { useBeneficios } from '@/hooks/useBeneficios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Gift, Info, Calendar } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FormField, FormSelect } from '@/components/forms';
import { useForm, Controller } from 'react-hook-form';

interface BeneficiosTabProps {
  colaboradorId: string;
}

export function BeneficiosTab({ colaboradorId }: BeneficiosTabProps) {
  const { beneficios, isLoading, vincularBeneficio, desvincularBeneficio } = useBeneficiosColaborador(colaboradorId);
  const { beneficios: planosDisponiveis } = useBeneficios();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { register, handleSubmit, reset, watch, control } = useForm({
    defaultValues: {
      beneficio_id: '',
      valor: 0,
      desconto: 0,
      data_inicio: todayLocalISO(),
      quantidade_diaria: 2
    }
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedPlanId = watch('beneficio_id');
  const selectedPlan = Array.isArray(planosDisponiveis) ? (planosDisponiveis as any[]).find((p: any) => p.id === selectedPlanId) : null;

  const formatCurrency = (v: number | null) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const onVincular = async (data: any) => {
    await vincularBeneficio({
      ...data,
      valor: data.valor || (selectedPlan as any)?.valor || 0,
      status_vinculo: 'ativo'
    });
    setIsDialogOpen(false);
    reset();
  };

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-bold flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" /> Benefícios Ativos
        </h3>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gap-2 shadow-xs">
              <Plus className="h-4 w-4" /> Vincular Benefício
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Vincular Benefício ao Colaborador</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onVincular)} className="space-y-4 pt-4">
              <Controller
                name="beneficio_id"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <FormSelect 
                    label="Plano de Benefício" 
                    options={Array.isArray(planosDisponiveis) ? planosDisponiveis.map((p: any) => ({ value: p.id, label: `${p.nome} (${p.tipo})` })) : []}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Valor (R$)" type="number" step="0.01" {...register('valor')} placeholder={(selectedPlan as any)?.valor?.toString()} />
                <FormField label="Desconto (R$)" type="number" step="0.01" {...register('desconto')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Data Início" type="date" {...register('data_inicio')} />
                {(selectedPlan as any)?.tipo === 'transporte' && (
                  <FormField label="Passagens/Dia" type="number" {...register('quantidade_diaria')} />
                )}
              </div>

              <Button type="submit" className="w-full rounded-xl mt-4">Vincular Agora</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="border-info/20 bg-info/5 rounded-2xl md:col-span-3">
            <CardContent className="p-4 flex items-center gap-3">
               <Info className="h-5 w-5 text-info" />
               <p className="text-xs text-info-foreground font-body">
                 Os valores de desconto em folha são calculados automaticamente com base nas regras de cada benefício e no salário base do colaborador.
               </p>
            </CardContent>
         </Card>
      </div>

      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-display font-semibold">Benefício</TableHead>
                <TableHead className="font-display font-semibold">Tipo</TableHead>
                <TableHead className="font-display font-semibold">Valor</TableHead>
                <TableHead className="font-display font-semibold">Desconto</TableHead>
                <TableHead className="font-display font-semibold text-center">Vigência</TableHead>
                <TableHead className="font-display font-semibold">Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!beneficios || beneficios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-body">
                    Nenhum benefício vinculado a este colaborador.
                  </TableCell>
                </TableRow>
              ) : (
                beneficios?.map((b: any) => (
                  <TableRow key={b.id} className="hover:bg-accent/30 transition-colors">
                    <TableCell className="font-body font-medium">{b.beneficio?.nome}</TableCell>
                    <TableCell className="font-body capitalize text-xs">
                       <Badge variant="outline" className="font-normal border-muted-foreground/20">
                         {b.beneficio?.tipo || '-'}
                       </Badge>
                    </TableCell>
                    <TableCell className="font-body text-success font-semibold text-sm">{formatCurrency(b.valor)}</TableCell>
                    <TableCell className="font-body text-destructive font-semibold text-sm">{formatCurrency(b.desconto)}</TableCell>
                    <TableCell className="font-body text-[10px] text-center">
                       <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {b.data_inicio ? new Date(b.data_inicio).toLocaleDateString('pt-BR') : '-'}
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={b.status_vinculo === 'ativo' ? 'bg-success/15 text-success border-0 text-[10px] rounded-full' : 'bg-muted text-muted-foreground border-0 text-[10px] rounded-full'}>
                        {b.status_vinculo === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir"
                        className="rounded-xl text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => desvincularBeneficio(b.id)}
                        title="Remover Benefício"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
