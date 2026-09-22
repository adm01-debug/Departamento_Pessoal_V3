import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Edit2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useDadosEstrangeiro, useSalvarDadosEstrangeiro } from '@/hooks/useColaboradorDetalhes';
import { useSyncedState } from '@/hooks/useSyncedState';
import { CampoInfo } from './CampoInfo';

interface EstrangeiroData {
  pais_origem?: string;
  tipo_visto?: string;
  data_chegada?: string;
  reside_brasil?: boolean;
}

/**
 * `bare`: mesma ideia do `bare` em PCDTab — usado dentro do card combinado
 * "PCD e Estrangeiro" do dashboard de Dados Pessoais, sem `<Card>` externo
 * e sempre em modo leitura (com "É estrangeiro? Não" quando não há
 * cadastro) até o usuário clicar em Editar. O estado de edição é sempre
 * controlado de fora (`editing` + `onEditingChange`) — o card combinado
 * tem um único botão "Editar" pra PCD e Estrangeiro juntos.
 */
export function EstrangeiroTab({
  colaboradorId, bare = false, editing: editingProp, onEditingChange,
}: {
  colaboradorId: string;
  bare?: boolean;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const { data, isLoading } = useDadosEstrangeiro(colaboradorId);
  const salvar = useSalvarDadosEstrangeiro();
  const [editingState, setEditingState] = useState(false);
  const editing = bare ? (editingProp ?? false) : editingState;
  const setEditing = bare ? (onEditingChange ?? (() => {})) : setEditingState;
  // Formulário derivado do dado remoto; a sincronização pausa durante a edição.
  const [form, setForm] = useSyncedState(
    data as EstrangeiroData | undefined,
    (d) => ({ pais_origem: d?.pais_origem || '', tipo_visto: d?.tipo_visto || '', data_chegada: d?.data_chegada || '', reside_brasil: d?.reside_brasil ?? true }),
    !editing
  );

  const handleSave = async () => {
    if (!form.pais_origem.trim()) { toast.error('País de origem é obrigatório'); return; }
    try {
      await salvar.mutateAsync({ colaboradorId, dados: form });
      toast.success('Dados salvos');
      setEditing(false);
    } catch { toast.error('Erro ao salvar'); }
  };

  if (isLoading) return <Spinner />;

  const formulario = (
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
  );

  if (bare) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Globe className="h-3.5 w-3.5 text-info" /> Estrangeiro
        </div>
        {editing ? formulario : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 sm:gap-x-0 gap-y-2 sm:divide-x-2 sm:divide-border/60 [&>*]:sm:px-3 [&>*:first-child]:sm:pl-0">
            <CampoInfo compact label="É estrangeiro?" valor={data ? 'Sim' : 'Não'} />
            <CampoInfo compact label="País de origem" valor={(data as any)?.pais_origem} />
            <CampoInfo compact label="Tipo de visto" valor={(data as any)?.tipo_visto} />
            <CampoInfo compact label="Data de chegada" valor={(data as any)?.data_chegada ? new Date(`${(data as any).data_chegada}T00:00:00`).toLocaleDateString('pt-BR') : undefined} />
          </div>
        )}
      </div>
    );
  }

  const showForm = !data || editing;

  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-4.5 w-4.5 text-primary" /> Dados de Estrangeiro
        </CardTitle>
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
        ) : formulario}
      </CardContent>
    </Card>
  );
}
