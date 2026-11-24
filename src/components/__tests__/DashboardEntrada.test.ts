import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Prova OBJETIVA da entrada dos cards do sistema. Hoje existe UMA régua:
 *
 *  • Dashboard Principal (`ENTRADA_DASHBOARD`): 14px de subida, 520ms por card,
 *    120ms entre inícios, `ease-out` — os MESMOS números da régua global;
 *    ausência de escala/bounce; paridade JS↔CSS; ordem de leitura; dois grupos
 *    independentes (KPI simultâneo × conteúdo em cascata) e a sincronização
 *    entre eles.
 *  • RÉGUA GLOBAL (`ui/entradaGlobal.ts` → `CONFIG_ENTRADA_CARD_GLOBAL`): 14px,
 *    520ms, 120ms, em UMA fila única — o 1º KPI Card e o 1º card de conteúdo da
 *    tela partem no mesmo instante (slot 0) e o resto entra alternando as duas
 *    faixas, sem animação duplicada dentro dos cards. É a régua do Dashboard
 *    Executivo, que `ui/entrada-cards.tsx` (Pesquisas, Treinamentos,
 *    Recrutamento, Admissões, Desligamentos…), o Dashboard Principal e o
 *    `cardVariants` de `MetricCard.tsx` passaram a consumir.
 *
 * Fecha com a garantia de ESCOPO: `cardVariants` (de `MetricCard.tsx`) já É a
 * régua global e `avaliacao/entradaCards.tsx` passou a ser uma PONTE para ela em
 * 29/10/2026 (padronização autorizada pelo usuário) — o isolamento por atributo
 * `desempenho-congelado`, com squash de 0,7 s e cascata de 60 ms, foi removido.
 */
import {
  ENTRADA_DASHBOARD,
  INDICE_ENTRADA_KPI,
  KEYFRAMES_ENTRADA_DASHBOARD,
  MAX_ENTRADA_DASHBOARD,
  atrasoEntradaDashboard,
  entradaCardDashboard,
  entradaDashboard,
  ordenarPorLeitura,
  ESCOPO_ENTRADA_DASHBOARD,
  propsEscopoEntradaDashboard,
  ATTR_GRUPO_ENTRADA,
  GRUPO_ENTRADA_CONTEUDO,
  GRUPO_ENTRADA_KPI,
  chaveDoGrupo,
  intervaloDoGrupo,
  propsGrupoEntradaDashboard,
} from '../dashboard/entradaDashboard';
import {
  CONFIG_ENTRADA_CARD_GLOBAL,
  MAX_SLOT_ENTRADA_CARD_GLOBAL,
  atrasoDoSlot,
  atrasoEntradaCardGlobal,
  criarVariantesEntradaCard,
  entradaCardGlobal,
  entradaConteudoGlobal,
  entradaKpiGlobal,
  propsEntradaGlobal,
  slotConteudoIntercalado,
  slotKpiIntercalado,
  slotSequencial,
} from '../ui/entradaGlobal';
import { cardVariants } from '../dashboard/MetricCard';

/** `visible` é uma função do índice (`custom`) — este helper só a tipa. */
const visivelPara = (indice: number) =>
  (entradaDashboard.visible as (i: number) => Record<string, unknown>)(indice) as {
    opacity: number;
    y: number;
    scale?: number;
    transition: { duration: number; delay: number; ease: number[]; type?: string };
  };

const cssDoApp = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
const paginaDoDashboard = fs.readFileSync(
  path.resolve(process.cwd(), 'src/pages/DashboardPage.tsx'),
  'utf8'
);
/** Fonte do Dashboard Executivo — a rota onde o conteúdo esperava os KPIs. */
const paginaExecutiva = fs.readFileSync(
  path.resolve(process.cwd(), 'src/pages/DashboardExecutivoPage.tsx'),
  'utf8'
);

describe('entrada dos cards dos dashboards', () => {
  it('começa 14px abaixo e transparente, termina exatamente na posição original', () => {
    expect(entradaDashboard.hidden).toEqual({ opacity: 0, y: 14 });

    const visivel = visivelPara(0);
    expect(visivel.opacity).toBe(1);
    expect(visivel.y).toBe(0);
  });

  it('520ms por card, 120ms entre cards e ease-out (cubic-bezier(0,0,.58,1))', () => {
    expect(ENTRADA_DASHBOARD.duracaoMs).toBe(520);
    expect(ENTRADA_DASHBOARD.intervaloMs).toBe(120);
    expect(ENTRADA_DASHBOARD.deslocamentoY).toBe(14);

    const visivel = visivelPara(3);
    expect(visivel.transition.duration).toBeCloseTo(0.52, 5);
    expect(visivel.transition.delay).toBeCloseTo(0.36, 5);
    expect(visivel.transition.ease).toEqual([0, 0, 0.58, 1]);
  });

  it('o card seguinte parte com o anterior a ~23% do percurso — cascata sobreposta, não exagerada', () => {
    const fracao = ENTRADA_DASHBOARD.intervaloMs / ENTRADA_DASHBOARD.duracaoMs;
    expect(fracao).toBeCloseTo(0.23, 2);
    expect(fracao).toBeGreaterThanOrEqual(0.2);
    expect(fracao).toBeLessThan(0.35);
    // Piso de sanidade: nem duração nem intervalo podem voltar ao "tudo junto".
    expect(ENTRADA_DASHBOARD.duracaoMs).toBeGreaterThanOrEqual(500);
    expect(ENTRADA_DASHBOARD.intervaloMs).toBeGreaterThanOrEqual(100);
    expect(ENTRADA_DASHBOARD.intervaloMs).toBeLessThan(ENTRADA_DASHBOARD.duracaoMs);
  });

  it('NÃO existe escala, mola nem ultrapassagem da posição final', () => {
    const visivel = visivelPara(2);
    // Nenhuma propriedade de tamanho nos keyframes (o card não comprime/estica)
    expect(visivel).not.toHaveProperty('scale');
    expect(visivel).not.toHaveProperty('scaleX');
    expect(visivel).not.toHaveProperty('scaleY');
    expect(entradaDashboard.hidden).not.toHaveProperty('scale');
    // `tween` com ease explícito — nunca `spring` (que ultrapassa o alvo)
    expect(visivel.transition).not.toHaveProperty('type');
    expect(visivel.transition).not.toHaveProperty('bounce');
    expect(visivel.transition).not.toHaveProperty('stiffness');
  });

  it('a cascata de conteúdo avança 120ms por índice (nenhum card começa junto do anterior)', () => {
    const atrasos = [0, 1, 2, 3, 4].map(atrasoEntradaDashboard);
    expect(atrasos[0]).toBe(0);
    expect(atrasos[1]).toBeCloseTo(0.12, 5);
    expect(atrasos[2]).toBeCloseTo(0.24, 5);
    expect(atrasos[3]).toBeCloseTo(0.36, 5);
    expect(atrasos[4]).toBeCloseTo(0.48, 5);
  });

  it('índice tem teto (1,32s) para páginas longas não arrastarem a entrada', () => {
    expect(atrasoEntradaDashboard(MAX_ENTRADA_DASHBOARD)).toBeCloseTo(1.32, 5);
    expect(atrasoEntradaDashboard(99)).toBeCloseTo(1.32, 5);
    // índice negativo (nenhum consumidor usa, mas não pode virar atraso negativo)
    expect(atrasoEntradaDashboard(-3)).toBe(0);
  });

  it('props prontas para espalhar em qualquer motion.*', () => {
    expect(entradaCardDashboard(7)).toMatchObject({
      custom: 7,
      initial: 'hidden',
      animate: 'visible',
    });
    expect(entradaCardDashboard().custom).toBe(0);
  });

  it('o escopo CSS/JS é um único literal, compartilhado por página, driver e CSS', () => {
    expect(ESCOPO_ENTRADA_DASHBOARD).toBe('dashboard-principal');
    expect(propsEscopoEntradaDashboard).toEqual({
      'data-entrada-escopo': 'dashboard-principal',
    });
    expect(cssDoApp).toContain(
      `[data-entrada-escopo='${ESCOPO_ENTRADA_DASHBOARD}'] .animate-squash`
    );
  });

  it('o keyframes do CSS usa os MESMOS números do TS (14px, 520ms) e não tem scale', () => {
    expect(KEYFRAMES_ENTRADA_DASHBOARD).toBe('entradaCascataDashboard');

    const bloco = cssDoApp.slice(cssDoApp.indexOf(`@keyframes ${KEYFRAMES_ENTRADA_DASHBOARD}`));
    const corpo = bloco.slice(0, bloco.indexOf('\n}\n'));
    expect(corpo).toContain(`translate3d(0, ${ENTRADA_DASHBOARD.deslocamentoY}px, 0)`);
    expect(corpo).not.toMatch(/scale\w*\s*\(/);

    expect(cssDoApp).toContain(
      `${KEYFRAMES_ENTRADA_DASHBOARD} ${ENTRADA_DASHBOARD.duracaoMs}ms cubic-bezier(0, 0, 0.58, 1) both`
    );
  });

  describe('grupos independentes de animação', () => {
    it('o grupo é declarado por atributo e a página marca os KPI Cards com `kpi`', () => {
      expect(ATTR_GRUPO_ENTRADA).toBe('data-entrada-grupo');
      expect(propsGrupoEntradaDashboard('kpi')).toEqual({ 'data-entrada-grupo': 'kpi' });

      // Paridade JSX↔driver: o grid dos KPI precisa ser o container do grupo `kpi`.
      const gridDosKpis = paginaDoDashboard
        .split('\n')
        .find((linha) => linha.includes('grid shrink-0 gap-3 grid-cols-1 sm:grid-cols-5'));
      expect(gridDosKpis).toBeDefined();
      expect(gridDosKpis).toContain('propsGrupoEntradaDashboard("kpi")');
    });

    it('KPI e conteúdo entram na MESMA cadência (120ms), cada grupo com relógio próprio', () => {
      expect(intervaloDoGrupo(GRUPO_ENTRADA_KPI)).toBe(ENTRADA_DASHBOARD.intervaloMs);
      expect(intervaloDoGrupo(GRUPO_ENTRADA_CONTEUDO)).toBe(ENTRADA_DASHBOARD.intervaloMs);
      expect(intervaloDoGrupo(GRUPO_ENTRADA_KPI)).toBe(120);
      expect(intervaloDoGrupo(GRUPO_ENTRADA_CONTEUDO)).toBe(120);
    });

    it('card sem grupo declarado cai no conteúdo; grupo novo ganha relógio e intervalo de cascata', () => {
      expect(chaveDoGrupo(null)).toBe(GRUPO_ENTRADA_CONTEUDO);
      expect(chaveDoGrupo(undefined)).toBe(GRUPO_ENTRADA_CONTEUDO);
      expect(chaveDoGrupo('   ')).toBe(GRUPO_ENTRADA_CONTEUDO);
      expect(chaveDoGrupo('kpi')).toBe(GRUPO_ENTRADA_KPI);
      expect(chaveDoGrupo(' outro ')).toBe('outro');
      // Grupo novo = grupo próprio (relógio próprio no driver), mesma cadência.
      expect(intervaloDoGrupo('outro')).toBe(120);
    });

    it('o grupo dos KPI não consome a fila do conteúdo (cada grupo parte de 0)', () => {
      // O driver guarda um cursor POR GRUPO: a faixa de KPIs não empurra o 1º
      // card de conteúdo, que continua partindo em 0 no mesmo instante.
      expect(atrasoEntradaDashboard(0)).toBe(0);
      expect(atrasoEntradaDashboard(4)).toBeCloseTo(0.48, 5);
    });

    it('os dois grupos partem no MESMO instante e o conteúdo anda antes de os KPIs terminarem', () => {
      // Mesmo instante de início: índice do grupo kpi == índice do 1º de conteúdo.
      expect(INDICE_ENTRADA_KPI).toBe(0);
      expect(atrasoEntradaDashboard(INDICE_ENTRADA_KPI)).toBe(atrasoEntradaDashboard(0));

      // O critério do pedido, em números: o 2º e o 3º cards de conteúdo já estão
      // em movimento enquanto o último KPI ainda está subindo (0,12s e 0,24s
      // contra 0,52s de duração). Se alguém reintroduzir um deslocamento do
      // tamanho da faixa de KPIs (5 × 120ms = 0,6s), este teste quebra.
      expect(atrasoEntradaDashboard(1) * 1000).toBeLessThan(ENTRADA_DASHBOARD.duracaoMs);
      expect(atrasoEntradaDashboard(2) * 1000).toBeLessThan(ENTRADA_DASHBOARD.duracaoMs);
    });
  });

  describe('RÉGUA GLOBAL — fila ÚNICA (KPI + conteúdo no mesmo relógio)', () => {
    type VarianteVisivel = {
      opacity: number;
      y: number;
      scale?: number;
      transition: { duration: number; delay: number; ease: number[]; type?: string };
    };
    const visivelKpi = (posicao: number) =>
      (entradaKpiGlobal.visible as unknown as (p: number) => VarianteVisivel)(posicao);
    const visivelConteudo = (posicao: number) =>
      (entradaConteudoGlobal.visible as unknown as (p: number) => VarianteVisivel)(posicao);

    it('não existe índice-base deslocando o conteúdo (o bug do "conteúdo invisível")', () => {
      expect(paginaExecutiva).not.toMatch(/baseCascataPainel/);
      expect(paginaExecutiva).not.toMatch(/QTD_KPIS_DASHBOARD_EXECUTIVO/);
      // Nenhum `custom` somando outro grupo/índice: só a posição do card.
      expect(paginaExecutiva).not.toMatch(/custom=\{[A-Za-z_$][\w$]*\s*\+/);
      // O primeiro card de conteúdo de cada aba parte do índice 0.
      expect(paginaExecutiva).toContain('custom={0}');
    });

    it('o 1º KPI Card e o 1º card de conteúdo começam no MESMO instante (slot 0)', () => {
      // Headcount (1º KPI) e Evolução do Quadro (1º conteúdo) dividem o slot 0.
      expect(slotKpiIntercalado(0)).toBe(0);
      expect(slotConteudoIntercalado(0)).toBe(0);
      expect(visivelKpi(0).transition.delay).toBe(0);
      expect(visivelConteudo(0).transition.delay).toBe(0);
    });

    it('a sequência pedida vira 0..7 sem buraco nem repetição', () => {
      const sequencia = [
        slotKpiIntercalado(0), // Headcount — junto com Evolução do Quadro (slot 0)
        slotKpiIntercalado(1), // Folha Mensal
        slotConteudoIntercalado(1), // Movimentação no Período
        slotKpiIntercalado(2), // Turnover
        slotConteudoIntercalado(2), // Turnover no Período
        slotKpiIntercalado(3), // Absenteísmo
        slotKpiIntercalado(4), // Pendências
        slotConteudoIntercalado(3), // Principais Insights
      ];
      expect(sequencia).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    it('a fila nunca volta atrás (KPI e conteúdo estritamente crescentes)', () => {
      const kpis = [0, 1, 2, 3, 4].map(slotKpiIntercalado);
      expect(kpis).toEqual([0, 1, 3, 5, 6]);
      // Do 4º card de conteúdo em diante a fila segue sozinha, sem salto.
      const conteudos = [0, 1, 2, 3, 4, 5].map(slotConteudoIntercalado);
      expect(conteudos).toEqual([0, 2, 4, 7, 8, 9]);
      [kpis, conteudos].forEach((slots) =>
        slots.forEach((slot, i) => {
          if (i > 0) expect(slot).toBeGreaterThan(slots[i - 1]);
        })
      );
    });

    it('520ms por card, 120ms entre inícios e 14px de subida', () => {
      expect(CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs).toBe(520);
      expect(CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs).toBe(120);
      expect(CONFIG_ENTRADA_CARD_GLOBAL.deslocamentoY).toBe(14);

      expect(entradaKpiGlobal.hidden).toEqual({ opacity: 0, y: 14 });
      expect(entradaConteudoGlobal.hidden).toEqual({ opacity: 0, y: 14 });

      const segundo = visivelConteudo(1); // slot 2 → 240ms
      expect(segundo.opacity).toBe(1);
      expect(segundo.y).toBe(0);
      expect(segundo.transition.duration).toBeCloseTo(0.52, 5);
      expect(segundo.transition.delay).toBeCloseTo(0.24, 5);
      expect(segundo.transition.ease).toEqual([0, 0, 0.58, 1]);

      // Faixas do pedido (nem "tudo junto", nem lento demais).
      expect(CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs).toBeGreaterThanOrEqual(450);
      expect(CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs).toBeLessThanOrEqual(600);
      expect(CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs).toBeGreaterThanOrEqual(100);
      expect(CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs).toBeLessThanOrEqual(140);
      expect(CONFIG_ENTRADA_CARD_GLOBAL.deslocamentoY).toBeGreaterThanOrEqual(12);
      expect(CONFIG_ENTRADA_CARD_GLOBAL.deslocamentoY).toBeLessThanOrEqual(18);
    });

    it('o teto de slots impede uma aba longa de esperar mais de ~1,4s para começar', () => {
      expect(atrasoDoSlot(999) * 1000).toBe(
        MAX_SLOT_ENTRADA_CARD_GLOBAL * CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs
      );
      expect(atrasoDoSlot(999)).toBeLessThan(1.4);
      // E o fim da entrada (último slot + duração) cabe em ~2s.
      expect(atrasoDoSlot(999) + CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs / 1000).toBeLessThan(2);
    });

    it('NÃO existe escala, mola nem ultrapassagem (nem nos KPI, nem no conteúdo)', () => {
      [visivelKpi(2), visivelConteudo(2)].forEach((visivel) => {
        expect(visivel.scale).toBeUndefined();
        expect(visivel.transition.type).toBeUndefined();
        expect(Object.keys(visivel.transition).sort()).toEqual(['delay', 'duration', 'ease']);
      });
    });

    it('a página usa as variants certas, cada KPI com seu slot, e o grid declara o grupo', () => {
      expect(paginaExecutiva).toContain('custom={posicaoKpi}');
      expect(paginaExecutiva).toContain('variants={entradaKpiGlobal}');
      expect(paginaExecutiva).toContain('variants={entradaConteudoGlobal}');
      // Os 5 KPIs NÃO entram mais todos no mesmo instante: cada um tem seu slot.
      expect(paginaExecutiva).not.toContain('custom={INDICE_ENTRADA_KPI}');

      const gridDosKpis = paginaExecutiva
        .split('\n')
        .find((linha) => linha.includes('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5'));
      expect(gridDosKpis).toBeDefined();
      expect(gridDosKpis).toContain("propsGrupoEntradaDashboard('kpi')");

      // Um único call site dos KPIs, dentro do map (os comentários não contam).
      const callSitesDosKpis = paginaExecutiva
        .split('\n')
        .filter((linha) => linha.includes('<MotionCard') && linha.includes('custom={posicaoKpi}'));
      expect(callSitesDosKpis).toHaveLength(1);
    });

    it('nenhum bloco interno repete a entrada do card que o contém', () => {
      // A animação duplicada era exatamente isto: `motion.div` dentro de um card
      // animado, com `custom` próprio competindo pela mesma fila.
      expect(paginaExecutiva).not.toMatch(/<motion\.div custom=\{/);
    });
  });

  describe('RÉGUA GLOBAL — módulo centralizado (`ui/entradaGlobal.ts`)', () => {
    type VarianteVisivel = {
      opacity: number;
      y: number;
      scale?: number;
      transition: { duration: number; delay: number; ease: number[]; type?: string };
    };
    const visivelDe = (variantes: typeof entradaCardGlobal, posicao: number) =>
      (variantes.visible as unknown as (p: number) => VarianteVisivel)(posicao);

    const fonteEntradaCards = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ui/entrada-cards.tsx'),
      'utf8'
    );
    const fonteMetricCard = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/dashboard/MetricCard.tsx'),
      'utf8'
    );
    const fonteDesempenho = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/avaliacao/entradaCards.tsx'),
      'utf8'
    );
    const fonteMainLayout = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/layout/MainLayout.tsx'),
      'utf8'
    );

    it('mantém exatamente a assinatura validada: 14px, 520ms, 120ms e ease-out', () => {
      expect(CONFIG_ENTRADA_CARD_GLOBAL.deslocamentoY).toBe(14);
      expect(CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs).toBe(520);
      expect(CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs).toBe(120);
      expect(CONFIG_ENTRADA_CARD_GLOBAL.curva).toEqual([0, 0, 0.58, 1]);
      expect(entradaCardGlobal.hidden).toEqual({ opacity: 0, y: 14 });

      const quarto = visivelDe(entradaCardGlobal, 3);
      expect(quarto.opacity).toBe(1);
      expect(quarto.y).toBe(0);
      expect(quarto.transition.duration).toBeCloseTo(0.52, 5);
      expect(quarto.transition.delay).toBeCloseTo(0.36, 5);
      expect(quarto.transition.ease).toEqual([0, 0, 0.58, 1]);
      expect(quarto.scale).toBeUndefined();
    });

    it('a fábrica gera a MESMA variants para qualquer mapa de slots', () => {
      expect(criarVariantesEntradaCard().hidden).toEqual(entradaCardGlobal.hidden);
      expect(visivelDe(criarVariantesEntradaCard(slotKpiIntercalado), 2).transition.delay).toBe(
        visivelDe(entradaKpiGlobal, 2).transition.delay
      );
      expect(visivelDe(criarVariantesEntradaCard(slotSequencial), 2).transition.delay).toBe(
        visivelDe(entradaCardGlobal, 2).transition.delay
      );
    });

    it('fila simples (padrão global): 0, 120ms, 240ms… sem furo nem repetição', () => {
      expect([0, 1, 2, 3, 4].map(slotSequencial)).toEqual([0, 1, 2, 3, 4]);
      const atrasos = [0, 1, 2, 3, 4].map(atrasoEntradaCardGlobal);
      expect(atrasos).toEqual([0, 0.12, 0.24, 0.36, 0.48]);
      [0, 1, 2, 3, 4].forEach((posicao) => {
        expect(visivelDe(entradaCardGlobal, posicao).transition.delay).toBeCloseTo(atrasos[posicao], 5);
        expect(visivelDe(entradaCardGlobal, posicao).transition.duration).toBeCloseTo(0.52, 5);
      });
    });

    it('o teto de slots vale para qualquer mapa (1,32s) e posição inválida vira 0', () => {
      expect(atrasoDoSlot(999)).toBeCloseTo(1.32, 5);
      expect(MAX_SLOT_ENTRADA_CARD_GLOBAL * CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs).toBe(1320);
      expect(atrasoDoSlot(-5)).toBe(0);
      expect(atrasoDoSlot(Number.NaN)).toBe(0);
      expect(slotSequencial(Number.POSITIVE_INFINITY)).toBe(0);
      expect(slotConteudoIntercalado(Number.NaN)).toBe(0);
    });

    it('propsEntradaGlobal entrega a trinca pronta para qualquer `motion.*`', () => {
      expect(propsEntradaGlobal(4)).toMatchObject({
        custom: 4,
        variants: entradaCardGlobal,
        initial: 'hidden',
        animate: 'visible',
      });
      expect(propsEntradaGlobal().custom).toBe(0);
      expect(propsEntradaGlobal(2, entradaKpiGlobal).variants).toBe(entradaKpiGlobal);
      expect(propsEntradaGlobal(2, entradaConteudoGlobal).variants).toBe(entradaConteudoGlobal);
    });

    it('o pacote compartilhado do sistema passou a consumir a régua global', () => {
      expect(fonteEntradaCards).toContain("from '@/components/ui/entradaGlobal'");
      expect(fonteEntradaCards).toContain('propsEntradaGlobal');
      expect(fonteEntradaCards).toContain('export function entradaCard(');
      // Nenhuma dependência da régua antiga no pacote global (era o acoplamento).
      expect(fonteEntradaCards).not.toContain("from '@/components/dashboard/MetricCard'");
    });

    it('o KPI Card aceita a entrada global por props, sem mudar o default', () => {
      expect(fonteMetricCard).toContain('animarEntrada?: boolean');
      expect(fonteMetricCard).toContain('indexForCascata?: number');
      expect(fonteMetricCard).toContain('animarEntrada ? entradaCardGlobal : cardVariants');
      // Default preservado: sem opt-in explícito, o card continua na régua legada.
      expect(fonteMetricCard).toContain('animarEntrada = false');
    });

    it('o módulo de Desempenho consome a régua global (padronização autorizada em 29/10/2026)', () => {
      // A ponte do módulo NÃO declara números próprios: delega ao pacote global.
      expect(fonteDesempenho).toContain("from '@/components/ui/entrada-cards'");
      expect(fonteDesempenho).not.toContain('export const CARD_VARIANTS_CONGELADO');
      expect(fonteDesempenho).not.toContain('y: 20');
      // Um card, uma animação: o `MotionCard` do módulo liga o opt-out do
      // `.animate-squash` — sem isso o CSS e o Framer animariam o MESMO nó.
      expect(fonteDesempenho).toContain('data-entrada="cascata"');
      // O isolamento por escopo (`desempenho-congelado`) deixou de existir.
      expect(cssDoApp).not.toContain("data-entrada-escopo='desempenho-congelado'");
      expect(fonteMainLayout).not.toContain('ESCOPO_ENTRADA_CONGELADO');
    });
  });

  describe('ordem visual de leitura da cascata', () => {
    it('ordena por linha (de cima para baixo) — card de baixo nunca entra antes', () => {
      // Índices na ordem do DOM: [0] topo-esquerda, [1] rodapé, [2] topo-direita
      const posicoes = [
        { top: 100, left: 0 },
        { top: 400, left: 0 },
        { top: 100, left: 600 },
      ];
      expect(ordenarPorLeitura(posicoes)).toEqual([0, 2, 1]);
    });

    it('empata cards da mesma linha (tolerância de 12px) e ordena da esquerda para a direita', () => {
      const posicoes = [
        { top: 302, left: 640 }, // linha 1, coluna 3
        { top: 298, left: 0 }, // linha 1, coluna 1 (4px acima, mesma linha)
        { top: 300, left: 320 }, // linha 1, coluna 2
      ];
      expect(ordenarPorLeitura(posicoes)).toEqual([1, 2, 0]);
    });

    it('funciona com lista vazia ou de um item', () => {
      expect(ordenarPorLeitura([])).toEqual([]);
      expect(ordenarPorLeitura([{ top: 10, left: 10 }])).toEqual([0]);
    });
  });

  it('`cardVariants` (MetricCard) passou a SER a régua global — 14px / 0,52s / 0,12s', () => {
    expect(cardVariants.hidden).toEqual({ opacity: 0, y: 14 });

    const global = (cardVariants.visible as (i: number) => never)(1) as unknown as {
      transition: { duration: number; delay: number };
    };
    expect(global.transition.duration).toBe(0.52);
    expect(global.transition.delay).toBeCloseTo(0.12, 5);
  });
});

