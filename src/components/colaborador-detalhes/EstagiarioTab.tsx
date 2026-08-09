import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDadosEstagiario, useSalvarDadosEstagiario } from '@/hooks/useTabelasReferencia';
import { useSyncedState } from '@/hooks/useSyncedState';

interface EstagiarioData {
  instituicao_nome?: string;
  instituicao_cnpj?: string;
  curso?: string;
  nivel?: string;
  supervisor_nome?: string;
  supervisor_cargo?: string;
  data_inicio?: string;
  data_fim?: string;
  carga_horaria_semanal?: number;
  valor_bolsa?: number;
  numero_apolice?: string;
}

export function EstagiarioTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useDadosEstagiario(colaboradorId);
  const salvar = useSalvarDadosEstagiario();
  const [editing, setEditing] = useState(false);
  // Formulário derivado do dado remoto; a sincronização pausa durante a edição.
  const [form, setForm] = useSyncedState(
    data as EstagiarioData | undefined,
    (d) => ({
      instituicao_nome: d?.instituicao_nome || '', instituicao_cnpj: d?.instituicao_cnpj || '',
      curso: d?.curso || '', nivel: d?.nivel || '',
      supervisor_nome: d?.supervisor_nome || '', supervisor_cargo: d?.supervisor_cargo || '',
      data_inicio: d?.data_inicio || '', data_fim: d?.data_fim || '',
      carga_horaria_semanal: d?.carga_horaria_semanal?.toString() || '',
      valor_bolsa: d?.valor_bolsa?.toString() || '', numero_apolice: d?.numero_apolice || ''
    }),
    !editing
  );

  const handleSave = async () => {
    if (!form.instituicao_nome.trim()) { toast.error('Instituição de ensino é obrigatória'); return; }
    try {
      const payload = {
        ...form,
        carga_horaria_semanal: form.carga_horaria_semanal ? Number(form.carga_horaria_semanal) : null,
        valor_bolsa: form.valor_bolsa ? Number(form.valor_bolsa) : null,
      };
      await salvar.mutateAsync({ colaboradorId, dados: payload });
      toast.success('Dados de estagiário salvos');
      setEditing(false);
    } catch { toast.error('Erro ao salvar'); }
  };

  if (isLoading) return <Spinner />;

  const showForm = !data || editing;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Dados de Estagiário</CardTitle>
        {data && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="mr-1 h-4 w-4" />Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!showForm && data ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><Label className="text-xs text-muted-foreground">Instituição</Label><p className="font-medium">{(data as EstagiarioData).instituicao_nome}</p></div>
            <div><Label className="text-xs text-muted-foreground">CNPJ Instituição</Label><p className="font-medium">{(data as EstagiarioData).instituicao_cnpj || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Curso</Label><p className="font-medium">{(data as EstagiarioData).curso || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Nível</Label><p className="font-medium">{(data as EstagiarioData).nivel || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Supervisor</Label><p className="font-medium">{(data as EstagiarioData).supervisor_nome || '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Período</Label><p className="font-medium">{(data as EstagiarioData).data_inicio} a {(data as EstagiarioData).data_fim || '...'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Carga Horária</Label><p className="font-medium">{(data as EstagiarioData).carga_horaria_semanal ? `${(data as EstagiarioData).carga_horaria_semanal}h/sem` : '-'}</p></div>
            <div><Label className="text-xs text-muted-foreground">Bolsa</Label><p className="font-medium">{(data as EstagiarioData).valor_bolsa ? Number((data as EstagiarioData).valor_bolsa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</p></div>
          </div>
        ) : (
          <div className="grid gap-3 max-w-lg">
            {!data && <p className="text-sm text-muted-foreground mb-2">Nenhum dado cadastrado.</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Instituição de Ensino *</Label><Input value={form.instituicao_nome} onChange={e => setForm(f => ({ ...f, instituicao_nome: e.target.value }))} /></div>
              <div><Label>CNPJ Instituição</Label><Input value={form.instituicao_cnpj} onChange={e => setForm(f => ({ ...f, instituicao_cnpj: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Curso</Label><Input value={form.curso} onChange={e => setForm(f => ({ ...f, curso: e.target.value }))} /></div>
              <div><Label>Nível</Label><Input value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))} placeholder="Superior, Técnico..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Supervisor</Label><Input value={form.supervisor_nome} onChange={e => setForm(f => ({ ...f, supervisor_nome: e.target.value }))} /></div>
              <div><Label>Cargo Supervisor</Label><Input value={form.supervisor_cargo} onChange={e => setForm(f => ({ ...f, supervisor_cargo: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Início</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
              <div><Label>Data Fim</Label><Input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Carga Horária (h/sem)</Label><Input type="number" value={form.carga_horaria_semanal} onChange={e => setForm(f => ({ ...f, carga_horaria_semanal: e.target.value }))} /></div>
              <div><Label>Valor Bolsa (R$)</Label><Input type="number" step="0.01" value={form.valor_bolsa} onChange={e => setForm(f => ({ ...f, valor_bolsa: e.target.value }))} /></div>
              <div><Label>Nº Apólice Seguro</Label><Input value={form.numero_apolice} onChange={e => setForm(f => ({ ...f, numero_apolice: e.target.value }))} /></div>
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
