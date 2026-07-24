import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, MapPin, Navigation, Plus, Stethoscope, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

type Agend = {
  id: string;
  colaborador_id: string;
  clinica_id: string;
  tipo_exame: string;
  data_agendada: string;
  distancia_km: number | null;
  status: string;
  observacoes: string | null;
  clinicas_partners?: { razao_social: string; cidade: string | null; uf: string | null };
  colaboradores?: { nome_completo: string; matricula: string | null };
};

type ClinicaProxima = {
  id: string; razao_social: string; nome_fantasia: string | null;
  cidade: string | null; uf: string | null; telefone: string | null;
  sla_medio_min: number | null; tipos_exame: string[]; distancia_km: number;
};

const TIPOS_EXAME = [
  { v: 'admissional', l: 'Admissional' },
  { v: 'periodico', l: 'Periódico' },
  { v: 'demissional', l: 'Demissional' },
  { v: 'mudanca_funcao', l: 'Mudança de função' },
  { v: 'retorno_trabalho', l: 'Retorno ao trabalho' },
];

export default function AdminAgendamentoExamesPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [colaboradorId, setColaboradorId] = useState<string>('');
  const [tipoExame, setTipoExame] = useState<string>('periodico');
  const [dataAgendada, setDataAgendada] = useState<string>('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [raio, setRaio] = useState<number>(50);
  const [clinicaEscolhida, setClinicaEscolhida] = useState<ClinicaProxima | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [obs, setObs] = useState('');

  const empresaId = empresaAtual?.id;

  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ['exames-agendamentos', empresaId],
    enabled: !!empresaId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('exames_agendamentos')
        .select('*, clinicas_partners(razao_social,cidade,uf), colaboradores(nome_completo,matricula)')
        .eq('empresa_id', empresaId)
        .order('data_agendada', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Agend[];
    },
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['colab-mini', empresaId],
    enabled: !!empresaId && dialogOpen,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome_completo, matricula, cep, cidade, uf')
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [clinicasProximas, setClinicasProximas] = useState<ClinicaProxima[]>([]);

  const buscarClinicas = async () => {
    if (!empresaId || !lat || !lng) {
      toast.error('Informe latitude e longitude do colaborador');
      return;
    }
    setBuscando(true);
    setClinicaEscolhida(null);
    try {
      const { data, error } = await (supabase as any).rpc('clinicas_proximas', {
        p_empresa_id: empresaId,
        p_lat: Number(lat),
        p_lng: Number(lng),
        p_tipo_exame: tipoExame || null,
        p_raio_km: raio,
        p_limit: 15,
      });
      if (error) throw error;
      setClinicasProximas((data ?? []) as ClinicaProxima[]);
      if (!data || data.length === 0) toast.info('Nenhuma clínica encontrada no raio informado');
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Falha na busca de clínicas.'));
    } finally {
      setBuscando(false);
    }
  };

  const usarLocalizacaoAtual = () => {
    if (!navigator.geolocation) return toast.error('Geolocalização indisponível no navegador');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(String(pos.coords.latitude)); setLng(String(pos.coords.longitude)); },
      () => toast.error('Não foi possível obter localização'),
    );
  };

  const agendar = useMutation({
    mutationFn: async () => {
      if (!empresaId || !colaboradorId || !clinicaEscolhida || !dataAgendada) {
        throw new Error('Preencha colaborador, clínica e data.');
      }
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('exames_agendamentos').insert({
        empresa_id: empresaId,
        colaborador_id: colaboradorId,
        clinica_id: clinicaEscolhida.id,
        tipo_exame: tipoExame,
        data_agendada: dataAgendada,
        distancia_km: clinicaEscolhida.distancia_km,
        colaborador_lat: Number(lat),
        colaborador_lng: Number(lng),
        observacoes: obs || null,
        criado_por: userRes.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Exame agendado com sucesso');
      qc.invalidateQueries({ queryKey: ['exames-agendamentos'] });
      setDialogOpen(false);
      setColaboradorId(''); setDataAgendada(''); setLat(''); setLng('');
      setClinicaEscolhida(null); setClinicasProximas([]); setObs('');
    },
    onError: (e: any) => toast.error(safeErrorMessage(e, 'Falha ao agendar exame.')),
  });

  const kpis = useMemo(() => {
    const total = agendamentos?.length ?? 0;
    const agendados = agendamentos?.filter((a) => a.status === 'agendado').length ?? 0;
    const realizados = agendamentos?.filter((a) => a.status === 'realizado').length ?? 0;
    const proximos7d = agendamentos?.filter((a) => {
      const d = new Date(a.data_agendada);
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      return d.getTime() >= now && d.getTime() <= now + 7 * 24 * 3600 * 1000;
    }).length ?? 0;
    return { total, agendados, realizados, proximos7d };
  }, [agendamentos]);

  const statusColor = (s: string) =>
    s === 'realizado' ? 'default' : s === 'cancelado' || s === 'faltou' ? 'destructive' : 'secondary';

  return (
    <>
      <PageTitle title="Autoagendamento de Exames" description="Agende exames ocupacionais pela clínica mais próxima" />
      <PageLayout
        title="Autoagendamento de Exames"
        description="Busca por geolocalização (Haversine) na rede credenciada"
        icon={<Stethoscope className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-success"
      >
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{kpis.total}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Agendados</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{kpis.agendados}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Próximos 7 dias</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-warning">{kpis.proximos7d}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Realizados</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-success">{kpis.realizados}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Agendamentos</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo agendamento</Button></DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Novo agendamento por geolocalização</DialogTitle></DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Colaborador *</Label>
                    <Select value={colaboradorId} onValueChange={setColaboradorId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {colaboradores?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome_completo}{c.matricula ? ` — ${c.matricula}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de exame *</Label>
                    <Select value={tipoExame} onValueChange={setTipoExame}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_EXAME.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data / hora *</Label>
                    <Input type="datetime-local" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />
                  </div>
                  <div>
                    <Label>Raio de busca (km)</Label>
                    <Input type="number" min={1} max={500} value={raio} onChange={(e) => setRaio(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Latitude *</Label>
                    <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-23.5505" />
                  </div>
                  <div>
                    <Label>Longitude *</Label>
                    <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-46.6333" />
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <Button type="button" variant="outline" onClick={usarLocalizacaoAtual}>
                      <Navigation className="mr-2 h-4 w-4" /> Usar minha localização
                    </Button>
                    <Button type="button" onClick={buscarClinicas} disabled={buscando || !lat || !lng}>
                      {buscando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                      Buscar clínicas próximas
                    </Button>
                  </div>

                  {clinicasProximas.length > 0 && (
                    <div className="md:col-span-2 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Clínica</TableHead>
                            <TableHead>Cidade/UF</TableHead>
                            <TableHead>SLA</TableHead>
                            <TableHead className="text-right">Distância</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clinicasProximas.map((c) => (
                            <TableRow
                              key={c.id}
                              className={`cursor-pointer ${clinicaEscolhida?.id === c.id ? 'bg-primary/10' : ''}`}
                              onClick={() => setClinicaEscolhida(c)}
                            >
                              <TableCell><input type="radio" checked={clinicaEscolhida?.id === c.id} onChange={() => setClinicaEscolhida(c)} /></TableCell>
                              <TableCell>
                                <div className="font-medium">{c.razao_social}</div>
                                {c.nome_fantasia && <div className="text-xs text-muted-foreground">{c.nome_fantasia}</div>}
                              </TableCell>
                              <TableCell>{c.cidade}/{c.uf}</TableCell>
                              <TableCell>{c.sla_medio_min ? `${c.sla_medio_min} min` : '—'}</TableCell>
                              <TableCell className="text-right font-mono">{c.distancia_km} km</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <Label>Observações</Label>
                    <Input value={obs} onChange={(e) => setObs(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => agendar.mutate()}
                    disabled={agendar.isPending || !colaboradorId || !clinicaEscolhida || !dataAgendada}
                  >
                    {agendar.isPending ? 'Agendando...' : 'Confirmar agendamento'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : (agendamentos?.length ?? 0) === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum agendamento ainda</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Clínica</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Distância</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendamentos?.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.colaboradores?.nome_completo ?? '—'}</div>
                        {a.colaboradores?.matricula && <div className="text-xs text-muted-foreground">{a.colaboradores.matricula}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{a.clinicas_partners?.razao_social ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{a.clinicas_partners?.cidade}/{a.clinicas_partners?.uf}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{TIPOS_EXAME.find(t => t.v === a.tipo_exame)?.l ?? a.tipo_exame}</Badge></TableCell>
                      <TableCell>{new Date(a.data_agendada).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="font-mono">{a.distancia_km ? `${a.distancia_km} km` : '—'}</TableCell>
                      <TableCell><Badge variant={statusColor(a.status) as any}>{a.status}</Badge></TableCell>
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
