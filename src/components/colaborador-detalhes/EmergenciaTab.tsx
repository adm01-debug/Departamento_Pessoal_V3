import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useContatosEmergencia,
  useCriarContatoEmergencia,
  useAtualizarContatoEmergencia,
  useExcluirContatoEmergencia,
} from '@/hooks/useColaboradorDetalhes';
import { usePiiMask } from '@/hooks/usePiiMask';
import { FalhaConsulta } from './FalhaConsulta';
import type { Tables } from '@/integrations/supabase/database.types';

const PARENTESCOS = ['Pai/Mãe', 'Cônjuge', 'Irmão/Irmã', 'Filho(a)', 'Amigo(a)', 'Outro'];
const initialForm = { nome: '', parentesco: '', telefone: '', celular: '', email: '' };

export function EmergenciaTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading, isError } = useContatosEmergencia(colaboradorId);
  const criar = useCriarContatoEmergencia();
  const atualizar = useAtualizarContatoEmergencia(colaboradorId);
  const excluir = useExcluirContatoEmergencia(colaboradorId);
  const [open, setOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const pii = usePiiMask();

  const fecharEResetar = () => {
    setOpen(false);
    setEditandoId(null);
    setForm(initialForm);
  };

  // O formulário abre com o valor REAL do banco, não com o que a tabela exibe:
  // a máscara de `usePiiMask` é só de exibição, salvar o texto mascarado por
  // cima destruiria o telefone de emergência do colaborador. Consequência: quem
  // não pode ver PII também não edita — abrir o formulário com o valor real
  // furaria a máscara da tabela. Mesmo critério de RelatorioContabilDialog.tsx.
  const abrirEdicao = (c: Tables<'contatos_emergencia'>) => {
    if (!pii.canViewPii) {
      toast.error('Apenas administradores e RH podem editar contatos de emergência (contêm telefone e e-mail).');
      return;
    }
    setEditandoId(c.id);
    setForm({
      nome: c.nome,
      parentesco: c.parentesco || '',
      telefone: c.telefone || '',
      celular: c.celular || '',
      email: c.email || '',
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!form.telefone.trim() && !form.celular.trim()) {
      toast.error('Informe pelo menos um telefone');
      return;
    }
    // Opcional em branco vai como null: `''` reprova no `.email()` do
    // contatoEmergenciaSchema (contato sem e-mail ficaria impossível de salvar) e
    // gravaria string vazia nas colunas nullable de `contatos_emergencia`.
    const dados = {
      nome: form.nome,
      parentesco: form.parentesco || null,
      telefone: form.telefone || null,
      celular: form.celular || null,
      email: form.email || null,
    };
    try {
      if (editandoId) {
        await atualizar.mutateAsync({ id: editandoId, dados });
        toast.success('Contato atualizado');
      } else {
        await criar.mutateAsync({ ...dados, colaborador_id: colaboradorId });
        toast.success('Contato adicionado');
      }
      fecharEResetar();
    } catch {
      toast.error(editandoId ? 'Erro ao atualizar contato' : 'Erro ao adicionar contato');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Contatos de Emergência</CardTitle>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (v) setOpen(true);
            else fecharEResetar();
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => {
                setEditandoId(null);
                setForm(initialForm);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editandoId ? 'Editar Contato de Emergência' : 'Novo Contato de Emergência'}</DialogTitle>
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
              <Button onClick={handleSubmit} disabled={criar.isPending || atualizar.isPending}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <FalhaConsulta o="os contatos de emergência" />
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
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" aria-label="Editar contato" onClick={() => abrirEdicao(c)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Excluir contato"
                        onClick={() => {
                          if (confirm('Excluir contato?')) excluir.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
