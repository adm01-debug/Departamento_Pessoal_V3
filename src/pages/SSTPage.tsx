import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts';
import { toast } from 'sonner';
import { Shield, Plus } from 'lucide-react';
import { SSTKPIs, SSTExamesTab, SSTEPIsTab, SSTProgramasTab, SSTRiscosTab, SSTNRsTab, SSTIncidentesTab } from '@/components/sst';
import { GerarPgrButton } from '@/components/sst/GerarPgrButton';
import { GerarLtcatOsButton } from '@/components/sst/GerarLtcatOsButton';

const RISCO_LEVELS = [
  { label: 'Trivial', value: 1 },
  { label: 'Tolerável', value: 2 },
  { label: 'Moderado', value: 3 },
  { label: 'Substancial', value: 4 },
  { label: 'Intolerável', value: 5 },
];

export default function SSTPage() {
  const { empresaAtual } = useEmpresa();
  const [openIncidente, setOpenIncidente] = useState(false);
  const [incidenteForm, setIncidenteForm] = useState({ tipo: 'quase_acidente', descricao: '', local: '', gravidade: '3' });

  const { data: asos = [], isLoading: loadAsos } = useQuery({
    queryKey: ['sst_asos', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('asos')
        .select('*, colaborador:colaboradores(nome_completo, departamento)')
        .eq('empresa_id', empresaAtual!.id)
        .order('data_validade', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: epis = [] } = useQuery({
    queryKey: ['sst_epis', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('epis').select('*').eq('empresa_id', empresaAtual!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: entregas = [] } = useQuery({
    queryKey: ['sst_entregas', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('epis_entregas')
        .select('*, colaborador:colaboradores(nome_completo), epi:epis(nome, ca)')
        .order('data_entrega', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const hoje = new Date();
    const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
    const vencidos = asos.filter((a: any) => a.data_validade && new Date(a.data_validade) < hoje).length;
    const vencendo = asos.filter((a: any) => {
      if (!a.data_validade) return false;
      const dv = new Date(a.data_validade);
      return dv >= hoje && dv <= em30dias;
    }).length;
    const validos = asos.filter((a: any) => a.data_validade && new Date(a.data_validade) > em30dias).length;
    const tipoMap = new Map<string, number>();
    asos.forEach((a: any) => tipoMap.set(a.tipo, (tipoMap.get(a.tipo) || 0) + 1));
    const porTipo = Array.from(tipoMap.entries()).map(([name, value]) => ({ name, value }));
    const deptMap = new Map<string, number>();
    asos.forEach((a: any) => { const dept = a.colaborador?.departamento || 'Sem Depto'; deptMap.set(dept, (deptMap.get(dept) || 0) + 1); });
    const porDepartamento = Array.from(deptMap.entries()).map(([name, value]) => ({ name, value }));
    return { vencidos, vencendo, validos, porTipo, porDepartamento };
  }, [asos]);

  return (
    <>
      <PageTitle title="SST" description="Saúde e Segurança do Trabalho" />
      <PageLayout
        title="Saúde e Segurança do Trabalho"
        description="Exames, EPIs, riscos, NRs, programas e incidentes"
        icon={<Shield className="h-5 w-5 text-primary-foreground" />}
        gradient="from-success to-info"
        actions={
          <div className="flex gap-2">
          <GerarPgrButton />
          <GerarLtcatOsButton />
          <Dialog open={openIncidente} onOpenChange={setOpenIncidente}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-destructive to-warning font-body">
                <Plus className="mr-2 h-4 w-4" />Registrar Incidente
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle className="font-display">Registrar Incidente / Quase Acidente</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label className="font-body">Tipo</Label>
                  <Select value={incidenteForm.tipo} onValueChange={v => setIncidenteForm(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quase_acidente">Quase Acidente</SelectItem>
                      <SelectItem value="acidente_leve">Acidente Leve</SelectItem>
                      <SelectItem value="acidente_grave">Acidente Grave</SelectItem>
                      <SelectItem value="doenca_ocupacional">Doença Ocupacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="font-body">Local</Label><Input value={incidenteForm.local} onChange={e => setIncidenteForm(p => ({ ...p, local: e.target.value }))} placeholder="Ex: Galpão 2, Setor B" className="rounded-xl" /></div>
                <div><Label className="font-body">Gravidade (1-5)</Label>
                  <Select value={incidenteForm.gravidade} onValueChange={v => setIncidenteForm(p => ({ ...p, gravidade: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RISCO_LEVELS.map(r => <SelectItem key={r.value} value={String(r.value)}>{r.value} — {r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="font-body">Descrição detalhada</Label><Textarea value={incidenteForm.descricao} onChange={e => setIncidenteForm(p => ({ ...p, descricao: e.target.value }))} className="rounded-xl" rows={4} /></div>
                <Button className="w-full rounded-xl bg-gradient-to-r from-destructive to-warning" onClick={() => { toast.success('Incidente registrado!'); setOpenIncidente(false); }}>
                  Registrar Incidente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        }
      >
        <SSTKPIs validos={stats.validos} vencendo={stats.vencendo} vencidos={stats.vencidos} totalEpis={epis.length} totalEntregas={entregas.length} />

        <Tabs defaultValue="exames">
          <TabsList className="rounded-xl mb-4">
            <TabsTrigger value="exames" className="rounded-lg font-body">🩺 Exames</TabsTrigger>
            <TabsTrigger value="epis" className="rounded-lg font-body">🦺 EPIs</TabsTrigger>
            <TabsTrigger value="programas" className="rounded-lg font-body">📋 Programas</TabsTrigger>
            <TabsTrigger value="riscos" className="rounded-lg font-body">⚠️ Riscos</TabsTrigger>
            <TabsTrigger value="nrs" className="rounded-lg font-body">📑 NRs</TabsTrigger>
            <TabsTrigger value="incidentes" className="rounded-lg font-body">🚨 Incidentes</TabsTrigger>
          </TabsList>
          <TabsContent value="exames"><SSTExamesTab asos={asos} porTipo={stats.porTipo} porDepartamento={stats.porDepartamento} isLoading={loadAsos} /></TabsContent>
          <TabsContent value="epis"><SSTEPIsTab epis={epis} entregas={entregas} /></TabsContent>
          <TabsContent value="programas"><SSTProgramasTab /></TabsContent>
          <TabsContent value="riscos"><SSTRiscosTab /></TabsContent>
          <TabsContent value="nrs"><SSTNRsTab /></TabsContent>
          <TabsContent value="incidentes"><SSTIncidentesTab /></TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
