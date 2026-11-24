import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ============================================================================
 * CONTRATO DE ESTRUTURA DO PAINEL DE GEOFENCING (source-parity)
 *
 * Este teste lê o FONTE dos arquivos do painel e trava as decisões que não são
 * visíveis em teste de DOM: quais componentes do Design System cada card usa,
 * qual regra de animação foi reaproveitada e quais armadilhas já resolvidas não
 * podem voltar. Ele falha se alguém:
 *   • trocar o perímetro por raio fixo (o raio tem de vir da unidade);
 *   • trocar as barras do gráfico de distância por CSS próprio;
 *   • trocar a cascata das linhas ou a moldura do modal por implementações novas;
 *   • reintroduzir `preferCanvas` (que intercepta o ponteiro sobre o mapa);
 *   • remover a correção de `max-width` dos tiles (mapa fica sem base);
 *   • voltar a usar o componente antigo (`PontoGeoAnalytics`);
 *   • prender a dica do gráfico de distância numa coordenada fixa (`left-1/2`);
 *   • encolher os filtros do mapa ou empilhar ícone e texto do período;
 *   • devolver o preenchimento sólido às barras de distância (o padrão é
 *     contorno na cor do token + preenchimento a 20%, como no simulador);
 *   • tirar o valor de cima da coluna ou deixá-lo sair da área do gráfico;
 *   • devolver o preenchimento sólido à barra de conformidade;
 *   • voltar a deixar os controles/legendas translúcidos sobre o mapa.
 * ============================================================================
 */
const raiz = path.resolve(__dirname, '../..');
const ler = (relativo: string) => readFileSync(path.join(raiz, relativo), 'utf8');

const MAPA = ler('components/ponto/PontoGeoMapa.tsx');
const PAINEL = ler('components/ponto/PontoGeofencingPainel.tsx');
const DISTANCIA = ler('components/ponto/PontoGeoDistancia.tsx');
const REGISTROS = ler('components/ponto/PontoGeoRegistros.tsx');
const CSS = ler('index.css');
const UTIL = ler('utils/pontoGeofencing.ts');
const HOOK = ler('hooks/usePontoGeofencing.ts');
const PAGINA = ler('pages/PontoPage.tsx');

describe('Geofencing · mapa', () => {
  it('desenha o perímetro com o raio REAL da unidade e borda tracejada', () => {
    expect(MAPA).toContain('L.circle(');
    expect(MAPA).toContain('radius: unidade.raioMetros');
    expect(MAPA).toContain("dashArray: '7 7'");
    expect(MAPA).toContain('interactive: false');
  });

  it('mantém as três visualizações reais (mapa, satélite e calor)', () => {
    expect(MAPA).toContain('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(MAPA).toContain('World_Imagery/MapServer/tile/{z}/{y}/{x}');
    expect(MAPA).toContain("modo !== 'calor'");
    expect(MAPA).toContain('createRadialGradient');
  });

  it('não usa o renderer de canvas do Leaflet (intercepta o ponteiro)', () => {
    expect(MAPA).toContain('preferCanvas: false');
    expect(MAPA).not.toContain('preferCanvas: true');
  });

  it('expõe zoom, centralizar e ajustar aos registros', () => {
    expect(MAPA).toContain('rotulo="Aproximar mapa"');
    expect(MAPA).toContain('rotulo="Afastar mapa"');
    expect(MAPA).toContain('rotulo="Centralizar na unidade"');
    expect(MAPA).toContain('rotulo="Ajustar visualização aos registros"');
    expect(MAPA).toContain('fitBounds');
  });

  it('mostra a dica do marcador com os campos pedidos', () => {
    ['Data', 'Horário', 'Distância', 'Origem', 'Dentro do raio', 'Fora do raio'].forEach((rotulo) => {
      expect(MAPA).toContain(rotulo);
    });
  });
});

describe('Geofencing · CSS do mapa', () => {
  it('neutraliza o preflight do Tailwind nos tiles', () => {
    expect(CSS).toContain('.geo-mapa .leaflet-tile {');
    expect(CSS).toContain('max-width: none;');
  });

  it('respeita movimento reduzido na entrada dos marcadores', () => {
    expect(CSS).toContain('@keyframes geoMarcadorEntrada');
    expect(CSS).toMatch(/prefers-reduced-motion: reduce[\s\S]{0,180}\.geo-marcador__ponto/);
  });
});

describe('Geofencing · cards', () => {
  it('usa a peça oficial de KPI e a régua de preenchimento do sistema', () => {
    expect(PAINEL).toContain("from '@/components/dashboard/MetricCard'");
    expect(PAINEL).toContain('propsPreenchimentoBarra(');
    expect(PAINEL).toContain('bg-success');
    expect(PAINEL).toContain('Conformidade Geográfica');
  });

  it('mantém o cabeçalho e as ferramentas do card principal', () => {
    expect(PAINEL).toContain('Distribuição Geográfica de Batidas');
    expect(PAINEL).toContain('Localização dos registros em relação ao perímetro autorizado.');
    expect(PAINEL).toContain('PERIODOS_GEO');
    expect(PAINEL).toContain('Camadas');
    expect(PAINEL).toContain('MODOS_MAPA');
  });

  it('reaproveita o crescimento das barras do "Visualize o impacto"', () => {
    expect(DISTANCIA).toContain("from '@/components/ui/crescimentoBarras'");
    expect(DISTANCIA).toContain('useCrescimentoBarras(');
    expect(DISTANCIA).toContain('estiloCrescimentoBarra(');
  });

  it('desenha colunas VAZADAS, como o "Visualize o impacto" (contorno + 20%)', () => {
    // Lá: `<Cell fill={contorno} fillOpacity={0.2} stroke={contorno}
    // strokeWidth={1.5} />` com `radius={[6, 6, 0, 0]}`. Aqui, o par
    // borda/fundo do MESMO token — nunca preenchimento sólido.
    expect(DISTANCIA).toContain('border-success bg-success/20');
    expect(DISTANCIA).toContain('border-primary bg-primary/20');
    expect(DISTANCIA).toContain('border-info bg-info/20');
    expect(DISTANCIA).toContain('border-xp bg-xp/20');
    expect(DISTANCIA).toContain('border-destructive-vivid bg-destructive-vivid/20');
    expect(DISTANCIA).toContain('rounded-t-[6px]');
    expect(DISTANCIA).toContain('border-[1.5px]');
    // O preenchimento sólido antigo não pode voltar.
    expect(DISTANCIA).not.toContain("'w-full rounded-t-[4px] transition-colors'");
    expect(DISTANCIA).not.toContain("'bg-destructive-vivid'");
  });

  it('mostra o valor de cada faixa acima da coluna, dentro do plot', () => {
    // Faixa de 18 px no topo do plot: o rótulo tem respiro fixo e a grade/eixo
    // Y começam abaixo dela (`top-[18px]`), então o número nunca é cortado.
    expect(DISTANCIA).toContain('h-[18px] w-full shrink-0 items-center justify-center');
    expect(DISTANCIA).toContain('top-[18px]');
    expect(DISTANCIA).toContain('justify-between pt-[18px]');
    expect(DISTANCIA).toContain('data-coluna');
  });

  it('ancora a dica na coluna ativa (medida no DOM), sem coordenada fixa', () => {
    // A dica antiga ficava presa em `left-1/2 top-0`: aparecia sempre no mesmo
    // ponto do card, independentemente da coluna sob o ponteiro. Agora a
    // geometria vem da coluna ativa e é escrita em `left`/`top`.
    expect(DISTANCIA).toContain('useLayoutEffect(');
    expect(DISTANCIA).toContain('refColunaAtiva');
    expect(DISTANCIA).toContain('getBoundingClientRect()');
    expect(DISTANCIA).toContain('posicao.esquerda');
    expect(DISTANCIA).toContain('posicao.topo');
    expect(DISTANCIA).not.toContain('left-1/2 top-0');
    expect(DISTANCIA).not.toContain('-translate-x-1/2');
  });

  it('entra e sai com fade + 4 px de subida (mesma régua dos tooltips)', () => {
    expect(DISTANCIA).toContain("from 'framer-motion'");
    expect(DISTANCIA).toContain('AnimatePresence');
    expect(DISTANCIA).toContain('{ opacity: 0, y: 4 }');
    expect(DISTANCIA).toContain('duration: reduzido ? 0 : 0.15');
  });

  it('preenche a conformidade com gradiente success → lime na régua global', () => {
    expect(PAINEL).toContain('bg-gradient-to-r from-success to-primary');
    expect(PAINEL).toContain('propsPreenchimentoBarra(resumo.percentualConformidade');
  });

  it('mantém todos os filtros do mapa na mesma altura e o período em linha única', () => {
    // `h-9` — a altura padrão dos controles do Design System (≈45px com o root
    // do app a 125%): período, datas, camadas e modos na MESMA altura.
    expect(PAINEL).toContain('h-9 w-[184px]');
    expect(PAINEL).toContain('h-9 shrink-0 gap-2');
    // Ícone + texto dentro de um `div`: o `[&>span]:line-clamp-1` do
    // `SelectTrigger` transformava o wrapper `span` em `-webkit-box` e jogava
    // o calendário para cima do texto.
    expect(PAINEL).toContain('<div className="flex min-w-0 items-center gap-2">');
    expect(PAINEL).toContain('whitespace-nowrap');
    expect(PAINEL).toContain('inline-flex h-9 shrink-0 items-center gap-1.5');
  });

  it('usa a cascata de linhas de Candidatos e a moldura de modal de Pendências', () => {
    expect(REGISTROS).toContain('linhaTabelaVariants');
    expect(REGISTROS).toContain('linhaTabelaVariantsReduzido');
    expect(REGISTROS).toContain('CascadeDialogFrame');
    expect(REGISTROS).toContain('CASCADE_SAIDA_RAPIDA');
    expect(REGISTROS).toContain('FilterChip');
    expect(REGISTROS).toContain('ACAO_CARD_LIME');
  });
});

describe('Geofencing · contraste sobre o mapa', () => {
  it('dá superfície sólida, borda e sombra aos controles e às legendas', () => {
    expect(MAPA).toContain('PELE_SOBRE_MAPA');
    expect(MAPA).toContain('bg-background/95');
    expect(MAPA).toContain('border-muted-foreground/25');
    expect(MAPA).toContain('backdrop-blur-md');
  });

  it('mantém créditos e escala legíveis no CSS', () => {
    expect(CSS).toContain('.geo-mapa .leaflet-control-scale-line {');
    expect(CSS).toContain('background: hsl(var(--background) / 0.95);');
  });
});

describe('Geofencing · dados', () => {
  it('deriva distância e situação das coordenadas reais', () => {
    expect(UTIL).toContain('distancia_local_metros');
    expect(UTIL).toContain('distanciaEmMetros(');
    expect(UTIL).toContain('dentroRaio: distancia <= unidade.raioMetros');
    expect(UTIL).toContain('passoDaFaixa');
  });

  it('mantém o fallback de raio do registro de ponto', () => {
    expect(HOOK).toContain('RAIO_PADRAO_METROS = 200');
    expect(HOOK).toContain('listarPorPeriodo');
  });

  it('a aba Geofencing renderiza o painel novo (e não o componente antigo)', () => {
    expect(PAGINA).toContain('<PontoGeofencingPainel empresaId={empresaAtual?.id} />');
    expect(PAGINA).not.toContain('PontoGeoAnalytics');
  });
});
