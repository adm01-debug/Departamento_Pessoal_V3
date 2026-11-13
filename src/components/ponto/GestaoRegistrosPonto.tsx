import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Users,
  Search,
  Clock,
  AlertTriangle,
  Download,
  FileText,
  ShieldCheck,
  Activity,
  TrendingUp,
  Filter,
  History,
} from 'lucide-react';
import { PontoInconsistencyPanel } from './PontoInconsistencyPanel';
import { PontoAuditTimeline } from './PontoAuditTimeline';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { useAuth } from '@/contexts';
import { safeErrorMessage } from '@/utils/safeError';
import { validateTablePayload } from '@/schemas/validate';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { exportPontoCSV, exportPontoPDF } from '@/services/exportService';
import { registrarAcessoPII } from '@/services/piiAccessLogService';
import { batidasPontoService } from '@/services/batidasPontoService';
import { GestaoPontoAnalytics } from './GestaoPontoAnalytics';
import { PontoGeoAnalytics } from './PontoGeoAnalytics';
import { toast } from 'sonner';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { todayLocalISO } from '@/utils/dateLocal';

export function GestaoRegistrosPonto() {
  const { empresaAtual } = useEmpresas();
  const { user, isAdmin, hasRole } = useAuth();
  // Aprovação segue pode_gerir_pessoas (RH/gestor); a trilha (get_audit_trail) é restrita a RH/admin.
  const podeAprovar = isAdmin || hasRole('rh') || hasRole('gestor');
  const podeVerHistorico = isAdmin || hasRole('rh');
  const queryClient = useQueryClient();
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [historico, setHistorico] = useState<{ id: string; nome: string } | null>(null);
  const [filtroData, setFiltroData] = useState(todayLocalISO());
  const [filtroFim, setFiltroFim] = useState(todayLocalISO());
  const [tipoExcecao, setTipoExcecao] = useState('todas');
  const [busca, setBusca] = useState('');
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['gestao-registros-ponto', empresaAtual?.id, filtroData, filtroFim],
    queryFn: async () => {
      if (!empresaAtual?.id) return [];
      const { data, error } = await supabase
        .from('registros_ponto')
        .select(
          '*, colaborador:colaboradores!registros_ponto_colaborador_id_fkey(nome_completo, cargo, departamento, foto_url)'
        )
        .eq('empresa_id', empresaAtual.id)
        .gte('data', filtroData)
        .lte('data', filtroFim)
        .order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: batidas = [] } = useQuery({
    queryKey: ['gestao-batidas-ponto-geo', empresaAtual?.id, filtroData, filtroFim],
    queryFn: async () => {
      if (!empresaAtual?.id) return [];
      const { data, error } = await supabase
        .from('batidas_ponto')
        .select('*, colaborador:colaboradores(nome_completo)')
        .eq('empresa_id', empresaAtual.id)
        .gte('data', filtroData)
        .lte('data', filtroFim);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const aprovarLote = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!empresaAtual?.id) throw new Error('Selecione uma empresa para aprovar registros.');
      if (!user?.id) throw new Error('Sessão expirada. Faça login novamente.');
      const { data, error } = await supabase
        .from('registros_ponto')
        .update(
          validateTablePayload(
            'registros_ponto',
            { aprovado: true, aprovado_por: user.id, aprovado_em: new Date().toISOString() },
            'GestaoRegistrosPonto:aprovarLote'
          )
        )
        .in('id', ids)
        .eq('empresa_id', empresaAtual.id)
        .or('aprovado.is.null,aprovado.eq.false')
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          'Nenhum registro foi aprovado: os selecionados já estavam aprovados ou você não tem permissão de RH nesta empresa.'
        );
      }
      return data.length;
    },
    onSuccess: (aprovados, ids) => {
      queryClient.invalidateQueries({ queryKey: ['gestao-registros-ponto'] });
      if (aprovados < ids.length) {
        toast.warning(
          `${aprovados} de ${ids.length} registros aprovados; ${ids.length - aprovados} ignorados (já aprovados ou sem permissão).`
        );
      } else {
        toast.success(`${aprovados} registros aprovados em lote!`);
      }
      setSelecionados([]);
    },
    onError: (error: unknown) => {
      toast.error(safeErrorMessage(error, 'Erro ao aprovar registros em lote.'));
    },
  });

  const formatTime = (val: string | null | undefined) => {
    if (!val) return '--:--';
    const m = String(val).match(/(\d+):(\d+)/);
    return m ? `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}` : '--:--';
  };

  const formatInterval = (val: string | null | undefined) => {
    if (!val) return '00:00';
    const m = String(val).match(/(\d+):(\d+)/);
    return m ? `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}` : '00:00';
  };

  const filtrados = registros.filter((r) => {
    const nome = r.colaborador?.nome_completo?.toLowerCase() || '';
    const cargo = r.colaborador?.cargo?.toLowerCase() || '';
    const depto = r.colaborador?.departamento?.toLowerCase() || '';
    const query = busca.toLowerCase();

    const buscaMatch = !busca || nome.includes(query) || cargo.includes(query) || depto.includes(query);

    if (tipoExcecao === 'todas') return buscaMatch;
    if (tipoExcecao === 'atrasos') return buscaMatch && (r.atraso_minutos ?? 0) > 0;
    if (tipoExcecao === 'faltas') return buscaMatch && !r.entrada_1 && !r.saida_1;
    if (tipoExcecao === 'incompletos') return buscaMatch && r.entrada_1 && !r.saida_1;

    return buscaMatch;
  });
  // Só aprova o que está selecionado E visível com os filtros atuais.
  const selecionadosVisiveis = selecionados.filter((id) => filtrados.some((f) => f.id === id));

  const exportData = (format: 'csv' | 'pdf') => {
    if (filtrados.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const dataToExport = filtrados.map((r) => ({
      colaborador: r.colaborador?.nome_completo,
      data: r.data,
      entrada_1: formatTime(r.entrada_1),
      saida_intervalo: formatTime(r.saida_intervalo),
      retorno_intervalo: formatTime(r.retorno_intervalo),
      saida_1: formatTime(r.saida_1),
      horas_trabalhadas: formatInterval(r.horas_trabalhadas),
      horas_extras: formatInterval(r.horas_extras),
    }));

    void registrarAcessoPII('ponto_registros', 'export', {
      empresaId: empresaAtual?.id,
      registroCount: dataToExport.length,
    });
    if (format === 'csv') {
      exportPontoCSV(dataToExport, `ponto-${filtroData}.csv`);
    } else {
      exportPontoPDF(dataToExport, `Relatório de Ponto - ${filtroData}`, [
        'colaborador',
        'entrada_1',
        'saida_intervalo',
        'retorno_intervalo',
        'saida_1',
        'horas_trabalhadas',
      ]);
    }
    toast.success('Relatório gerado com sucesso!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="mt-6"
    >
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow" />
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="h-4 w-4 text-info" /> Controle de Ponto - Gestão Avançada
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px] border-dashed">
                      <Filter className="h-3 w-3" /> Filtros Avançados
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="end">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-bold text-xs uppercase text-muted-foreground">Período</h4>
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={filtroData}
                            onChange={(e) => setFiltroData(e.target.value)}
                            className="h-8 text-[10px]"
                          />
                          <span className="text-[10px] text-muted-foreground">até</span>
                          <Input
                            type="date"
                            value={filtroFim}
                            onChange={(e) => setFiltroFim(e.target.value)}
                            className="h-8 text-[10px]"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-xs uppercase text-muted-foreground">Tipo de Exceção</h4>
                        <select
                          value={tipoExcecao}
                          onChange={(e) => setTipoExcecao(e.target.value)}
                          className="w-full h-8 rounded-lg border border-input bg-background px-2 py-1 text-[10px] shadow-xs focus:ring-1 focus:ring-primary"
                        >
                          <option value="todas">Todas as Batidas</option>
                          <option value="atrasos">Apenas Atrasos</option>
                          <option value="faltas">Apenas Faltas</option>
                          <option value="incompletos">Incompletos/Abertos</option>
                        </select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="flex items-center border rounded-lg overflow-hidden h-8 shadow-xs bg-background">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-full px-2 text-[10px] gap-1 border-r rounded-none hover:bg-success/10 text-success"
                    onClick={async () => {
                      if (!empresaAtual?.id) return;
                      toast.promise(batidasPontoService.fecharPeriodo(empresaAtual.id, filtroData, filtroFim), {
                        loading: 'Fechando período e integrando com folha...',
                        success: 'Período encerrado e dados enviados para processamento de folha!',
                        error: 'Erro ao fechar período',
                      });
                    }}
                  >
                    <ShieldCheck className="h-3 w-3" /> Fechar Período
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-full px-2 text-[10px] gap-1 border-r rounded-none hover:bg-info/10"
                    onClick={() => exportData('csv')}
                  >
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-full px-2 text-[10px] gap-1 rounded-none hover:bg-destructive/10"
                    onClick={() => exportData('pdf')}
                  >
                    <FileText className="h-3 w-3" /> PDF
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaborador, departamento ou cargo..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 h-9 rounded-xl border-border/40 bg-muted/20 focus:bg-background transition-colors"
                />
              </div>

              <AnimatePresence>
                {podeAprovar && selecionadosVisiveis.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-lg border border-primary/20"
                  >
                    <span className="text-[10px] font-bold text-primary">
                      {selecionadosVisiveis.length} selecionados
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] text-primary hover:bg-primary/20"
                      disabled={aprovarLote.isPending}
                      onClick={() => aprovarLote.mutate(selecionadosVisiveis)}
                    >
                      {aprovarLote.isPending ? 'Aprovando...' : 'Aprovar Lote'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="lista" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="lista" className="text-xs rounded-lg px-4">
                  <Activity className="h-3 w-3 mr-2" /> Registros
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs rounded-lg px-4">
                  <TrendingUp className="h-3 w-3 mr-2" /> Inteligência & Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="lista">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="p-3 rounded-2xl bg-muted/50 mb-3">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-body">Nenhum registro encontrado para esta data</p>
                </div>
              ) : (
                <>
                  <PontoInconsistencyPanel registros={registros} />

                  <div className="overflow-x-auto mt-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="w-10">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={selecionadosVisiveis.length === filtrados.length && filtrados.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) setSelecionados(filtrados.map((f) => f.id));
                                else setSelecionados([]);
                              }}
                            />
                          </TableHead>
                          <TableHead className="font-display font-semibold">Colaborador</TableHead>
                          <TableHead className="font-display font-semibold">Escala</TableHead>
                          <TableHead className="font-display font-semibold">Entrada 1</TableHead>
                          <TableHead className="font-display font-semibold">Saída Int.</TableHead>
                          <TableHead className="font-display font-semibold">Ret. Int.</TableHead>
                          <TableHead className="font-display font-semibold">Saída 1</TableHead>
                          <TableHead className="font-display font-semibold">Trabalhadas</TableHead>
                          <TableHead className="font-display font-semibold">Extras</TableHead>
                          <TableHead className="font-display font-semibold">Status</TableHead>
                          <TableHead className="font-display font-semibold text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {filtrados.map((r) => {
                          const trabalhadas = formatInterval(r.horas_trabalhadas);
                          const extras = formatInterval(r.horas_extras);
                          const temAtraso = (r.atraso_minutos ?? 0) > 0;
                          const temFalta = formatInterval(r.horas_falta) !== '00:00';
                          const aberto = !r.saida_1 && r.entrada_1;

                          return (
                            <TableRow
                              key={r.id}
                              className={`hover:bg-accent/30 transition-colors ${selecionados.includes(r.id) ? 'bg-primary/5' : ''}`}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300"
                                  checked={selecionados.includes(r.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelecionados([...selecionados, r.id]);
                                    else setSelecionados(selecionados.filter((id) => id !== r.id));
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {r.colaborador?.foto_url ? (
                                    <img
                                      src={r.colaborador.foto_url}
                                      alt=""
                                      className="h-7 w-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                      {(r.colaborador?.nome_completo || '?')[0]}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-body font-medium text-sm">
                                      {r.colaborador?.nome_completo || '—'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{r.colaborador?.cargo}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {r.entrada_esperada ? `${r.entrada_esperada} - ${r.saida_esperada}` : 'Não def.'}
                              </TableCell>
                              <TableCell
                                className={`font-mono text-sm ${temAtraso ? 'text-destructive font-bold' : ''}`}
                              >
                                {formatTime(r.entrada_1)}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{formatTime(r.saida_intervalo)}</TableCell>
                              <TableCell className="font-mono text-sm">{formatTime(r.retorno_intervalo)}</TableCell>
                              <TableCell className="font-mono text-sm">{formatTime(r.saida_1)}</TableCell>
                              <TableCell>
                                <span className="font-mono text-sm font-medium text-success">{trabalhadas}</span>
                              </TableCell>
                              <TableCell>
                                {extras !== '00:00' ? (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-info">
                                    +{extras}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {r.aprovado && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-5 px-1.5 text-primary border-primary/30"
                                    >
                                      Aprovado
                                    </Badge>
                                  )}
                                  {aberto && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-5 px-1.5 text-warning border-warning/30"
                                    >
                                      <Clock className="h-3 w-3 mr-0.5" /> Aberto
                                    </Badge>
                                  )}
                                  {temAtraso && (
                                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                      <AlertTriangle className="h-3 w-3 mr-0.5" /> {r.atraso_minutos}min
                                    </Badge>
                                  )}
                                  {temFalta && (
                                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                      Falta
                                    </Badge>
                                  )}
                                  {!aberto && !temAtraso && !temFalta && r.saida_1 && (
                                    <Badge
                                      className="text-[10px] h-5 px-1.5 bg-success/10 text-success border-success/30"
                                      variant="outline"
                                    >
                                      ✓ OK
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="text-right">
                                {podeVerHistorico && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Histórico"
                                    className="h-7 w-7 rounded-lg hover:bg-info/10 text-info"
                                    onClick={() =>
                                      setHistorico({ id: r.id, nome: r.colaborador?.nome_completo || '—' })
                                    }
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <p className="text-xs text-muted-foreground mt-3 font-body">
                      {filtrados.length} registro(s) encontrado(s)
                    </p>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <GestaoPontoAnalytics registros={registros} />
              <PontoGeoAnalytics batidas={batidas} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!historico} onOpenChange={(open) => !open && setHistorico(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histórico do registro de ponto</DialogTitle>
            <DialogDescription>{historico?.nome}</DialogDescription>
          </DialogHeader>
          {historico && <PontoAuditTimeline filterTabela="registros_ponto" registroId={historico.id} />}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
