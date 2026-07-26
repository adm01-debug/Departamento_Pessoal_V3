import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDeficiencia, useSalvarDeficiencia } from '@/hooks/useColaboradorDetalhes';
import { useOnMount } from '@/hooks/useMountEffects';

interface PCDData {
  tipo?: string;
  cid?: string;
  descricao?: string;
  observacoes?: string;
}

const TIPOS = ['Física', 'Auditiva', 'Visual', 'Mental', 'Intelectual', 'Múltipla', 'Reabilitado'];

export function PCDTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useDeficiencia(colaboradorId);
  const salvar = useSalvarDeficiencia();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ tipo: '', cid: '', descricao: '', observacoes: '' });

  // Inicializa form no mount
  useOnMount(() => {
    if (data && !editing) {
      const d = data as PCDData;
      setForm({ tipo: d.tipo || '', cid: d.cid || '', descricao: d.descricao || '', observacoes: d.observacoes || '' });
    }
  });

  useEffect(() => {
    if (data && !editing) {
      const d = data as PCDData;
      setForm({ tipo: d.tipo || '', cid: d.cid || '', descricao: d.descricao || '', observacoes: d.observacoes || '' });
    }
  }, [data, editing]);

  const handleSave = async () => {
    if (!form.tipo) { toast.error('Tipo de deficiência é obrigatório'); return; }
    try {
      await salvar.mutateAsync({ colaboradorId, dados: form });
      toast.success('Dados PCD salvos');
      setEditing(false);
    } catch { toast.error('Erro ao salvar'); }
  };

  if (isLoading) return <Spinner />;

  const showForm = !data || editing;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Pessoa com Deficiência (PCD)</CardTitle>
        {data && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="mr-1 h-4 w-4" />Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!showForm && data ? (
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs text-muted-foreground">Tipo</Label><p className="font-medium">{(data as any).tipo}</p></div>
            <div><Label className="text-xs text-muted-foreground">CID</Label><p className="font-medium">{(data as any).cid || '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Descrição</Label><p>{(data as any).descricao || '-'}</p></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Observações</Label><p>{(data as any).observacoes || '-'}</p></div>
          </div>
        ) : (
          <div className="grid gap-3 max-w-md">
            {!data && <p className="text-sm text-muted-foreground mb-2">Nenhum dado cadastrado.</p>}
            <div><Label>Tipo de Deficiência *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>CID</Label><Input value={form.cid} onChange={e => setForm(f => ({ ...f, cid: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
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
