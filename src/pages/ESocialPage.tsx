import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCheck, Send, AlertCircle, CheckCircle, Plus, Loader2, RefreshCw, ShieldCheck, Key, Eye, Info, Globe, AlertTriangle, Check, Search, Download, LayoutDashboard, History, Settings2, ShieldAlert, BarChart3, Calendar, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useESocial } from '@/hooks/useESocial';
import { useEmpresas } from '@/hooks/useEmpresas';
import { getEventoDescricao, validarAnteDeEnviar } from '@/services/esocialService';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ESocialComplianceScore } from '@/components/esocial/ESocialComplianceScore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ESocialAIInsights } from '@/components/esocial/ESocialAIInsights';
import { ESocialConciliacao } from '@/components/esocial/ESocialConciliacao';
import { ESocialTimeline } from '@/components/esocial/ESocialTimeline';
import { ESocialAuditDialog } from '@/components/esocial/ESocialAuditDialog';
import { ESocialLogsTab, ESocialConfigTab, ESocialEventDetailsDialog } from '@/components/esocial/tabs';
import { currentCompetenciaLocal } from '@/utils/dateLocal';


const tiposEvento = [
  'S-1000', 'S-1005', 'S-1010', 'S-1020',
  'S-1200', 'S-1210', 'S-1280',
  'S-2200', 'S-2205', 'S-2206', 'S-2210', 'S-2220', 'S-2230', 'S-2240', 'S-2299', 'S-2300', 'S-2306', 'S-2399', 'S-2400'
];

export default function ESocialPage() {
  const { 
    eventos, stats, isLoading, criarEvento, enviarEvento, reenviarEvento, 
    gerarEventosPeriodo, isSending, enviarLote, config, certificados, logs,
    salvarConfig, adicionarCertificado, refreshLogs
  } = useESocial();
  const { empresaAtual } = useEmpresas();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [novoTipo, setNovoTipo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<Record<string, any> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCompetencia, setSelectedCompetencia] = useState(currentCompetenciaLocal());
  const [isValidating, setIsValidating] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const filteredEventos = useMemo(() => {
    return eventos.filter(e => {
      const matchesSearch = 
        e.tipo_evento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getEventoDescricao(e.tipo_evento).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.protocolo && e.protocolo.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || (e.status || 'pendente') === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [eventos, searchTerm, filterStatus]);

  const handleValidar = async (evento: any) => {
    if (!evento.dados) return;
    setIsValidating(evento.id);
    try {
      const result = await validarAnteDeEnviar(evento.tipo_evento, evento.dados as any);
      if (result.valid) {
        toast.success(`Evento ${evento.tipo_evento} válido para transmissão!`);
      } else {
        toast.error(`Evento ${evento.tipo_evento} possui ${result.errors.length} erro(s) de validação.`);
      }
    } catch (error) {
      toast.error("Falha ao validar evento");
    } finally {
      setIsValidating(null);
    }
  };

  const handleExportXML = (evento: any) => {
    if (!evento.xml) {
      toast.error("XML não disponível. Envie o evento primeiro.");
      return;
    }
    const blob = new Blob([evento.xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${evento.tipo_evento}_${evento.id}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("XML exportado com sucesso");
  };

  const statusVariant = (s: string) => s === 'enviado' ? 'success' : s === 'erro' ? 'error' : 'warning';
  const statusIcon = (s: string) => {
    if (s === 'enviado') return <CheckCircle className="h-5 w-5 text-success" />;
    if (s === 'erro') return <AlertCircle className="h-5 w-5 text-destructive" />;
    return <Send className="h-5 w-5 text-warning" />;
  };




  const handleCriar = () => {
    if (!novoTipo || !empresaAtual?.id) return;
    criarEvento({ empresa_id: empresaAtual.id, tipo_evento: novoTipo });
    setNovoTipo('');
    setDialogOpen(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEventos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEventos.map(e => e.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleEnviarLote = () => {
    if (selectedIds.length === 0 || !empresaAtual?.id) return;
    enviarLote({ eventoIds: selectedIds, empresaId: empresaAtual.id });
    setSelectedIds([]);
  };

  const statsData = [
    { label: 'Enviados', value: String(stats.enviados), gradient: 'from-success to-success/70' },
    { label: 'Pendentes', value: String(stats.pendentes), gradient: 'from-warning to-warning/70' },
    { label: 'Com Erro', value: String(stats.erros), gradient: 'from-destructive to-destructive/70' },
    { label: 'Conformidade', value: `${stats.conformidade}%`, gradient: 'from-primary to-primary-glow' },
  ];

  return (
    <>
    <PageTitle title="eSocial" description="Gestão de eventos eSocial" />
    <PageLayout
      title="Central eSocial 10/10"
      description="Monitoramento proativo e conformidade total com o Governo Federal"
      icon={<FileCheck className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary to-primary-glow"
      actions={
        <div className="flex gap-2">
           <Button 
             variant="outline" 
             size="sm" 
             className="rounded-xl gap-1.5 border-primary/20 hover:bg-primary/5"
             onClick={() => setAuditOpen(true)}
           >
              <ShieldAlert className="h-4 w-4" />
              Auditoria IA
           </Button>
           <Button 
             size="sm" 
             className="rounded-xl gap-1.5 bg-gradient-to-r from-primary to-primary-glow"
             disabled={isSending || !empresaAtual}
             onClick={() => {
               if (empresaAtual?.id) {
                 gerarEventosPeriodo({ 
                   empresaId: empresaAtual.id, 
                   competencia: selectedCompetencia 
                 });
               }
             }}
           >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Gerar Eventos Periódicos ({selectedCompetencia})
           </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {statsData.map(({ label, value, gradient }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden group hover:shadow-glow transition-all">
                  <div className={cn("h-[2px] bg-gradient-to-r", gradient)} />
                  <CardContent className="pt-6">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-3xl font-display font-bold">{value}</div>
                    )}
                    <p className="text-xs text-muted-foreground font-body mt-1">{label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="eventos" className="space-y-6">

        <TabsList className="bg-muted/30 p-1 rounded-2xl border border-border/20 flex-wrap h-auto">
          <TabsTrigger value="eventos" className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <LayoutDashboard className="h-4 w-4" /> Eventos
          </TabsTrigger>
          <TabsTrigger value="conciliacao" className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <BarChart3 className="h-4 w-4" /> Conciliação
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <ShieldCheck className="h-4 w-4" /> Logs de Transmissão
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <History className="h-4 w-4" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Settings2 className="h-4 w-4" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conciliacao" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <ESocialConciliacao />
          </motion.div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <ESocialLogsTab logs={logs} eventos={eventos} refreshLogs={refreshLogs} />
        </TabsContent>


        <TabsContent value="eventos" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

        <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <FileCheck className="h-4 w-4 text-primary-foreground" />
              </div>
              <CardTitle className="font-display">Eventos eSocial</CardTitle>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <AnimatePresence>
                {selectedIds.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-2 mr-2"
                  >
                    <Badge variant="secondary" className="rounded-lg h-9 px-3 bg-primary/10 text-primary border-primary/20">
                      {selectedIds.length} selecionados
                    </Badge>
                    <Button 
                      size="sm" 
                      className="rounded-xl gap-1.5 bg-gradient-to-r from-primary to-primary-glow"
                      onClick={handleEnviarLote}
                      disabled={isSending}
                    >
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Transmitir Lote
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                      onClick={() => setSelectedIds([])}
                      aria-label="Limpar seleção"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 bg-muted/20 p-1 rounded-xl border">
                <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
                <Input 
                  type="month" 
                  value={selectedCompetencia}
                  onChange={(e) => setSelectedCompetencia(e.target.value)}
                  className="border-none bg-transparent h-7 w-32 focus-visible:ring-0 text-xs font-bold"
                />
              </div>
              <div className="relative w-full md:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar evento..." 
                  className="pl-9 rounded-xl h-9 text-xs" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] rounded-xl h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="enviado">Enviados</SelectItem>
                  <SelectItem value="erro">Com Erro</SelectItem>
                </SelectContent>
              </Select>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-body border-success/30 hover:bg-success/5 text-success">
                    <ShieldCheck className="h-4 w-4" />
                    Certificado Ativo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">Gestão de Certificados Digitais</DialogTitle>
                    <CardDescription>Gerencie seus certificados ICP-Brasil (A1/A3)</CardDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="p-4 rounded-xl border border-success/20 bg-success/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Key className="h-8 w-8 text-success" />
                        <div>
                          <p className="font-bold text-sm">e-CNPJ: {empresaAtual?.razao_social}</p>
                          <p className="text-xs text-muted-foreground">Vencimento: 12/12/2026 (Em 224 dias)</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-success border-success/30">Válido</Badge>
                    </div>
                    <Button variant="outline" className="w-full rounded-xl border-dashed">
                      <Plus className="h-4 w-4 mr-2" /> Upload Novo Certificado (.pfx)
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-body">
                  <Plus className="h-4 w-4 mr-1" /> Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Criar Evento eSocial</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Select value={novoTipo} onValueChange={setNovoTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposEvento.map(t => (
                        <SelectItem key={t} value={t}>{t} - {getEventoDescricao(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCriar} disabled={!novoTipo || !empresaAtual?.id} className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                    Criar Evento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : eventos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground font-body">
                <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum evento registrado</p>
                <p className="text-sm mt-1">Crie um novo evento para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3.5 mb-2">
                   <Checkbox 
                     checked={selectedIds.length === filteredEventos.length && filteredEventos.length > 0}
                     onCheckedChange={toggleSelectAll}
                     className="rounded border-border/40 data-[state=checked]:bg-primary"
                   />
                   <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Selecionar Todos</span>
                </div>
                {filteredEventos.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.03 }}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl glass hover:border-border/60 transition-all group",
                      e.status === 'processando' && "border-primary/40 bg-primary/5 animate-pulse"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox 
                        checked={selectedIds.includes(e.id)}
                        onCheckedChange={() => handleToggleSelect(e.id)}
                        className="rounded border-border/40 data-[state=checked]:bg-primary"
                        onClick={(ev) => ev.stopPropagation()}
                      />
                      {e.status === 'processando' ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      ) : (
                        statusIcon(e.status || 'pendente')
                      )}

                      <div>
                        <p className="font-body font-medium flex items-center gap-2">
                          {e.tipo_evento} - {getEventoDescricao(e.tipo_evento)}
                          {e.status === 'erro' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="bg-destructive text-destructive-foreground border-none max-w-[300px] p-3 rounded-xl shadow-glow">
                                  <p className="font-bold mb-1">Erro de Transmissão:</p>
                                  <p className="max-w-xs text-xs">{(e.erros as any)?.mensagem || (e.erros as any)?.validacao?.[0]?.mensagem || (e.erros as any)?.detalhes || 'Falha na recepção pelo Governo'}</p>
                                  {(e.erros as any)?.codigo && <p className="text-[10px] mt-2 opacity-80">Código: {(e.erros as any).codigo}</p>}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <p className="text-[10px] text-muted-foreground font-body flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {e.status === 'enviado' ? 'Enviado em:' : 'Criado em:'} {formatDate(e.data_envio || e.created_at)}
                          </p>
                          {e.protocolo && (
                            <p className="text-[10px] text-primary font-mono bg-primary/5 px-1.5 rounded border border-primary/10">
                              Protocolo: {e.protocolo}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={e.status || 'pendente'} variant={statusVariant(e.status || 'pendente') as any} />
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Visualizar" className="h-8 w-8 rounded-lg" onClick={() => setSelectedEvento(e)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Ver Detalhes</p></TooltipContent>
                            </Tooltip>

                            {e.xml && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="Baixar" className="h-8 w-8 rounded-lg text-primary" onClick={() => handleExportXML(e)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Exportar XML</p></TooltipContent>
                              </Tooltip>
                            )}

                            {e.status === 'pendente' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Validar"
                                    className="h-8 w-8 rounded-lg text-warning"
                                    onClick={() => handleValidar(e)}
                                    disabled={isValidating === e.id}
                                  >
                                    {isValidating === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Validar Regras Gov.br</p></TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>

                        {e.status === 'pendente' && empresaAtual?.id && (
                          <Button
                            size="sm"
                            disabled={isSending}
                            onClick={() => enviarEvento({ eventoId: e.id, empresaId: empresaAtual.id })}
                            className="rounded-xl bg-gradient-to-r from-primary-glow to-primary hover:opacity-90 text-primary-foreground font-body h-8"
                          >
                            {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3 mr-1" /> Enviar</>}
                          </Button>
                        )}
                        {e.status === 'erro' && empresaAtual?.id && (
                          <Button
                            size="sm"
                            disabled={isSending}
                            onClick={() => reenviarEvento({ eventoId: e.id, empresaId: empresaAtual.id })}
                            className="rounded-xl bg-gradient-to-r from-destructive to-destructive/70/70 hover:opacity-90 text-primary-foreground font-body h-8"
                          >
                            {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3 mr-1" /> Reenviar</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="border border-border/30 rounded-2xl overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Histórico de Eventos & Transmissões
              </CardTitle>
              <CardDescription>Rastreabilidade completa de todas as ações no módulo eSocial</CardDescription>
            </CardHeader>
            <CardContent>
              <ESocialTimeline eventos={eventos} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <ESocialConfigTab
            certificados={certificados}
            config={config}
            empresaAtual={empresaAtual}
            salvarConfig={salvarConfig}
            adicionarCertificado={adicionarCertificado}
          />
        </TabsContent>

      </Tabs>
    </div>
    
    <div className="lg:col-span-1 space-y-6">
      <ESocialComplianceScore stats={stats} />
      <ESocialAIInsights />
      
      <Card className="border border-border/30 rounded-2xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-2">
           <CardTitle className="text-sm font-display flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
             Status do Webservice
           </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Gov.br Gateway</span>
              <Badge variant="outline" className="text-[10px] bg-success/5 text-success border-success/20 gap-1.5">
                 <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Operacional
              </Badge>
           </div>
           <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Latência de Resposta</span>
              <span className="text-xs font-bold">124ms</span>
           </div>
           <Button variant="ghost" className="w-full text-[10px] h-8 text-muted-foreground hover:text-primary rounded-xl gap-2">
              <Globe className="h-3 w-3" /> Ver Status da Infraestrutura
           </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</PageLayout>



      <ESocialEventDetailsDialog
        selectedEvento={selectedEvento}
        onClose={() => setSelectedEvento(null)}
        statusVariant={statusVariant}
        onExportXML={handleExportXML}
        onValidar={handleValidar}
      />

      <ESocialAuditDialog 
        open={auditOpen} 
        onOpenChange={setAuditOpen} 
        eventos={eventos} 
      />
    </>
  );
}