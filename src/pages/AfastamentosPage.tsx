import { useState, useMemo } from 'react';
import { useAfastamentos, useProrrogacoesAfastamento } from '@/hooks/useAfastamentos';
import { usePDFExport } from '@/hooks/usePDFExport';
import { gerarAfastamentosPDF } from '@/utils/afastamentoPDF';
import { afastamentoService } from '@/services/afastamentoService';
import { toast } from 'sonner';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, Plus, Search, Filter, Download, Calendar as CalendarIcon, Clock, AlertCircle, FileText, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AfastamentoStats } from '@/components/afastamentos/AfastamentoStats';
import { AfastamentoTable } from '@/components/afastamentos/AfastamentoTable';
import { AfastamentoForm } from '@/components/afastamentos/AfastamentoForm';
import { AfastamentoDocumentManager } from '@/components/afastamentos/AfastamentoDocumentManager';
import { AfastamentoTimeline } from '@/components/afastamentos/AfastamentoTimeline';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyList } from '@/components/ui/empty-state';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
const tipoLabels: Record<string, string> = {
  doenca: 'Doença',
  acidente_trabalho: 'Acidente Trabalho',
  acidente_trajeto: 'Acidente Trajeto',
  licenca_maternidade: 'L. Maternidade',
  licenca_paternidade: 'L. Paternidade',
  licenca_casamento: 'L. Casamento',
  licenca_obito: 'L. Óbito',
  licenca_nao_remunerada: 'L. Não Remunerada',
  servico_militar: 'Serviço Militar',
  mandato_sindical: 'Mandato Sindical',
  suspensao_disciplinar: 'Suspensão Disc.',
  outros: 'Outros',
};

export default function AfastamentosPage() {
  const { afastamentos, isLoading, filtros, setFiltros } = useAfastamentos();
  const { prorrogacoes, isLoading: loadProrr } = useProrrogacoesAfastamento(undefined);
  const { exportarPDF } = usePDFExport();
  
  const [activeTab, setActiveTab] = useState('afastamentos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedAfastamento, setSelectedAfastamento] = useState<Record<string, any> | null>(null);

  const stats = {
    total: afastamentos.length,
    ativos: afastamentos.filter((a: any) => a.status === 'ativo').length,
    pendentes: afastamentos.filter((a: any) => a.status === 'pendente').length,
    finalizados: afastamentos.filter((a: any) => a.status === 'finalizado' || a.status === 'concluido').length,
    diasTotais: afastamentos.reduce<number>((sum, a: any) => sum + Number(a.dias_total || 0), 0),
  };

  const filteredAfastamentos = afastamentos.filter((a: any) => {
    const matchSearch = 
      !searchTerm || a.colaborador?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCID = 
      !filtros.cid || 
      a.cid?.codigo?.toLowerCase().includes(filtros.cid.toLowerCase()) ||
      a.cid?.descricao?.toLowerCase().includes(filtros.cid.toLowerCase());
    
    const matchTipo = !selectedTipo || a.tipo === selectedTipo;
    const matchStatus = !filtros.status || a.status === filtros.status;
    
    return matchSearch && matchCID && matchTipo && matchStatus;
  });

  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = months.map(m => ({ name: m, total: 0 }));
    
    afastamentos.forEach((af: any) => {
      const date = new Date(af.data_inicio);
      const monthIndex = date.getMonth();
      data[monthIndex].total += 1;
    });
    
    return data;
  }, [afastamentos]);

  const handleEdit = (af: any) => {
    setSelectedAfastamento(af);
    setIsFormOpen(true);
  };

  const handleDocuments = (af: any) => {
    setSelectedAfastamento(af);
    setIsDocOpen(true);
  };

  const handleTimeline = (af: any) => {
    setSelectedAfastamento(af);
    setIsTimelineOpen(true);
  };

  const handleNew = () => {
    setSelectedAfastamento(null);
    setIsFormOpen(true);
  };

  return (
    <PageLayout
      title="Gestão de Afastamentos"
      description="Controle integral de licenças, atestados e encaminhamentos ao INSS"
      icon={<Heart className="h-5 w-5 text-white" />}
      gradient="from-red-500 to-orange-500"
      actions={
        <Button 
          onClick={handleNew}
          className="rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90 shadow-md font-medium"
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Afastamento
        </Button>
      }
    >
      <AfastamentoStats stats={stats} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="afastamentos" className="rounded-lg">Afastamentos</TabsTrigger>
            <TabsTrigger value="prorrogacoes" className="rounded-lg">Prorrogações</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 min-w-[200px] md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por colaborador..." 
                className="pl-9 bg-card shadow-xs border-primary/20 focus:border-primary transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative flex-1 min-w-[150px] md:w-48 group">
              <div className="absolute left-3 top-2.5 h-4 w-4 text-primary/60 group-focus-within:text-primary transition-colors">
                <FileText className="h-4 w-4" />
              </div>
              <Input 
                placeholder="Filtrar por CID-10..." 
                className="pl-9 bg-card shadow-xs border-orange-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                value={filtros.cid || ''}
                onChange={(e) => setFiltros({ ...filtros, cid: e.target.value })}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shadow-xs border-muted-foreground/20 hover:bg-accent">
                  <Filter className="h-4 w-4 mr-2" />
                  {selectedTipo ? tipoLabels[selectedTipo] : 'Filtrar Tipo'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                <DropdownMenuLabel className="text-xs uppercase text-muted-foreground font-bold">Status do Afastamento</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFiltros({ ...filtros, status: null })}>Todos Status</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiltros({ ...filtros, status: 'ativo' })} className="text-green-600 font-medium">Ativos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiltros({ ...filtros, status: 'pendente' })} className="text-orange-600 font-medium">Pendentes (INSS)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiltros({ ...filtros, status: 'finalizado' })} className="text-gray-600 font-medium">Finalizados</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiltros({ ...filtros, status: 'prorrogado' })} className="text-blue-600 font-medium">Prorrogados</DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs uppercase text-muted-foreground font-bold">Tipo de Licença</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedTipo(null)}>Todos Tipos</DropdownMenuItem>
                <ScrollArea className="h-48">
                  {Object.entries(tipoLabels).map(([key, label]) => (
                    <DropdownMenuItem key={key} onClick={() => setSelectedTipo(key)} className="text-xs">
                      {label}
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Baixar" className="shadow-xs" title="Exportar Dados">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Exportar Relatório</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  await afastamentoService.exportarRelatorio(filtros.empresa_id, { ...filtros, tipo: selectedTipo });
                  toast.success('Relatório exportado com sucesso em CSV');
                }}>
                  <Download className="h-4 w-4 mr-2" /> CSV (Planilha)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  const dataToExport = filteredAfastamentos.map((af: any) => ({
                    colaborador: af.colaborador?.nome_completo || '-',
                    tipo: tipoLabels[af.tipo] || af.tipo,
                    cid: af.cid?.codigo || af.cid || '-',
                    inicio: format(new Date(af.data_inicio), 'dd/MM/yyyy'),
                    fim: format(new Date(af.data_fim_prevista), 'dd/MM/yyyy'),
                    dias: af.dias_total,
                    status: af.status,
                    diasInss: af.dias_inss || 0,
                    pericia: af.data_pericia ? format(new Date(af.data_pericia), 'dd/MM/yyyy') : '-'
                  }));
                  
                  try {
                    await gerarAfastamentosPDF(
                      'Relatório de Afastamentos e Auditoria Detalhada',
                      dataToExport,
                      { cid: filtros.cid, status: filtros.status, tipo: selectedTipo }
                    );
                    toast.success('Exportação PDF concluída com excelência');
                  } catch (e) {
                    toast.error('Erro ao gerar PDF avançado');
                  }
                }}>
                  <FileText className="h-4 w-4 mr-2" /> PDF (Auditoria Detalhada 10/10)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <TabsContent value="afastamentos" className="mt-0">
              {isLoading ? (
                <div className="flex justify-center p-12"><Spinner size="lg" /></div>
              ) : filteredAfastamentos.length === 0 ? (
                <EmptyList entityName="afastamento" />
              ) : (
                <AfastamentoTable 
                  data={filteredAfastamentos} 
                  onEdit={handleEdit}
                  onDocuments={handleDocuments}
                  onProrrogacao={handleEdit}
                  onTimeline={handleTimeline}
                />
              )}
            </TabsContent>

            <TabsContent value="prorrogacoes" className="mt-0">
              <Card className="border border-border/50 shadow-xs rounded-xl overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                  <CardTitle className="text-lg font-display">Histórico de Prorrogações</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadProrr ? (
                    <div className="p-12 flex justify-center"><Spinner /></div>
                  ) : prorrogacoes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">Nenhuma prorrogação registrada.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Fim Anterior</TableHead>
                          <TableHead>Novo Fim</TableHead>
                          <TableHead className="text-center">Data Registro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prorrogacoes.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.afastamento?.colaborador?.nome_completo || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal">
                                {tipoLabels[p.afastamento?.tipo] || p.afastamento?.tipo || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell>{p.data_fim_antiga ? format(new Date(p.data_fim_antiga), 'dd/MM/yyyy') : '-'}</TableCell>
                            <TableCell className="font-semibold text-primary">{p.data_fim_nova ? format(new Date(p.data_fim_nova), 'dd/MM/yyyy') : '-'}</TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {format(new Date(p.created_at), 'dd/MM/yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <div className="space-y-6">
            <Card className="border border-border/50 shadow-xs rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Próximas Perícias / Eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {afastamentos.filter((a: any) => a.data_pericia || a.dias_inss > 0).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Sem eventos agendados.</p>
                    ) : (
                      afastamentos
                        .filter((a: any) => a.data_pericia || a.dias_inss > 0)
                        .map((af: any) => (
                          <div key={af.id} className="relative pl-6 pb-4 border-l border-muted last:pb-0">
                            <div className="absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold truncate">{af.colaborador?.nome_completo}</p>
                              {af.data_pericia ? (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>Perícia: {format(new Date(af.data_pericia), 'dd/MM/yyyy')}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[10px] text-warning font-semibold">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Aguardando agendamento INSS</span>
                                </div>
                              )}
                              <p className="text-[10px] text-muted-foreground italic truncate">
                                {af.local_pericia || 'Local não informado'}
                              </p>
                            </div>
                            <Separator className="mt-3 opacity-50" />
                          </div>
                        ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border border-border/50 shadow-xs rounded-xl bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Volume Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[120px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fill: '#888'}} 
                        interval={1}
                      />
                      <RechartsTooltip 
                        contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        cursor={{fill: '#f5f5f5'}}
                      />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === new Date().getMonth() ? '#ef4444' : '#fca5a5'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-3 pt-2 border-t">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-muted-foreground">Impacto Direto</span>
                    <span className="text-foreground">{afastamentos.reduce<number>((acc, a: any) => acc + Number(a.dias_empresa || 0), 0)} dias pagos</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-muted-foreground">Previdência</span>
                    <span className="text-orange-600">{afastamentos.filter((a: any) => (a.dias_inss || 0) > 0).length} casos ativos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAfastamento ? 'Editar Afastamento' : 'Novo Registro de Afastamento'}
            </DialogTitle>
          </DialogHeader>
          <AfastamentoForm 
            initialData={selectedAfastamento} 
            onSuccess={() => {
              setIsFormOpen(false);
              setSelectedAfastamento(null);
            }} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDocOpen} onOpenChange={setIsDocOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Documentos e Anexos</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Afastamento de: {selectedAfastamento?.colaborador?.nome_completo}
            </div>
          </DialogHeader>
          {selectedAfastamento && (
            <AfastamentoDocumentManager afastamentoId={selectedAfastamento.id} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Evolução</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Acompanhamento completo de: {selectedAfastamento?.colaborador?.nome_completo}
            </div>
          </DialogHeader>
          {selectedAfastamento && (
            <AfastamentoTimeline afastamentoId={selectedAfastamento.id} />
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}