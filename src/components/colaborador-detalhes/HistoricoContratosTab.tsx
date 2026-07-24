import { useState } from 'react';
import { useHistoricoContratos } from '@/hooks/useHistoricoContratos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Props { colaboradorId: string; }

export function HistoricoContratosTab({ colaboradorId }: Props) {
  const { historico, isLoading, criar, excluir } = useHistoricoContratos(colaboradorId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ data_inicio: '', cargo: '', departamento: '', tipo_contrato: '', salario: '', carga_horaria_semanal: '', motivo_alteracao: '' });

  const handleSubmit = async () => {
    if (!form.data_inicio || !form.motivo_alteracao) { toast.error('Data e motivo são obrigatórios'); return; }
    await criar({ ...form, salario: form.salario ? Number(form.salario) : null, carga_horaria_semanal: form.carga_horaria_semanal ? Number(form.carga_horaria_semanal) : null });
    setForm({ data_inicio: '', cargo: '', departamento: '', tipo_contrato: '', salario: '', carga_horaria_semanal: '', motivo_alteracao: '' });
    setShowForm(false);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Histórico de Contratos</CardTitle>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />Nova Alteração</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
            <div><Label>Data Início *</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
            <div><Label>Cargo</Label><Input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} /></div>
            <div><Label>Departamento</Label><Input value={form.departamento} onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))} /></div>
            <div><Label>Tipo Contrato</Label><Input value={form.tipo_contrato} onChange={e => setForm(f => ({ ...f, tipo_contrato: e.target.value }))} /></div>
            <div><Label>Salário</Label><Input type="number" value={form.salario} onChange={e => setForm(f => ({ ...f, salario: e.target.value }))} /></div>
            <div><Label>Carga Horária Semanal</Label><Input type="number" value={form.carga_horaria_semanal} onChange={e => setForm(f => ({ ...f, carga_horaria_semanal: e.target.value }))} /></div>
            <div className="md:col-span-2"><Label>Motivo da Alteração *</Label><Input value={form.motivo_alteracao} onChange={e => setForm(f => ({ ...f, motivo_alteracao: e.target.value }))} /></div>
            <div className="flex items-end"><Button onClick={handleSubmit}>Salvar</Button></div>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Início</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Salário</TableHead>
              <TableHead>CH Semanal</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!historico || historico.length === 0) && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma alteração contratual</TableCell></TableRow>}
            {historico?.map((h: any) => (

              <TableRow key={h.id}>
                <TableCell>{h.data_inicio}</TableCell>
                <TableCell>{h.cargo || '—'}</TableCell>
                <TableCell>{h.departamento || '—'}</TableCell>
                <TableCell>{h.tipo_contrato || '—'}</TableCell>
                <TableCell>{h.salario ? Number(h.salario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</TableCell>
                <TableCell>{h.carga_horaria_semanal ? `${h.carga_horaria_semanal}h` : '—'}</TableCell>
                <TableCell>{h.motivo_alteracao || '—'}</TableCell>
                <TableCell><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
