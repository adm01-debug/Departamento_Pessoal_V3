import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const GRID_LABELS: Record<string, string> = {
  '1-3': 'Enigma', '2-3': 'Alto Potencial', '3-3': 'Estrela',
  '1-2': 'Dilema', '2-2': 'Core Player', '3-2': 'Alto Profissional',
  '1-1': 'Sub-performer', '2-1': 'Efetivo', '3-1': 'Profissional Confiável'
};

const GRID_COLORS: Record<string, string> = {
  '3-3': 'bg-green-100 border-green-500 text-green-700',
  '1-1': 'bg-red-100 border-red-500 text-red-700',
  '2-2': 'bg-blue-50 border-blue-400 text-blue-700',
  '1-3': 'bg-yellow-50 border-yellow-400 text-yellow-700',
  '3-1': 'bg-orange-50 border-orange-400 text-orange-700',
};

export function NineBoxMatrix({ data }: { data: any[] }) {
  function classifyScore(score: number) {
    if (score <= 1.5 || !score) return 1;
    if (score <= 3.5) return 2;
    return 3;
  }

  const grid = useMemo(() => {
    const buckets: any = {
      '1-1': [], '1-2': [], '1-3': [],
      '2-1': [], '2-2': [], '2-3': [],
      '3-1': [], '3-2': [], '3-3': []
    };

    data.forEach(item => {
      // Usando performance e potencial salvos no feedback ou calculados
      const perf = classifyScore(item.performance || item.nota_geral);
      const pot = classifyScore(item.potencial || 2); // default mediano se não houver
      const key = `${perf}-${pot}`;
      if (buckets[key]) buckets[key].push(item);
    });
    return buckets;
  }, [data]);

  return (
    <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
      <CardHeader className="bg-muted/30 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" /> Matriz Nine-Box 10/10
            </CardTitle>
            <CardDescription className="font-body text-xs text-muted-foreground">Mapeamento estratégico de talentos por desempenho e potencial</CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Eixo Horizontal: Desempenho (Efetividade nas metas)<br />
                Eixo Vertical: Potencial (Capacidade de assumir novos desafios)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-3 aspect-square md:aspect-video max-w-5xl mx-auto relative">
          {/* Labels de Eixos */}
          <div className="absolute -left-10 top-1/2 -rotate-90 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Potencial</div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Desempenho</div>

          {[3, 2, 1].map(pot => (
            [1, 2, 3].map(perf => {
              const key = `${perf}-${pot}`;
              const employees = grid[key] || [];
              return (
                <div 
                  key={key} 
                  className={`border-2 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all hover:shadow-lg ${GRID_COLORS[key] || 'bg-muted/10 border-border/30 text-muted-foreground'}`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-80">{GRID_LABELS[key]}</p>
                  <div className="relative">
                    <p className="text-3xl font-display font-semibold leading-snug">{employees.length}</p>
                  </div>
                  
                  {employees.length > 0 && (
                     <div className="mt-3 flex flex-wrap justify-center gap-1">
                        {employees.slice(0, 4).map((e: any, idx: number) => (
                          <div 
                            key={e.id || idx} 
                            className="h-6 w-6 rounded-full bg-white/60 border border-black/5 flex items-center justify-center text-[10px] font-medium shadow-xs" 
                            title={e.avaliado?.nome_completo}
                          >
                            {e.avaliado?.nome_completo?.charAt(0)}
                          </div>
                        ))}
                        {employees.length > 4 && (
                          <div className="h-6 w-6 rounded-full bg-black/5 flex items-center justify-center text-[8px] font-medium">
                            +{employees.length - 4}
                          </div>
                        )}
                     </div>
                  )}
                </div>
              );
            })
          ))}
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="p-4 rounded-2xl bg-green-50 border border-green-200 flex flex-col gap-1">
              <span className="text-[10px] font-medium text-green-700 uppercase tracking-wider">Alto Desempenho & Potencial</span>
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-display font-medium text-green-800">Estrelas</h4>
                <Badge className="bg-green-600 text-white font-medium">{grid['3-3']?.length || 0}</Badge>
              </div>
           </div>
           <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col gap-1">
              <span className="text-[10px] font-medium text-blue-700 uppercase tracking-wider">Base da Empresa</span>
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-display font-medium text-blue-800">Core Players</h4>
                <Badge className="bg-blue-600 text-white font-medium">{grid['2-2']?.length || 0}</Badge>
              </div>
           </div>
           <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex flex-col gap-1">
              <span className="text-[10px] font-medium text-red-700 uppercase tracking-wider">Atenção Necessária</span>
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-display font-medium text-red-800">Em Risco</h4>
                <Badge className="bg-red-600 text-white font-medium">{grid['1-1']?.length || 0}</Badge>
              </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
