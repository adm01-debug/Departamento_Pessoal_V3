import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { AlertTriangle, FileText, Plus, Send, ShieldAlert, Clock, Skull } from 'lucide-react';

const catSchema = z.object({
  colaborador_id: z.string().uuid('Colaborador obrigatório'),
  data_acidente: z.string().min(1, 'Data obrigatória'),
  hora_acidente: z.string().optional(),
  tipo_acidente: z.enum(['tipico', 'trajeto', 'doenca_ocupacional']),
  tipo_cat: z.enum(['inicial', 'reabertura', 'comunicacao_obito']),
  cid_principal: z.string().min(3, 'CID obrigatório').max(10),
  parte_corpo_atingida: z.string().optional(),
  agente_causador: z.string().optional(),
  local_acidente: z.string().optional(),
  tipo_local: z.enum(['estabelecimento_empregador', 'via_publica', 'area_rural', 'outros']).optional(),
  situacao_geradora: z.string().optional(),
  minutos_trabalhados_antes: z.coerce.number().min(0).optional(),
  houve_afastamento: z.boolean().default(false),
  dias_afastamento_estimado: z.coerce.number().min(0).optional(),
  houve_obito: z.boolean().default(false),
  houve_internacao: z.boolean().default(false),
  ultimo_dia_trabalhado: z.string().optional(),
  observacoes: z.string().optional(),
});

type CatForm = z.infer<typeof catSchema>;

type CatRow = {
  id: string;
  numero_cat: string | null;
  data_acidente: string;
  tipo_acidente: string;
  tipo_cat: string;
  cid_principal: string | null;
  houve_obito: boolean;
  houve_afastamento: boolean;
  status_esocial: string | null;
  prazo_limite_envio: string | null;
  data_envio_esocial: string | null;
  protocolo_esocial: string | null;
  colaborador_id: string | null;
};

export default function AdminCatPage() {
  const { empresaAtual } = useEmpresas();
  const [cats, setCats] = useState<CatRow[]>([]);
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string }[]>([]);
  const [dashboard, setDashboard] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const form = useForm<CatForm>({
    resolver: zodResolver(catSchema) as never,
    defaultValues: {
      tipo_cat: 'inicial',
      tipo_acidente: 'tipico',
      houve_afastamento: false,
      houve_obito: false,
      houve_internacao: false,
    } as Partial<CatForm>,
  });

  const empresaId = empresaAtual?.id;

  const carregar = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const [{ data: cs }, { data: cols }, { data: dash }] = await Promise.all([
        supabase
          .from('sst_cat')
          .select('id,numero_cat,data_acidente,tipo_acidente,tipo_cat,cid_principal,houve_obito,houve_afastamento,status_esocial,prazo_limite_envio,data_envio_esocial,protocolo_esocial,colaborador_id')
          .eq('empresa_id', empresaId)
          .order('data_acidente', { ascending: false })
          .limit(500),
        supabase.from('colaboradores').select('id,nome_completo').eq('empresa_id', empresaId).limit(500),
        supabase.rpc('sst_cat_dashboard', { p_empresa_id: empresaId }),
      ]);
      setCats((cs as CatRow[]) || []);
      const colsData = (cols as { id: string; nome_completo: string }[] | null) || [];
      setColaboradores(colsData.map(c => ({ id: c.id, nome: c.nome_completo })));
      setDashboard((dash as Record<string, unknown>) || {});
    } catch (e) {
      toast.error('Falha ao carregar CATs');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void carregar(); }, [empresaId]);

  const onSubmit = async (values: CatForm) => {
    if (!empresaId) return;
    try {
      const { error } = await supabase.from('sst_cat').insert({
        ...values,
        empresa_id: empresaId,
        data_acidente: new Date(values.data_acidente).toISOString(),
      });
      if (error) throw error;
      toast.success('CAT registrada. Prazo legal calculado automaticamente.');
      setOpen(false);
      form.reset();
      void carregar();
    } catch (e) {
      toast.error(safeErrorMessage(e, 'Erro ao salvar CAT.'));
    }
  };

  const nomeColab = useMemo(() => new Map(colaboradores.map(c => [c.id, c.nome])), [colaboradores]);

  const kpi = (label: string, value: unknown, Icon: typeof AlertTriangle, tone: string) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${tone}`} />
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{String(value ?? 0)}</div></CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldAlert className="h-7 w-7 text-destructive" />CAT Eletrônica (S-2210)</h1>
          <p className="text-muted-foreground text-sm">Comunicação de Acidente de Trabalho — envio ao eSocial dentro do prazo legal.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova CAT</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar CAT</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Colaborador *</Label>
                  <Select onValueChange={(v) => form.setValue('colaborador_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{colaboradores.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                  {form.formState.errors.colaborador_id && <p className="text-xs text-destructive">{form.formState.errors.colaborador_id.message}</p>}
                </div>
                <div>
                  <Label>Tipo de CAT *</Label>
                  <Select defaultValue="inicial" onValueChange={(v) => form.setValue('tipo_cat', v as CatForm['tipo_cat'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inicial">Inicial</SelectItem>
                      <SelectItem value="reabertura">Reabertura</SelectItem>
                      <SelectItem value="comunicacao_obito">Comunicação de Óbito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data do acidente *</Label>
                  <Input type="datetime-local" {...form.register('data_acidente')} />
                </div>
                <div>
                  <Label>Tipo de acidente *</Label>
                  <Select defaultValue="tipico" onValueChange={(v) => form.setValue('tipo_acidente', v as CatForm['tipo_acidente'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tipico">Típico</SelectItem>
                      <SelectItem value="trajeto">Trajeto</SelectItem>
                      <SelectItem value="doenca_ocupacional">Doença Ocupacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CID Principal *</Label>
                  <Input placeholder="Ex: S60.9" {...form.register('cid_principal')} />
                  {form.formState.errors.cid_principal && <p className="text-xs text-destructive">{form.formState.errors.cid_principal.message}</p>}
                </div>
                <div>
                  <Label>Parte do corpo atingida</Label>
                  <Input {...form.register('parte_corpo_atingida')} />
                </div>
                <div>
                  <Label>Agente causador</Label>
                  <Input {...form.register('agente_causador')} />
                </div>
                <div>
                  <Label>Tipo de local</Label>
                  <Select onValueChange={(v) => form.setValue('tipo_local', v as NonNullable<CatForm['tipo_local']>)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estabelecimento_empregador">Estabelecimento do empregador</SelectItem>
                      <SelectItem value="via_publica">Via pública</SelectItem>
                      <SelectItem value="area_rural">Área rural</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Local do acidente</Label>
                  <Input {...form.register('local_acidente')} />
                </div>
                <div className="col-span-2">
                  <Label>Situação geradora</Label>
                  <Textarea rows={2} {...form.register('situacao_geradora')} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" {...form.register('houve_afastamento')} /> <Label>Houve afastamento</Label>
                </div>
                <div>
                  <Label>Dias estimados</Label>
                  <Input type="number" min={0} {...form.register('dias_afastamento_estimado')} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('houve_obito')} /> <Label className="text-destructive">Óbito (prazo 24h)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('houve_internacao')} /> <Label>Houve internação</Label>
                </div>
                <div className="col-span-2">
                  <Label>Observações</Label>
                  <Textarea rows={2} {...form.register('observacoes')} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>Registrar CAT</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {kpi('Total', dashboard.total_cats, FileText, 'text-primary')}
        {kpi('Pendentes envio', dashboard.pendentes_envio, Clock, 'text-warning')}
        {kpi('Em atraso', dashboard.em_atraso, AlertTriangle, 'text-destructive')}
        {kpi('Transmitidas', dashboard.transmitidas, Send, 'text-success')}
        {kpi('Com afastamento', dashboard.com_afastamento, FileText, 'text-muted-foreground')}
        {kpi('Óbitos (ano)', dashboard.obitos_ano, Skull, 'text-destructive')}
      </div>

      <Card>
        <CardHeader><CardTitle>CATs registradas</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Carregando…</p> : cats.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma CAT registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2">Número</th><th>Colaborador</th><th>Data</th><th>Tipo</th><th>CID</th>
                    <th>Prazo</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cats.map(c => {
                    const atrasada = !c.data_envio_esocial && c.prazo_limite_envio && new Date(c.prazo_limite_envio) < new Date();
                    return (
                      <tr key={c.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 font-mono text-xs">{c.numero_cat}</td>
                        <td>{c.colaborador_id ? nomeColab.get(c.colaborador_id) ?? '—' : '—'}</td>
                        <td>{new Date(c.data_acidente).toLocaleString('pt-BR')}</td>
                        <td><Badge variant="outline">{c.tipo_acidente}</Badge></td>
                        <td className="font-mono text-xs">{c.cid_principal ?? '—'}</td>
                        <td className={atrasada ? 'text-destructive font-medium' : ''}>
                          {c.prazo_limite_envio ? new Date(c.prazo_limite_envio).toLocaleString('pt-BR') : '—'}
                        </td>
                        <td>
                          {c.data_envio_esocial
                            ? <Badge className="bg-success text-success-foreground">Transmitida</Badge>
                            : atrasada
                              ? <Badge variant="destructive">Em atraso</Badge>
                              : <Badge variant="secondary">Pendente</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
