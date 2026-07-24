import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { controleAcessoService } from '@/services/controleAcessoService';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Plus, DoorOpen, DoorClosed, MapPin, Fingerprint, LogIn, LogOut } from 'lucide-react';

export default function ControleAcessoPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ colaborador_id: '', tipo: 'entrada', metodo: 'manual', local: '', area: '' });

  const { data: registros = [], isLoading } = useQuery({ queryKey: ['controle_acesso', empresaAtual?.id], queryFn: () => controleAcessoService.listar(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', empresaAtual?.id], queryFn: () => colaboradorService.list(empresaAtual!.id), enabled: !!empresaAtual?.id });

  const registrar = useMutation({
    mutationFn: () => controleAcessoService.registrar({ ...form, empresa_id: empresaAtual?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['controle_acesso'] }); setOpen(false); toast.success('Acesso registrado!'); setForm({ colaborador_id: '', tipo: 'entrada', metodo: 'manual', local: '', area: '' }); },
    onError: () => toast.error('Erro ao registrar'),
  });

  const entradas = registros.filter((r: any) => r.tipo === 'entrada').length;
  const saidas = registros.filter((r: any) => r.tipo === 'saida').length;

  return (
    <>
    <PageTitle title="Controle de Acesso" description="Gerenciamento de permissões e acessos" />
    <PageLayout title="Controle de Presença & Acesso">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Fingerprint className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{registros.length}</p><p className="text-xs text-muted-foreground">Total registros</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><LogIn className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{entradas}</p><p className="text-xs text-muted-foreground">Entradas</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><LogOut className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{saidas}</p><p className="text-xs text-muted-foreground">Saídas</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><MapPin className="h-8 w-8 text-info" /><div><p className="text-2xl font-bold">{new Set(registros.map((r: any) => r.local).filter(Boolean)).size}</p><p className="text-xs text-muted-foreground">Locais</p></div></CardContent></Card>
      </div>

      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Registrar Acesso</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Acesso</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Colaborador</Label>
                <Select value={form.colaborador_id} onValueChange={v => setForm(p => ({ ...p, colaborador_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Método</Label>
                  <Select value={form.metodo} onValueChange={v => setForm(p => ({ ...p, metodo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="cracha">Crachá</SelectItem><SelectItem value="biometria">Biometria</SelectItem><SelectItem value="qrcode">QR Code</SelectItem><SelectItem value="nfc">NFC</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Local</Label><Input value={form.local} onChange={e => setForm(p => ({ ...p, local: e.target.value }))} placeholder="Ex: Sede" /></div>
                <div><Label>Área</Label><Input value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} placeholder="Ex: Recepção" /></div>
              </div>
              <Button className="w-full" onClick={() => registrar.mutate()} disabled={!form.colaborador_id || registrar.isPending}>{registrar.isPending ? 'Registrando...' : 'Registrar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Spinner /> : (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Tipo</TableHead><TableHead>Método</TableHead><TableHead>Local</TableHead><TableHead>Área</TableHead><TableHead>Data/Hora</TableHead></TableRow></TableHeader>
            <TableBody>
              {registros.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro de acesso</TableCell></TableRow> :
                registros.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{(r as any).colaborador?.nome_completo || '—'}</TableCell>
                    <TableCell>{r.tipo === 'entrada' ? <Badge className="bg-success/20 text-success"><LogIn className="h-3 w-3 mr-1" />Entrada</Badge> : <Badge variant="secondary"><LogOut className="h-3 w-3 mr-1" />Saída</Badge>}</TableCell>
                    <TableCell><Badge variant="outline">{r.metodo}</Badge></TableCell>
                    <TableCell>{r.local || '—'}</TableCell>
                    <TableCell>{r.area || '—'}</TableCell>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString('pt-BR')}</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </Card>
      )}
    </PageLayout>
    </>
  );
}
