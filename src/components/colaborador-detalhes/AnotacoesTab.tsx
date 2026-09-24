import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAnotacoes, useCriarAnotacao, useExcluirAnotacao } from '@/hooks/useColaboradorDetalhes';

const TIPOS = ['geral', 'advertencia', 'elogio', 'feedback', 'disciplinar', 'outro'];

export function AnotacoesTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useAnotacoes(colaboradorId);
  const criar = useCriarAnotacao();
  const excluir = useExcluirAnotacao(colaboradorId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', conteudo: '', tipo: 'geral' });

  const handleSubmit = async () => {
    if (!form.titulo.trim()) { toast.error('Título é obrigatório'); return; }
    try {
      await criar.mutateAsync({ ...form, colaborador_id: colaboradorId });
      toast.success('Anotação adicionada');
      setOpen(false);
      setForm({ titulo: '', conteudo: '', tipo: 'geral' });
    } catch { toast.error('Erro ao adicionar anotação'); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Anotações</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Nova Anotação</Button></DialogTrigger>
          <DialogContent className="max-w-[440px]">
            <DialogHeader><DialogTitle>Nova Anotação</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Título *</Label><Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Conteúdo</Label><Textarea rows={4} value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} /></div>
              <div className="flex justify-end pt-1">
                <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={criar.isPending}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhuma anotação.</p> : (
          <div className="space-y-3">
            {data.map((a: any) => (
              <div key={a.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">{a.titulo}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{a.tipo}</Badge>
                    <span className="text-xs text-muted-foreground">{a.data}</span>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm('Excluir anotação?')) excluir.mutate(a.id); }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                {a.conteudo && <p className="text-sm text-muted-foreground">{a.conteudo}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
