import type { Tables } from '@/integrations/supabase/types';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation, Compass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type BatidaGeo = Tables<'batidas_ponto'> & { colaborador?: { nome_completo?: string | null } | null };

// Mapa real (tiles OpenStreetMap, projeção Web-Mercator) — substitui o
// "Fake Map Grid" + scatter artificial (achado §6.4). Sem dependência nova:
// a grade de tiles e os marcadores são calculados na projeção.
const TILE = 256;
const mercX = (lng: number, z: number) => ((lng + 180) / 360) * TILE * 2 ** z;
const mercY = (lat: number, z: number) => {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * TILE * 2 ** z;
};

function escolherZoom(minLng: number, maxLng: number, minLat: number, maxLat: number, w = 640, h = 320) {
  for (let z = 17; z >= 5; z--) {
    const dx = Math.abs(mercX(maxLng, z) - mercX(minLng, z));
    const dy = Math.abs(mercY(maxLat, z) - mercY(minLat, z));
    if (dx <= w * 0.7 && dy <= h * 0.7) return z;
  }
  return 5;
}

export function PontoGeoAnalytics({ batidas }: { batidas: BatidaGeo[] }) {
  const geoStats = useMemo(() => {
    const total = batidas.length;
    if (total === 0) return null;

    const dentro = batidas.filter((b) => b.dentro_raio).length;
    const fora = total - dentro;
    const percentDentro = (dentro / total) * 100;

    // Filter batidas with valid lat/lng for the "map"
    const validPoints = batidas
      .filter((b) => b.latitude && b.longitude)
      .map((b) => ({
        x: Number(b.longitude),
        y: Number(b.latitude),
        name: b.colaborador?.nome_completo || 'Colaborador',
        dentro: b.dentro_raio,
        distancia: b.distancia_local_metros || 0,
        hora: b.hora,
      }));

    const avgDist = validPoints.reduce((acc, p) => acc + p.distancia, 0) / (validPoints.length || 1);

    return {
      total,
      dentro,
      fora,
      percentDentro,
      validPoints,
      avgDist,
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
              {geoStats.validPoints.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sem batidas com coordenadas no período.
                </div>
              ) : (
                (() => {
                  const W = 640;
                  const H = 320;
                  const lats = geoStats.validPoints.map((p) => p.y);
                  const lngs = geoStats.validPoints.map((p) => p.x);
                  const minLat = Math.min(...lats);
                  const maxLat = Math.max(...lats);
                  const minLng = Math.min(...lngs);
                  const maxLng = Math.max(...lngs);
                  const zoom = escolherZoom(minLng, maxLng, minLat, maxLat);
                  const cx = (mercX(minLng, zoom) + mercX(maxLng, zoom)) / 2;
                  const cy = (mercY(minLat, zoom) + mercY(maxLat, zoom)) / 2;
                  const tileCount = Math.ceil(Math.max(W / TILE, H / TILE)) + 1;
                  const tiles: { x: number; y: number; left: number; top: number }[] = [];
                  const x0 = Math.floor((cx - W / 2) / TILE);
                  const y0 = Math.floor((cy - H / 2) / TILE);
                  for (let ty = y0; ty < y0 + tileCount; ty++) {
                    for (let tx = x0; tx < x0 + tileCount; tx++) {
                      const maxTile = 2 ** zoom;
                      if (tx < 0 || ty < 0 || tx >= maxTile || ty >= maxTile) continue;
                      tiles.push({ x: tx, y: ty, left: tx * TILE - (cx - W / 2), top: ty * TILE - (cy - H / 2) });
                    }
                  }
                  return (
                    <div className="absolute inset-0 overflow-hidden rounded-xl border border-border/30 bg-muted/20">
                      <div
                        className="absolute"
                        style={{ width: W, height: H, left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
                      >
                        {tiles.map((t) => (
                          <img
                            key={`${t.x}-${t.y}`}
                            src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
                            alt=""
                            width={TILE}
                            height={TILE}
                            draggable={false}
                            className="absolute select-none"
                            style={{ left: t.left, top: t.top }}
                          />
                        ))}
                        {geoStats.validPoints.map((p, i) => (
                          <div
                            key={`pt-${i}`}
                            title={`${p.name} · ${p.hora ?? ''} · ${Math.round(p.distancia)}m ${p.dentro ? '(dentro do raio)' : '(fora do raio)'}`}
                            className={cn(
                              'absolute -ml-1.5 -mt-1.5 h-3 w-3 rounded-full border-2 border-background shadow',
                              p.dentro ? 'bg-primary' : 'bg-destructive'
                            )}
                            style={{ left: mercX(p.x, zoom) - (cx - W / 2), top: mercY(p.y, zoom) - (cy - H / 2) }}
                          />
                        ))}
                      </div>
                      <div className="absolute bottom-1 right-2 bg-background/80 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] text-muted-foreground">
                        © OpenStreetMap contributors
                      </div>
                    </div>
                  );
                })()
              )}

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
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Índice de Geofencing
            </CardTitle>
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
                  className={cn(
                    'transition-all duration-1000',
                    geoStats.percentDentro > 90 ? 'text-success' : 'text-warning'
                  )}
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
            <div className="p-3 bg-primary/20 rounded-xl text-primary">
              <Navigation className="h-6 w-6" />
            </div>
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
