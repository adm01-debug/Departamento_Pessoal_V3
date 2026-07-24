import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, Save, History, RefreshCw, Zap, PieChart as PieChartIcon, BarChart as BarChartIcon, Copy, Trash2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { premiacoesService } from '@/services/premiacoesService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { useEmpresas } from '@/hooks/useEmpresas';

export function RewardsSimulator() {
  const queryClient = useQueryClient();
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id || '';
  const [employees, setEmployees] = React.useState(50);
  const [avgSalary, setAvgSalary] = React.useState(4500);
  const [bonusPercent, setBonusPercent] = React.useState(10);
  const [performanceLevel, setPerformanceLevel] = React.useState(85);
  const [retentionImpact, setRetentionImpact] = React.useState(5);
  const [compareMode, setCompareMode] = React.useState(false);

  const { data: scenarios = [] } = useQuery({
    queryKey: ['premiacoes_cenarios_roi', empresaId],
    queryFn: () => premiacoesService.listarCenariosROI(empresaId),
    enabled: !!empresaId
  });

  const saveMutation = useMutation({
    mutationFn: (cenario: any) => premiacoesService.salvarCenarioROI(cenario, empresaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premiacoes_cenarios_roi', empresaId] });
      toast.success("Cenário salvo no banco de dados estrategicamente!");
    }
  });

  const calculateMetrics = (emp: number, sal: number, bonus: number, perf: number, ret: number) => {
    const totalBudget = emp * sal * (bonus / 100) * (perf / 100);
    const turnoverCost = sal * 3 * emp * 0.15;
    const savings = turnoverCost * (ret / 100);
    const roi = totalBudget > 0 ? (savings / totalBudget) : 0;
    return { totalBudget, savings, roi };
  };

  const { totalBudget, savings, roi } = calculateMetrics(employees, avgSalary, bonusPercent, performanceLevel, retentionImpact);

  const saveScenario = () => {
    saveMutation.mutate({
      name: `Cenário ${scenarios.length + 1}`,
      employees,
      avgSalary,
      bonusPercent,
      performanceLevel,
      retentionImpact,
      totalBudget,
      savings,
      roi
    });
  };

  const loadScenario = (s: any) => {
    setEmployees(s.configuracoes.employees);
    setAvgSalary(s.configuracoes.avgSalary);
    setBonusPercent(s.configuracoes.bonusPercent);
    setPerformanceLevel(s.configuracoes.performanceLevel);
    setRetentionImpact(s.configuracoes.retentionImpact);
    toast.info(`Cenário "${s.name}" carregado.`);
  };

  const chartData = compareMode && scenarios.length > 0 
    ? scenarios.slice(0, 3).map((s: any) => ({
        name: s.name,
        'Custo Bônus': s.resultados.totalBudget,
        'Economia ROI': s.resultados.savings
      }))
    : [
        { name: 'Atual', 'Custo Bônus': totalBudget, 'Economia ROI': savings }
      ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Simulador de ROI de Capital Humano 10/10</h3>
          <p className="text-sm text-muted-foreground">Projete e compare cenários de premiação com snapshots de auditoria.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className={`gap-2 rounded-xl ${compareMode ? 'bg-primary/10 border-primary' : ''}`} onClick={() => setCompareMode(!compareMode)}>
            <ArrowRightLeft className="h-4 w-4" /> {compareMode ? 'Sair Comparação' : 'Comparar Cenários'}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => {
            setEmployees(50); setAvgSalary(4500); setBonusPercent(10); setPerformanceLevel(85); setRetentionImpact(5);
          }}>
            <RefreshCw className="h-4 w-4" /> Resetar
          </Button>
          <Button size="sm" className="gap-2 rounded-xl bg-primary shadow-lg shadow-primary/20" onClick={saveScenario}>
            <Save className="h-4 w-4" /> Salvar Snapshot
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border/30 rounded-2xl shadow-xs bg-card/50 backdrop-blur-xs">
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Colaboradores</Label>
                  <Badge variant="outline" className="font-mono bg-background">{employees}</Badge>
                </div>
                <Slider value={[employees]} onValueChange={([v]: number[]) => setEmployees(v)} max={1000} step={10} />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Salário Médio</Label>
                  <Badge variant="outline" className="font-mono bg-background">{formatCurrency(avgSalary)}</Badge>
                </div>
                <Slider value={[avgSalary]} onValueChange={([v]: number[]) => setAvgSalary(v)} min={1500} max={30000} step={500} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">% Bônus Alvo</Label>
                  <Badge variant="secondary" className="font-mono">{bonusPercent}%</Badge>
                </div>
                <Slider value={[bonusPercent]} onValueChange={([v]: number[]) => setBonusPercent(v)} max={100} step={1} />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Atingimento de Meta</Label>
                  <Badge variant="secondary" className="font-mono">{performanceLevel}%</Badge>
                </div>
                <Slider value={[performanceLevel]} onValueChange={([v]: number[]) => setPerformanceLevel(v)} max={150} step={5} />
              </div>
            </div>

            <div className="pt-4 border-t border-border/10">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Redução de Turnover</Label>
                    <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                  </div>
                  <Badge variant="outline" className="font-mono text-amber-600 border-amber-200 bg-amber-50">{retentionImpact}%</Badge>
                </div>
                <Slider value={[retentionImpact]} onValueChange={([v]: number[]) => setRetentionImpact(v)} max={20} step={0.5} />
              </div>
            </div>

            <div className="h-[250px] w-full mt-8 p-6 bg-muted/20 rounded-3xl border border-border/5">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <BarChartIcon className="h-3 w-3" /> {compareMode ? 'Comparativo de Cenários Salvos' : 'Impacto Financeiro Detalhado'}
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(val: any) => formatCurrency(Number(val))}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  <Bar dataKey="Custo Bônus" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Economia ROI" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20 rounded-3xl overflow-hidden relative">
            <Calculator className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10 rotate-12" />
            <CardContent className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Payout Estimado</p>
              <h2 className="text-4xl font-bold mt-2 tracking-tighter">{formatCurrency(totalBudget)}</h2>
              <div className="mt-8 p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                <div className="flex justify-between text-[10px] font-bold mb-2 uppercase tracking-tighter">
                  <span>Eficiência de Capital</span>
                  <span>{roi.toFixed(2)}x</span>
                </div>
                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-500" style={{ width: `${Math.min(roi * 20, 100)}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 rounded-3xl shadow-xs bg-gradient-to-br from-success/10 to-transparent border-l-4 border-l-success">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-success">Economia Direta</p>
              </div>
              <h2 className="text-3xl font-bold text-success tracking-tighter">{formatCurrency(savings)}</h2>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                Snapshot de economia baseada em redução de <strong>{retentionImpact}%</strong> no turnover orgânico.
              </p>
            </CardContent>
          </Card>

          {scenarios.length > 0 && (
            <Card className="border-border/30 rounded-3xl shadow-xs bg-muted/30">
              <CardHeader className="p-4 pb-0 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <History className="h-3 w-3 text-muted-foreground" />
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Snapshots (Auditoria)</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {}} aria-label="Excluir snapshots">
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-4 space-y-3">
                {scenarios.map((s: any) => (
                  <div key={s.id} className="group relative flex flex-col gap-1 p-3 bg-background rounded-2xl border border-border/10 hover:border-primary/30 transition-all cursor-pointer" onClick={() => loadScenario(s)}>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold">{s.name}</span>
                      <span className="text-[9px] text-muted-foreground">{formatDateTime(s.created_at)}</span>
                    </div>
                    <div className="flex justify-between items-end mt-1">
                      <span className="text-[10px] font-mono font-bold text-primary">{formatCurrency(s.resultados.totalBudget)}</span>
                      <Badge variant="outline" className="text-[8px] h-4 bg-success/5 text-success border-success/20">{s.resultados.roi.toFixed(1)}x ROI</Badge>
                    </div>
                    <div className="hidden group-hover:block mt-2 pt-2 border-t border-border/10">
                      <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Logs de Cálculo (Snapshot)</p>
                      <ul className="text-[8px] text-muted-foreground list-disc pl-3 mt-1">
                        <li>Metas: {s.configuracoes.performanceLevel}%</li>
                        <li>Retenção: {s.configuracoes.retentionImpact}%</li>
                        <li>Salário Médio: {formatCurrency(s.configuracoes.avgSalary)}</li>
                      </ul>
                    </div>
                    <Button variant="ghost" size="icon" className="absolute -right-2 -top-2 h-5 w-5 bg-background border border-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Copiar cenário">
                      <Copy className="h-2 w-2" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}