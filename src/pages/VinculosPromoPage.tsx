import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Link, Trash2, Plus, Users, Gift, ArrowRight } from 'lucide-react';

export default function VinculosPromoPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    time_id: '',
    brinde_id: '',
    quantidade: 0
  });

  // Fetch times
  const { data: times = [] } = useQuery({
    queryKey: ['times'],
    queryFn: async () => {
      const { data, error } = await supabase.from('times').select('id, nome').order('nome');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch brindes
  const { data: brindes = [] } = useQuery({
    queryKey: ['promo_brindes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('promo_brindes').select('id, nome, estoque').order('nome');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch links
  const { data: vinculos = [], isLoading } = useQuery({
    queryKey: ['times_brindes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('times_brindes')
        .select(`
          id,
          time_id,
          brinde_id,
          quantidade_alocada,
          times (nome),
          promo_brindes (nome, estoque)
        `);
      if (error) throw error;
      return data || [];
    }
  });

  const criarVinculo = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from('times_brindes').insert({
        time_id: d.time_id,
        brinde_id: d.brinde_id,
        quantidade_alocada: d.quantidade
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['times_brindes'] });
      setOpen(false);
      setForm({ time_id: '', brinde_id: '', quantidade: 0 });
      toast.success('Vínculo criado com sucesso!');
    },
    onError: (e: any) => {
      if (e.code === '23505') {
        toast.error('Este time já possui este brinde vinculado.');
      } else {
        toast.error(safeErrorMessage(e, 'Erro ao processar vínculo.'));
      }
    }
  });

  const removerVinculo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('times_brindes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['times_brindes'] });
      toast.success('Vínculo removido!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar vínculo.'))
  });

  if (isLoading) return <PageLayout title="Vínculos Promo"><Spinner /></PageLayout>;

  return (
    <>
      <PageTitle title="Vínculos Promo" description="Gerenciar brindes por time" />
      <PageLayout title="Vínculos Promo" description="Relacione itens promocionais aos times específicos">
        <div className="grid gap-6">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo Vínculo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Vincular Brinde ao Time</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Selecione o Time</Label>
                    <Select onValueChange={(v) => setForm(p => ({ ...p, time_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione um time" /></SelectTrigger>
                      <SelectContent>
                        {times.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Selecione o Brinde</Label>
                    <Select onValueChange={(v) => setForm(p => ({ ...p, brinde_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione um brinde" /></SelectTrigger>
                      <SelectContent>
                        {brindes.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.nome} ({b.estoque} em estoque)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Quantidade Alocada</Label>
                    <Input 
                      type="number" 
                      value={form.quantidade} 
                      onChange={e => setForm(p => ({ ...p, quantidade: parseInt(e.target.value) || 0 }))} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button 
                    onClick={() => criarVinculo.mutate(form)} 
                    disabled={!form.time_id || !form.brinde_id || criarVinculo.isPending}
                  >
                    Vincular Agora
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relacionamentos Ativos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-center w-[100px]"></TableHead>
                    <TableHead>Brinde</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vinculos.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-info" />
                          <span className="font-medium">{v.times?.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-warning" />
                          <span>{v.promo_brindes?.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {v.quantidade_alocada}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Excluir"
                          onClick={() => { if(confirm('Remover este vínculo?')) removerVinculo.mutate(v.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {vinculos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <Link className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>Nenhum vínculo encontrado.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </>
  );
}
