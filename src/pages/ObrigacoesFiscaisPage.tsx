import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { edgeFunctionsService } from '@/services/edgeFunctionsService';
import { Receipt, DollarSign, Building2, Plus, FileText, Shield, Loader2, Zap, CloudSync, Calculator, Key } from 'lucide-react';
import { ObrigacoesKPIs } from '@/components/obrigacoes/ObrigacoesKPIs';
import { GuiasTable } from '@/components/obrigacoes/GuiasTable';
import { DctfTable, SefipTable } from '@/components/obrigacoes/DeclaracoesTable';
import { DarfTab } from '@/components/obrigacoes/DarfTab';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function gerarCompetencias(): string[] {
  const items: string[] = [];
  const hoje = new Date();
  for (let i = -6; i <= 1; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    items.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
  }
  return items.reverse();
}

export default function ObrigacoesFiscaisPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const competencias = useMemo(() => gerarCompetencias(), []);
  const [competencia, setCompetencia] = useState(competencias[0]);
  const [openGuia, setOpenGuia] = useState(false);
  const [guiaForm, setGuiaForm] = useState({ tipo: 'fgts', valor: '', vencimento: '' });
  const [gerandoServidor, setGerandoServidor] = useState(false);

  const { data: dctf = [], isLoading: l1 } = useQuery({ queryKey: ['dctfweb', empresaAtual?.id], queryFn: async () => { const { data, error } = await supabase.from('dctfweb_declaracoes').select('*').eq('empresa_id', empresaAtual!.id).order('competencia', { ascending: false }); if (error) throw error; return data || []; }, enabled: !!empresaAtual?.id });
  const { data: sefip = [], isLoading: l2 } = useQuery({ queryKey: ['sefip', empresaAtual?.id], queryFn: async () => { const { data, error } = await supabase.from('sefip_arquivos').select('*').eq('empresa_id', empresaAtual!.id).order('competencia', { ascending: false }); if (error) throw error; return data || []; }, enabled: !!empresaAtual?.id });
  const { data: guiasFgts = [], isLoading: l3 } = useQuery({ queryKey: ['guias-fgts', empresaAtual?.id], queryFn: async () => { const { data, error } = await supabase.from('guias_fgts').select('*').eq('empresa_id', empresaAtual!.id).order('competencia', { ascending: false }); if (error) throw error; return data || []; }, enabled: !!empresaAtual?.id });
  const { data: guiasInss = [], isLoading: l4 } = useQuery({ queryKey: ['guias-inss', empresaAtual?.id], queryFn: async () => { const { data, error } = await supabase.from('guias_inss').select('*').eq('empresa_id', empresaAtual!.id).order('competencia', { ascending: false }); if (error) throw error; return data || []; }, enabled: !!empresaAtual?.id });

  const { data: certificados = [], isLoading: l5 } = useQuery({ queryKey: ['certificados', empresaAtual?.id], queryFn: async () => { const { data, error } = await supabase.from('certificados_digitais').select('*').eq('empresa_id', empresaAtual!.id); if (error) throw error; return data || []; }, enabled: !!empresaAtual?.id });
  const { data: simulacoes = [], isLoading: l6 } = useQuery({ queryKey: ['simulacoes-fiscais', empresaAtual?.id], queryFn: async () => { const { data, error } = await supabase.from('simulacoes_fiscais').select('*').eq('empresa_id', empresaAtual!.id).order('created_at', { ascending: false }); if (error) throw error; return data || []; }, enabled: !!empresaAtual?.id });
  
  const gerarGuia = useMutation({
    mutationFn: async () => {
      const [mes, ano] = competencia.split('/');
      const table = guiaForm.tipo === 'fgts' ? 'guias_fgts' : 'guias_inss';
      const { error } = await supabase.from(table).insert({ empresa_id: empresaAtual?.id, competencia: `${ano}-${mes}`, valor: parseFloat(guiaForm.valor) || 0, data_vencimento: guiaForm.vencimento || null, status: 'gerada' } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['guias-fgts'] }); qc.invalidateQueries({ queryKey: ['guias-inss'] }); setOpenGuia(false); setGuiaForm({ tipo: 'fgts', valor: '', vencimento: '' }); toast.success('Guia gerada com sucesso!'); },
    onError: () => toast.error('Erro ao gerar guia'),
  });

  const marcarPaga = useMutation({
    mutationFn: async ({ id, tabela }: { id: string; tabela: string }) => {
      const { error } = await supabase.from(tabela as any).update({ status: 'paga', data_pagamento: new Date().toISOString() } as any).eq('id', id).eq('empresa_id', empresaAtual!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['guias-fgts'] }); qc.invalidateQueries({ queryKey: ['guias-inss'] }); toast.success('Guia marcada como paga!'); },
  });

  const gerarGuiasServidor = async () => {
    if (!empresaAtual?.id) return;
    setGerandoServidor(true);
    try {
      const [mes, ano] = competencia.split('/');
      await edgeFunctionsService.gerarGuias({ empresaId: empresaAtual.id, competencia: `${ano}-${mes}`, tipo: 'todos' });
      qc.invalidateQueries({ queryKey: ['guias-fgts'] }); qc.invalidateQueries({ queryKey: ['guias-inss'] });
      toast.success('Guias geradas automaticamente via servidor!');
    } catch (err: any) { toast.error(safeErrorMessage(err, 'Erro ao gerar guias.')); } finally { setGerandoServidor(false); }
  };

  const totalFgts = guiasFgts.reduce((acc: number, g: any) => acc + (g.valor || 0), 0);
  const totalInss = guiasInss.reduce((acc: number, g: any) => acc + (g.valor || 0), 0);
  const hoje = new Date();
  const guiasVencidas = [...guiasFgts, ...guiasInss].filter((g: any) => g.status !== 'paga' && g.data_vencimento && new Date(g.data_vencimento) < hoje).length;

  return (
    <>
      <PageTitle title="Obrigações Fiscais" description="Gestão de obrigações fiscais trabalhistas" />
      <PageLayout title="Obrigações Fiscais" description="DCTFWeb, SEFIP, Guias FGTS, INSS e DARF" icon={<Receipt className="h-5 w-5 text-primary-foreground" />} gradient="from-warning to-primary"
        actions={
          <div className="flex items-center gap-2">
            <Select value={competencia} onValueChange={setCompetencia}>
              <SelectTrigger className="w-[130px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{competencias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" className="rounded-xl font-body gap-1.5" onClick={gerarGuiasServidor} disabled={gerandoServidor}>
              {gerandoServidor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}<span className="hidden sm:inline">Auto</span>
            </Button>
            <Button variant="outline" className="rounded-xl font-body gap-1.5 border-info/30 text-info hover:bg-info/5" onClick={() => toast.success('Sincronizando com FGTS Digital API...')}>
              <CloudSync className="h-4 w-4" /><span className="hidden sm:inline">Sincronizar API</span>
            </Button>
            <Dialog open={openGuia} onOpenChange={setOpenGuia}>
              <DialogTrigger asChild><Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body"><Plus className="mr-2 h-4 w-4" />Gerar Guia</Button></DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle className="font-display">Gerar Guia de Recolhimento</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label className="font-body">Tipo</Label><Select value={guiaForm.tipo} onValueChange={v => setGuiaForm(p => ({ ...p, tipo: v }))}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fgts">FGTS (GRF)</SelectItem><SelectItem value="inss">GPS / INSS</SelectItem></SelectContent></Select></div>
                  <div><Label className="font-body">Competência</Label><Input value={competencia} disabled className="rounded-xl" /></div>
                  <div><Label className="font-body">Valor (R$)</Label><Input type="number" step="0.01" value={guiaForm.valor} onChange={e => setGuiaForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" className="rounded-xl" /></div>
                  <div><Label className="font-body">Data de Vencimento</Label><Input type="date" value={guiaForm.vencimento} onChange={e => setGuiaForm(p => ({ ...p, vencimento: e.target.value }))} className="rounded-xl" /></div>
                  <Button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow" onClick={() => gerarGuia.mutate()} disabled={!guiaForm.valor || gerarGuia.isPending}>{gerarGuia.isPending ? 'Gerando...' : 'Gerar Guia'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        <ObrigacoesKPIs dctfCount={dctf.length} sefipCount={sefip.length} totalFgts={formatCurrency(totalFgts)} totalInss={formatCurrency(totalInss)} guiasVencidas={guiasVencidas} />

        {(l1 || l2 || l3 || l4 || l5 || l6) ? <div className="flex justify-center p-12"><Spinner size="lg" /></div> : (
          <Tabs defaultValue="fgts">
            <TabsList className="rounded-xl mb-4">
              <TabsTrigger value="fgts" className="rounded-lg font-body"><DollarSign className="h-4 w-4 mr-1" />FGTS</TabsTrigger>
              <TabsTrigger value="inss" className="rounded-lg font-body"><Building2 className="h-4 w-4 mr-1" />INSS / GPS</TabsTrigger>
              <TabsTrigger value="dctf" className="rounded-lg font-body"><FileText className="h-4 w-4 mr-1" />DCTFWeb</TabsTrigger>
              <TabsTrigger value="sefip" className="rounded-lg font-body"><Receipt className="h-4 w-4 mr-1" />SEFIP</TabsTrigger>
              <TabsTrigger value="darf" className="rounded-lg font-body"><Shield className="h-4 w-4 mr-1" />DARF / IRRF</TabsTrigger>
              <TabsTrigger value="certificados" className="rounded-lg font-body"><Key className="h-4 w-4 mr-1" />Certificados</TabsTrigger>
              <TabsTrigger value="simulacoes" className="rounded-lg font-body"><Calculator className="h-4 w-4 mr-1" />Simulações</TabsTrigger>
            </TabsList>
            <TabsContent value="fgts"><GuiasTable guias={guiasFgts} tabela="guias_fgts" emptyMessage="Nenhuma guia FGTS gerada" onMarcarPaga={(id, t) => marcarPaga.mutate({ id, tabela: t })} /></TabsContent>
            <TabsContent value="inss"><GuiasTable guias={guiasInss} tabela="guias_inss" emptyMessage="Nenhuma guia INSS gerada" onMarcarPaga={(id, t) => marcarPaga.mutate({ id, tabela: t })} /></TabsContent>
            <TabsContent value="dctf"><DctfTable data={dctf} /></TabsContent>
            <TabsContent value="sefip"><SefipTable data={sefip} /></TabsContent>
            <TabsContent value="darf"><DarfTab totalFgts={totalFgts} totalInss={totalInss} /></TabsContent>
            <TabsContent value="certificados">
              <div className="grid gap-4 md:grid-cols-2">
                {certificados.length === 0 ? <div className="col-span-2 p-12 text-center border border-dashed rounded-2xl text-muted-foreground italic">Nenhum certificado digital cadastrado</div> :
                  certificados.map((c: any) => (
                    <Card key={c.id} className="border-border/30 overflow-hidden">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex gap-4">
                          <div className={`p-2 rounded-xl ${c.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}><Key className="h-5 w-5" /></div>
                          <div>
                            <h4 className="font-semibold text-sm">{c.subject}</h4>
                            <p className="text-xs text-muted-foreground">Vencimento: {new Date(c.valid_to).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <Badge variant={c.ativo ? 'outline' : 'secondary'} className={c.ativo ? 'text-success border-success/30' : ''}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </CardContent>
                    </Card>
                  ))
                }
              </div>
            </TabsContent>
            <TabsContent value="simulacoes">
               <div className="flex justify-between items-center mb-6">
                 <div><h3 className="font-semibold text-lg">Simulações Fiscais</h3><p className="text-sm text-muted-foreground">Análise de impacto "What-If" para cenários tributários</p></div>
                 <Button className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Nova Simulação</Button>
               </div>
               <div className="space-y-4">
                  {simulacoes.length === 0 ? <div className="p-12 text-center border border-dashed rounded-2xl text-muted-foreground italic">Nenhuma simulação realizada</div> :
                    simulacoes.map((s: any) => (
                      <Card key={s.id} className="border-border/30 hover:border-primary/30 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                           <div>
                              <h4 className="font-semibold">{s.titulo}</h4>
                              <p className="text-sm text-muted-foreground">{s.descricao}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-1">Impacto Estimado</p>
                              <p className="text-lg font-bold text-primary font-display">+{formatCurrency(s.resultado?.impacto_total || 0)}</p>
                           </div>
                        </CardContent>
                      </Card>
                    ))
                  }
               </div>
            </TabsContent>
          </Tabs>
        )}
      </PageLayout>
    </>
  );
}
