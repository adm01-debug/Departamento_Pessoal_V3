import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePeriodoExperiencia, useSalvarPeriodoExperiencia } from '@/hooks/useColaboradorDetalhes';

export function ExperienciaTab({ colaboradorId, hideHeader = false }: { colaboradorId: string; hideHeader?: boolean }) {
  const { data, isLoading } = usePeriodoExperiencia(colaboradorId);
  const salvar = useSalvarPeriodoExperiencia();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ data_inicio: '', primeira_etapa_fim: '', segunda_etapa_fim: '', tipo: '45+45', dias_total: 90 });

  const handleSave = async () => {
    if (!form.data_inicio) { toast.error('Data de início é obrigatória'); return; }
    try {
      await salvar.mutateAsync({ colaboradorId, dados: form });
      toast.success('Período de experiência salvo');
      setEditing(false);
    } catch { toast.error('Erro ao salvar'); }
  };

  const startEdit = (d: any) => {
    setForm({ data_inicio: d.data_inicio || '', primeira_etapa_fim: d.primeira_etapa_fim || '', segunda_etapa_fim: d.segunda_etapa_fim || '', tipo: d.tipo || '45+45', dias_total: d.dias_total || 90 });
    setEditing(true);
  };

  if (isLoading) return <Spinner />;

  const showForm = !data || editing;

  const botaoEditar = data && !editing && (
    <Button variant="outline" size="sm" onClick={() => startEdit(data)}>
      <Edit2 className="mr-1 h-4 w-4" />Editar
    </Button>
  );

  const corpo = !showForm && data ? (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div><Label className="text-muted-foreground text-xs">Início</Label><p className="font-medium">{(data as any).data_inicio}</p></div>
      <div><Label className="text-muted-foreground text-xs">1ª Etapa (fim)</Label><p className="font-medium">{(data as any).primeira_etapa_fim || '-'}</p></div>
      <div><Label className="text-muted-foreground text-xs">2ª Etapa (fim)</Label><p className="font-medium">{(data as any).segunda_etapa_fim || '-'}</p></div>
      <div><Label className="text-muted-foreground text-xs">Tipo</Label><p className="font-medium">{(data as any).tipo}</p></div>
      <div className="flex items-center gap-2"><Label className="text-muted-foreground text-xs">Status</Label><Badge>{(data as any).status}</Badge></div>
    </div>
  ) : (
    <div className="grid gap-3 max-w-md">
      {!data && <p className="text-sm text-muted-foreground mb-2">Nenhum período cadastrado. Preencha abaixo:</p>}
      <div><Label>Data Início *</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
      <div><Label>Tipo</Label>
        <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="45+45">45 + 45 dias</SelectItem>
            <SelectItem value="30+60">30 + 60 dias</SelectItem>
            <SelectItem value="90">90 dias corridos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>1ª Etapa Fim</Label><Input type="date" value={form.primeira_etapa_fim} onChange={e => setForm(f => ({ ...f, primeira_etapa_fim: e.target.value }))} /></div>
      <div><Label>2ª Etapa Fim</Label><Input type="date" value={form.segunda_etapa_fim} onChange={e => setForm(f => ({ ...f, segunda_etapa_fim: e.target.value }))} /></div>
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={salvar.isPending}>Salvar</Button>
        {editing && <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>}
      </div>
    </div>
  );

  if (hideHeader) {
    return (
      <div className="space-y-3">
        {botaoEditar && <div className="flex justify-end">{botaoEditar}</div>}
        {corpo}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Período de Experiência</CardTitle>
        {botaoEditar}
      </CardHeader>
      <CardContent>{corpo}</CardContent>
    </Card>
  );
}
