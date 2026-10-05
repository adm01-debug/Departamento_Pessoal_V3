import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useContatosEmergencia,
  useCriarContatoEmergencia,
  useExcluirContatoEmergencia,
} from '@/hooks/useColaboradorDetalhes';
import { usePiiMask } from '@/hooks/usePiiMask';

const PARENTESCOS = ['Pai/Mãe', 'Cônjuge', 'Irmão/Irmã', 'Filho(a)', 'Amigo(a)', 'Outro'];
const initialForm = { nome: '', parentesco: '', telefone: '', celular: '', email: '' };

export function EmergenciaTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useContatosEmergencia(colaboradorId);
  const criar = useCriarContatoEmergencia();
  const excluir = useExcluirContatoEmergencia(colaboradorId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const pii = usePiiMask();

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!form.telefone.trim() && !form.celular.trim()) {
      toast.error('Informe pelo menos um telefone');
      return;
    }
    try {
      await criar.mutateAsync({ ...form, colaborador_id: colaboradorId });
      toast.success('Contato adicionado');
      setOpen(false);
      setForm(initialForm);
    } catch {
      toast.error('Erro ao adicionar contato');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Contatos de Emergência</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Contato de Emergência</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <Label>Parentesco</Label>
                <Select value={form.parentesco} onValueChange={(v) => setForm((f) => ({ ...f, parentesco: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARENTESCOS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
              </div>
              <div>
                <Label>Celular</Label>
                <Input value={form.celular} onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <Button onClick={handleSubmit} disabled={criar.isPending}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Spinner />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Parentesco</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Celular</TableHead>
                <TableHead>Email</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.nome}</TableCell>
                  <TableCell>{c.parentesco || '-'}</TableCell>
                  <TableCell>{c.telefone ? pii.phone(c.telefone) : '-'}</TableCell>
                  <TableCell>{c.celular ? pii.phone(c.celular) : '-'}</TableCell>
                  <TableCell>{c.email ? pii.email(c.email) : '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Excluir contato?')) excluir.mutate(c.id);
                      }}
                    >
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
  );
}
