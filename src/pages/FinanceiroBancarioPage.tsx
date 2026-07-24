import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Landmark, FileDown, History, Settings, CheckCircle, AlertCircle, Loader2, Download, Plus, Banknote, Globe, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useEmpresas } from '@/hooks/useEmpresas';
import { cnabService, CNABConfig, folhaService } from '@/services';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { todayLocalISO } from '@/utils/dateLocal';
import { formatDate } from '@/utils/format';
export default function FinanceiroBancarioPage() {
  const { empresaAtual } = useEmpresas();
  const [config, setConfig] = useState<CNABConfig | null>(null);
  const [remessas, setRemessas] = useState<any[]>([]);
  const [pixLotes, setPixLotes] = useState<any[]>([]);
  const [folhas, setFolhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [processingRetorno, setProcessingRetorno] = useState(false);
  const [selectedFolha, setSelectedFolha] = useState('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const loadData = useCallback(async () => {
    if (!empresaAtual?.id) return;
    try {
      setLoading(true);
      const [conf, rem, pix, fls] = await Promise.all([
        cnabService.getConfig(empresaAtual.id),
        cnabService.listRemessas(empresaAtual.id),
        cnabService.listPixLotes(empresaAtual.id),
        folhaService.list()
      ]);
      setConfig(conf);
      setRemessas(rem || []);
      setPixLotes(pix || []);
      setFolhas(fls || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados bancários');
    } finally {
      setLoading(false);
    }
  }, [empresaAtual?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newConfig: CNABConfig = {
      banco_codigo: formData.get('banco_codigo') as string,
      agencia: formData.get('agencia') as string,
      agencia_digito: formData.get('agencia_digito') as string,
      conta: formData.get('conta') as string,
      conta_digito: formData.get('conta_digito') as string,
      convenio: formData.get('convenio') as string,
      nome_empresa: formData.get('nome_empresa') as string,
    };

    try {
      await cnabService.saveConfig(empresaAtual!.id, newConfig);
      setConfig(newConfig);
      toast.success('Configuração salva com sucesso');
      setConfigDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    }
  };

  const generateCNAB = async () => {
    if (!selectedFolha) {
      toast.warning('Selecione uma folha de pagamento');
      return;
    }
    if (!config) {
      toast.error('Configure os dados bancários primeiro');
      setConfigDialogOpen(true);
      return;
    }

    try {
      setGenerating(true);
      const content = await cnabService.generateCNAB240(empresaAtual!.id, selectedFolha);
      
      // Download file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `REMESSA_${config.banco_codigo}_${todayLocalISO()}.rem`;
      a.click();
      
      toast.success('Remessa CNAB gerada com sucesso');
      loadData();
    } catch (error: any) {
      toast.error(safeErrorMessage(error, 'Erro ao gerar CNAB.'));
    } finally {
      setGenerating(false);
    }
  };

  const generatePix = async () => {
    if (!selectedFolha) {
      toast.warning('Selecione uma folha de pagamento');
      return;
    }

    try {
      setGenerating(true);
      const content = await cnabService.generatePIXBatch(empresaAtual!.id, selectedFolha);

      // Download CSV
      const blob = new Blob([content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PIX_LOTE_${todayLocalISO()}.csv`;
      a.click();

      toast.success('Lote PIX gerado com sucesso');
      loadData();
    } catch (error: any) {
      toast.error(safeErrorMessage(error, 'Erro ao gerar lote PIX.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleImportRetorno = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProcessingRetorno(true);
      const content = await file.text();
      const results = await cnabService.parseRetornoCNAB(empresaAtual!.id, content);

      toast.success(`Retorno processado: ${results.sucesso} sucessos, ${results.erro} erros.`);
      loadData();
    } catch (error: any) {
      toast.error(safeErrorMessage(error, 'Erro ao processar arquivo de retorno.'));
    } finally {
      setProcessingRetorno(false);
      // Reset input
      e.target.value = '';
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <>
      <PageTitle title="Bancário" description="Gestão de pagamentos bancários (CNAB/Pix)" />
      <PageLayout
        title="Gestão Bancária"
        description="Geração de remessas e pagamentos em lote"
        icon={<Landmark className="h-5 w-5 text-primary-foreground" />}
        gradient="from-info to-primary"
      >
        <div className="grid gap-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-display font-semibold">Nova Operação</h3>
              <p className="text-sm text-muted-foreground">Selecione uma folha para gerar os arquivos de pagamento</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedFolha} onValueChange={setSelectedFolha}>
                <SelectTrigger className="w-[250px] rounded-xl border-border/40">
                  <SelectValue placeholder="Selecione a competência" />
                </SelectTrigger>
                <SelectContent>
                  {folhas.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.competencia} - {f.tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl gap-2 font-body border-border/40">
                    <Settings className="h-4 w-4" /> Configurar Banco
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="font-display">Configuração Bancária</DialogTitle>
                    <CardDescription>Informe os dados para geração do arquivo CNAB 240</CardDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveConfig} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Código do Banco (ex: 001)</Label>
                        <Input name="banco_codigo" defaultValue={config?.banco_codigo} placeholder="001" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Código Convênio</Label>
                        <Input name="convenio" defaultValue={config?.convenio} placeholder="123456" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Agência</Label>
                        <Input name="agencia" defaultValue={config?.agencia} placeholder="0001" required />
                      </div>
                      <div className="space-y-2">
                        <Label>DV</Label>
                        <Input name="agencia_digito" defaultValue={config?.agencia_digito} placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label>Conta Corrente</Label>
                        <Input name="conta" defaultValue={config?.conta} placeholder="12345" required />
                      </div>
                      <div className="space-y-2">
                        <Label>DV</Label>
                        <Input name="conta_digito" defaultValue={config?.conta_digito} placeholder="0" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome da Empresa (no Banco)</Label>
                      <Input name="nome_empresa" defaultValue={config?.nome_empresa} placeholder="EMPRESA LTDA" required />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-info to-primary text-primary-foreground">
                        Salvar Configurações
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:shadow-glow transition-all">
              <div className="h-[2px] bg-gradient-to-r from-info to-primary" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-info/10 text-info">
                    <FileDown className="h-5 w-5" />
                  </div>
                  Remessa CNAB
                </CardTitle>
                <CardDescription>Gerar arquivo para pagamento de salários</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={generateCNAB} 
                  disabled={generating || !selectedFolha} 
                  className="w-full rounded-xl bg-gradient-to-r from-info to-primary text-primary-foreground font-body h-11"
                >
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Download className="h-4 w-4 mr-2" /> Gerar Arquivo</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:shadow-glow transition-all">
              <div className="h-[2px] bg-gradient-to-r from-success to-success/70" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-success/10 text-success">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  PIX em Lote
                </CardTitle>
                <CardDescription>Gere CSV para pagamento instantâneo</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={generatePix} 
                  variant="outline"
                  disabled={generating || !selectedFolha} 
                  className="w-full rounded-xl border-success/30 hover:bg-success/5 text-success font-body h-11"
                >
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Gerar CSV PIX</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:shadow-glow transition-all">
              <div className="h-[2px] bg-gradient-to-r from-warning to-warning/70" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-warning/10 text-warning">
                    <Upload className="h-5 w-5" />
                  </div>
                  Retorno CNAB
                </CardTitle>
                <CardDescription>Importe o arquivo de retorno do banco</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Input 
                    type="file" 
                    accept=".ret,.txt" 
                    onChange={handleImportRetorno}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    disabled={processingRetorno}
                  />
                  <Button 
                    variant="outline"
                    className="w-full rounded-xl border-warning/30 hover:bg-warning/5 text-warning font-body h-11 pointer-events-none"
                  >
                    {processingRetorno ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> Importar Retorno</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="remessas" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
              <TabsTrigger value="remessas">Remessas CNAB</TabsTrigger>
              <TabsTrigger value="pix">Lotes PIX</TabsTrigger>
              <TabsTrigger value="cambio">Taxas de Câmbio</TabsTrigger>
            </TabsList>
            <TabsContent value="remessas">
              <Card className="border border-border/30 rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" /> Histórico de Remessas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Seq.</TableHead>
                        <TableHead>Pagamentos</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {remessas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma remessa gerada</TableCell>
                        </TableRow>
                      ) : remessas.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{formatDate(r.created_at)}</TableCell>
                          <TableCell>{r.banco_codigo}</TableCell>
                          <TableCell>{r.sequencial_arquivo}</TableCell>
                          <TableCell>{r.total_pagamentos}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(r.valor_total)}</TableCell>
                          <TableCell><StatusBadge status={r.status} variant="success" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="pix">
              <Card className="border border-border/30 rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" /> Histórico de Lotes PIX
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Qtd. Pagamentos</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pixLotes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum lote PIX gerado</TableCell>
                        </TableRow>
                      ) : pixLotes.map(l => (
                        <TableRow key={l.id}>
                          <TableCell>{formatDate(l.created_at)}</TableCell>
                          <TableCell>{l.quantidade_pagamentos}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(l.valor_total)}</TableCell>
                          <TableCell><StatusBadge status={l.status} variant="success" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="cambio">
              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                <CardHeader>
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Conversão Multi-moeda
                  </CardTitle>
                  <CardDescription>Cotações para pagamento de expatriados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-xl glass border-border/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1 uppercase">USD / BRL</p>
                      <p className="text-xl font-bold font-display">R$ 5,24</p>
                      <span className="text-[10px] text-success font-medium">+0.42%</span>
                    </div>
                    <div className="p-4 rounded-xl glass border-border/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1 uppercase">EUR / BRL</p>
                      <p className="text-xl font-bold font-display">R$ 5,68</p>
                      <span className="text-[10px] text-destructive font-medium">-0.15%</span>
                    </div>
                    <div className="p-4 rounded-xl glass border-border/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1 uppercase">GBP / BRL</p>
                      <p className="text-xl font-bold font-display">R$ 6,55</p>
                      <span className="text-[10px] text-success font-medium">+0.12%</span>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Par de Moedas</TableHead>
                        <TableHead>Taxa</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">USD → BRL</TableCell>
                        <TableCell>5.2410</TableCell>
                        <TableCell>{formatDate(new Date())}</TableCell>
                        <TableCell><StatusBadge status="ativo" variant="success" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">EUR → BRL</TableCell>
                        <TableCell>5.6822</TableCell>
                        <TableCell>{formatDate(new Date())}</TableCell>
                        <TableCell><StatusBadge status="ativo" variant="success" /></TableCell>
                      </TableRow>
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
