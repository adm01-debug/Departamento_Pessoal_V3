import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { StatusBadge, TipoBadge } from './DesligamentoStatusBadge';
import { DesligamentoChecklist } from './DesligamentoChecklist';
import { Calculator, Download, FileText, User, Calendar, DollarSign, RefreshCw, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { desligamentoService, type DesligamentoComColaborador } from '@/services/desligamentoService';
import { rescisaoService } from '@/services/rescisaoService';
import { gerarPDFRescisao, mapearResultadoDeDesligamento } from '@/utils/rescisaoPDF';
import type { Updatable } from '@/integrations/supabase/database.types';
import type { LucideIcon } from 'lucide-react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizarTipoRescisao } from '@/utils/rescisaoCalc';

interface DetailSheetProps {
  desligamento:
    | (DesligamentoComColaborador & {
        detalhes_calculo?: Partial<import('@/utils/rescisaoCalc').RescisaoResult> | null;
      })
    | null;
  open: boolean;
  onClose: () => void;
}

function fmt(v: number | null) {
  if (v === null || v === undefined) return 'R$ 0,00';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

interface ParametrosCalculo {
  aviso_trabalhado?: boolean;
  ferias_vencidas?: boolean;
  saldo_fgts?: number;
  dias_aviso_nao_cumpridos?: number;
  data_fim_contrato?: string;
  termino_iniciativa?: 'empregador' | 'empregado' | 'natural';
  indenizacao_art_480_prejuizo?: number;
}

export function DesligamentoDetailSheet({ desligamento, open, onClose }: DetailSheetProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [calculating, setCalculating] = useState(false);
  const [homologating, setHomologating] = useState(false);
  // Parâmetros das modalidades: o motor aceita aviso trabalhado, férias
  // vencidas, saldo FGTS, pedido de demissão com desconto de aviso (art. 487
  // §2º) e término de contrato a prazo (arts. 479/480). Antes o fluxo chamava
  // o cálculo com defaults fixos e a rescisão saía subcalculada. Os valores
  // persistem em detalhes_calculo._parametros e repr aqui no recálculo.
  const salvos = (desligamento?.detalhes_calculo as { _parametros?: ParametrosCalculo } | null | undefined)
    ?._parametros;
  const [params, setParams] = useState<ParametrosCalculo>(salvos ?? {});
  const [paramsLoaded, setParamsLoaded] = useState('');
  const d = desligamento;

  if (d && paramsLoaded !== d.id) {
    setParamsLoaded(d.id);
    setParams((d.detalhes_calculo as { _parametros?: ParametrosCalculo } | null | undefined)?._parametros ?? {});
  }

  if (!d) return null;

  const tipoNormalizado = normalizarTipoRescisao(d.tipo || 'sem_justa_causa');

  const handleChecklistToggle = async (key: string, value: boolean) => {
    try {
      // Regras de transição de etapa baseadas no checklist
      const updates: Updatable<'desligamentos'> = { [key]: value };

      if (key === 'checklist_comunicacao' && value) {
        updates.etapa = 'documentacao';
        updates.status = 'comunicado';
      } else if (key === 'checklist_documentacao' && value) {
        // Se concluiu documentação, habilita etapa de cálculo
        if (d.etapa === 'documentacao') updates.etapa = 'calculo';
      }

      await desligamentoService.atualizar(d.id, updates, d.empresa_id ?? '');
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Checklist atualizado');
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao atualizar checklist.'));
    }
  };

  const handleCalcular = async () => {
    if (!d.salario_base || !d.data_desligamento) {
      toast.error('Salário base e data de desligamento são obrigatórios para o cálculo');
      return;
    }
    setCalculating(true);
    try {
      await rescisaoService.calcularESalvar(
        d.id,
        {
          salario_base: d.salario_base,
          data_admissao: d.colaborador?.data_admissao ?? '',
          data_desligamento: d.data_desligamento,
          tipo: d.tipo || 'sem_justa_causa',
          aviso_trabalhado: params.aviso_trabalhado ?? false,
          ferias_vencidas: params.ferias_vencidas ?? false,
          saldo_fgts: params.saldo_fgts ?? 0,
          dias_aviso_nao_cumpridos: params.dias_aviso_nao_cumpridos,
          data_fim_contrato: params.data_fim_contrato,
          termino_iniciativa: params.termino_iniciativa,
          indenizacao_art_480_prejuizo: params.indenizacao_art_480_prejuizo,
          // Com data_pagamento registrada, o motor aplica a multa do
          // art. 477 §8º quando a quitação passou de 10 dias corridos.
          data_pagamento: d.data_pagamento ?? undefined,
        },
        d.empresa_id ?? ''
      );
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Rescisão calculada com sucesso');
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao calcular rescisão.'));
    } finally {
      setCalculating(false);
    }
  };

  const handleHomologar = async () => {
    setHomologating(true);
    try {
      await rescisaoService.homologar(d.id, d.empresa_id ?? '');
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Homologação concluída');
    } catch (err) {
      toast.error(safeErrorMessage(err, 'Erro ao homologar.'));
    } finally {
      setHomologating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={d.status} />
            <TipoBadge tipo={d.tipo} />
          </div>
          <SheetTitle className="font-display text-lg">{d.colaborador?.nome_completo || 'Colaborador'}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="detalhes" className="w-full">
          <TabsList className="w-full rounded-xl">
            <TabsTrigger value="detalhes" className="flex-1 rounded-lg text-xs font-body">
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex-1 rounded-lg text-xs font-body">
              Checklist
            </TabsTrigger>
            <TabsTrigger value="rescisao" className="flex-1 rounded-lg text-xs font-body">
              Rescisão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="mt-4 space-y-4">
            <Card className="border-border/30 rounded-xl">
              <CardContent className="p-4 space-y-3">
                <InfoRow icon={User} label="Colaborador" value={d.colaborador?.nome_completo || '—'} />
                <InfoRow
                  icon={Calendar}
                  label="Data Desligamento"
                  value={d.data_desligamento ? new Date(d.data_desligamento).toLocaleDateString('pt-BR') : '—'}
                />
                <InfoRow
                  icon={Calendar}
                  label="Data Aviso Prévio"
                  value={d.data_aviso_previo ? new Date(d.data_aviso_previo).toLocaleDateString('pt-BR') : '—'}
                />
                <InfoRow icon={DollarSign} label="Salário Base" value={fmt(d.salario_base)} />
                {d.motivo && <InfoRow icon={FileText} label="Motivo" value={d.motivo} />}
              </CardContent>
            </Card>

            {/* Etapa / Timeline */}
            {d.etapa && (
              <Card className="border-border/30 rounded-xl">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-xs font-display">Etapa Atual</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <EtapaStepper etapa={d.etapa} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="checklist" className="mt-4">
            <DesligamentoChecklist desligamento={d} onToggle={handleChecklistToggle} />
          </TabsContent>

          <TabsContent value="rescisao" className="mt-4 space-y-4">
            {d.status !== 'homologado' && d.status !== 'finalizado' && d.status !== 'pago' && (
              <Card className="border-border/30 rounded-xl">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-xs font-display">Parâmetros do Cálculo</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="aviso-trabalhado"
                      checked={params.aviso_trabalhado === true}
                      onCheckedChange={(v) => setParams((p) => ({ ...p, aviso_trabalhado: v === true }))}
                    />
                    <Label htmlFor="aviso-trabalhado" className="text-xs font-body">
                      Aviso prévio trabalhado
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ferias-vencidas"
                      checked={params.ferias_vencidas === true}
                      onCheckedChange={(v) => setParams((p) => ({ ...p, ferias_vencidas: v === true }))}
                    />
                    <Label htmlFor="ferias-vencidas" className="text-xs font-body">
                      Férias vencidas em dobro
                    </Label>
                  </div>
                  <div>
                    <Label htmlFor="saldo-fgts" className="text-xs">
                      Saldo FGTS para multa (R$)
                    </Label>
                    <Input
                      id="saldo-fgts"
                      type="number"
                      min={0}
                      step="0.01"
                      value={params.saldo_fgts ?? ''}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          saldo_fgts: e.target.value === '' ? undefined : Number(e.target.value),
                        }))
                      }
                      placeholder="0,00"
                    />
                  </div>
                  {tipoNormalizado === 'pedido_demissao' && !params.aviso_trabalhado && (
                    <div>
                      <Label htmlFor="dias-aviso" className="text-xs">
                        Dias de aviso prévio não cumpridos (0–30)
                      </Label>
                      <Input
                        id="dias-aviso"
                        type="number"
                        min={0}
                        max={30}
                        value={params.dias_aviso_nao_cumpridos ?? ''}
                        onChange={(e) =>
                          setParams((p) => ({
                            ...p,
                            dias_aviso_nao_cumpridos: e.target.value === '' ? undefined : Number(e.target.value),
                          }))
                        }
                        placeholder="30"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Desconto do aviso não cumprido (art. 487, §2º) — proporcional aos dias faltantes.
                      </p>
                    </div>
                  )}
                  {tipoNormalizado === 'termino_contrato' && (
                    <>
                      <div>
                        <Label htmlFor="termino-iniciativa" className="text-xs">
                          Iniciativa do término antecipado
                        </Label>
                        <Select
                          value={params.termino_iniciativa ?? 'empregador'}
                          onValueChange={(v) =>
                            setParams((p) => ({
                              ...p,
                              termino_iniciativa: v as 'empregador' | 'empregado' | 'natural',
                            }))
                          }
                        >
                          <SelectTrigger id="termino-iniciativa">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="empregador">Empregador (art. 479)</SelectItem>
                            <SelectItem value="empregado">Empregado (art. 480)</SelectItem>
                            <SelectItem value="natural">Término natural do contrato</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {params.termino_iniciativa !== 'natural' && (
                        <div>
                          <Label htmlFor="data-fim-contrato" className="text-xs">
                            Data prevista de fim do contrato *
                          </Label>
                          <Input
                            id="data-fim-contrato"
                            type="date"
                            value={params.data_fim_contrato ?? ''}
                            onChange={(e) =>
                              setParams((p) => ({ ...p, data_fim_contrato: e.target.value || undefined }))
                            }
                          />
                        </div>
                      )}
                      {params.termino_iniciativa === 'empregado' && (
                        <div>
                          <Label htmlFor="prejuizo-480" className="text-xs">
                            Prejuízo apurado do empregador — art. 480 (R$)
                          </Label>
                          <Input
                            id="prejuizo-480"
                            type="number"
                            min={0}
                            step="0.01"
                            value={params.indenizacao_art_480_prejuizo ?? ''}
                            onChange={(e) =>
                              setParams((p) => ({
                                ...p,
                                indenizacao_art_480_prejuizo:
                                  e.target.value === '' ? undefined : Number(e.target.value),
                              }))
                            }
                            placeholder="0,00"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            A indenização é limitada às perdas comprovadas (teto = metade do período restante).
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border-border/30 rounded-xl">
              <CardContent className="p-4 space-y-2">
                <RescisaoRow label="Saldo de Salário" value={d.saldo_salario} />
                <RescisaoRow label="13º Proporcional" value={d.decimo_terceiro} />
                <RescisaoRow label="Férias Proporcionais" value={d.ferias_proporcionais} />
                <RescisaoRow label="Férias Vencidas" value={d.ferias_vencidas} />
                <RescisaoRow label="1/3 Constitucional" value={d.terco_constitucional} />
                <RescisaoRow label="Aviso Prévio" value={d.aviso_previo} />
                <Separator className="my-2" />
                <RescisaoRow label="Total Proventos" value={d.total_proventos} bold className="text-success" />
                <RescisaoRow label="Total Descontos" value={d.total_descontos} bold className="text-destructive" />
                {d.detalhes_calculo && (
                  <div className="flex justify-between text-[10px] font-body text-muted-foreground px-1">
                    <span>
                      (INSS: {fmt(d.detalhes_calculo.inss ?? null)} / IRRF: {fmt(d.detalhes_calculo.irrf ?? null)})
                    </span>
                  </div>
                )}
                <RescisaoRow label="Multa FGTS" value={d.multa_fgts} />
                <Separator className="my-2" />
                <div className="bg-primary/5 rounded-xl p-3 flex justify-between items-center">
                  <span className="font-display font-bold text-sm">Valor Líquido</span>
                  <span className="font-display font-bold text-primary text-lg">{fmt(d.valor_liquido)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleCalcular}
                disabled={calculating || d.status === 'homologado' || d.status === 'finalizado'}
                className="rounded-xl font-body bg-primary hover:bg-primary-glow"
              >
                {calculating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4 mr-2" />
                )}
                {d.valor_liquido ? 'Recalcular' : 'Calcular Agora'}
              </Button>

              <Button
                onClick={handleHomologar}
                disabled={homologating || d.status === 'homologado' || d.status === 'finalizado' || !d.valor_liquido}
                variant="outline"
                className="rounded-xl font-body border-success/50 hover:bg-success/10 text-success"
              >
                {homologating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Homologar
              </Button>
            </div>

            {d.valor_liquido && (
              <Button
                onClick={() => {
                  const form = {
                    ...d,
                    empresa_id: d.empresa_id ?? '',
                    nomeColaborador: d.colaborador?.nome_completo ?? null,
                    cpf: d.colaborador?.cpf ?? null,
                    cargo: d.colaborador?.cargo ?? null,
                    dataAdmissao: d.colaborador?.data_admissao ?? null,
                    dataDesligamento: d.data_desligamento,
                    tipo: d.tipo,
                  };
                  gerarPDFRescisao(form, mapearResultadoDeDesligamento(d));
                }}
                variant="outline"
                className="w-full rounded-xl font-body gap-2"
              >
                <Download className="h-4 w-4" /> Download TRCT assinado
              </Button>
            )}

            <Button
              onClick={() => navigate('/calculadora-rescisao')}
              variant="ghost"
              className="w-full rounded-xl font-body text-xs text-muted-foreground"
            >
              Abrir Calculadora Avançada
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground font-body">{label}</p>
        <p className="text-sm font-body font-medium">{value}</p>
      </div>
    </div>
  );
}

function RescisaoRow({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: number | null;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className="flex justify-between text-xs font-body">
      <span className={bold ? 'font-semibold' : ''}>{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${className || ''}`}>{fmt(value)}</span>
    </div>
  );
}

const ETAPAS = ['comunicacao', 'documentacao', 'calculo', 'homologacao', 'pagamento', 'finalizado'];
const ETAPA_LABELS: Record<string, string> = {
  comunicacao: 'Comunicação',
  documentacao: 'Documentação',
  calculo: 'Cálculo',
  homologacao: 'Homologação',
  pagamento: 'Pagamento',
  finalizado: 'Finalizado',
};

function EtapaStepper({ etapa }: { etapa: string }) {
  const currentIndex = ETAPAS.indexOf(etapa);
  return (
    <div className="flex items-center gap-1">
      {ETAPAS.map((e, i) => (
        <div key={e} className="flex items-center gap-1 flex-1">
          <div
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentIndex ? 'bg-primary' : 'bg-muted'}`}
          />
        </div>
      ))}
      <span className="text-[10px] font-body text-muted-foreground ml-2">{ETAPA_LABELS[etapa] || etapa}</span>
    </div>
  );
}
