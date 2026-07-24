import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Plus, Gift, Trash2, Edit2, Search, Package } from 'lucide-react';
export default function PromoBrindesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    preco: 0,
    estoque: 0,
    categoria: ''
  });

  const { data: brindes = [], isLoading } = useQuery({
    queryKey: ['promo_brindes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_brindes')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredBrindes = brindes.filter((b: any) => 
    b.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.categoria && b.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = useMutation({
    mutationFn: async (d: any) => {
      if (editingItem) {
        const { error } = await supabase
          .from('promo_brindes')
          .update(d)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promo_brindes')
          .insert(d);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo_brindes'] });
      setOpen(false);
      setEditingItem(null);
      resetForm();
      toast.success(editingItem ? 'Brinde atualizado!' : 'Brinde criado!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promo_brindes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promo_brindes'] });
      toast.success('Brinde excluído!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar operação.')),
  });

  const resetForm = () => {
    setForm({ nome: '', descricao: '', preco: 0, estoque: 0, categoria: '' });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      nome: item.nome,
      descricao: item.descricao || '',
      preco: item.preco || 0,
      estoque: item.estoque || 0,
      categoria: item.categoria || ''
    });
    setOpen(true);
  };

  if (isLoading) return <PageLayout title="Promo Brindes"><Spinner /></PageLayout>;

  return (
    <>
      <PageTitle title="Promo Brindes" description="Gestão de itens promocionais e brindes" />
      <PageLayout title="Promo Brindes" description="Gerencie o inventário de brindes e itens promocionais">
        <div className="grid gap-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou categoria..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={open} onOpenChange={(val) => {
              setOpen(val);
              if (!val) {
                setEditingItem(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo Brinde</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar Brinde' : 'Novo Brinde'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input 
                      id="nome" 
                      value={form.nome} 
                      onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="categoria">Categoria</Label>
                      <Input 
                        id="categoria" 
                        value={form.categoria} 
                        onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="estoque">Estoque</Label>
                      <Input 
                        id="estoque" 
                        type="number"
                        value={form.estoque} 
                        onChange={e => setForm(p => ({ ...p, estoque: parseInt(e.target.value) || 0 }))} 
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="preco">Preço Sugerido (R$)</Label>
                    <Input 
                      id="preco" 
                      type="number"
                      step="0.01"
                      value={form.preco} 
                      onChange={e => setForm(p => ({ ...p, preco: parseFloat(e.target.value) || 0 }))} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea 
                      id="descricao" 
                      rows={3}
                      value={form.descricao} 
                      onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={() => handleSubmit.mutate(form)} disabled={!form.nome || handleSubmit.isPending}>
                    {handleSubmit.isPending ? <Spinner className="mr-2" /> : null}
                    {editingItem ? 'Salvar Alterações' : 'Criar Brinde'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-center">Estoque</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBrindes.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium">{item.nome}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{item.descricao || 'Sem descrição'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.categoria || 'Geral'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          item.estoque <= 5 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                        )}>
                          {item.estoque} un
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => handleEdit(item)}>
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => {
                            if (confirm('Deseja excluir este brinde?')) excluir.mutate(item.id);
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredBrindes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <Gift className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>Nenhum brinde encontrado.</p>
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
