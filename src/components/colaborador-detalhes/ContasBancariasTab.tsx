import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useContasBancarias, useCriarContaBancaria, useExcluirContaBancaria } from '@/hooks/useTabelasReferencia';
import { maskBankAccount } from '@/utils/piiMask';

const TIPOS_CONTA = ['Corrente', 'Poupança', 'Salário'];
const TIPOS_PIX = ['CPF', 'CNPJ', 'Email', 'Telefone', 'Chave aleatória'];

export function ContasBancariasTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useContasBancarias(colaboradorId);
  const criar = useCriarContaBancaria();
  const excluir = useExcluirContaBancaria(colaboradorId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ banco_codigo: '', banco_nome: '', agencia: '', conta: '', tipo_conta: 'Corrente', pix_tipo: '', pix_chave: '', principal: false });

  const handleSubmit = async () => {
    if (!form.banco_nome.trim()) { toast.error('Nome do banco é obrigatório'); return; }
    if (!form.agencia.trim()) { toast.error('Agência é obrigatória'); return; }
    if (!form.conta.trim()) { toast.error('Conta é obrigatória'); return; }
    try {
      await criar.mutateAsync({ ...form, colaborador_id: colaboradorId });
      toast.success('Conta bancária adicionada');
      setOpen(false);
      setForm({ banco_codigo: '', banco_nome: '', agencia: '', conta: '', tipo_conta: 'Corrente', pix_tipo: '', pix_chave: '', principal: false });
    } catch { toast.error('Erro ao adicionar conta'); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Contas Bancárias</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Conta Bancária</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Código Banco</Label><Input value={form.banco_codigo} onChange={e => setForm(f => ({ ...f, banco_codigo: e.target.value }))} placeholder="001" /></div>
                <div><Label>Nome Banco *</Label><Input value={form.banco_nome} onChange={e => setForm(f => ({ ...f, banco_nome: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Agência *</Label><Input value={form.agencia} onChange={e => setForm(f => ({ ...f, agencia: e.target.value }))} /></div>
                <div><Label>Conta *</Label><Input value={form.conta} onChange={e => setForm(f => ({ ...f, conta: e.target.value }))} /></div>
              </div>
              <div><Label>Tipo de Conta</Label>
                <Select value={form.tipo_conta} onValueChange={v => setForm(f => ({ ...f, tipo_conta: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_CONTA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tipo PIX</Label>
                <Select value={form.pix_tipo} onValueChange={v => setForm(f => ({ ...f, pix_tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                  <SelectContent>{TIPOS_PIX.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.pix_tipo && <div><Label>Chave PIX</Label><Input value={form.pix_chave} onChange={e => setForm(f => ({ ...f, pix_chave: e.target.value }))} /></div>}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.checked }))} />
                Conta principal
              </label>
              <Button onClick={handleSubmit} disabled={criar.isPending}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Banco</TableHead><TableHead>Agência</TableHead><TableHead>Conta</TableHead><TableHead>Tipo</TableHead><TableHead>PIX</TableHead><TableHead>Principal</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {data.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.banco_nome} {c.banco_codigo ? `(${c.banco_codigo})` : ''}</TableCell>
                  <TableCell>{maskBankAccount(c.agencia)}</TableCell>
                  <TableCell>{maskBankAccount(c.conta)}</TableCell>
                  <TableCell>{c.tipo_conta}</TableCell>
                  <TableCell>{c.pix_tipo ? `${c.pix_tipo}: ${c.pix_chave}` : '-'}</TableCell>
                  <TableCell>{c.principal ? <Badge>Sim</Badge> : 'Não'}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => { if (confirm('Excluir conta?')) excluir.mutate(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
