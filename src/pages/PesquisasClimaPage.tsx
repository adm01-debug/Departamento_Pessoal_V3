import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

import { pesquisaService } from '@/services/pesquisaService';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Plus, BarChart3, ClipboardList, TrendingUp, Users, Trash2 } from 'lucide-react';

const statusColors: Record<string, string> = { rascunho: 'secondary', ativa: 'default', encerrada: 'outline' };
const tipoLabels: Record<string, string> = { clima: 'Clima Organizacional', enps: 'eNPS', satisfacao: 'Satisfação', custom: 'Personalizada' };

export default function PesquisasClimaPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', tipo: 'clima', anonima: true, data_inicio: '', data_fim: '' });

  const { data: pesquisas = [], isLoading } = useQuery({
    queryKey: ['pesquisas', empresaAtual?.id],
    queryFn: () => pesquisaService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: () => pesquisaService.criar({ ...form, empresa_id: empresaAtual?.id, status: 'rascunho' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pesquisas'] }); setOpen(false); toast.success('Pesquisa criada!'); setForm({ titulo: '', descricao: '', tipo: 'clima', anonima: true, data_inicio: '', data_fim: '' }); },
    onError: () => toast.error('Erro ao criar pesquisa'),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => pesquisaService.excluir(id, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pesquisas'] }); toast.success('Pesquisa excluída'); },
  });

  const ativar = useMutation({
    mutationFn: (id: string) => pesquisaService.atualizar(id, { status: 'ativa' }, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pesquisas'] }); toast.success('Pesquisa ativada!'); },
  });

  const ativas = pesquisas.filter((p: any) => p.status === 'ativa').length;
  const encerradas = pesquisas.filter((p: any) => p.status === 'encerrada').length;

  return (
    <>
    <PageTitle title="Pesquisas de Clima" description="Pesquisas de clima organizacional" />
    <PageLayout title="Pesquisas de Clima & eNPS">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4 flex items-center gap-3"><ClipboardList className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{pesquisas.length}</p><p className="text-xs text-muted-foreground">Total</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{ativas}</p><p className="text-xs text-muted-foreground">Ativas</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><BarChart3 className="h-8 w-8 text-info" /><div><p className="text-2xl font-bold">{encerradas}</p><p className="text-xs text-muted-foreground">Encerradas</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Users className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Respostas Total</p></div></CardContent></Card>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Pesquisas</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova Pesquisa</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Pesquisa</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Pesquisa de Clima Q1 2026" /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clima">Clima Organizacional</SelectItem>
                    <SelectItem value="enps">eNPS</SelectItem>
                    <SelectItem value="satisfacao">Satisfação</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Data Início</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
                <div><Label>Data Fim</Label><Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.anonima} onCheckedChange={v => setForm(p => ({ ...p, anonima: v }))} /><Label>Respostas anônimas</Label></div>
              <Button className="w-full" onClick={() => criar.mutate()} disabled={!form.titulo || criar.isPending}>{criar.isPending ? 'Criando...' : 'Criar Pesquisa'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Spinner /> : pesquisas.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><ClipboardList className="mx-auto h-12 w-12 mb-4 opacity-50" /><p>Nenhuma pesquisa cadastrada</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pesquisas.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{p.titulo}</CardTitle>
                  <Badge variant={statusColors[p.status] as any}>{p.status}</Badge>
                </div>
                <Badge variant="outline" className="w-fit text-xs">{tipoLabels[p.tipo] || p.tipo}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.descricao && <p className="text-sm text-muted-foreground line-clamp-2">{p.descricao}</p>}
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {p.data_inicio && <span>Início: {p.data_inicio}</span>}
                  {p.data_fim && <span>Fim: {p.data_fim}</span>}
                </div>
                <div className="flex items-center gap-1 text-xs"><Users className="h-3 w-3" />{p.anonima ? 'Anônima' : 'Identificada'}</div>
                <div className="flex gap-2 pt-2">
                  {p.status === 'rascunho' && <Button size="sm" variant="outline" onClick={() => ativar.mutate(p.id)}>Ativar</Button>}
                  <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => excluir.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
    </>
  );
}
