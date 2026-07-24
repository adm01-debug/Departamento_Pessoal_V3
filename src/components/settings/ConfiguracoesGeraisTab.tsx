import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Save, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function ConfiguracoesGeraisTab() {
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ chave: '', valor: '', descricao: '' });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .order('chave');
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return data || [];
    },
  });

  const criar = useMutation({
    mutationFn: async (d: typeof form) => {
      const chave = d.chave.trim().slice(0, 100);
      const valor = d.valor.trim().slice(0, 500);
      if (!chave) throw new Error('Chave é obrigatória.');
      if (!/^[a-zA-Z0-9_.-]+$/.test(chave)) throw new Error('Chave deve conter apenas letras, números, _ . e -');

      const { error } = await supabase.from('configuracoes').insert({
        chave,
        valor,
        descricao: d.descricao?.trim().slice(0, 200) || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracoes'] });
      setOpenNew(false);
      setForm({ chave: '', valor: '', descricao: '' });
      toast.success('Configuração criada');
    },
    onError: (e: any) => toast.error(safeErrorMessage(e, 'Erro ao criar configuração.')),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('configuracoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracoes'] });
      toast.success('Configuração removida');
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-card">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader className="pb-4 px-6 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display flex items-center gap-2 text-xl">
                <Database className="h-5 w-5 text-primary" /> Parâmetros de Backend
              </CardTitle>
              <CardDescription className="font-body text-sm mt-1">
                Ajuste chaves de configuração globais persistidas no banco de dados.
              </CardDescription>
            </div>
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-glow gap-2">
                  <Plus className="h-4 w-4" /> Nova Config
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">Nova Chave de Configuração</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chave</Label>
                    <Input 
                      value={form.chave} 
                      onChange={e => setForm(p => ({ ...p, chave: e.target.value }))} 
                      placeholder="Ex: app.timezone" 
                      className="rounded-xl border-border/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Valor</Label>
                    <Input 
                      value={form.valor} 
                      onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} 
                      placeholder="Ex: America/Sao_Paulo" 
                      className="rounded-xl border-border/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descrição</Label>
                    <Input 
                      value={form.descricao} 
                      onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} 
                      placeholder="Para que serve esta chave?" 
                      className="rounded-xl border-border/40"
                    />
                  </div>
                  <Button onClick={() => criar.mutate(form)} disabled={!form.chave || !form.valor || criar.isPending} className="w-full rounded-xl shadow-glow h-11 mt-2">
                    {criar.isPending ? <Spinner size="sm" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Parâmetro
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center gap-4">
                <Spinner size="lg" />
                <p className="text-sm text-muted-foreground font-body">Carregando parâmetros...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/20">
                    <TableHead className="font-display font-semibold py-4 pl-6">Chave</TableHead>
                    <TableHead className="font-display font-semibold">Valor</TableHead>
                    <TableHead className="font-display font-semibold hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="font-display font-semibold hidden sm:table-cell">Atualizado em</TableHead>
                    <TableHead className="w-[80px] text-right pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((c: any) => (
                    <TableRow key={c.id} className="hover:bg-accent/10 transition-colors group">
                      <TableCell className="font-mono text-[11px] font-bold text-primary pl-6 py-4">{c.chave}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px] bg-muted/50 border-border/40 px-2 py-0.5 rounded-lg font-medium">
                          {c.valor}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{c.descricao || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell font-body">
                        {c.updated_at ? new Date(c.updated_at).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir"
                          onClick={() => excluir.mutate(c.id)}
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {configs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-16 font-body">
                        <div className="flex flex-col items-center gap-3 opacity-30">
                          <Database className="h-12 w-12" />
                          <p>Nenhuma configuração cadastrada no banco.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3">
        <Database className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">Gestão de Variáveis de Ambiente de DB</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Estes parâmetros controlam o comportamento global do sistema, como timezones, IDs de integração padrão e flags de feature. 
            Alterações nestes campos impactam todos os usuários e módulos em tempo real.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

