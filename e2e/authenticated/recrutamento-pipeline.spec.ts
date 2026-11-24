import { test, expect, devices, type Page } from '@playwright/test';

/**
 * ============================================================================
 * RECRUTAMENTO — PIPELINE no padrão do Kanban de Admissão
 * ============================================================================
 * Cobre o que o pedido de padronização exige:
 *   • colunas de 272px (mesma largura do board de Admissão) — sem comprimir;
 *   • faixa com scroll horizontal e colunas na mesma altura;
 *   • lista interna rolável (cabeçalho/rodapé fixos) SEM `overscroll-contain`,
 *     com encadeamento para a página quando a lista chega ao fim;
 *   • estados vazios discretos, rodapés alinhados e cards escuros;
 *   • Drag & Drop real (mouse) entre colunas, cancelamento, clique e menus;
 *   • filtro/pesquisa e contadores coerentes no modo demonstração.
 */

const COLUNA = (etapa: string) => `[data-pipeline-coluna="${etapa}"]`;
const LISTA = (etapa: string) => `${COLUNA(etapa)} [data-pipeline-lista]`;

/**
 * Largura da lane na RÉGUA do Design System: `w-[272px]` em `PipelineColumn`
 * (a mesma classe do Kanban de Admissão).
 *
 * A medida renderizada NÃO é 272: a escala global do DS declara
 * `html { font-size: 125% }` (`src/index.css`) e o `scripts/postcss-escala-rem.mjs`
 * converte px arbitrário em `rem` — ou seja, 272px da régua viram
 * 17rem = 340px na base de 20px (ver `docs/ESCALA-GLOBAL-DESIGN-SYSTEM.md`).
 * Por isso a expectativa é calculada a partir do `font-size` da raiz em vez de
 * ficar cravada em px: o teste continua válido se a base do DS mudar.
 */
const LANE_PX = 272;

/** Fator da escala global (base de 16px = 1). */
const escalaDaRaiz = (page: Page) =>
  page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16);

/**
 * Ponto DENTRO da viewport e dentro do elemento — a fração 1 é o mais perto
 * possível do rodapé do elemento (espaço vazio), mas sempre visível.
 *
 * Necessário porque a roda do mouse só age quando há um elemento sob o cursor:
 * a coluna do pipeline (`h-[calc(100vh-19rem)]`) passa da dobra em 900px de
 * altura de viewport, e o ponto calculado direto pela caixa caía em y≈934 —
 * fora da tela, com `elementFromPoint` devolvendo `null`.
 */
async function pontoVisivel(page: Page, seletor: string) {
  const caixa = await page.locator(seletor).boundingBox();
  const vista = page.viewportSize()!;
  const topo = Math.max(caixa!.y, 0);
  const base = Math.min(caixa!.y + caixa!.height, vista.height - 4);
  return { x: caixa!.x + caixa!.width / 2, y: base - Math.min(2, (base - topo) / 2) };
}

/** A ordem dos testes move cards de verdade; em série não há corrida de sessão. */
test.describe.configure({ mode: 'serial' });

const scrollDaPagina = (page: Page) => page.evaluate(() => document.querySelector('main')?.scrollTop ?? 0);

async function abrirPipeline(page: Page) {
  await page.goto('/recrutamento');
  await expect(page.locator('[data-pipeline-board]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-candidato-card]').first()).toBeVisible({ timeout: 20_000 });
  // Espera a coreografia de entrada (a MESMA da Admissão) terminar antes de
  // medir/arrastar: coluna cresce → degradê → cabeçalho → cards → rodapé.
  await expect(page.locator('[data-pipeline-coluna] .kanban-coluna-concluida')).toHaveCount(5, {
    timeout: 25_000,
  });
  await page.waitForTimeout(250);
}

async function zerarScroll(page: Page) {
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  });
  await page.waitForTimeout(100);
}

/** Estado geométrico do board — usado nas asserções de paridade. */
function medirBoard(page: Page) {
  return page.evaluate(() => {
    const rect = (el: Element | null) => (el ? el.getBoundingClientRect() : null);
    const board = document.querySelector('[data-pipeline-board]') as HTMLElement | null;
    const main = document.querySelector('main');
    return {
      mainOverflowY: main ? getComputedStyle(main).overflowY : null,
      board: board
        ? {
            clientX: board.clientWidth,
            scrollX: board.scrollWidth,
            clientY: board.clientHeight,
            scrollY: board.scrollHeight,
            overflowX: getComputedStyle(board).overflowX,
          }
        : null,
      colunas: [...document.querySelectorAll('[data-pipeline-coluna]')].map((coluna) => {
        const r = rect(coluna)!;
        const lista = coluna.querySelector('[data-pipeline-lista]') as HTMLElement | null;
        const card = coluna.querySelector('[data-candidato-card]') as HTMLElement | null;
        const cardVisual = card?.firstElementChild as HTMLElement | null;
        const rodape = coluna.querySelector('footer') as HTMLElement | null;
        return {
          id: coluna.getAttribute('data-pipeline-coluna'),
          width: Math.round(r.width),
          height: Math.round(r.height),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          rodapeBottom: rodape ? Math.round(rect(rodape)!.bottom) : null,
          listaClient: lista?.clientHeight ?? null,
          listaScroll: lista?.scrollHeight ?? null,
          listaOverflowY: lista ? getComputedStyle(lista).overflowY : null,
          listaOverscroll: lista ? getComputedStyle(lista).overscrollBehaviorY : null,
          cardClass: cardVisual?.className ?? null,
          cards: coluna.querySelectorAll('[data-candidato-card]').length,
        };
      }),
    };
  });
}

/** Arrasta o primeiro card de `origem` para a coluna `destino`. */
async function arrastarPrimeiroCard(page: Page, origem: string, destino: string) {
  const card = page.locator(`${COLUNA(origem)} [data-candidato-card]`).first();
  const id = await card.getAttribute('data-candidato-card');
  const caixa = await card.boundingBox();
  const lista = await page.locator(LISTA(destino)).boundingBox();
  expect(caixa, 'card de origem sem caixa').not.toBeNull();
  expect(lista, 'lista de destino sem caixa').not.toBeNull();

  await page.mouse.move(caixa!.x + 26, caixa!.y + 32);
  await page.mouse.down();
  await page.mouse.move(caixa!.x + 38, caixa!.y + 44, { steps: 4 });
  await expect(page.locator('[data-pipeline-arrastado]')).toHaveCount(1);
  await page.mouse.move(lista!.x + lista!.width / 2, lista!.y + Math.min(80, lista!.height - 30), {
    steps: 16,
  });
  await expect(page.locator(COLUNA(destino))).toHaveAttribute('data-pipeline-drop', 'true');
  await page.mouse.up();
  await expect(page.locator('[data-pipeline-arrastado]')).toHaveCount(0);
  await page.waitForTimeout(700);
  return id!;
}

test.describe('Pipeline — estrutura e scroll no padrão de Admissão', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await abrirPipeline(page);
  });

  test('5 colunas de 272px, mesma altura, rodapés alinhados e scroll horizontal', async ({ page }) => {
    const dados = await medirBoard(page);
    expect(dados.mainOverflowY).toBe('auto');
    expect(dados.colunas.map((c) => c.id)).toEqual(['triagem', 'entrevista', 'teste', 'proposta', 'contratado']);

    const larguras = dados.colunas.map((c) => c.width);
    const escala = await escalaDaRaiz(page);
    expect(new Set(larguras), `lane de ${LANE_PX}px na escala ${escala}`).toEqual(
      new Set([Math.round(LANE_PX * escala)]),
    );

    const alturas = dados.colunas.map((c) => c.height);
    const topos = dados.colunas.map((c) => c.top);
    const rodapes = dados.colunas.map((c) => c.rodapeBottom);
    const amplitude = (v: number[]) => Math.max(...v) - Math.min(...v);
    expect(amplitude(alturas)).toBeLessThanOrEqual(1);
    expect(amplitude(topos)).toBeLessThanOrEqual(1);
    expect(amplitude(rodapes as number[])).toBeLessThanOrEqual(1);

    // A faixa excede a viewport e rola na horizontal (4 colunas + parte da 5ª).
    expect(dados.board!.scrollX).toBeGreaterThan(dados.board!.clientX);
    expect(dados.board!.overflowX).toBe('auto');
    expect(dados.board!.scrollY).toBeLessThanOrEqual(dados.board!.clientY + 1);

    // Só a lista rola; sem overscroll contido (o scroll encadeia na página).
    dados.colunas.forEach((c) => {
      expect(c.listaOverflowY).toBe('auto');
      expect(c.listaOverscroll).not.toBe('contain');
    });

    // Card escuro (mesma superfície do card de Admissão), nunca branco/cinza.
    const comCard = dados.colunas.find((c) => c.cards > 0)!;
    expect(comCard.cardClass).toContain('bg-background/85');
    expect(comCard.cardClass).toContain('rounded-xl');

    // Rolagem horizontal real da faixa.
    const caixa = await page.locator('[data-pipeline-board]').boundingBox();
    await page.mouse.move(caixa!.x + 200, caixa!.y + 30);
    await page.mouse.wheel(300, 0);
    await expect
      .poll(() => page.evaluate(() => (document.querySelector('[data-pipeline-board]') as HTMLElement).scrollLeft))
      .toBeGreaterThan(0);
  });

  test('A/B/C — lista rola, encadeia para a página; cabeçalho/espaço vazio rolam direto', async ({ page }) => {
    await zerarScroll(page);
    const lista = page.locator(LISTA('triagem'));
    const rolouLista = await lista.evaluate((el) => el.scrollTop);
    expect(rolouLista).toBe(0);

    // Roda sobre o CARD: a lista interna consome a rolagem.
    const card = page.locator(`${COLUNA('triagem')} [data-candidato-card]`).first();
    const caixaCard = await card.boundingBox();
    await page.mouse.move(caixaCard!.x + 30, caixaCard!.y + 40);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => lista.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

    // Continuando, a lista chega ao fim e a roda passa para a PÁGINA.
    for (let i = 0; i < 12; i += 1) {
      if ((await scrollDaPagina(page)) > 0) break;
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(80);
    }
    await expect.poll(() => scrollDaPagina(page)).toBeGreaterThan(0);

    // Cabeçalho: não há lista sob o cursor -> a página rola.
    await zerarScroll(page);
    const header = await page.locator(`${COLUNA('entrevista')} header`).boundingBox();
    await page.mouse.move(header!.x + header!.width / 2, header!.y + header!.height / 2);
    const antesHeader = await scrollDaPagina(page);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => scrollDaPagina(page)).toBeGreaterThan(antesHeader);

    // Espaço vazio de Contratado (última coluna, fora da viewport em 1440):
    // leva a faixa até o fim para o cursor ficar de fato sobre a coluna.
    await page.evaluate(() => {
      const board = document.querySelector('[data-pipeline-board]') as HTMLElement | null;
      if (board) board.scrollLeft = board.scrollWidth;
    });
    await page.waitForTimeout(250);
    await zerarScroll(page);
    // O ponto é limitado à viewport: o board pode passar da dobra, e a roda só
    // rola quando há um elemento sob o cursor.
    const vazio = await pontoVisivel(page, LISTA('contratado'));
    await page.mouse.move(vazio.x, vazio.y);
    const antesVazio = await scrollDaPagina(page);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => scrollDaPagina(page)).toBeGreaterThan(antesVazio);
  });

  test('D — arrasta de Triagem para Entrevista sem duplicar e atualiza contadores', async ({ page }) => {
    const totais = await page.evaluate(() => ({
      triagem: document.querySelectorAll('[data-pipeline-coluna="triagem"] [data-candidato-card]').length,
      entrevista: document.querySelectorAll('[data-pipeline-coluna="entrevista"] [data-candidato-card]').length,
      total: document.querySelectorAll('[data-pipeline-board] [data-candidato-card]').length,
    }));

    const id = await arrastarPrimeiroCard(page, 'triagem', 'entrevista');

    await expect(page.locator(`${COLUNA('entrevista')} [data-candidato-card="${id}"]`)).toHaveCount(1);
    await expect(page.locator(`${COLUNA('triagem')} [data-candidato-card="${id}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-pipeline-board] [data-candidato-card="${id}"]`)).toHaveCount(1);
    expect(await page.locator('[data-pipeline-board] [data-candidato-card]').count()).toBe(totais.total);

    const depois = await page.evaluate(() => ({
      triagem: document.querySelectorAll('[data-pipeline-coluna="triagem"] [data-candidato-card]').length,
      entrevista: document.querySelectorAll('[data-pipeline-coluna="entrevista"] [data-candidato-card]').length,
    }));
    expect(depois.triagem).toBe(totais.triagem - 1);
    expect(depois.entrevista).toBe(totais.entrevista + 1);

    const contador = await page
      .locator(`${COLUNA('entrevista')} header span.tabular-nums`)
      .first()
      .innerText();
    expect(Number(contador)).toBe(depois.entrevista);
  });

  test('E/H — filtro ativo + arraste para coluna vazia mantêm os dados coerentes', async ({ page }) => {
    const nome = await page
      .locator(`${COLUNA('triagem')} [data-candidato-card] p`)
      .first()
      .innerText();
    const primeiroNome = nome.trim().split(/\s+/)[0];

    await page.getByLabel('Buscar candidatos').fill(primeiroNome);
    await page.waitForTimeout(600);

    const vazias = await page.evaluate(() =>
      [...document.querySelectorAll('[data-pipeline-coluna]')]
        .filter((coluna) => coluna.querySelectorAll('[data-candidato-card]').length === 0)
        .map((coluna) => coluna.getAttribute('data-pipeline-coluna'))
    );
    test.skip(vazias.length === 0, 'Sem coluna vazia para o filtro aplicado');

    const destino = vazias.includes('entrevista') ? 'entrevista' : vazias[0]!;
    const totalAntes = await page.locator('[data-pipeline-board] [data-candidato-card]').count();
    const id = await arrastarPrimeiroCard(page, 'triagem', destino);

    await expect(page.locator(`${COLUNA(destino)} [data-candidato-card="${id}"]`)).toHaveCount(1);
    await expect(page.locator(`${COLUNA('triagem')} [data-candidato-card="${id}"]`)).toHaveCount(0);
    expect(await page.locator('[data-pipeline-board] [data-candidato-card]').count()).toBe(totalAntes);
    await expect(page.locator('[data-pipeline-footer]')).toContainText(
      `Mostrando ${totalAntes} ${totalAntes === 1 ? 'candidato' : 'candidatos'}`
    );
    // Coluna vazia passa a exibir o card e esconde o estado vazio.
    await expect(page.locator(`${COLUNA(destino)} [data-pipeline-vazio]`)).toHaveCount(0);

    await page.getByLabel('Buscar candidatos').fill('');
    await page.waitForTimeout(700);
    await expect(page.locator(`${COLUNA(destino)} [data-candidato-card="${id}"]`)).toHaveCount(1);
  });

  test('F — Escape cancela o arraste e devolve o card à origem', async ({ page }) => {
    const card = page.locator(`${COLUNA('triagem')} [data-candidato-card]`).first();
    const id = await card.getAttribute('data-candidato-card');
    const caixa = await card.boundingBox();
    const antes = await page.evaluate(() => ({
      triagem: document.querySelectorAll('[data-pipeline-coluna="triagem"] [data-candidato-card]').length,
      entrevista: document.querySelectorAll('[data-pipeline-coluna="entrevista"] [data-candidato-card]').length,
    }));

    await page.mouse.move(caixa!.x + 26, caixa!.y + 32);
    await page.mouse.down();
    await page.mouse.move(caixa!.x + 80, caixa!.y + 90, { steps: 6 });
    await expect(page.locator('[data-pipeline-arrastado]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await page.waitForTimeout(500);

    await expect(page.locator('[data-pipeline-arrastado]')).toHaveCount(0);
    await expect(page.locator(`${COLUNA('triagem')} [data-candidato-card="${id}"]`)).toHaveCount(1);
    const depois = await page.evaluate(() => ({
      triagem: document.querySelectorAll('[data-pipeline-coluna="triagem"] [data-candidato-card]').length,
      entrevista: document.querySelectorAll('[data-pipeline-coluna="entrevista"] [data-candidato-card]').length,
    }));
    expect(depois).toEqual(antes);
  });

  test('G — clique no card e nos botões internos não inicia arraste', async ({ page }) => {
    const card = page.locator(`${COLUNA('triagem')} [data-candidato-card]`).first();
    const id = await card.getAttribute('data-candidato-card');

    await card.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Histórico do processo');
    expect(await page.locator('[data-pipeline-arrastado]').count()).toBe(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.locator(`${COLUNA('triagem')} [data-candidato-card="${id}"] button[aria-label^="Mais ações"]`).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu).toContainText('Mover para');
    expect(await page.locator('[data-pipeline-arrastado]').count()).toBe(0);
    await page.keyboard.press('Escape');
  });

  test('I — a roda continua funcionando imediatamente após um arraste', async ({ page }) => {
    const id = await arrastarPrimeiroCard(page, 'triagem', 'entrevista');
    await zerarScroll(page);
    const alvo = page.locator(`${COLUNA('entrevista')} [data-candidato-card="${id}"]`);
    await expect(alvo).toBeVisible();
    await alvo.scrollIntoViewIfNeeded();
    const caixa = await alvo.boundingBox();
    await page.mouse.move(caixa!.x + 24, caixa!.y + 30);

    const lista = page.locator(LISTA('entrevista'));
    const antesLista = await lista.evaluate((el) => el.scrollTop);
    const antesPagina = await scrollDaPagina(page);
    for (let i = 0; i < 12; i += 1) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(60);
      const rolouLista = (await lista.evaluate((el) => el.scrollTop)) > antesLista;
      if (rolouLista || (await scrollDaPagina(page)) > antesPagina) return;
    }
    throw new Error('a roda não rolou lista nem página após o arraste');
  });

  test('paridade — largura/altura das colunas iguais às do Kanban de Admissão', async ({ page }) => {
    const recrutamento = await page.locator(COLUNA('triagem')).boundingBox();

    await page.goto('/admissoes');
    const abaKanban = page.getByRole('tab', { name: 'Kanban' });
    try {
      await abaKanban.waitFor({ state: 'visible', timeout: 20_000 });
    } catch {
      test.skip(true, 'Kanban de Admissão indisponível neste ambiente');
      return;
    }
    await abaKanban.click();
    const slot = page.locator('.kanban-lane-slot').first();
    try {
      await slot.waitFor({ state: 'visible', timeout: 20_000 });
    } catch {
      test.skip(true, 'Colunas de Admissão não renderizaram (sem dados/sessão)');
      return;
    }
    const admissao = await slot.boundingBox();

    expect(Math.round(recrutamento!.width)).toBe(Math.round(admissao!.width));
    expect(Math.round(recrutamento!.height)).toBe(Math.round(admissao!.height));
  });
});

test.describe('Pipeline — mobile (toque)', () => {
  const pixel = devices['Pixel 5'];
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: pixel.deviceScaleFactor,
    isMobile: pixel.isMobile,
    hasTouch: pixel.hasTouch,
    userAgent: pixel.userAgent,
  });
  test.setTimeout(90_000);

  test('J — swipe rola página/board e o menu move o card com toque', async ({ page, context }) => {
    await abrirPipeline(page);
    const cdp = await context.newCDPSession(page);

    const toque = (x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    const mover = (x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    const soltar = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    // Swipe vertical no cabeçalho (fora da lista) rola a PÁGINA.
    const header = await page.locator(`${COLUNA('triagem')} header`).boundingBox();
    await zerarScroll(page);
    await toque(header!.x + 40, header!.y + 20);
    for (let i = 1; i <= 8; i += 1) {
      await mover(header!.x + 40, header!.y + 20 - i * 22);
      await page.waitForTimeout(16);
    }
    await soltar();
    await expect.poll(() => scrollDaPagina(page)).toBeGreaterThan(0);

    // Swipe vertical sobre o card rola a LISTA (sem iniciar arraste).
    await zerarScroll(page);
    const card = await page
      .locator(`${COLUNA('triagem')} [data-candidato-card]`)
      .first()
      .boundingBox();
    await toque(card!.x + 30, card!.y + 60);
    for (let i = 1; i <= 8; i += 1) {
      await mover(card!.x + 30, card!.y + 60 - i * 20);
      await page.waitForTimeout(16);
    }
    await soltar();
    const rolouLista = await page
      .locator(LISTA('triagem'))
      .evaluate((el) => el.scrollTop > 0 || el.scrollHeight <= el.clientHeight);
    expect(rolouLista).toBe(true);
    expect(await page.locator('[data-pipeline-arrastado]').count()).toBe(0);

    // Swipe horizontal no cabeçalho navega o board (sem arrastar card).
    const boardAntes = await page.evaluate(
      () => (document.querySelector('[data-pipeline-board]') as HTMLElement).scrollLeft
    );
    const header2 = await page.locator(`${COLUNA('triagem')} header`).boundingBox();
    await toque(header2!.x + header2!.width - 30, header2!.y + 20);
    for (let i = 1; i <= 8; i += 1) {
      await mover(header2!.x + header2!.width - 30 - i * 30, header2!.y + 20);
      await page.waitForTimeout(16);
    }
    await soltar();
    await expect
      .poll(() => page.evaluate(() => (document.querySelector('[data-pipeline-board]') as HTMLElement).scrollLeft))
      .toBeGreaterThan(boardAntes);

    // Arraste por toque de verdade: card -> Entrevista (touch-pan-y preserva o
    // scroll vertical e libera o arraste horizontal intencional).
    await page.waitForTimeout(400);
    const cardToque = page.locator(`${COLUNA('triagem')} [data-candidato-card]`).first();
    // Os swipes anteriores podem ter deixado a lista/página roladas: volta ao
    // topo para o card ficar inteiro dentro da área visível da coluna.
    await page.locator(LISTA('triagem')).evaluate((el) => {
      el.scrollTop = 0;
    });
    await zerarScroll(page);
    await cardToque.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);

    /**
     * A lane renderiza ~340px (272px × escala global do DS), então em 390px de
     * viewport Triagem e Entrevista não cabem lado a lado. Antes de arrastar:
     *
     * 1. rola a faixa até a borda direita do card de origem ficar `zona + 26`
     *    px adentro da faixa (o card continua tocável e a Entrevista entra na
     *    área visível);
     * 2. toca na ÁREA DO NOME do card — a faixa do botão "Mais ações" (Radix)
     *    abre o menu e não inicia arraste;
     * 3. o alvo é o x que maximiza a interseção do OVERLAY com a lane de
     *    destino, porque a colisão padrão (`rectIntersection` do dnd-kit) usa o
     *    rect do card arrastado — quase uma lane inteira — e não o ponto do
     *    dedo. O y fica na lista de destino.
     *
     * Os dois pontos ficam fora das zonas de auto-scroll do dnd-kit (20% de
     * cada borda), então o board não rola sozinho durante o gesto.
     */
    const pontos = await page.evaluate(
      ([seletorOrigem, seletorDestino]) => {
        const board = document.querySelector('[data-pipeline-board]') as HTMLElement;
        const card = document.querySelector(`${seletorOrigem} [data-candidato-card]`) as HTMLElement;
        const laneOrigem = document.querySelector(seletorOrigem) as HTMLElement;
        const laneDestino = document.querySelector(seletorDestino) as HTMLElement;
        const listaDestino = document.querySelector(`${seletorDestino} [data-pipeline-lista]`) as HTMLElement;
        const faixa = board.getBoundingClientRect();
        const zona = faixa.width * 0.2;

        board.scrollLeft = 0;
        const cardInicial = card.getBoundingClientRect();
        board.scrollLeft = Math.max(0, cardInicial.right - faixa.left - (zona + 26));

        const cardBox = card.getBoundingClientRect();
        const listaBox = listaDestino.getBoundingClientRect();
        const origem = {
          x: Math.max(cardBox.left, faixa.left) + 20,
          y: Math.min(cardBox.top + 50, listaBox.top + 60, window.innerHeight - 60),
        };

        const sobreposicao = (inicio: number, alvo: DOMRect) =>
          Math.max(0, Math.min(inicio + cardBox.width, alvo.right) - Math.max(inicio, alvo.left));
        const destinoLane = laneDestino.getBoundingClientRect();
        const origemLane = laneOrigem.getBoundingClientRect();
        let melhor = { x: origem.x, folga: -Infinity };
        for (let x = origem.x + 1; x <= faixa.right - zona - 4; x += 1) {
          const inicio = cardBox.left + (x - origem.x);
          const folga = sobreposicao(inicio, destinoLane) - sobreposicao(inicio, origemLane);
          if (folga > melhor.folga) melhor = { x, folga };
        }

        return {
          origem,
          destino: {
            x: melhor.x,
            y: Math.min(listaBox.top + 60, window.innerHeight - 60),
          },
        };
      },
      [COLUNA('triagem'), COLUNA('entrevista')]
    );
    await page.waitForTimeout(350);

    const idToque = await cardToque.getAttribute('data-candidato-card');
    const { origem, destino } = pontos;
    await toque(origem.x, origem.y);
    for (let i = 1; i <= 14; i += 1) {
      await mover(
        origem.x + ((destino.x - origem.x) * i) / 14,
        origem.y + ((destino.y - origem.y) * i) / 14
      );
      await page.waitForTimeout(24);
    }
    await page.waitForTimeout(250);
    await expect(page.locator('[data-pipeline-arrastado]')).toHaveCount(1);
    await expect(page.locator(COLUNA('entrevista'))).toHaveAttribute('data-pipeline-drop', 'true');
    await soltar();
    await expect(page.locator('[data-pipeline-arrastado]')).toHaveCount(0);
    await expect(page.locator(`${COLUNA('entrevista')} [data-candidato-card="${idToque}"]`)).toHaveCount(1);
    await expect(page.locator(`[data-pipeline-board] [data-candidato-card="${idToque}"]`)).toHaveCount(1);

    // Caminho acessível de movimento no toque: menu "Mover para".
    // Volta a faixa ao início para o card da Triagem ficar no lugar.
    await page.evaluate(() => {
      const board = document.querySelector('[data-pipeline-board]') as HTMLElement | null;
      if (board) board.scrollLeft = 0;
    });
    await page.waitForTimeout(400);
    const primeiro = page.locator(`${COLUNA('triagem')} [data-candidato-card]`).first();
    const id = await primeiro.getAttribute('data-candidato-card');
    await primeiro.locator('button[aria-label^="Mais ações"]').click();
    await page.getByRole('menuitem', { name: 'Entrevista' }).click();
    await expect(page.locator(`${COLUNA('entrevista')} [data-candidato-card="${id}"]`)).toHaveCount(1);
    await expect(page.locator(`[data-pipeline-board] [data-candidato-card="${id}"]`)).toHaveCount(1);
  });
});
