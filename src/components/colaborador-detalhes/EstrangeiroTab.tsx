import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDadosEstrangeiro, useSalvarDadosEstrangeiro } from '@/hooks/useColaboradorDetalhes';
import { useOnMount } from '@/hooks/useMountEffects';

interface EstrangeiroData {
  pais_origem?: string;
  tipo_visto?: string;
  data_chegada?: string;
  reside_brasil?: boolean;
}

export function EstrangeiroTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useDadosEstrangeiro(colaboradorId);
  const salvar = useSalvarDadosEstrangeiro();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ pais_origem: '', tipo_visto: '', data_chegada: '', reside_brasil: true });

  // Inicializa form no mount
  useOnMount(() => {
    if (data && !editing) {
      const d = data as EstrangeiroData;
      setForm({ pais_origem: d.pais_origem || '', tipo_visto: d.tipo_visto || '', data_chegada: d.data_chegada || '', reside_brasil: d.reside_brasil ?? true });
    }
  });

  useEffect(() => {
    if (data && !editing) {
      const d = data as EstrangeiroData;
      setForm({ pais_origem: d.pais_origem || '', tipo_visto: d.tipo_visto || '', data_chegada: d.data_chegada || '', reside_brasil: d.reside_brasil ?? true });
    }
  }, [data, editing]);

  const handleSave = async () => {
    if (!form.pais_origem.trim()) { toast.error('País de origem é obrigatório'); return; }
    try {
      await salvar.mutateAsync({ colaboradorId, dados: form });
      toast.success('Dados salvos');
      setEditing(false);
    } catch { toast.error('Erro ao salvar'); }
  };

  if (isLoading) return <Spinner />;

  const showForm = !data || editing;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Dados de Estrangeiro</CardTitle>
        {data && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="mr-1 h-4 w-4" />Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!showForm && data ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><Label className="text-xs text-muted-foreground">País de Origem</Label><p className="font-medium">{(data as any).pais_origem || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Tipo de Visto</Label><p className="font-medium">{(data as any).tipo_visto || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Data Chegada</Label><p className="font-medium">{(data as any).data_chegada || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Reside no Brasil</Label><Badge>{(data as any).reside_brasil ? 'Sim' : 'Não'}</Badge></div>
          </div>
        ) : (
          <div className="grid gap-3 max-w-md">
            {!data && <p className="text-sm text-muted-foreground mb-2">Nenhum dado cadastrado.</p>}
            <div><Label>País de Origem *</Label><Input value={form.pais_origem} onChange={e => setForm(f => ({ ...f, pais_origem: e.target.value }))} /></div>
            <div><Label>Tipo de Visto</Label><Input value={form.tipo_visto} onChange={e => setForm(f => ({ ...f, tipo_visto: e.target.value }))} /></div>
            <div><Label>Data Chegada</Label><Input type="date" value={form.data_chegada} onChange={e => setForm(f => ({ ...f, data_chegada: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.reside_brasil} onChange={e => setForm(f => ({ ...f, reside_brasil: e.target.checked }))} />
              <Label>Reside no Brasil</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={salvar.isPending}>Salvar</Button>
              {editing && <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
