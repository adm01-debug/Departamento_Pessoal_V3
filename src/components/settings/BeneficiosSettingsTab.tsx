import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormSwitch } from '@/components/forms';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Save, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function BeneficiosSettingsTab() {
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: '', valor: '' });

  const { data: regras = [], isLoading } = useQuery({
    queryKey: ['configuracoes-beneficios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficios')
        .select('*')
        .order('nome');
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return data || [];
    },
  });

  const criar = useMutation({
    mutationFn: async (d: typeof form) => {
      const nome = d.nome.trim().slice(0, 100);
      const tipo = d.tipo.trim().slice(0, 50);
      const valor = Number(d.valor);
      if (!nome) throw new Error('Nome do plano é obrigatório.');
      if (valor < 0 || valor > 99999.99 || isNaN(valor)) throw new Error('Valor inválido (entre 0 e 99.999,99).');

      const { error } = await supabase.from('beneficios').insert({
        nome,
        tipo,
        valor,
        ativo: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracoes-beneficios'] });
      setOpenNew(false);
      setForm({ nome: '', tipo: '', valor: '' });
      toast.success('Regra de benefício criada');
    },
    onError: (e: any) => toast.error(safeErrorMessage(e, 'Erro ao criar regra de benefício.')),
  });

  const alternarStatus = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('beneficios').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracoes-beneficios'] });
      toast.success('Status atualizado');
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-xp to-store" />
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" /> Regras de Benefícios
              </CardTitle>
              <CardDescription className="font-body">
                Configure os planos, valores e elegibilidade global
              </CardDescription>
            </div>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl gap-2 font-body">
                  <Plus className="h-4 w-4" /> Novo Plano
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Plano de Benefício</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Plano</Label>
                    <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: VR Master" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Input value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} placeholder="Ex: Alimentação" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Mensal (R$)</Label>
                    <Input type="number" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0.00" />
                  </div>
                  <Button onClick={() => criar.mutate(form)} disabled={!form.nome || criar.isPending} className="w-full rounded-xl">
                    {criar.isPending ? 'Salvando...' : 'Salvar Plano'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-display font-bold">Plano</TableHead>
                  <TableHead className="font-display font-bold">Tipo</TableHead>
                  <TableHead className="font-display font-bold">Valor</TableHead>
                  <TableHead className="font-display font-bold">Status</TableHead>
                  <TableHead className="text-right font-display font-bold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((regra: any) => (
                  <TableRow key={regra.id} className="hover:bg-accent/30 transition-colors">
                    <TableCell className="font-medium font-body">{regra.nome}</TableCell>
                    <TableCell className="text-muted-foreground font-body text-xs">{regra.tipo}</TableCell>
                    <TableCell className="font-body text-sm font-semibold">
                      {regra.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>
                      <FormSwitch 
                        label=""
                        checked={regra.ativo} 
                        onCheckedChange={(v) => alternarStatus.mutate({ id: regra.id, ativo: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label="Excluir" className="h-8 w-8 rounded-xl">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-warning/20 bg-warning/5 rounded-2xl">
        <CardContent className="p-4 flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-warning" />
          <p className="text-xs text-muted-foreground font-body">
            Alterações nos valores dos planos serão aplicadas nos próximos fechamentos de folha.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
