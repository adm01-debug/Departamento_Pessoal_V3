import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, FileSpreadsheet, History, Download, Zap, RefreshCcw, Table as TableIcon, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useEmpresas } from '@/hooks/useEmpresas';
import { contabilidadeService, folhaService } from '@/services';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/utils/format';
export default function ContabilidadePage() {
  const { empresaAtual } = useEmpresas();
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [planoContas, setPlanoContas] = useState<any[]>([]);
  const [folhas, setFolhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedFolha, setSelectedFolha] = useState('');

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const loadData = useCallback(async () => {
    if (!empresaAtual?.id) return;
    try {
      setLoading(true);
      const [lan, pla, fls] = await Promise.all([
        contabilidadeService.listLancamentos(empresaAtual.id),
        contabilidadeService.listPlanoContas(empresaAtual.id),
        folhaService.list()
      ]);
      setLancamentos(lan || []);
      setPlanoContas(pla || []);
      setFolhas(fls || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados contábeis');
    } finally {
      setLoading(false);
    }
  }, [empresaAtual?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const gerarLancamentos = async () => {
    if (!selectedFolha) {
      toast.warning('Selecione uma folha de pagamento');
      return;
    }

    try {
      setProcessing(true);
      await contabilidadeService.gerarLancamentosFolha(empresaAtual!.id, selectedFolha);
      toast.success('Lançamentos contábeis gerados com sucesso');
      loadData();
    } catch (error: any) {
      toast.error(safeErrorMessage(error, 'Erro ao gerar lançamentos contábeis.'));
    } finally {
      setProcessing(false);
    }
  };

  const exportarSPED = async () => {
    try {
      const content = await contabilidadeService.exportarSPED(empresaAtual!.id);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SPED_CONTABIL_${new Date().getFullYear()}.txt`;
      a.click();
      toast.success('Arquivo SPED exportado com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar SPED');
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <>
      <PageTitle title="Contabilidade" description="Integração Contábil e SPED" />
      <PageLayout
        title="Contabilidade"
        description="Conciliação, Plano de Contas e SPED ECD"
        icon={<BookOpen className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
      >
        <div className="grid gap-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-display font-semibold">Conciliação Automática</h3>
              <p className="text-sm text-muted-foreground">Converta sua folha em lançamentos contábeis</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedFolha} onValueChange={setSelectedFolha}>
                <SelectTrigger className="w-[200px] rounded-xl border-border/40">
                  <SelectValue placeholder="Selecionar Folha" />
                </SelectTrigger>
                <SelectContent>
                  {folhas.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.competencia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={gerarLancamentos} 
                disabled={processing || !selectedFolha} 
                className="rounded-xl gap-2 bg-gradient-to-r from-primary to-primary-glow font-body shadow-lg hover:opacity-90"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Zap className="h-4 w-4" />} 
                Gerar Lançamentos
              </Button>
              <Button 
                variant="outline" 
                onClick={exportarSPED} 
                className="rounded-xl gap-2 font-body border-border/40 hover:bg-muted/30"
              >
                <Download className="h-4 w-4" /> Exportar SPED
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border border-border/30 rounded-2xl overflow-hidden bg-card/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-body">Contas Ativas</p>
                  <p className="text-xl font-display font-bold">{planoContas.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/30 rounded-2xl overflow-hidden bg-card/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10 text-success">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-body">Total Lançamentos</p>
                  <p className="text-xl font-display font-bold">{lancamentos.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/30 rounded-2xl overflow-hidden bg-card/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-body">Status SPED</p>
                  <p className="text-xl font-display font-bold">Pronto para Envio</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="lancamentos" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
              <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
              <TabsTrigger value="plano">Plano de Contas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lancamentos">
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-display flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Diário de Lançamentos
                    </CardTitle>
                    <CardDescription>Visualização em tempo real das partidas dobradas</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={loadData} className="rounded-xl h-8 w-8 p-0">
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Débito / Crédito</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                      ) : lancamentos.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum lançamento contábil encontrado</TableCell></TableRow>
                      ) : lancamentos.map(l => (
                        <TableRow key={l.id} className="hover:bg-accent/30 transition-colors">
                          <TableCell className="font-body">{formatDate(l.data_lancamento)}</TableCell>
                          <TableCell className="font-body max-w-[200px] truncate" title={l.descricao}>{l.descricao}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-success font-bold uppercase w-4">D:</span>
                                <span className="text-muted-foreground">{l.conta_debito?.codigo} - {l.conta_debito?.nome}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-destructive font-bold uppercase w-4">C:</span>
                                <span className="text-muted-foreground">{l.conta_credito?.codigo} - {l.conta_credito?.nome}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-display font-bold">{formatCurrency(l.valor)}</TableCell>
                          <TableCell><StatusBadge status={l.status} variant="success" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plano">
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader>
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <TableIcon className="h-4 w-4 text-primary" /> Estrutura do Plano de Contas
                  </CardTitle>
                  <CardDescription>Capa contábil integrada ao DP</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição da Conta</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Natureza</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planoContas.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-bold">{p.codigo}</TableCell>
                          <TableCell className="font-body">{p.nome}</TableCell>
                          <TableCell className="capitalize font-body text-xs">{p.tipo}</TableCell>
                          <TableCell className="capitalize font-body text-xs">{p.natureza}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageLayout>
    </>
  );
}
