import { Briefcase, Globe, Layers, Search, Tag, UserCheck, type LucideIcon } from 'lucide-react';
import type { OrigemRanking } from './analyticsComum';
import { AnalyticsPainel } from './AnalyticsPainel';

/**
 * PRINCIPAIS ORIGENS — ranking de captação derivado de `candidatos.origem`.
 *
 * Cada linha tem marcador colorido (tokens do sistema), nome, volume,
 * participação e barra. Não há origem fixa: o que a base tiver aparece aqui,
 * inclusive "Não informada". O tom de cada linha só ordena a leitura visual —
 * não carrega semântica de desempenho.
 */
const PALETA_ORIGENS = ['--info', '--chart-4', '--warning', '--chart-5', '--success', '--aqua', '--primary'] as const;

const ICONES_ORIGEM: { chave: string; icone: LucideIcon }[] = [
  { chave: 'linkedin', icone: Briefcase },
  { chave: 'indeed', icone: Search },
  { chave: 'site', icone: Globe },
  { chave: 'indicacao', icone: UserCheck },
  { chave: 'gupy', icone: Layers },
];

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function iconeDaOrigem(origem: string): LucideIcon {
  const chave = normalizar(origem);
  return ICONES_ORIGEM.find((item) => chave.includes(item.chave))?.icone ?? Tag;
}

export function AnalyticsOrigens({ origens, index }: { origens: OrigemRanking[]; index: number }) {
  const totalTop3 = origens.slice(0, 3).reduce((soma, origem) => soma + origem.percentual, 0);
  const top3 = Math.round(totalTop3 * 10) / 10;

  return (
    <AnalyticsPainel
      icon={Globe}
      title="Principais origens"
      subtitle={`De onde vêm os candidatos · ${origens.length} ${origens.length === 1 ? 'origem' : 'origens'}`}
      tom="chart4"
      index={index}
    >
      {origens.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/40 bg-background/30 px-4 py-8 text-center">
          <Globe className="h-5 w-5 text-muted-foreground/40" aria-hidden />
          <p className="text-[12px] font-medium text-foreground/80">Nenhuma origem registrada</p>
          <p className="max-w-[210px] text-[10.5px] leading-snug text-muted-foreground">
            A origem é preenchida no cadastro do candidato.
          </p>
        </div>
      ) : (
        <ol className="space-y-2.5" aria-label="Ranking de origens de candidatos">
          {origens.map((origem, indice) => {
            const token = PALETA_ORIGENS[indice % PALETA_ORIGENS.length];
            const Icone = iconeDaOrigem(origem.origem);
            return (
              <li key={origem.origem} className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
                    style={{
                      background: `hsl(var(--${token}) / 0.12)`,
                      color: `hsl(var(--${token}))`,
                      borderColor: `hsl(var(--${token}) / 0.28)`,
                    }}
                  >
                    <Icone className="h-3 w-3" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-foreground/85" title={origem.origem}>
                    {origem.origem}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground">
                    {origem.total}
                  </span>
                  <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                    {origem.percentual.toFixed(1).replace('.', ',')}%
                  </span>
                </div>
                <span aria-hidden className="ml-8 mt-1 block h-1 overflow-hidden rounded-full bg-border/30">
                  <span
                    className="block h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(2, origem.percentual))}%`,
                      background: `hsl(var(--${token}) / 0.85)`,
                    }}
                  />
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {origens.length > 0 && (
        <p className="mt-auto pt-2.5 text-[10px] leading-snug text-muted-foreground">
          As {Math.min(3, origens.length)} principais origens concentram{' '}
          <span className="font-semibold text-foreground">{top3.toFixed(1).replace('.', ',')}%</span> da base.
        </p>
      )}
    </AnalyticsPainel>
  );
}
