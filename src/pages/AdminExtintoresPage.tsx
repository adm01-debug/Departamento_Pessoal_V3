import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Flame, ShieldCheck, Timer, Plus, ClipboardCheck, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { z } from 'zod';

interface Dashboard {
  total: number;
  ativos: number;
  vencidos: number;
  em_manutencao: number;
  recarga_30d: number;
  hidro_90d: number;
  inspecoes_mes: number;
  nao_conformes_mes: number;
}

interface Extintor {
  id: string;
  codigo_patrimonio: string;
  tipo: string;
  capacidade_kg: number;
  localizacao: string;
  data_proxima_recarga: string;
  data_proximo_teste_hidrostatico: string;
  status: string;
  qr_code: string | null;
}

const extintorSchema = z.object({
  codigo_patrimonio: z.string().trim().min(1).max(50),
  tipo: z.enum(['AGUA','PO_QUIMICO_ABC','PO_QUIMICO_BC','CO2','ESPUMA','CLASSE_K']),
  capacidade_kg: z.number().positive().max(999),
  localizacao: z.string().trim().min(1).max(255),
  data_proxima_recarga: z.string().min(1),
  data_proximo_teste_hidrostatico: z.string().min(1),
});

const TIPOS = [
  { value: 'AGUA', label: 'Água' },
  { value: 'PO_QUIMICO_ABC', label: 'Pó Químico ABC' },
  { value: 'PO_QUIMICO_BC', label: 'Pó Químico BC' },
  { value: 'CO2', label: 'CO₂' },
  { value: 'ESPUMA', label: 'Espuma' },
  { value: 'CLASSE_K', label: 'Classe K' },
];

const statusVariant = (s: string) =>
  s === 'ATIVO' ? 'default' : s === 'VENCIDO' ? 'destructive' : s === 'MANUTENCAO' ? 'secondary' : 'outline';

export default function AdminExtintoresPage() {
  const { empresaAtual } = useEmpresas();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [extintores, setExtintores] = useState<Extintor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNovo, setOpenNovo] = useState(false);
  const [openInsp, setOpenInsp] = useState<Extintor | null>(null);

  const [form, setForm] = useState({
    codigo_patrimonio: '',
    tipo: 'PO_QUIMICO_ABC',
    capacidade_kg: 6,
    localizacao: '',
    data_proxima_recarga: '',
    data_proximo_teste_hidrostatico: '',
  });

  const [insp, setInsp] = useState({
    lacre_ok: true, pressao_ok: true, mangueira_ok: true,
    sinalizacao_ok: true, acesso_desobstruido: true,
    altura_correta: true, corpo_integro: true, observacoes: '',
  });

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const carregar = useCallback(async () => {
    if (!empresaAtual?.id) return;
    setLoading(true);
    try {
      const [{ data: dash }, { data: exts }] = await Promise.all([
        supabase.rpc('sst_extintores_dashboard', { p_empresa_id: empresaAtual.id }),
        supabase.from('sst_extintores')
          .select('id,codigo_patrimonio,tipo,capacidade_kg,localizacao,data_proxima_recarga,data_proximo_teste_hidrostatico,status,qr_code')
          .eq('empresa_id', empresaAtual.id)
          .is('deleted_at', null)
          .order('codigo_patrimonio')
          .limit(500),
      ]);
      setDashboard(dash as unknown as Dashboard);
      setExtintores((exts as Extintor[]) || []);
    } catch (e) {
      toast.error('Erro ao carregar extintores');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [empresaAtual?.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar(); }, [carregar]);

  const criarExtintor = async () => {
    if (!empresaAtual?.id) return;
    const parsed = extintorSchema.safeParse({ ...form, capacidade_kg: Number(form.capacidade_kg) });
    if (!parsed.success) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }
    const { error } = await supabase.from('sst_extintores').insert({
      ...parsed.data,
      empresa_id: empresaAtual.id,
    });
    if (error) { toast.error(safeErrorMessage(error, 'Erro ao salvar extintor.')); return; }
    toast.success('Extintor cadastrado');
    setOpenNovo(false);
    setForm({ codigo_patrimonio: '', tipo: 'PO_QUIMICO_ABC', capacidade_kg: 6, localizacao: '', data_proxima_recarga: '', data_proximo_teste_hidrostatico: '' });
    carregar();
  };

  const registrarInspecao = async () => {
    if (!openInsp || !empresaAtual?.id) return;
    const { data: userRes } = await supabase.auth.getUser();
    const conforme = insp.lacre_ok && insp.pressao_ok && insp.mangueira_ok
      && insp.sinalizacao_ok && insp.acesso_desobstruido && insp.altura_correta && insp.corpo_integro;
    const { error } = await supabase.from('sst_extintores_inspecoes').insert({
      extintor_id: openInsp.id,
      empresa_id: empresaAtual.id,
      inspetor_id: userRes.user?.id,
      inspetor_nome: userRes.user?.email ?? 'Inspetor',
      ...insp,
      resultado: conforme ? 'CONFORME' : 'NAO_CONFORME',
    });
    if (error) { toast.error(safeErrorMessage(error, 'Erro ao salvar extintor.')); return; }
    toast.success('Inspeção registrada');
    setOpenInsp(null);
    setInsp({ lacre_ok: true, pressao_ok: true, mangueira_ok: true, sinalizacao_ok: true, acesso_desobstruido: true, altura_correta: true, corpo_integro: true, observacoes: '' });
    carregar();
  };

  const kpis = [
    { icon: Flame, label: 'Total', value: dashboard?.total ?? 0, color: 'text-primary' },
    { icon: ShieldCheck, label: 'Ativos', value: dashboard?.ativos ?? 0, color: 'text-green-500' },
    { icon: AlertCircle, label: 'Vencidos', value: dashboard?.vencidos ?? 0, color: 'text-destructive' },
    { icon: Timer, label: 'Recarga ≤30d', value: dashboard?.recarga_30d ?? 0, color: 'text-yellow-500' },
    { icon: Timer, label: 'Hidrostático ≤90d', value: dashboard?.hidro_90d ?? 0, color: 'text-orange-500' },
    { icon: ClipboardCheck, label: 'Inspeções (mês)', value: dashboard?.inspecoes_mes ?? 0, color: 'text-blue-500' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flame className="h-8 w-8 text-primary" />
            Gestão de Extintores (NR-23)
          </h1>
          <p className="text-muted-foreground mt-1">Inventário, inspeções periódicas e vencimentos.</p>
        </div>
        <Dialog open={openNovo} onOpenChange={setOpenNovo}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Extintor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Extintor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Código de patrimônio</Label>
                <Input value={form.codigo_patrimonio} onChange={(e) => setForm({ ...form, codigo_patrimonio: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Capacidade (kg)</Label>
                  <Input type="number" step="0.5" value={form.capacidade_kg} onChange={(e) => setForm({ ...form, capacidade_kg: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Localização</Label>
                <Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Próxima recarga</Label>
                  <Input type="date" value={form.data_proxima_recarga} onChange={(e) => setForm({ ...form, data_proxima_recarga: e.target.value })} />
                </div>
                <div>
                  <Label>Próximo hidrostático</Label>
                  <Input type="date" value={form.data_proximo_teste_hidrostatico} onChange={(e) => setForm({ ...form, data_proximo_teste_hidrostatico: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
              <Button onClick={criarExtintor}>Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <k.icon className={`h-5 w-5 ${k.color}`} />
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Inventário</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : extintores.length === 0 ? (
            <p className="text-muted-foreground">Nenhum extintor cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cap.</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Recarga</TableHead>
                  <TableHead>Hidrostático</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extintores.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">{e.codigo_patrimonio}</TableCell>
                    <TableCell>{TIPOS.find((t) => t.value === e.tipo)?.label ?? e.tipo}</TableCell>
                    <TableCell>{e.capacidade_kg}kg</TableCell>
                    <TableCell>{e.localizacao}</TableCell>
                    <TableCell>{new Date(e.data_proxima_recarga).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{new Date(e.data_proximo_teste_hidrostatico).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell><Badge variant={statusVariant(e.status)}>{e.status}</Badge></TableCell>
                    <TableCell><span className="text-xs font-mono text-muted-foreground flex items-center gap-1"><QrCode className="h-3 w-3" />{e.qr_code?.slice(-6)}</span></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setOpenInsp(e)}>
                        <ClipboardCheck className="h-4 w-4 mr-1" />Inspecionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openInsp} onOpenChange={(v) => !v && setOpenInsp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inspeção NR-23 — {openInsp?.codigo_patrimonio}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {[
              ['lacre_ok', 'Lacre íntegro'],
              ['pressao_ok', 'Pressão adequada (verde)'],
              ['mangueira_ok', 'Mangueira sem defeitos'],
              ['sinalizacao_ok', 'Sinalização visível'],
              ['acesso_desobstruido', 'Acesso desobstruído'],
              ['altura_correta', 'Altura correta (1,60m)'],
              ['corpo_integro', 'Corpo sem corrosão'],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(insp as Record<string, boolean | string>)[k] as boolean}
                  onCheckedChange={(c) => setInsp({ ...insp, [k]: !!c })}
                />
                <span>{label}</span>
              </label>
            ))}
            <div>
              <Label>Observações</Label>
              <Textarea value={insp.observacoes} onChange={(e) => setInsp({ ...insp, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInsp(null)}>Cancelar</Button>
            <Button onClick={registrarInspecao}>Registrar Inspeção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
