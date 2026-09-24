import { todayLocalISO } from '@/utils/dateLocal';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { useBeneficiosColaborador } from '@/hooks/useBeneficiosColaborador';
import { useBeneficios } from '@/hooks/useBeneficios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Gift, Calendar } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { FormField, FormSelect } from '@/components/forms';
import { useForm, Controller } from 'react-hook-form';

const MotionCard = motion.create(Card);

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
    <MotionCard
      custom={6}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated"
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-sm font-display font-medium flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" /> Benefícios Ativos
          </h3>

          <Button size="sm" className="h-7 px-3 text-xs rounded-xl gap-1.5 shadow-xs" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Vincular Benefício
          </Button>
        </div>

        <AnimatedCascadeDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title="Vincular Benefício ao Colaborador"
          titleIcon={Gift}
          emptyMessage=""
          className="max-w-[430px]"
          items={[
            <form key="form" onSubmit={handleSubmit(onVincular)} className="space-y-3">
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

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Valor (R$)" type="number" step="0.01" {...register('valor')} placeholder={(selectedPlan as any)?.valor?.toString()} />
                <FormField label="Desconto (R$)" type="number" step="0.01" {...register('desconto')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="data_inicio"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-1">
                      <Label htmlFor="data_inicio">Data Início</Label>
                      <DatePicker id="data_inicio" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                    </div>
                  )}
                />
                {(selectedPlan as any)?.tipo === 'transporte' && (
                  <FormField label="Passagens/Dia" type="number" {...register('quantidade_diaria')} />
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" className="rounded-lg px-4">Vincular Agora</Button>
              </div>
            </form>,
          ]}
        />

        {/* Altura máxima calibrada + scroll interno — mesma lógica do card
            "Contas Bancárias": a tabela rola por dentro em vez de esticar o
            card quando há muitos benefícios vinculados. */}
        <div className="max-h-[240px] overflow-y-scroll">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-6 px-3 text-[10px] font-display font-semibold">Benefício</TableHead>
              <TableHead className="h-6 px-3 text-[10px] font-display font-semibold text-center">Tipo</TableHead>
              <TableHead className="h-6 px-3 text-[10px] font-display font-semibold text-center">Valor</TableHead>
              <TableHead className="h-6 px-3 text-[10px] font-display font-semibold text-center">Desconto</TableHead>
              <TableHead className="h-6 px-3 text-[10px] font-display font-semibold text-center">Vigência</TableHead>
              <TableHead className="h-6 px-3 text-[10px] font-display font-semibold text-center">Status</TableHead>
              <TableHead className="h-6 px-3 w-10 text-center" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!beneficios || beneficios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground font-body text-sm">
                  Nenhum benefício vinculado a este colaborador.
                </TableCell>
              </TableRow>
            ) : (
              beneficios?.map((b: any) => (
                <TableRow key={b.id} className="hover:bg-background/70 transition-colors">
                  <TableCell className="px-3 py-2.5 font-body font-medium text-[11px]">{b.beneficio?.nome}</TableCell>
                  <TableCell className="px-3 py-2.5 font-body capitalize text-[11px] text-center">
                     <Badge variant="outline" size="sm" className="font-normal border-muted-foreground/20 text-[9px] px-1.5 py-0 h-3.5">
                       {b.beneficio?.tipo || '-'}
                     </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 font-body text-success font-semibold text-[11px] text-center">{formatCurrency(b.valor)}</TableCell>
                  <TableCell className="px-3 py-2.5 font-body text-destructive font-semibold text-[11px] text-center">{formatCurrency(b.desconto)}</TableCell>
                  <TableCell className="px-3 py-2.5 font-body text-[9px] text-center">
                     <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Calendar className="h-2.5 w-2.5" />
                        {b.data_inicio ? new Date(b.data_inicio).toLocaleDateString('pt-BR') : '-'}
                     </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-center">
                    <Badge className={b.status_vinculo === 'ativo' ? 'bg-success/15 text-success border-0 text-[9px] px-1.5 py-0 h-3.5 rounded-full' : 'bg-muted text-muted-foreground border-0 text-[9px] px-1.5 py-0 h-3.5 rounded-full'}>
                      {b.status_vinculo === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir"
                      className="rounded-xl text-destructive hover:bg-destructive/10 h-5 w-5"
                      onClick={() => desvincularBeneficio(b.id)}
                      title="Remover Benefício"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </MotionCard>
  );
}
