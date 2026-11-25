/**
 * ============================================================================
 * PAINEL DE GEOFENCING (Controle de Ponto → Gestão da Equipe → Geofencing).
 *
 * Estrutura da referência aprovada, de cima para baixo:
 *   1. quatro KPIs horizontais (`MetricCard`, a peça oficial de KPI do sistema);
 *   2. coluna esquerda (~64%) com o mapa + filtros/período/camadas/visualização;
 *   3. coluna direita (~36%) com Conformidade, Distribuição por Distância e
 *      Registros Recentes.
 *
 * ── COERÊNCIA DOS NÚMEROS ──────────────────────────────────────────────────
 * KPIs, mapa, gráfico e tabela saem TODOS do mesmo `pontos` (calculado uma vez
 * por `montarPontos` a partir das batidas do período). Não existe contador
 * paralelo: mudar o período muda uma única série e todos os cards acompanham.
 *
 * ── DADOS REAIS x DEMONSTRAÇÃO ─────────────────────────────────────────────
 * A preferência é sempre o dado real (`batidas_ponto` do período + raio de
 * `configuracoes_ponto` + coordenada de `locais_trabalho`). Quando o período não
 * tem NENHUM registro e o mock visual está ligado (`VITE_PONTO_MOCK`), o painel
 * cai na vitrine de `src/mocks/pontoGeoMock.ts` e AVISA: selo "Demonstração" no
 * cabeçalho do mapa. Nunca há mistura das duas fontes.
 *
 * ── MOCK VISUAL — ver src/mocks/pontoGeoMock.ts ────────────────────────────
 * ============================================================================
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleSlash,
  Crosshair,
  Flame,
  Layers,
  Map as MapIcon,
  MapPin,
  MapPinOff,
  Navigation,
  Satellite,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DatePicker } from '@/components/ui/date-picker';
import { Progress } from '@/components/ui/progress';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { propsPreenchimentoBarra } from '@/components/ui/progressMotion';
import { MOTION_REDUCED_MODE, useMovimentoReduzido } from '@/lib/motionMode';
import { usePontoGeofencing } from '@/hooks/usePontoGeofencing';
import { PontoGeoMapa, type CamadasGeo, type ModoVisualizacaoGeo } from '@/components/ponto/PontoGeoMapa';
import { PontoGeoDistancia } from '@/components/ponto/PontoGeoDistancia';
import { PontoGeoRegistros } from '@/components/ponto/PontoGeoRegistros';
import { UNIDADE_GEO_DEMO, batidasGeoDemonstrativas, isPontoGeoMockEnabled } from '@/mocks/pontoGeoMock';
import {
  PERIODOS_GEO,
  faixasDeDistancia,
  formatarDistancia,
  intervaloAnterior,
  intervaloDoPeriodo,
  montarPontos,
  registrosRecentes,
  resumoGeo,
  variacaoPercentual,
  type BatidaGeograficaCrua,
  type IntervaloGeo,
  type PeriodoGeo,
  type UnidadeGeografica,
} from '@/utils/pontoGeofencing';
import { cn } from '@/lib/utils';

export interface PontoGeofencingPainelProps {
  /** Empresa atual (isolamento de tenant das consultas). */
  empresaId?: string;
}

/** Camadas ligadas por padrão (todas as três, como na referência). */
const CAMADAS_INICIAIS: CamadasGeo = { marcadores: true, perimetro: true, unidades: true };

/** Mínimo de coordenadas para o modo Calor fazer sentido. */
const MINIMO_PONTOS_CALOR = 5;

/** Modos de visualização do mapa, na ordem da referência. */
const MODOS_MAPA = [
  { valor: 'mapa', rotulo: 'Mapa', Icone: MapIcon },
  { valor: 'satelite', rotulo: 'Satélite', Icone: Satellite },
  { valor: 'calor', rotulo: 'Calor', Icone: Flame },
] as const;

/** Recorte de um período (datas locais `yyyy-MM-dd`, inclusive nas pontas). */
function recortarPeriodo(linhas: readonly BatidaGeograficaCrua[], janela: IntervaloGeo): BatidaGeograficaCrua[] {
  return linhas.filter((linha) => {
    const data = String(linha.data ?? '');
    return data >= janela.inicio && data <= janela.fim;
  });
}

export function PontoGeofencingPainel({ empresaId }: PontoGeofencingPainelProps) {
  const reduzido = useMovimentoReduzido();
  const [periodo, setPeriodo] = useState<PeriodoGeo>('7d');
  const [personalizado, setPersonalizado] = useState<IntervaloGeo | null>(null);
  const [camadas, setCamadas] = useState<CamadasGeo>(CAMADAS_INICIAIS);
  const [modo, setModo] = useState<ModoVisualizacaoGeo>('mapa');

  /** Intervalo efetivo: período fixo ou o personalizado (com as pontas em ordem). */
  const intervalo = useMemo<IntervaloGeo>(() => {
    if (periodo !== 'personalizado') return intervaloDoPeriodo(periodo);
    if (personalizado?.inicio && personalizado?.fim) {
      return personalizado.inicio <= personalizado.fim
        ? personalizado
        : { inicio: personalizado.fim, fim: personalizado.inicio };
    }
    return intervaloDoPeriodo('7d');
  }, [periodo, personalizado]);

  const intervaloComparativo = useMemo(() => intervaloAnterior(intervalo), [intervalo]);
  const { unidades, unidade, raioMetros, batidas, batidasAnteriores, carregando, erro } = usePontoGeofencing(
    empresaId,
    intervalo,
    intervaloComparativo
  );

  const mockLigado = isPontoGeoMockEnabled();
  const demonstracao = mockLigado && !carregando && batidas.length === 0;

  /** Unidade do mapa: a real (com coordenada) ou a da vitrine demonstrativa. */
  const unidadeEfetiva: UnidadeGeografica | null = useMemo(() => {
    if (unidade) return unidade;
    if (demonstracao) return UNIDADE_GEO_DEMO;
    return null;
  }, [unidade, demonstracao]);

  /** Recorte do período — vale para a fonte real E para a vitrine. */
  const cruas = useMemo(() => {
    const fonte = demonstracao ? batidasGeoDemonstrativas() : batidas;
    return recortarPeriodo(fonte, intervalo);
  }, [demonstracao, batidas, intervalo]);

  const cruasAnteriores = useMemo(() => {
    const fonte = demonstracao ? batidasGeoDemonstrativas() : batidasAnteriores;
    return recortarPeriodo(fonte, intervaloComparativo);
  }, [demonstracao, batidasAnteriores, intervaloComparativo]);

  const pontos = useMemo(() => (unidadeEfetiva ? montarPontos(cruas, unidadeEfetiva) : []), [cruas, unidadeEfetiva]);
  const pontosAnteriores = useMemo(
    () => (unidadeEfetiva ? montarPontos(cruasAnteriores, unidadeEfetiva) : []),
    [cruasAnteriores, unidadeEfetiva]
  );

  const resumo = useMemo(() => resumoGeo(pontos), [pontos]);
  const resumoAnterior = useMemo(() => resumoGeo(pontosAnteriores), [pontosAnteriores]);
  const faixas = useMemo(
    () => faixasDeDistancia(pontos, unidadeEfetiva?.raioMetros ?? raioMetros),
    [pontos, unidadeEfetiva, raioMetros]
  );
  const registros = useMemo(() => registrosRecentes(pontos), [pontos]);

  const rotuloPeriodo = PERIODOS_GEO.find((opcao) => opcao.valor === periodo)?.rotulo ?? 'Últimos 7 dias';
  const descricaoPeriodo =
    periodo === 'personalizado'
      ? `${intervalo.inicio.split('-').reverse().join('/')} a ${intervalo.fim.split('-').reverse().join('/')}`
      : rotuloPeriodo.toLowerCase();
  const chaveCascata = `${intervalo.inicio}-${intervalo.fim}`;

  /** Variação de cada KPI contra o período anterior (nunca inventada). */
  const variacaoTotal = variacaoPercentual(resumo.total, resumoAnterior.total);
  const variacaoDentro = variacaoPercentual(resumo.dentro, resumoAnterior.dentro);
  const variacaoFora = variacaoPercentual(resumo.fora, resumoAnterior.fora);
  const variacaoMedia = variacaoPercentual(
    Math.round(resumo.distanciaMedia),
    Math.round(resumoAnterior.distanciaMedia)
  );

  const percentualConformidade = Math.round(resumo.percentualConformidade);
  const percentualFora = Math.round(resumo.percentualFora);
  const semVariacao = 'sem variação no período';

  const calibrarModo = (proximo: ModoVisualizacaoGeo) => {
    // Calor precisa de massa de pontos; sem isso o botão fica desabilitado.
    if (proximo === 'calor' && pontos.length < MINIMO_PONTOS_CALOR) return;
    setModo(proximo);
  };

  /* ── Estados sem mapa ───────────────────────────────────────────────────── */
  if (carregando && !unidadeEfetiva) {
    return (
      <Card className="rounded-2xl border border-border/40 shadow-xs">
        <CardContent className="flex min-h-[200px] items-center justify-center gap-2 text-xs text-muted-foreground">
          <Crosshair className="h-4 w-4 animate-pulse" />
          Carregando dados de geolocalização…
        </CardContent>
      </Card>
    );
  }

  if (!unidadeEfetiva) {
    return (
      <Card className="rounded-2xl border border-border/40 shadow-xs">
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-warning/10 text-warning">
            <ShieldQuestion className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-foreground">Localização da unidade não configurada</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            O mapa precisa da coordenada da unidade (Locais de Trabalho) e do raio autorizado (Configurações de Ponto).
            {erro ? ' Também houve falha ao consultar os registros do período.' : ''}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── 1 · Quatro KPIs horizontais ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total de batidas"
          value={resumo.total}
          icon={MapPin}
          tone="info"
          trend={
            variacaoTotal === null || variacaoTotal === 0
              ? undefined
              : { value: variacaoTotal, label: 'vs. período anterior' }
          }
          description={variacaoTotal === 0 ? `${descricaoPeriodo} · ${semVariacao}` : descricaoPeriodo}
          index={0}
        />
        <MetricCard
          title="Dentro do perímetro"
          value={resumo.dentro}
          icon={ShieldCheck}
          tone="success"
          trend={
            variacaoDentro === null || variacaoDentro === 0
              ? undefined
              : { value: variacaoDentro, label: 'vs. período anterior' }
          }
          description={`${percentualConformidade}% do total`}
          index={1}
        />
        <MetricCard
          title="Fora do perímetro"
          value={resumo.fora}
          icon={MapPinOff}
          tone="destructive"
          trend={
            variacaoFora === null || variacaoFora === 0
              ? undefined
              : { value: variacaoFora, label: 'vs. período anterior' }
          }
          description={
            variacaoFora === 0 ? `${percentualFora}% do total · sem variação` : `${percentualFora}% do total`
          }
          index={2}
        />
        <MetricCard
          title="Distância média"
          value={formatarDistancia(resumo.distanciaMedia)}
          icon={Navigation}
          tone="primary"
          trend={
            variacaoMedia === null || variacaoMedia === 0
              ? undefined
              : { value: variacaoMedia, label: 'vs. período anterior' }
          }
          description={variacaoMedia === 0 ? `do perímetro · ${semVariacao}` : 'do perímetro autorizado'}
          index={3}
        />
      </div>

      {/* ── 2 · Mapa (64%) + cards de apoio (36%) ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.78fr)_minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/40 shadow-xs">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 space-y-0 border-b border-border/40 bg-muted/30 px-4 py-2.5">
            <div className="min-w-0 flex-1 basis-[230px]">
              <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-display">
                <MapIcon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">Distribuição Geográfica de Batidas</span>
                {demonstracao && (
                  <Badge
                    variant="warning"
                    size="sm"
                    className="shrink-0 border-warning/30 bg-warning/10 px-1.5 py-0 text-[9px] text-warning"
                    title="Sem registros reais no período: o mapa mostra a série demonstrativa de src/mocks/pontoGeoMock.ts"
                  >
                    Demonstração
                  </Badge>
                )}
              </CardTitle>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Localização dos registros em relação ao perímetro autorizado.
              </p>
            </div>

            {/* Ferramentas do mapa — TODAS na mesma altura (`h-9`: a altura
                padrão dos controles do Design System, que com o root do app a
                125% rende ~45px) e com o mesmo respiro horizontal (`px-3.5`).

                O período é o caso delicado: o `SelectTrigger` do Design System
                aplica `[&>span]:line-clamp-1` nos filhos DIRETOS, e
                `line-clamp-1` grava `display: -webkit-box` — o que ANULAVA o
                `display:flex` do wrapper e empilhava o calendário ACIMA do
                texto (a regra de filho direto tem especificidade maior que a
                classe). Por isso o ícone + texto vão dentro de um `div` (que
                não é alcançado pelo seletor) com `flex items-center gap-2` e
                `whitespace-nowrap`: linha única, sem quebra. */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={periodo} onValueChange={(valor) => setPeriodo(valor as PeriodoGeo)}>
                <SelectTrigger
                  aria-label="Período dos registros"
                  className="h-9 w-[184px] shrink-0 gap-2 whitespace-nowrap rounded-lg border-border/60 bg-background/70 px-3.5 text-[11px] font-medium"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <SelectValue className="whitespace-nowrap" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PERIODOS_GEO.map((opcao) => (
                    <SelectItem key={opcao.valor} value={opcao.valor} className="text-xs">
                      {opcao.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {periodo === 'personalizado' && (
                <div className="flex items-center gap-1.5">
                  <DatePicker
                    value={intervalo.inicio}
                    onChange={(valor) => setPersonalizado({ inicio: valor, fim: intervalo.fim })}
                    placeholder="De"
                    className="h-9 w-[124px] rounded-lg border-border/60 bg-background/70 px-3.5 text-[11px]"
                  />
                  <span className="text-[10px] text-muted-foreground">até</span>
                  <DatePicker
                    value={intervalo.fim}
                    onChange={(valor) => setPersonalizado({ inicio: intervalo.inicio, fim: valor })}
                    placeholder="Até"
                    className="h-9 w-[124px] rounded-lg border-border/60 bg-background/70 px-3.5 text-[11px]"
                  />
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 gap-2 rounded-lg border-border/60 bg-background/70 px-3.5 text-[11px] font-medium"
                  >
                    <Layers className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    Camadas
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[210px]">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Exibir no mapa
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(
                    [
                      { chave: 'marcadores', rotulo: 'Marcadores de batidas' },
                      { chave: 'perimetro', rotulo: 'Perímetro autorizado' },
                      { chave: 'unidades', rotulo: 'Unidades' },
                    ] as const
                  ).map((item) => (
                    <DropdownMenuItem
                      key={item.chave}
                      className="gap-2 text-xs"
                      onSelect={(evento) => {
                        evento.preventDefault();
                        setCamadas((atual) => ({ ...atual, [item.chave]: !atual[item.chave] }));
                      }}
                    >
                      <Check
                        className={cn('h-3.5 w-3.5 shrink-0', camadas[item.chave] ? 'text-primary' : 'opacity-0')}
                      />
                      {item.rotulo}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Visualização: mesma altura dos demais filtros, área clicável
                  maior (px-3) e troca de estado com transição curta. O lime
                  segue sendo o estado selecionado. */}
              <div
                className="flex flex-wrap items-center gap-1.5"
                role="group"
                aria-label="Modo de visualização do mapa"
              >
                {MODOS_MAPA.map(({ valor, rotulo, Icone }) => {
                  const ativo = modo === valor;
                  const indisponivel = valor === 'calor' && pontos.length < MINIMO_PONTOS_CALOR;
                  return (
                    <button
                      key={valor}
                      type="button"
                      aria-label={`Visualização: ${rotulo}`}
                      aria-pressed={ativo}
                      disabled={indisponivel}
                      title={
                        indisponivel
                          ? `Calor disponível a partir de ${MINIMO_PONTOS_CALOR} registros com coordenada`
                          : `Visualização: ${rotulo}`
                      }
                      onClick={() => calibrarModo(valor)}
                      className={cn(
                        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium transition-colors duration-200',
                        ativo
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                        indisponivel && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground'
                      )}
                    >
                      <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {rotulo}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0">
            <div className="h-[320px] sm:h-[400px] xl:h-full xl:min-h-[440px]">
              <PontoGeoMapa
                pontos={pontos}
                unidade={unidadeEfetiva}
                unidades={demonstracao ? [UNIDADE_GEO_DEMO] : unidades}
                camadas={camadas}
                modo={modo}
                reduzido={reduzido}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-3">
          {/* Conformidade Geográfica — barra horizontal com o success do tema */}
          <Card className="overflow-hidden rounded-2xl border border-border/40 shadow-xs">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-display text-foreground">Conformidade Geográfica</p>
                    <p className="text-[11px] leading-tight text-muted-foreground">
                      Registros dentro do perímetro autorizado
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={percentualConformidade >= 95 ? 'success' : 'warning'}
                    size="sm"
                    className="gap-1 px-1.5 py-0 text-[9px]"
                  >
                    <Check className="h-2.5 w-2.5" />
                    {percentualConformidade >= 95 ? 'Regular' : 'Atenção'}
                  </Badge>
                  <span className="text-2xl font-display font-semibold leading-none tabular-nums text-foreground">
                    {percentualConformidade}%
                  </span>
                </div>
              </div>

              {/* Preenchimento da esquerda para a direita com a régua global das
                  barras de progresso (1200 ms, ease-out; movimento reduzido
                  monta cheia). `resumo.percentualConformidade` preserva as
                  decimais. O gradiente vai do verde semântico (`--success`) no
                  início ao lime da marca (`--primary`) no fim — mesmos tokens,
                  sem cor nova. */}
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                <motion.div
                  {...propsPreenchimentoBarra(resumo.percentualConformidade, { reduzir: reduzido, ease: 'easeOut' })}
                  className="h-full rounded-full bg-gradient-to-r from-success to-primary"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] leading-none">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Check className="h-3 w-3 shrink-0 text-success" />
                  <span className="font-semibold tabular-nums text-foreground">{resumo.dentro}</span>
                  {resumo.dentro === 1 ? 'registro conforme' : 'registros conformes'}
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <CircleSlash className="h-3 w-3 shrink-0 text-destructive-vivid" />
                  <span className="font-semibold tabular-nums text-foreground">{resumo.fora}</span>
                  {resumo.fora === 1 ? 'irregularidade' : 'irregularidades'}
                </span>
              </div>
            </CardContent>
          </Card>

          <PontoGeoDistancia faixas={faixas} total={resumo.total} reduzido={reduzido} />

          <PontoGeoRegistros
            pontos={pontos}
            rotuloPeriodo={rotuloPeriodo}
            chave={chaveCascata}
            reduzido={reduzido}
            limite={5}
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </div>
  );
}
