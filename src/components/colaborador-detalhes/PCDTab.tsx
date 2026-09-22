import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Edit2, Accessibility } from 'lucide-react';
import { toast } from 'sonner';
import { useDeficiencia, useSalvarDeficiencia } from '@/hooks/useColaboradorDetalhes';
import { useSyncedState } from '@/hooks/useSyncedState';
import { CampoInfo } from './CampoInfo';

interface PCDData {
  tipo?: string;
  cid?: string;
  descricao?: string;
  observacoes?: string;
}

const TIPOS = ['Física', 'Auditiva', 'Visual', 'Mental', 'Intelectual', 'Múltipla', 'Reabilitado'];

/**
 * `bare`: usado dentro do card combinado "PCD e Estrangeiro" do dashboard
 * de Dados Pessoais — renderiza só o cabeçalho compacto + conteúdo, sem o
 * `<Card>` externo (evita Card-dentro-de-Card) e sempre mostra o resumo em
 * modo leitura (com "É PCD? Não" quando não há cadastro, em vez de já abrir
 * o formulário de criação — o formulário só aparece ao clicar em Editar).
 * Nesse modo o estado de edição é sempre controlado de fora (`editing` +
 * `onEditingChange`) — o card combinado tem um único botão "Editar" pra
 * PCD e Estrangeiro juntos, então este componente não renderiza o seu
 * próprio botão. O modo padrão (sem `bare`) é usado isoladamente em outros
 * lugares e mantém o comportamento/textos originais intactos (estado e
 * botão próprios).
 */
export function PCDTab({
  colaboradorId, bare = false, editing: editingProp, onEditingChange,
}: {
  colaboradorId: string;
  bare?: boolean;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const { data, isLoading } = useDeficiencia(colaboradorId);
  const salvar = useSalvarDeficiencia();
  const [editingState, setEditingState] = useState(false);
  const editing = bare ? (editingProp ?? false) : editingState;
  const setEditing = bare ? (onEditingChange ?? (() => {})) : setEditingState;
  // Formulário derivado do dado remoto; a sincronização pausa durante a edição.
  const [form, setForm] = useSyncedState(
    data as PCDData | undefined,
    (d) => ({ tipo: d?.tipo || '', cid: d?.cid || '', descricao: d?.descricao || '', observacoes: d?.observacoes || '' }),
    !editing
  );

  const handleSave = async () => {
    if (!form.tipo) { toast.error('Tipo de deficiência é obrigatório'); return; }
    try {
      await salvar.mutateAsync({ colaboradorId, dados: form });
      toast.success('Dados PCD salvos');
      setEditing(false);
    } catch { toast.error('Erro ao salvar'); }
  };

  if (isLoading) return <Spinner />;

  const formulario = (
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
  );

  if (bare) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Accessibility className="h-3.5 w-3.5 text-success" /> PCD
        </div>
        {editing ? formulario : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 sm:gap-x-0 gap-y-2 sm:divide-x-2 sm:divide-border/60 [&>*]:sm:px-3 [&>*:first-child]:sm:pl-0">
            <CampoInfo compact label="É PCD?" valor={data ? 'Sim' : 'Não'} />
            <CampoInfo compact label="Tipo" valor={(data as any)?.tipo} />
            <CampoInfo compact label="CID" valor={(data as any)?.cid} />
            <CampoInfo compact label="Observações" valor={(data as any)?.observacoes} />
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
          <Accessibility className="h-4.5 w-4.5 text-primary" /> Pessoa com Deficiência (PCD)
        </CardTitle>
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
        ) : formulario}
      </CardContent>
    </Card>
  );
}
