import { useEffect } from 'react';
import { useProrrogacoesAfastamento, useAfastamentos } from '@/hooks/useAfastamentos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, History, Clock, FileText, Stethoscope, AlertCircle, Plus } from 'lucide-react';
import { afastamentoService } from '@/services/afastamentoService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';

interface AfastamentoTimelineProps {
  afastamentoId: string;
}

export function AfastamentoTimeline({ afastamentoId }: AfastamentoTimelineProps) {
  const { prorrogacoes, isLoading } = useProrrogacoesAfastamento(afastamentoId);
  const { afastamentos } = useAfastamentos();
  
  const afastamento: any = Array.isArray(afastamentos) ? afastamentos.find((a: any) => a.id === afastamentoId) : null;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground animate-pulse">Carregando histórico detalhado...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-primary font-semibold mb-2">
        <History className="h-5 w-5" />
        <h3>Linha do Tempo do Afastamento</h3>
      </div>

      <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
        {/* Registro Inicial */}
        <div className="relative">
          <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-background flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
          <Card className="border-border/50 shadow-xs">
            <CardHeader className="py-3 px-4 bg-muted/30">
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="text-[10px] uppercase font-bold">Registro Inicial</Badge>
                {afastamento?.created_at && (
                  <span className="text-[10px] text-muted-foreground italic">
                    {format(new Date(afastamento.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="py-3 px-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Início</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {afastamento?.data_inicio ? format(new Date(afastamento.data_inicio), 'dd/MM/yyyy') : '-'}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Fim Original</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {afastamento?.data_fim_prevista ? format(new Date(afastamento.data_fim_prevista), 'dd/MM/yyyy') : '-'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prorrogações */}
        {Array.isArray(prorrogacoes) && prorrogacoes.map((prorr: any, index: number) => (
          <div key={prorr.id} className="relative">
            <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full border-2 border-orange-500 bg-background flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            </div>
            <Card className="border-orange-100 shadow-xs">
              <CardHeader className="py-3 px-4 bg-orange-50/50">
                <div className="flex justify-between items-center">
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none text-[10px] uppercase font-bold">
                    Prorrogação #{(prorrogacoes?.length || 0) - index}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground italic">
                    {format(new Date(prorr.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="py-4 px-4 space-y-4">
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between p-4 bg-orange-50/50 rounded-xl border border-orange-100/50">
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Período Anterior</p>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium line-through opacity-60">
                        Até {prorr.data_fim_antiga ? format(new Date(prorr.data_fim_antiga), 'dd/MM/yyyy') : '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-orange-200/50 p-2 rounded-full hidden md:block">
                    <ArrowRight className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="bg-orange-200/50 p-2 rounded-full block md:hidden">
                    <History className="h-4 w-4 text-orange-600" />
                  </div>

                  <div className="flex-1 text-center md:text-right">
                    <p className="text-[10px] text-orange-600 uppercase font-bold tracking-wider mb-1">Novo Período</p>
                    <div className="flex items-center justify-center md:justify-end gap-2">
                      <span className="text-base font-bold text-orange-700">
                        Até {prorr.data_fim_nova ? format(new Date(prorr.data_fim_nova), 'dd/MM/yyyy') : '-'}
                      </span>
                      <Badge className="bg-orange-500 text-white border-none text-[10px] h-5">EXTENDIDO</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-white border border-orange-100 rounded-lg shadow-xs">
                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Dias Adicionais</p>
                      <p className="text-sm font-bold text-orange-700">
                        +{afastamentoService.calcularDias(prorr.data_fim_antiga, prorr.data_fim_nova) - 1} dias de afastamento
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white border border-orange-100 rounded-lg shadow-xs">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Total Acumulado</p>
                      <p className="text-sm font-bold text-blue-700">
                        {afastamentoService.calcularDias(afastamento?.data_inicio, prorr.data_fim_nova)} dias totais
                      </p>
                    </div>
                  </div>
                </div>

                {prorr.motivo && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Justificativa Médica</span>
                    </div>
                    <p className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border-l-4 border-orange-400 italic">
                      "{prorr.motivo}"
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>Doc vinculado: {prorr.documento?.nome_arquivo || 'Nenhum'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Eventos Futuros / Perícias Agendadas */}
        {afastamento?.data_pericia && (
          <div className="relative">
            <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full border-2 border-blue-500 bg-background flex items-center justify-center">
              <Stethoscope className="h-2.5 w-2.5 text-blue-500" />
            </div>
            <Card className="border-blue-100 bg-blue-50/20 shadow-xs">
              <CardHeader className="py-3 px-4 bg-blue-50/40">
                <div className="flex justify-between items-center">
                  <Badge className="bg-blue-100 text-blue-700 border-none text-[10px] uppercase font-bold">
                    Perícia Médica Agendada
                  </Badge>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    AGENDADO
                  </span>
                </div>
              </CardHeader>
              <CardContent className="py-4 px-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-bold text-blue-900">
                          {format(new Date(afastamento.data_pericia), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[9px] bg-blue-100/50 border-blue-200 text-blue-700">
                            Protocolo: {afastamento.protocolo_inss || 'Pendente'}
                          </Badge>
                          {afastamento.data_pericia_anterior && (
                            <Badge variant="outline" className="text-[9px] bg-amber-50 border-amber-200 text-amber-700">
                              REAGENDADO (Era: {format(new Date(afastamento.data_pericia_anterior), 'dd/MM/yy')})
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {afastamento.motivo_pericia && (
                        <div className="bg-white/50 p-2 rounded border border-blue-100/50 text-[10px] italic">
                          <span className="font-bold text-blue-800 not-italic mr-1">Motivo:</span>
                          "{afastamento.motivo_pericia}"
                        </div>
                      )}

                      <div className="p-2 bg-white rounded border border-blue-100 text-[11px] shadow-xs">
                        <span className="font-bold text-blue-800 uppercase block mb-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Local da Perícia:
                        </span>
                        <span className="text-blue-700 leading-tight block">{afastamento.local_pericia || 'Local a ser confirmado pelo INSS / Ver no site Meu INSS'}</span>
                      </div>

                      {afastamento.data_fim_prevista && (
                        <div className="bg-blue-600/5 p-2 rounded-lg border border-blue-200/50">
                          <div className="text-[10px] text-blue-800 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span className="font-semibold">Cálculo de Dias Adicionais:</span>
                          </div>
                          <p className="text-[11px] text-blue-700 mt-1">
                            Se a perícia confirmar a incapacidade, a prorrogação estimada será de 
                            <span className="font-bold ml-1">+{afastamentoService.calcularDias(afastamento.data_fim_prevista, afastamento.data_pericia)} dias</span> até a data da avaliação.
                          </p>
                        </div>
                      )}
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
