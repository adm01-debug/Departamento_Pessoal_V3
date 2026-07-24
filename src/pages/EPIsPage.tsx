import { todayLocalISO } from '@/utils/dateLocal';
import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { TableSkeleton } from '@/components/ui/module-skeleton';
import { EpiKPIs, EpiCategoryChart, EpiCatalogoTable, EpiEntregasTable } from '@/components/epis';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { episService, episEntregasService } from '@/services';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Plus, HardHat, Package } from 'lucide-react';
import { addMonths, parseISO, isBefore } from 'date-fns';

const categorias = ['cabeca', 'olhos', 'auditiva', 'respiratoria', 'maos', 'pes', 'corpo', 'queda', 'outros'];
const categoriaLabels: Record<string, string> = {
  cabeca: 'Cabeça', olhos: 'Olhos/Face', auditiva: 'Auditiva', respiratoria: 'Respiratória',
  maos: 'Mãos', pes: 'Pés', corpo: 'Corpo', queda: 'Queda', outros: 'Outros',
};
const categoriaOptions = categorias.map(c => ({ value: c, label: categoriaLabels[c] }));

export default function EPIsPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [openEpi, setOpenEpi] = useState(false);
  const [openEntrega, setOpenEntrega] = useState(false);
  const [formEpi, setFormEpi] = useState({ 
    nome: '', 
    ca: '', 
    validade_meses: '', 
    categoria: 'cabeca', 
    ca_validade: '',
    fabricante: '',
    unidade_medida: 'un',
    estoque_atual: '0',
    estoque_minimo: '0'
  });
  const [formEntrega, setFormEntrega] = useState({ epi_id: '', colaborador_id: '', data_entrega: '', quantidade: '1' });
  const [searchCatalogo, setSearchCatalogo] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [searchEntregas, setSearchEntregas] = useState('');

  const { data: epis = [], isLoading } = useQuery({
    queryKey: ['epis', empresaAtual?.id],
    queryFn: () => episService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const { data: entregas = [] } = useQuery({
    queryKey: ['epis-entregas', empresaAtual?.id],
    queryFn: () => episEntregasService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const criarEpi = useMutation({
    mutationFn: (d: Record<string, unknown>) => episService.criar({ 
      ...d, 
      empresa_id: empresaAtual?.id, 
      validade_meses: Number(d.validade_meses) || null,
      estoque_atual: Number(d.estoque_atual) || 0,
      estoque_minimo: Number(d.estoque_minimo) || 0
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epis'] });
      setOpenEpi(false);
      setFormEpi({ 
        nome: '', 
        ca: '', 
        validade_meses: '', 
        categoria: 'cabeca', 
        ca_validade: '',
        fabricante: '',
        unidade_medida: 'un',
        estoque_atual: '0',
        estoque_minimo: '0'
      });
      toast.success('EPI cadastrado!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar EPI.')),
  });

  const criarEntrega = useMutation({
    mutationFn: (d: Record<string, unknown>) => episEntregasService.criar({ ...d, empresa_id: empresaAtual?.id, quantidade: Number(d.quantidade) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epis-entregas'] });
      setOpenEntrega(false);
      setFormEntrega({ epi_id: '', colaborador_id: '', data_entrega: '', quantidade: '1' });
      toast.success('Entrega registrada!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar EPI.')),
  });

  const excluirEpi = useMutation({
    mutationFn: (id: string) => episService.excluir(id, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epis'] }); toast.success('EPI excluído!'); },
  });

  const devolverEpi = useMutation({
    mutationFn: (id: string) => episEntregasService.registrarDevolucao(id, todayLocalISO(), empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epis-entregas'] }); toast.success('Devolução registrada!'); },
  });

  const filteredEpis = useMemo(() => epis.filter((e: any) => {
    if (catFilter && catFilter !== 'all' && e.categoria !== catFilter) return false;
    if (searchCatalogo && !e.nome.toLowerCase().includes(searchCatalogo.toLowerCase())) return false;
    return true;
  }), [epis, catFilter, searchCatalogo]);

  const filteredEntregas = useMemo(() => entregas.filter((e: any) => {
    if (!searchEntregas) return true;
    const nome = (e.colaborador?.nome_completo || '').toLowerCase();
    const epiNome = (e.epi?.nome || '').toLowerCase();
    return nome.includes(searchEntregas.toLowerCase()) || epiNome.includes(searchEntregas.toLowerCase());
  }), [entregas, searchEntregas]);

  const stats = useMemo(() => {
    const uniqueCats = new Set(epis.map((e: any) => e.categoria).filter(Boolean));
    const now = new Date();
    const vencProximo = entregas.filter((e: any) => {
      if (!e.data_entrega || !e.epi?.validade_meses || e.data_devolucao) return false;
      try {
        const venc = addMonths(parseISO(e.data_entrega), e.epi.validade_meses);
        return isBefore(venc, addMonths(now, 1)) && !isBefore(venc, now);
      } catch { return false; }
    }).length;

    return {
      totalEpis: epis.length,
      totalEntregas: entregas.length,
      categoriasCobertas: uniqueCats.size,
      comCA: epis.filter((e: any) => e.ca).length,
      semCA: epis.filter((e: any) => !e.ca).length,
      vencimentoProximo: vencProximo,
      estoqueBaixo: epis.filter((e: any) => e.estoque_atual <= e.estoque_minimo && e.estoque_minimo > 0).length,
      totalEstoque: epis.reduce((acc: number, e: any) => acc + (e.estoque_atual || 0), 0),
    };
  }, [epis, entregas]);

  return (
    <>
    <PageTitle title="EPIs" description="Controle de equipamentos de proteção individual" />
    <PageLayout
      title="Equipamentos de Proteção Individual"
      description="Gestão de EPIs, entregas e conformidade NR-6"
      icon={<HardHat className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary to-accent"
    >
      <EpiKPIs stats={stats} />

      <Tabs defaultValue="epis" className="space-y-4">
        <TabsList className="rounded-xl">
          <TabsTrigger value="epis" className="rounded-lg gap-1.5">
            <HardHat className="h-3.5 w-3.5" /> Catálogo ({epis.length})
          </TabsTrigger>
          <TabsTrigger value="entregas" className="rounded-lg gap-1.5">
            <Package className="h-3.5 w-3.5" /> Entregas ({entregas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="epis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <DataTableToolbar
                  search={searchCatalogo}
                  onSearchChange={setSearchCatalogo}
                  searchPlaceholder="Buscar EPI..."
                  filters={[{ key: 'categoria', label: 'Categoria', options: categoriaOptions, value: catFilter, onChange: setCatFilter }]}
                  onClearFilters={() => { setCatFilter(''); setSearchCatalogo(''); }}
                />
                <Dialog open={openEpi} onOpenChange={setOpenEpi}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl shrink-0"><Plus className="h-4 w-4 mr-1" />Novo EPI</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle className="font-display">Cadastrar EPI</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><Label>Nome *</Label><Input value={formEpi.nome} onChange={e => setFormEpi(p => ({ ...p, nome: e.target.value }))} placeholder="Ex.: Capacete de segurança" /></div>
                        <div><Label>CA</Label><Input value={formEpi.ca} onChange={e => setFormEpi(p => ({ ...p, ca: e.target.value }))} placeholder="Ex.: 12345" /></div>
                        <div><Label>Validade CA</Label><Input type="date" value={formEpi.ca_validade} onChange={e => setFormEpi(p => ({ ...p, ca_validade: e.target.value }))} /></div>
                        <div className="col-span-2"><Label>Fabricante</Label><Input value={formEpi.fabricante} onChange={e => setFormEpi(p => ({ ...p, fabricante: e.target.value }))} placeholder="Ex.: 3M Brasil" /></div>
                        <div><Label>Validade Uso (meses)</Label><Input type="number" min={1} value={formEpi.validade_meses} onChange={e => setFormEpi(p => ({ ...p, validade_meses: e.target.value }))} /></div>
                        <div>
                          <Label>Categoria</Label>
                          <Select value={formEpi.categoria} onValueChange={v => setFormEpi(p => ({ ...p, categoria: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {categorias.map(c => <SelectItem key={c} value={c}>{categoriaLabels[c]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label>Estoque Atual</Label><Input type="number" min={0} value={formEpi.estoque_atual} onChange={e => setFormEpi(p => ({ ...p, estoque_atual: e.target.value }))} /></div>
                        <div><Label>Estoque Mínimo</Label><Input type="number" min={0} value={formEpi.estoque_minimo} onChange={e => setFormEpi(p => ({ ...p, estoque_minimo: e.target.value }))} /></div>
                      </div>
                      <Button className="w-full rounded-xl" onClick={() => criarEpi.mutate(formEpi)} disabled={!formEpi.nome}>
                        Cadastrar EPI
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : (
                <EpiCatalogoTable data={filteredEpis} onExcluir={(id) => excluirEpi.mutate(id)} />
              )}
            </div>

            <div>
              <EpiCategoryChart epis={epis} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="entregas" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <DataTableToolbar
              search={searchEntregas}
              onSearchChange={setSearchEntregas}
              searchPlaceholder="Buscar por colaborador ou EPI..."
              filters={[]}
              onClearFilters={() => setSearchEntregas('')}
            />
            <Dialog open={openEntrega} onOpenChange={setOpenEntrega}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl shrink-0"><Plus className="h-4 w-4 mr-1" />Nova Entrega</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Registrar Entrega de EPI</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>EPI *</Label>
                    <Select value={formEntrega.epi_id} onValueChange={v => setFormEntrega(p => ({ ...p, epi_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione o EPI" /></SelectTrigger>
                      <SelectContent>{epis.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}{e.ca ? ` (CA: ${e.ca})` : ''}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Colaborador *</Label>
                    <Select value={formEntrega.colaborador_id} onValueChange={v => setFormEntrega(p => ({ ...p, colaborador_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                      <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Data Entrega *</Label><Input type="date" value={formEntrega.data_entrega} onChange={e => setFormEntrega(p => ({ ...p, data_entrega: e.target.value }))} /></div>
                  <div><Label>Quantidade</Label><Input type="number" min={1} value={formEntrega.quantidade} onChange={e => setFormEntrega(p => ({ ...p, quantidade: e.target.value }))} /></div>
                  <Button className="w-full rounded-xl" onClick={() => criarEntrega.mutate(formEntrega)} disabled={!formEntrega.epi_id || !formEntrega.colaborador_id || !formEntrega.data_entrega}>
                    Registrar Entrega
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <EpiEntregasTable
            data={filteredEntregas}
            onDevolver={(id) => devolverEpi.mutate(id)}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
    </>
  );
}
