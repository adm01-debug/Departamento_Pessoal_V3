import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Plus, Search, Trash2, Pencil, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

type Clinica = {
  id: string;
  empresa_id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  responsavel_tecnico: string | null;
  crm_responsavel: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  especialidades: string[];
  tipos_exame: string[];
  sla_medio_min: number | null;
  rating: number | null;
  aceita_convenio: boolean;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes: string | null;
};

type FormState = Partial<Clinica> & { especialidades_str?: string; tipos_exame_str?: string };

const EMPTY_FORM: FormState = {
  razao_social: '',
  cnpj: '',
  status: 'ativo',
  especialidades_str: '',
  tipos_exame_str: '',
  aceita_convenio: false,
};

export default function AdminClinicasPartnersPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const empresaId = empresaAtual?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['clinicas-partners', empresaId, statusFilter],
    enabled: !!empresaId,
    staleTime: 60_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from('clinicas_partners')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('razao_social', { ascending: true })
        .limit(500);
      if (statusFilter !== 'todos') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Clinica[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (c) =>
        c.razao_social.toLowerCase().includes(s) ||
        c.cnpj.includes(s) ||
        (c.cidade ?? '').toLowerCase().includes(s) ||
        (c.nome_fantasia ?? '').toLowerCase().includes(s),
    );
  }, [data, search]);

  const kpis = useMemo(() => {
    const total = data?.length ?? 0;
    const ativas = data?.filter((c) => c.status === 'ativo').length ?? 0;
    const cidades = new Set(data?.map((c) => c.cidade).filter(Boolean)).size;
    const comGeo = data?.filter((c) => c.geo_lat && c.geo_lng).length ?? 0;
    return { total, ativas, cidades, comGeo };
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      if (!empresaId) throw new Error('Empresa não selecionada');
      const especialidades = (payload.especialidades_str ?? '')
        .split(',').map((s) => s.trim()).filter(Boolean);
      const tipos_exame = (payload.tipos_exame_str ?? '')
        .split(',').map((s) => s.trim()).filter(Boolean);
      const row = {
        empresa_id: empresaId,
        razao_social: payload.razao_social,
        nome_fantasia: payload.nome_fantasia || null,
        cnpj: payload.cnpj,
        email: payload.email || null,
        telefone: payload.telefone || null,
        responsavel_tecnico: payload.responsavel_tecnico || null,
        crm_responsavel: payload.crm_responsavel || null,
        cep: payload.cep || null,
        logradouro: payload.logradouro || null,
        numero: payload.numero || null,
        bairro: payload.bairro || null,
        cidade: payload.cidade || null,
        uf: payload.uf ? payload.uf.toUpperCase() : null,
        geo_lat: payload.geo_lat ?? null,
        geo_lng: payload.geo_lng ?? null,
        especialidades,
        tipos_exame,
        sla_medio_min: payload.sla_medio_min ?? null,
        aceita_convenio: !!payload.aceita_convenio,
        status: payload.status ?? 'ativo',
        observacoes: payload.observacoes || null,
      };
      if (editingId) {
        const { error } = await (supabase as any).from('clinicas_partners').update(row).eq('id', editingId).eq('empresa_id', empresaId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('clinicas_partners').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Clínica atualizada' : 'Clínica cadastrada');
      qc.invalidateQueries({ queryKey: ['clinicas-partners'] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    },
    onError: (e: any) => toast.error(safeErrorMessage(e, 'Erro ao salvar clínica.')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('clinicas_partners').delete().eq('id', id).eq('empresa_id', empresaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Clínica removida');
      qc.invalidateQueries({ queryKey: ['clinicas-partners'] });
    },
    onError: (e: any) => toast.error(safeErrorMessage(e, 'Erro ao remover clínica.')),
  });

  const openEdit = (c: Clinica) => {
    setEditingId(c.id);
    setForm({
      ...c,
      especialidades_str: c.especialidades?.join(', ') ?? '',
      tipos_exame_str: c.tipos_exame?.join(', ') ?? '',
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  return (
    <>
      <PageTitle title="Clínicas Credenciadas" description="Rede de clínicas parceiras para exames ocupacionais" />
      <PageLayout
        title="Clínicas Credenciadas"
        description="Rede de partners para saúde ocupacional (autoagendamento, ASO digital, SLA)"
        icon={<Stethoscope className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-success"
      >
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{kpis.total}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ativas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-success">{kpis.ativas}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Cidades cobertas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{kpis.cidades}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Com geolocalização</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{kpis.comGeo}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por razão social, CNPJ ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativas</SelectItem>
                  <SelectItem value="inativo">Inativas</SelectItem>
                  <SelectItem value="suspenso">Suspensas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nova clínica</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar clínica' : 'Nova clínica credenciada'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>Razão social *</Label>
                    <Input value={form.razao_social ?? ''} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
                  </div>
                  <div><Label>Nome fantasia</Label><Input value={form.nome_fantasia ?? ''} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
                  <div><Label>CNPJ *</Label><Input value={form.cnpj ?? ''} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
                  <div><Label>E-mail</Label><Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Telefone</Label><Input value={form.telefone ?? ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                  <div><Label>Responsável técnico</Label><Input value={form.responsavel_tecnico ?? ''} onChange={(e) => setForm({ ...form, responsavel_tecnico: e.target.value })} /></div>
                  <div><Label>CRM responsável</Label><Input value={form.crm_responsavel ?? ''} onChange={(e) => setForm({ ...form, crm_responsavel: e.target.value })} /></div>
                  <div><Label>CEP</Label><Input value={form.cep ?? ''} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label>Logradouro</Label><Input value={form.logradouro ?? ''} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} /></div>
                  <div><Label>Número</Label><Input value={form.numero ?? ''} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
                  <div><Label>Bairro</Label><Input value={form.bairro ?? ''} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
                  <div><Label>Cidade</Label><Input value={form.cidade ?? ''} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
                  <div><Label>UF</Label><Input maxLength={2} value={form.uf ?? ''} onChange={(e) => setForm({ ...form, uf: e.target.value })} /></div>
                  <div><Label>Latitude</Label><Input type="number" step="0.0000001" value={form.geo_lat ?? ''} onChange={(e) => setForm({ ...form, geo_lat: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Longitude</Label><Input type="number" step="0.0000001" value={form.geo_lng ?? ''} onChange={(e) => setForm({ ...form, geo_lng: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>SLA médio (min)</Label><Input type="number" value={form.sla_medio_min ?? ''} onChange={(e) => setForm({ ...form, sla_medio_min: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status ?? 'ativo'} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativa</SelectItem>
                        <SelectItem value="inativo">Inativa</SelectItem>
                        <SelectItem value="suspenso">Suspensa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2"><Label>Especialidades (separadas por vírgula)</Label><Input placeholder="Cardiologia, Ortopedia, Oftalmologia" value={form.especialidades_str ?? ''} onChange={(e) => setForm({ ...form, especialidades_str: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label>Tipos de exame (separados por vírgula)</Label><Input placeholder="Admissional, Periódico, Demissional, Mudança de função" value={form.tipos_exame_str ?? ''} onChange={(e) => setForm({ ...form, tipos_exame_str: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => saveMutation.mutate(form)}
                    disabled={saveMutation.isPending || !form.razao_social || !form.cnpj}
                  >
                    {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma clínica cadastrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clínica</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Tipos de exame</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.razao_social}</div>
                        {c.nome_fantasia && <div className="text-xs text-muted-foreground">{c.nome_fantasia}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.cnpj}</TableCell>
                      <TableCell>
                        {c.cidade ? (
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.cidade}/{c.uf}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {c.tipos_exame?.slice(0, 3).map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                          ))}
                          {c.tipos_exame?.length > 3 && <Badge variant="outline" className="text-xs">+{c.tipos_exame.length - 3}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{c.sla_medio_min ? `${c.sla_medio_min} min` : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'ativo' ? 'default' : 'secondary'}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Excluir"
                          onClick={() => {
                            if (confirm(`Remover ${c.razao_social}?`)) deleteMutation.mutate(c.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageLayout>
    </>
  );
}
