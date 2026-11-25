/**
 * ============================================================================
 * MAPA DO GEOFENCING — Leaflet de verdade, dentro do card escuro do sistema.
 *
 * ── POR QUE LEAFLET (e não o `ScatterChart` que existia antes) ──────────────
 * A versão anterior desenhava as coordenadas num plano cartesiano sem ruas, com
 * uma grade decorativa: não era possível reconhecer o entorno da unidade nem
 * conferir uma batida fora do perímetro. O Leaflet (1.9.4, sem chave de API)
 * resolve isso com tiles raster e SVG, e continua sendo a opção mais leve e
 * estável para React: aqui ele é usado de forma IMPERATIVA dentro de um
 * `useEffect` — nenhuma camada de abstração nova, nenhum wrapper de terceiro.
 *
 * ── CAMADAS ────────────────────────────────────────────────────────────────
 *   • base "Mapa"    → CARTO dark (ruas e quadras, mesmo tom do tema);
 *   • base "Satélite"→ Esri World Imagery;
 *   • "Calor"        → base escura + calor em canvas (densidade de batidas),
 *                      desenhado à mão porque nenhuma lib extra é necessária;
 *   • perímetro      → `L.circle` com borda tracejada lime e preenchimento
 *                      translúcido (o RAIO REAL da unidade, nunca 100 m fixo);
 *   • batidas        → marcadores verdes (dentro) e vermelhos (fora);
 *   • unidades       → pino lime da unidade de referência + locais secundários.
 *
 * ── DICA (tooltip) ─────────────────────────────────────────────────────────
 * O Leaflet não entrega conteúdo React dentro de um marcador, então a dica é um
 * card NOSSO, posicionado com `latLngToContainerPoint()` e preso dentro da área
 * do mapa (clamp horizontal). Ela entra com fade + 4 px de subida — a MESMA
 * entrada de `DicaFluxoEntradas` (150 ms, ease-out) — e não anima posição: quem
 * se move é o marcador, não a caixa.
 *
 * ── MOVIMENTO REDUZIDO ─────────────────────────────────────────────────────
 * A entrada dos marcadores é CSS (`index.css`, guardada por
 * `html:not(.dp-force-motion)`), a mesma regra dos outros blocos do projeto.
 * A dica respeita `reduzir` (vindo de `useMovimentoReduzido()`): monta pronta.
 * ============================================================================
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Building2, Crosshair, Maximize2, Minus, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  formatarDistancia,
  rotuloDataCurta,
  rotuloOrigemGeo,
  type PontoGeografico,
  type UnidadeGeografica,
} from '@/utils/pontoGeofencing';

/** Modos de visualização do mapa (todos funcionam de verdade). */
export type ModoVisualizacaoGeo = 'mapa' | 'satelite' | 'calor';

/** Camadas que o usuário pode ligar/desligar. */
export interface CamadasGeo {
  marcadores: boolean;
  perimetro: boolean;
  unidades: boolean;
}

export interface PontoGeoMapaProps {
  pontos: PontoGeografico[];
  /** Unidade de referência (centro do perímetro). */
  unidade: UnidadeGeografica;
  /** Todas as unidades com coordenada (camada "Unidades"). */
  unidades: UnidadeGeografica[];
  camadas: CamadasGeo;
  modo: ModoVisualizacaoGeo;
  /** Movimento reduzido (`useMovimentoReduzido`). */
  reduzido: boolean;
}

/**
 * URL/atribuição das bases raster (sem chave de API).
 *
 * O CARTO "dark" foi descartado: as URLs `basemaps.cartocdn.com` passaram a
 * responder 403 ("API key required") a partir do navegador, o que enchia o mapa
 * de tarjas d'água. O Esri "Dark Gray Base" também não serve: ele só tem dados
 * até o zoom 16 ("Map data not yet available") e o perímetro de 100 m é
 * confortável no zoom ~18.
 *
 * Ficou assim:
 *   • Mapa    → tiles do OpenStreetMap (zoom até 19) ESCURECIDOS pelo filtro do
 *               `leaflet-tile-pane` (ver `index.css`): `invert + grayscale` dá o
 *               navy do tema sem provider pago;
 *   • Satélite→ Esri World Imagery (zoom até 19, imagem real sem filtro).
 * Para produção com volume alto, o caminho é configurar um provider com chave
 * (MapTiler, Stadia, Thunderforest) e trocar apenas a URL abaixo.
 */
const BASES: Record<'mapa' | 'satelite', { url: string; atribuicao: string }> = {
  mapa: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribuicao: '&copy; OpenStreetMap contributors',
  },
  satelite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    atribuicao: 'Imagens &copy; Esri, Maxar, Earthstar Geographics',
  },
};

/** Valor CRU de um token do tema (`"142 76% 40%"`), para montar `hsl(...)`. */
function tokenHsl(nome: string, alternativa: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return alternativa;
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return valor || alternativa;
}

/**
 * Zoom que faz o diâmetro do perímetro caber em ~62% da altura do mapa — assim
 * o círculo é o assunto principal em qualquer raio configurado (100 m, 200 m,
 * 500 m…) sem números mágicos por unidade.
 */
function zoomParaRaio(raioMetros: number, alturaPx: number): number {
  const raio = raioMetros > 0 ? raioMetros : 200;
  const altura = alturaPx > 0 ? alturaPx : 420;
  const metrosPorPixel = (2 * raio) / (altura * 0.62);
  // 156543,03 m/px é a resolução do zoom 0 no equador; a latitude corrige.
  const zoom = Math.log2(156_543.03392 / metrosPorPixel);
  return Math.min(19, Math.max(12, Math.round(zoom * 4) / 4));
}

/** Ícone (divIcon) da batida: ponto verde dentro do raio, vermelho fora. */
function iconeBatida(ponto: PontoGeografico, indice: number): L.DivIcon {
  return L.divIcon({
    className: cn('geo-marcador', !ponto.dentroRaio && 'geo-marcador--fora'),
    html: `<span class="geo-marcador__ponto" style="--geo-atraso:${Math.min(indice * 18, 420)}ms"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

/** Ícone (divIcon) de unidade: pino lime com o prédio, como na referência. */
function iconeUnidade(rotulo: string, secundaria: boolean): L.DivIcon {
  const tamanho = secundaria ? 26 : 34;
  const miolo = Math.round(tamanho / 2);
  const edificio = `<svg width="${miolo}" height="${miolo}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
  return L.divIcon({
    className: cn('geo-unidade', secundaria && 'geo-unidade--secundaria'),
    html: `<span class="geo-unidade__pinho" title="${rotulo}">${edificio}</span>`,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho],
  });
}

/**
 * Pele dos elementos que ficam SOBRE o mapa (controles e legendas).
 *
 * O problema que isto resolve: com `bg-background/85` + `backdrop-blur-sm`, o
 * mapa (ruas e quadras claras do tile invertido) atravessava a superfície e os
 * ícones/rótulos se misturavam ao fundo. Aqui a superfície fica praticamente
 * sólida (`/95`, ainda com blur para não virar um retângulo chapado), ganha
 * borda de contraste e uma sombra curta que a descola do mapa. Só tokens do
 * tema — nenhuma cor nova.
 */
const PELE_SOBRE_MAPA =
  'rounded-lg border border-muted-foreground/25 bg-background/95 shadow-[0_10px_24px_-16px_hsl(0_0%_0%/0.95)] backdrop-blur-md';

/** Botão de controle do mapa — a pele dos botões de ícone do sistema. */
function BotaoMapa({
  rotulo,
  onClick,
  disabled,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid h-9 w-9 place-items-center text-foreground/85 transition-colors duration-200 hover:border-primary/60 hover:bg-card hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-muted-foreground/25 disabled:hover:bg-background/95 disabled:hover:text-foreground/85',
        PELE_SOBRE_MAPA
      )}
    >
      {children}
    </button>
  );
}

/** Dica do marcador: quem bateu, quando, a que distância e em que situação. */
function DicaMarcador({
  ponto,
  x,
  y,
  reduzido,
  onFechar,
}: {
  ponto: PontoGeografico;
  x: number;
  y: number;
  reduzido: boolean;
  onFechar: () => void;
}) {
  return (
    <motion.div
      role="tooltip"
      initial={reduzido ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduzido ? 0 : 0.15, ease: 'easeOut' }}
      style={{ left: x, top: y }}
      className="pointer-events-none absolute z-[600] w-[206px] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg border border-border/60 bg-popover px-2.5 py-2 text-left shadow-[0_12px_28px_-14px_hsl(0_0%_0%/0.85)]"
    >
      <div className="flex items-start justify-between gap-1 border-b border-border/40 pb-1">
        <p className="min-w-0 truncate text-[11px] font-semibold leading-tight text-foreground">
          {ponto.colaboradorNome}
        </p>
        <button
          type="button"
          aria-label="Fechar dica"
          onClick={onFechar}
          className="pointer-events-auto -mr-0.5 -mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-1 space-y-0.5">
        <LinhaDica rotulo="Data" valor={rotuloDataCurta(ponto.data)} />
        <LinhaDica rotulo="Horário" valor={ponto.hora ?? '--:--'} />
        <LinhaDica rotulo="Distância" valor={formatarDistancia(ponto.distanciaMetros)} />
        <LinhaDica rotulo="Origem" valor={rotuloOrigemGeo(ponto.origem)} />
      </div>

      <div className="mt-1.5 flex items-center gap-1 border-t border-border/40 pt-1.5">
        <Badge variant={ponto.dentroRaio ? 'success' : 'destructive'} size="sm" className="gap-1 px-1.5 py-0">
          {ponto.dentroRaio ? 'Dentro do raio' : 'Fora do raio'}
        </Badge>
      </div>
    </motion.div>
  );
}

/** Uma linha rótulo → valor da dica (mesma hierarquia do `DicaFluxoEntradas`). */
function LinhaDica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] leading-none text-muted-foreground">{rotulo}</span>
      <span className="shrink-0 text-[10px] font-semibold leading-none tabular-nums text-foreground">{valor}</span>
    </div>
  );
}

/** Item da legenda do rodapé do mapa. */
function ItemLegenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] leading-none text-muted-foreground">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', cor)} aria-hidden="true" />
      {rotulo}
    </span>
  );
}

export function PontoGeoMapa({ pontos, unidade, unidades, camadas, modo, reduzido }: PontoGeoMapaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const grupoBatidasRef = useRef<L.LayerGroup | null>(null);
  const grupoUnidadesRef = useRef<L.LayerGroup | null>(null);
  const perimetroRef = useRef<L.Circle | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** Dica "presa" por clique: `mouseout` não pode fechá-la. */
  const dicaFixadaRef = useRef(false);
  const unidadeInicialRef = useRef(unidade);
  const [dica, setDica] = useState<{ ponto: PontoGeografico; x: number; y: number } | null>(null);

  const fecharDica = useCallback(() => {
    dicaFixadaRef.current = false;
    setDica(null);
  }, []);

  /**
   * Mostra a dica ancorada no marcador. Só é chamada a partir de eventos reais
   * do Leaflet, então já existe `map` e contêiner medido.
   */
  const mostrarDica = useCallback((marcador: L.Marker, ponto: PontoGeografico, fixar: boolean) => {
    const mapa = mapaRef.current;
    const container = containerRef.current;
    if (!mapa || !container) return;

    const posicao = mapa.latLngToContainerPoint(marcador.getLatLng());
    const largura = container.clientWidth;
    const limite = Math.max(100, largura - 100);
    dicaFixadaRef.current = fixar;
    setDica({ ponto, x: Math.min(Math.max(posicao.x, 100), limite), y: posicao.y });
  }, []);

  /* ── 1 · Cria o mapa (uma vez por montagem) ─────────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapaRef.current) return;

    const inicial = unidadeInicialRef.current;
    const mapa = L.map(container, {
      zoomControl: false,
      attributionControl: true,
      minZoom: 11,
      maxZoom: 19,
      zoomSnap: 0.25,
      zoomDelta: 0.75,
      // SVG (padrão) e NÃO `preferCanvas`: com canvas, o renderer do Leaflet cria
      // um `<canvas>` do tamanho do mapa que cobre a área e intercepta o ponteiro
      // (o botão "Calor" do cabeçalho deixava de receber clique). Com poucos
      // marcadores, SVG é mais leve para o hit-test e ainda permite estilo por CSS.
      preferCanvas: false,
    });

    mapa.attributionControl.setPrefix(false);
    // Créditos no canto SUPERIOR direito: o rodapé já tem unidade + legenda e o
    // canto inferior direito fica com a escala.
    mapa.attributionControl.setPosition('topright');
    L.control.scale({ position: 'bottomright', metric: true, imperial: false, maxWidth: 96 }).addTo(mapa);

    mapa.setView([inicial.latitude, inicial.longitude], zoomParaRaio(inicial.raioMetros, container.clientHeight), {
      animate: false,
    });

    grupoBatidasRef.current = L.layerGroup().addTo(mapa);
    grupoUnidadesRef.current = L.layerGroup().addTo(mapa);

    mapa.on('click movestart zoomstart', fecharDica);

    const observador =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            mapa.invalidateSize({ animate: false });
          });
    observador?.observe(container);

    mapaRef.current = mapa;

    return () => {
      observador?.disconnect();
      mapa.off();
      mapa.remove();
      mapaRef.current = null;
      tilesRef.current = null;
      grupoBatidasRef.current = null;
      grupoUnidadesRef.current = null;
      perimetroRef.current = null;
    };
  }, [fecharDica]);

  /* ── 2 · Base cartográfica do modo escolhido ─────────────────────────────── */
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    if (tilesRef.current) {
      mapa.removeLayer(tilesRef.current);
      tilesRef.current = null;
    }

    // No modo Calor a base continua sendo o mapa escuro (o calor é sobreposto).
    const base = BASES[modo === 'satelite' ? 'satelite' : 'mapa'];
    const camada = L.tileLayer(base.url, {
      maxZoom: 19,
      attribution: base.atribuicao,
    });
    camada.addTo(mapa);
    tilesRef.current = camada;

    return () => {
      if (mapa.hasLayer(camada)) mapa.removeLayer(camada);
    };
  }, [modo]);

  /* ── 3 · Perímetro autorizado (raio real da unidade) ────────────────────── */
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    if (perimetroRef.current) {
      mapa.removeLayer(perimetroRef.current);
      perimetroRef.current = null;
    }
    if (!camadas.perimetro) return;

    const lime = tokenHsl('--primary', '68 100% 48%');
    const circulo = L.circle([unidade.latitude, unidade.longitude], {
      radius: unidade.raioMetros,
      color: `hsl(${lime})`,
      weight: 2,
      opacity: 0.95,
      dashArray: '7 7',
      lineCap: 'round',
      fillColor: `hsl(${lime})`,
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(mapa);
    perimetroRef.current = circulo;

    return () => {
      if (perimetroRef.current && mapa.hasLayer(perimetroRef.current)) mapa.removeLayer(perimetroRef.current);
      perimetroRef.current = null;
    };
  }, [unidade.latitude, unidade.longitude, unidade.raioMetros, camadas.perimetro]);

  /* ── 4 · Marcadores das unidades ────────────────────────────────────────── */
  useEffect(() => {
    const grupo = grupoUnidadesRef.current;
    if (!grupo) return;
    grupo.clearLayers();
    if (!camadas.unidades) return;

    unidades.forEach((local) => {
      const referencia = local.id === unidade.id;
      L.marker([local.latitude, local.longitude], {
        icon: iconeUnidade(local.nome, !referencia),
        keyboard: true,
        title: local.nome,
        zIndexOffset: referencia ? 500 : 0,
        interactive: referencia,
      }).addTo(grupo);
    });
  }, [unidades, unidade.id, camadas.unidades]);

  /* ── 5 · Marcadores das batidas (verde dentro · vermelho fora) ──────────── */
  useEffect(() => {
    const grupo = grupoBatidasRef.current;
    if (!grupo) return;

    grupo.clearLayers();
    // No modo Calor os pontos viram manchas de densidade: manter os dois
    // desenhos sobrepostos só esconderia o calor.
    if (!camadas.marcadores || modo === 'calor') return;

    pontos.forEach((ponto, indice) => {
      const marcador = L.marker([ponto.latitude, ponto.longitude], {
        icon: iconeBatida(ponto, indice),
        keyboard: true,
        title: `${ponto.colaboradorNome} · ${ponto.hora ?? ''}`,
        riseOnHover: true,
        zIndexOffset: ponto.dentroRaio ? 0 : 200,
      });

      marcador.on('mouseover focus', () => mostrarDica(marcador, ponto, false));
      marcador.on('mouseout blur', () => {
        if (!dicaFixadaRef.current) setDica(null);
      });
      marcador.on('click', () => mostrarDica(marcador, ponto, true));

      marcador.addTo(grupo);
    });
  }, [pontos, camadas.marcadores, modo, mostrarDica]);

  /* ── 6 · Calor (canvas de densidade) ────────────────────────────────────── */
  useEffect(() => {
    const mapa = mapaRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!mapa || !canvas || !container) return;

    if (modo !== 'calor' || pontos.length === 0) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const success = tokenHsl('--success', '142 76% 40%');
    const alerta = tokenHsl('--destructive-vivid', '0 84% 60%');

    const desenhar = () => {
      const contexto = canvas.getContext('2d');
      if (!contexto) return;

      const largura = container.clientWidth;
      const altura = container.clientHeight;
      if (largura === 0 || altura === 0) return;

      const densidadeTela = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(largura * densidadeTela);
      canvas.height = Math.round(altura * densidadeTela);
      canvas.style.width = `${largura}px`;
      canvas.style.height = `${altura}px`;

      contexto.setTransform(densidadeTela, 0, 0, densidadeTela, 0, 0);
      contexto.clearRect(0, 0, largura, altura);
      contexto.globalCompositeOperation = 'lighter';

      // O raio da mancha acompanha o zoom: sem isso, no zoom alto cada batida
      // viraria um borrão do tamanho do mapa.
      const raio = Math.max(20, 34 * Math.pow(2, 16 - mapa.getZoom()));

      pontos.forEach((ponto) => {
        const { x, y } = mapa.latLngToContainerPoint([ponto.latitude, ponto.longitude]);
        if (x < -raio || y < -raio || x > largura + raio || y > altura + raio) return;

        const cor = ponto.dentroRaio ? success : alerta;
        const gradiente = contexto.createRadialGradient(x, y, 0, x, y, raio);
        gradiente.addColorStop(0, `hsl(${cor} / 0.55)`);
        gradiente.addColorStop(0.5, `hsl(${cor} / 0.24)`);
        gradiente.addColorStop(1, `hsl(${cor} / 0)`);

        contexto.fillStyle = gradiente;
        contexto.beginPath();
        contexto.arc(x, y, raio, 0, Math.PI * 2);
        contexto.fill();
      });

      contexto.globalCompositeOperation = 'source-over';
    };

    desenhar();
    mapa.on('move zoom resize viewreset', desenhar);

    return () => {
      mapa.off('move zoom resize viewreset', desenhar);
    };
  }, [pontos, modo]);

  /* ── 7 · Unidade de referência mudou: recentraliza no raio dela ──────────── */
  useEffect(() => {
    const mapa = mapaRef.current;
    const container = containerRef.current;
    if (!mapa || !container) return;
    mapa.setView([unidade.latitude, unidade.longitude], zoomParaRaio(unidade.raioMetros, container.clientHeight), {
      animate: false,
    });
  }, [unidade.id, unidade.latitude, unidade.longitude, unidade.raioMetros]);

  /* ── 8 · Controles (zoom, centralizar, ajustar aos registros) ───────────── */
  const aproximar = () => mapaRef.current?.zoomIn();
  const afastar = () => mapaRef.current?.zoomOut();

  const centralizar = () => {
    const mapa = mapaRef.current;
    const container = containerRef.current;
    if (!mapa || !container) return;
    mapa.setView([unidade.latitude, unidade.longitude], zoomParaRaio(unidade.raioMetros, container.clientHeight), {
      animate: true,
      duration: 0.4,
    });
  };

  const ajustarAosRegistros = () => {
    const mapa = mapaRef.current;
    if (!mapa || pontos.length === 0) return;

    const limites = L.latLngBounds(pontos.map((ponto) => [ponto.latitude, ponto.longitude] as [number, number]));
    limites.extend([unidade.latitude, unidade.longitude]);
    // Um único ponto gera um bounds degenerado (zoom máximo): centraliza nele.
    if (!limites.isValid() || limites.getNorthEast().equals(limites.getSouthWest())) {
      mapa.setView(limites.getCenter(), 17, { animate: true, duration: 0.4 });
      return;
    }
    mapa.fitBounds(limites, { padding: [48, 48], maxZoom: 18, animate: true, duration: 0.5 });
  };

  return (
    <div className={cn('geo-mapa relative h-full w-full', modo === 'satelite' && 'geo-mapa--satelite')}>
      <div className="h-full w-full" ref={containerRef} />

      {/* Calor: canvas sobreposto aos tiles, abaixo dos controles e da dica. */}
      {modo === 'calor' && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[401] h-full w-full mix-blend-screen"
        />
      )}

      {/* Controles de navegação (mesmo estilo dos botões de ícone do sistema). */}
      <div className="absolute left-3 top-3 z-[500] flex flex-col gap-1.5">
        <BotaoMapa rotulo="Aproximar mapa" onClick={aproximar}>
          <Plus className="h-4 w-4" />
        </BotaoMapa>
        <BotaoMapa rotulo="Afastar mapa" onClick={afastar}>
          <Minus className="h-4 w-4" />
        </BotaoMapa>
        <BotaoMapa rotulo="Centralizar na unidade" onClick={centralizar}>
          <Crosshair className="h-4 w-4" />
        </BotaoMapa>
        <BotaoMapa
          rotulo="Ajustar visualização aos registros"
          onClick={ajustarAosRegistros}
          disabled={pontos.length === 0}
        >
          <Maximize2 className="h-4 w-4" />
        </BotaoMapa>
      </div>

      {/* Rodapé: unidade de referência + legenda (o canto direito é da escala). */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] flex flex-wrap items-end justify-between gap-2 pr-24">
        <div className={cn('pointer-events-auto flex items-center gap-2 px-2.5 py-1.5', PELE_SOBRE_MAPA)}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
            <Building2 className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-semibold leading-tight text-foreground">
              {unidade.nome}
            </span>
            <span className="block text-[10px] leading-tight text-muted-foreground">
              Raio: {formatarDistancia(unidade.raioMetros)}
            </span>
          </span>
        </div>

        <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5', PELE_SOBRE_MAPA)}>
          <ItemLegenda cor="bg-success" rotulo={`Dentro do raio (${pontos.filter((p) => p.dentroRaio).length})`} />
          <ItemLegenda
            cor="bg-destructive-vivid"
            rotulo={`Fora do raio (${pontos.filter((p) => !p.dentroRaio).length})`}
          />
          {camadas.perimetro && (
            <span className="inline-flex items-center gap-1.5 text-[10px] leading-none text-muted-foreground">
              <span className="h-0 w-4 shrink-0 border-t-2 border-dashed border-primary" aria-hidden="true" />
              Perímetro ({formatarDistancia(unidade.raioMetros)})
            </span>
          )}
        </div>
      </div>

      {dica && <DicaMarcador ponto={dica.ponto} x={dica.x} y={dica.y} reduzido={reduzido} onFechar={fecharDica} />}
    </div>
  );
}
