import { Filter } from 'lucide-react';
import { ETAPAS } from './pipelineEtapas';
import { formatarPercentual, type ConversaoFunil, type ItemFunil } from './analyticsComum';
import { AnalyticsPainel, ChipContagem } from './AnalyticsPainel';

/**
 * FUNIL DE RECRUTAMENTO — volume e conversão por etapa.
 *
 * Desktop: cinco chevrons encaixados nas cores reais do Pipeline (os mesmos
 * tokens de `pipelineVisual`). Mobile: a mesma leitura em linhas com faixa
 * lateral, porque cinco rótulos não cabem lado a lado no viewport estreito.
 *
 * O percentual de cada etapa é a PARTICIPAÇÃO no volume ATUAL de Triagem — uma
 * foto do pipeline, não o acompanhamento de um grupo que entrou junto (com a
 * fila já triada, uma etapa posterior pode ter mais gente que Triagem). A
 * conversão etapa → etapa aparece em faixa própria abaixo.
 */
function percentualCompacto(valor: number): string {
  return formatarPercentual(valor, Number.isInteger(valor) ? 0 : 1);
}

function corDaEtapa(token: string, alpha = 1): string {
  return `hsl(var(--${token}) / ${alpha})`;
}

/** Rótulo curto no chevron — o nome completo fica no `title` e na conversão. */
const ROTULO_CHEVRON: Record<string, string> = {
  triagem: 'Triagem',
  entrevista: 'Entrevista',
  teste: 'Teste',
  proposta: 'Proposta',
  contratado: 'Contratado',
};

function recorteChevron(indice: number, total: number): string | undefined {
  if (total <= 1) return undefined;
  if (indice === 0) {
    return 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)';
  }
  if (indice === total - 1) {
    return 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)';
  }
  return 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)';
}

export function AnalyticsFunil({
  funil,
  conversoes,
  total,
  fora,
  index,
}: {
  funil: ItemFunil[];
  conversoes: ConversaoFunil[];
  total: number;
  /** Candidaturas fora das cinco etapas — declaradas, nunca descartadas. */
  fora: number;
  index: number;
}) {
  const entrada = funil[0]?.total ?? 0;
  const contratados = funil[funil.length - 1]?.total ?? 0;
  const tokenPorEtapa = new Map(ETAPAS.map((etapa) => [etapa.id, etapa.token]));
  // A participação só existe com alguém em Triagem; sem isso, o percentual
  // seria 0% sobre denominador vazio — mostramos a ausência, não um número.
  const temEntrada = entrada > 0;
  // Idem para a conversão: só compara quem tem etapa anterior povoada.
  const conversoesComBase = conversoes.filter((_, indice) => (funil[indice]?.total ?? 0) > 0);
  const maiorRetencao = [...conversoesComBase].sort((a, b) => b.percentual - a.percentual)[0];
  const maiorQueda = [...conversoesComBase].sort((a, b) => a.percentual - b.percentual)[0];

  return (
    <AnalyticsPainel
      icon={Filter}
      title="Funil de recrutamento"
      subtitle="Volume por etapa e conversão entre as etapas"
      tom="info"
      index={index}
      action={
        <ChipContagem>
          {total} {total === 1 ? 'candidatura' : 'candidaturas'}
        </ChipContagem>
      }
    >
      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/40 bg-background/30 px-4 py-8 text-center">
          <p className="text-[12px] font-medium text-foreground/80">Nenhuma candidatura no funil</p>
          <p className="max-w-[260px] text-[10.5px] leading-snug text-muted-foreground">
            Assim que houver candidaturas, o volume e a conversão de cada etapa aparecem aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop — chevrons por etapa */}
          <div className="hidden gap-1.5 sm:flex" role="list" aria-label="Funil por etapa">
            {funil.map((item, indice) => {
              const token = tokenPorEtapa.get(item.id) ?? 'primary';
              return (
                <div
                  key={item.id}
                  role="listitem"
                  className="relative min-w-0 flex-1"
                  title={`${item.label}: ${item.total} ${
                    temEntrada
                      ? `candidaturas (${percentualCompacto(item.percentual)} do volume atual em Triagem)`
                      : 'candidaturas'
                  }`}
                >
                  <div
                    className="relative flex h-[88px] flex-col justify-center px-2 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]"
                    style={{
                      clipPath: recorteChevron(indice, funil.length),
                      backgroundImage: `linear-gradient(135deg, ${corDaEtapa(token, 0.3)}, ${corDaEtapa(token, 0.07)})`,
                    }}
                  >
                    <span
                      className="truncate text-[8px] font-semibold uppercase leading-tight tracking-normal"
                      style={{ color: corDaEtapa(token) }}
                    >
                      {ROTULO_CHEVRON[item.id] ?? item.label}
                    </span>
                    <span className="mt-1 font-display text-[22px] font-semibold leading-none text-foreground">
                      {item.total}
                    </span>
                    <span className="mt-1 text-[9px] leading-none text-muted-foreground">
                      {temEntrada ? `${percentualCompacto(item.percentual)} vs. Triagem` : 'sem volume em Triagem'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile — mesmas etapas em linhas, com faixa lateral na cor da etapa */}
          <p className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground/70 sm:hidden">
            Participação no volume atual em Triagem
          </p>
          <ol className="space-y-1.5 sm:hidden" aria-label="Funil por etapa">
            {funil.map((item) => {
              const token = tokenPorEtapa.get(item.id) ?? 'primary';
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-2.5 py-2"
                >
                  <span
                    aria-hidden
                    className="h-6 w-1 shrink-0 rounded-full"
                    style={{ background: corDaEtapa(token) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/85">{item.label}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {temEntrada ? percentualCompacto(item.percentual) : '—'}
                  </span>
                  <span className="w-6 shrink-0 text-right font-display text-sm font-semibold tabular-nums">
                    {item.total}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Conversão etapa → etapa */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                Conversão entre etapas
              </p>
              <span className="text-[9px] leading-none text-muted-foreground/70">etapa seguinte ÷ anterior</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {conversoes.map((conversao, indice) => {
                const etapaDestino = funil[indice + 1];
                const token = etapaDestino ? (tokenPorEtapa.get(etapaDestino.id) ?? 'primary') : 'primary';
                const comBase = (funil[indice]?.total ?? 0) > 0;
                return (
                  <div
                    key={`${conversao.de}-${conversao.para}`}
                    className="min-w-0 rounded-lg border border-border/40 bg-background/40 px-2 py-1.5"
                    title={`${conversao.de} → ${conversao.para}: ${
                      comBase ? formatarPercentual(conversao.percentual) : 'sem candidatura na etapa anterior'
                    }`}
                  >
                    <p className="min-h-[24px] text-[9.5px] leading-tight text-muted-foreground">
                      {conversao.de} → {conversao.para}
                    </p>
                    <p className="mt-0.5 font-display text-[13px] font-semibold leading-none tabular-nums">
                      {comBase ? percentualCompacto(conversao.percentual) : '—'}
                    </p>
                    <span aria-hidden className="mt-1 block h-1 overflow-hidden rounded-full bg-border/30">
                      <span
                        className="block h-full rounded-full transition-all duration-500"
                        style={{
                          width:
                            comBase && conversao.percentual > 0
                              ? `${Math.min(100, Math.max(2, conversao.percentual))}%`
                              : '0%',
                          background: corDaEtapa(token, 0.85),
                        }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Destaques do funil — só com passagem medível (etapa anterior povoada). */}
          {maiorRetencao && maiorQueda && (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="min-w-0 rounded-lg border border-success/20 bg-success/5 px-2 py-1.5">
                <p className="text-[8.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Maior retenção
                </p>
                <p className="mt-0.5 text-[9.5px] leading-tight text-foreground/80">
                  {maiorRetencao.de} → {maiorRetencao.para}
                </p>
                <p className="mt-0.5 font-display text-[11px] font-semibold leading-none text-success">
                  {percentualCompacto(maiorRetencao.percentual)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-warning/20 bg-warning/5 px-2 py-1.5">
                <p className="text-[8.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Maior queda
                </p>
                <p className="mt-0.5 text-[9.5px] leading-tight text-foreground/80">
                  {maiorQueda.de} → {maiorQueda.para}
                </p>
                <p className="mt-0.5 font-display text-[11px] font-semibold leading-none text-warning">
                  {percentualCompacto(maiorQueda.percentual)}
                </p>
              </div>
            </div>
          )}

          {/* Leitura do volume — ocupa a base do painel sem área vazia. */}
          <p className="mt-auto pt-2.5 text-[10px] leading-snug text-muted-foreground">
            {temEntrada ? (
              <>
                <span className="font-semibold text-foreground">{contratados}</span> em Contratado e{' '}
                <span className="font-semibold text-foreground">{entrada}</span> em Triagem agora — foto atual do
                pipeline, não o percurso de um mesmo grupo de candidatos.
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">{contratados}</span> em Contratado · sem candidatura em
                Triagem, a participação no volume de entrada não é calculável.
              </>
            )}
            {fora > 0 && (
              <>
                {' '}
                <span className="font-semibold text-foreground">{fora}</span>{' '}
                {fora === 1 ? 'candidatura' : 'candidaturas'} fora das etapas monitoradas.
              </>
            )}
          </p>
        </>
      )}
    </AnalyticsPainel>
  );
}
