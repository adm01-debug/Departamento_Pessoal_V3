import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  Tooltip, ResponsiveContainer, Cell, CartesianGrid 
} from 'recharts';
import { Navigation, Compass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function PontoGeoAnalytics({ batidas }: { batidas: any[] }) {
  const geoStats = useMemo(() => {
    const total = batidas.length;
    if (total === 0) return null;

    const dentro = batidas.filter(b => b.dentro_raio).length;
    const fora = total - dentro;
    const percentDentro = (dentro / total) * 100;

    // Filter batidas with valid lat/lng for the "map"
    const validPoints = batidas
      .filter(b => b.latitude && b.longitude)
      .map(b => ({
        x: Number(b.longitude),
        y: Number(b.latitude),
        name: b.colaborador?.nome_completo || 'Colaborador',
        dentro: b.dentro_raio,
        distancia: b.distancia_local_metros || 0,
        hora: b.hora
      }));

    const avgDist = validPoints.reduce((acc, p) => acc + p.distancia, 0) / (validPoints.length || 1);

    return {
      total,
      dentro,
      fora,
      percentDentro,
      validPoints,
      avgDist
    };
  }, [batidas]);

  if (!geoStats) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border border-border/40 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/30 pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" /> Distribuição Geográfica de Batidas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-80 relative">
              {/* Fake Map Grid Background */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis type="number" dataKey="x" name="Longitude" hide />
                  <YAxis type="number" dataKey="y" name="Latitude" hide />
                  <ZAxis type="number" range={[60, 400]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border border-border p-3 rounded-xl shadow-xl">
                            <p className="text-xs font-bold mb-1">{data.name}</p>
                            <p className="text-[10px] text-muted-foreground">Hora: {data.hora}</p>
                            <p className="text-[10px] text-muted-foreground">Distância: {Math.round(data.distancia)}m</p>
                            <Badge variant={data.dentro ? "outline" : "destructive"} className="mt-2 text-[9px]">
                              {data.dentro ? "Dentro do Raio" : "Fora do Raio"}
                            </Badge>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Batidas" data={geoStats.validPoints}>
                    {geoStats.validPoints.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.dentro ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} 
                        className="animate-in fade-in zoom-in duration-500"
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              
              <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-xs p-2 rounded-lg border text-[10px]">
                  <div className="h-2 w-2 rounded-full bg-primary" /> Dentro do Raio
                </div>
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-xs p-2 rounded-lg border text-[10px]">
                  <div className="h-2 w-2 rounded-full bg-destructive" /> Fora do Raio
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border border-border/40 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/30 pb-2 text-center">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Índice de Geofencing</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="relative h-40 w-40 flex items-center justify-center">
              <svg className="h-full w-full -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-muted/20"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * geoStats.percentDentro) / 100}
                  strokeLinecap="round"
                  className={cn("transition-all duration-1000", geoStats.percentDentro > 90 ? "text-success" : "text-warning")}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-bold">{Math.round(geoStats.percentDentro)}%</span>
                <span className="text-[10px] text-muted-foreground font-bold">EM CONFORMIDADE</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full mt-6">
              <div className="p-3 rounded-xl bg-success/5 border border-success/10 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">DENTRO</p>
                <p className="text-xl font-bold text-success">{geoStats.dentro}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">FORA</p>
                <p className="text-xl font-bold text-destructive">{geoStats.fora}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl text-primary"><Navigation className="h-6 w-6" /></div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-bold">Distância Média</p>
              <h3 className="text-xl font-display font-bold text-primary">{Math.round(geoStats.avgDist)} metros</h3>
              <p className="text-[10px] text-muted-foreground">do perímetro autorizado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
