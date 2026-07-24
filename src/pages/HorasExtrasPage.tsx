import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { PageLayout } from '@/components/layout';
import { useHorasExtras } from '@/hooks/useHorasExtras';
import { useColaboradores } from '@/hooks/useColaboradores';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Check, X, Trash2 } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pendente: 'secondary',
  aprovada: 'default',
  rejeitada: 'destructive',
};

export default function HorasExtrasPage() {
  const { solicitacoes, isLoading, criar, aprovar, rejeitar, excluir } = useHorasExtras();
  const { colaboradores } = useColaboradores();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ colaborador_id: '', data: '', horas_solicitadas: '', motivo: '' });

  const handleSubmit = async () => {
    if (!form.colaborador_id || !form.data || !form.horas_solicitadas || !form.motivo) return;
    await criar({ ...form, horas_solicitadas: Number(form.horas_solicitadas) });
    setForm({ colaborador_id: '', data: '', horas_solicitadas: '', motivo: '' });
    setShowForm(false);
  };

  return (
    <>
    <PageTitle title="Horas Extras" description="Controle de horas extras" />
    <PageLayout title="Solicitações de Hora Extra">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Horas Extras</CardTitle>
          <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" />Nova Solicitação</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border rounded-lg bg-muted/30">
              <div>
                <Label>Colaborador *</Label>
                <Select value={form.colaborador_id} onValueChange={v => setForm(f => ({ ...f, colaborador_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data *</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
              <div><Label>Horas *</Label><Input type="number" step="0.5" value={form.horas_solicitadas} onChange={e => setForm(f => ({ ...f, horas_solicitadas: e.target.value }))} /></div>
              <div><Label>Motivo *</Label><Input value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} /></div>
              <div className="flex items-end"><Button onClick={handleSubmit}>Criar Solicitação</Button></div>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>}
              {!isLoading && solicitacoes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma solicitação</TableCell></TableRow>}
              {solicitacoes.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.colaborador?.nome_completo || '—'}</TableCell>
                  <TableCell>{s.data}</TableCell>
                  <TableCell>{Number(s.horas_solicitadas).toFixed(1)}h</TableCell>
                  <TableCell>{s.motivo}</TableCell>
                  <TableCell><Badge variant={statusVariant[s.status] || 'secondary'}>{s.status}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    {s.status === 'pendente' && (
                      <>
                        <Button size="icon" variant="ghost" aria-label="Aprovar" onClick={() => aprovar({ id: s.id })} title="Aprovar"><Check className="h-4 w-4 text-primary" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Rejeitar" onClick={() => rejeitar({ id: s.id })} title="Rejeitar"><X className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => excluir(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
    </>
  );
}
