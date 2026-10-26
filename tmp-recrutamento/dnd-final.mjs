import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const PASTA = 'tmp-recrutamento/dnd-final';
mkdirSync(PASTA, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'off');
});
const page = await context.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
});
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500);
console.log('URL:', page.url());
console.log('BOARD:', await page.locator('[data-pipeline-board]').count());
console.log('CARDS:', await page.locator('[data-candidato-card]').count());
await page.screenshot({ path: `${PASTA}/01-pipeline-completo.png`, fullPage: false });

const medir = () =>
  page.evaluate(() => {
    const main = document.querySelector('main');
    const board = document.querySelector('[data-pipeline-board]');
    const colunas = [...document.querySelectorAll('[data-pipeline-coluna]')].map((coluna) => {
      const r = coluna.getBoundingClientRect();
      const lista = coluna.querySelector('[data-pipeline-lista]');
      return {
        id: coluna.getAttribute('data-pipeline-coluna'),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        h: Math.round(r.height),
        listaClient: lista?.clientHeight,
        listaScroll: lista?.scrollHeight,
        cards: coluna.querySelectorAll('[data-candidato-card]').length,
      };
    });
    return {
      mainScrollTop: main?.scrollTop,
      mainScrollHeight: main?.scrollHeight,
      mainClientHeight: main?.clientHeight,
      mainOverflowY: main ? getComputedStyle(main).overflowY : null,
      board: board
        ? {
            h: Math.round(board.getBoundingClientRect().height),
            scrollHeight: board.scrollHeight,
            clientHeight: board.clientHeight,
          }
        : null,
      colunas,
    };
  });

const dados = await medir();
console.log('MEDIDAS', JSON.stringify(dados, null, 2));

async function rolarSobre(seletor, rotulo) {
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  });
  await page.waitForTimeout(150);
  const alvo = page.locator(seletor).first();
  const caixa = await alvo.boundingBox();
  if (!caixa) throw new Error(`sem caixa para ${seletor}`);
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + Math.min(caixa.height / 2, 40));
  const antes = (await medir()).mainScrollTop;
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(400);
  const depois = (await medir()).mainScrollTop;
  console.log(`SCROLL ${rotulo}:`, JSON.stringify({ antes, depois, rolou: depois > antes }));
  return depois > antes;
}

const resultadoScroll = {};
resultadoScroll.card = await rolarSobre('[data-pipeline-coluna="triagem"] [data-candidato-card]', 'sobre-card');
resultadoScroll.header = await rolarSobre('[data-pipeline-coluna="entrevista"] header', 'sobre-cabecalho');
resultadoScroll.vazio = await rolarSobre(
  '[data-pipeline-coluna="contratado"] [data-pipeline-lista]',
  'sobre-espaco-vazio'
);

// Rodapé da coluna: só alcança a viewport com a página no fim. Aí a roda sobe.
const mainFinal = await page.evaluate(() => {
  const main = document.querySelector('main');
  if (!main) return null;
  main.scrollTop = main.scrollHeight;
  return { top: main.scrollTop, max: main.scrollHeight - main.clientHeight };
});
await page.waitForTimeout(200);
const rodape = await page.locator('[data-pipeline-coluna="proposta"] [data-pipeline-rodape]').boundingBox();
await page.mouse.move(rodape.x + rodape.width / 2, rodape.y + rodape.height / 2);
await page.mouse.wheel(0, -400);
await page.waitForTimeout(350);
const aposRodape = (await medir()).mainScrollTop;
console.log(
  'SCROLL sobre-rodape:',
  JSON.stringify({ inicio: mainFinal.top, depois: aposRodape, rolou: aposRodape < mainFinal.top })
);
resultadoScroll.rodape = aposRodape < mainFinal.top;

await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(() => {
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
});
await page.waitForTimeout(300);
await page.locator('[data-pipeline-board]').screenshot({ path: `${PASTA}/02-board-alinhado.png` });

// ── Drag: primeiro card da Triagem -> Entrevista ──────────────────────────────
const card = page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').first();
const id = await card.getAttribute('data-candidato-card');
const caixaCard = await card.boundingBox();
const caixaAlca = await card.locator('[data-pipeline-alca]').boundingBox();

console.log(
  'CARD',
  JSON.stringify(caixaCard),
  'ALCA',
  JSON.stringify(caixaAlca),
  'ALCA_DISPLAY',
  await page.evaluate(() => {
    const alca = document.querySelector('[data-pipeline-alca]');
    return alca ? getComputedStyle(alca).display : 'sem-alca';
  })
);
const inicio = { x: caixaCard.x + 26, y: caixaCard.y + 34 };
const destino = await page.locator('[data-pipeline-coluna="entrevista"] [data-pipeline-lista]').boundingBox();
console.log('DESTINO', JSON.stringify(destino), 'ID', id);

await page.mouse.move(inicio.x, inicio.y);
await page.mouse.down();
await page.mouse.move(inicio.x + 10, inicio.y + 10, {
  steps: 4,
});
await page.waitForTimeout(150);
console.log('CARDS DURANTE O ARRASTE (inclui overlay):', await page.locator('[data-candidato-card]').count());
await page.screenshot({ path: `${PASTA}/03-durante-arraste.png` });
await page.mouse.move(destino.x + destino.width / 2, destino.y + 60, { steps: 18 });
await page.waitForTimeout(300);
console.log(
  'DROP DESTACADO:',
  await page.locator('[data-pipeline-coluna="entrevista"]').getAttribute('data-pipeline-drop')
);
await page.mouse.up();
await page.waitForTimeout(1200);
const depoisDoDrop = await medir();
console.log('POS-DROP', JSON.stringify(depoisDoDrop.colunas, null, 2));
console.log(
  'CARD NO DESTINO:',
  await page.locator(`[data-pipeline-coluna="entrevista"] [data-candidato-card="${id}"]`).count()
);
console.log(
  'CARD NA ORIGEM:',
  await page.locator(`[data-pipeline-coluna="triagem"] [data-candidato-card="${id}"]`).count()
);
console.log('TOTAL CARDS (sem overlay):', await page.locator('[data-pipeline-board] [data-candidato-card]').count());
await page.screenshot({ path: `${PASTA}/04-apos-drop.png` });

// ── Scroll imediatamente após arrastar ───────────────────────────────────────
await page.evaluate(() => {
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
});
await page.waitForTimeout(200);
const alvoScroll = await page
  .locator(`[data-pipeline-coluna="entrevista"] [data-candidato-card="${id}"]`)
  .boundingBox();
await page.mouse.move(alvoScroll.x + 20, alvoScroll.y + 20);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(350);
const aposArraste = await medir();
console.log('SCROLL APOS DRAG:', JSON.stringify({ top: aposArraste.mainScrollTop }));

// ── Cancelamento com Escape ──────────────────────────────────────────────────
await page.evaluate(() => {
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
});
await page.waitForTimeout(250);
const cardTriagem = page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').first();
const idCancel = await cardTriagem.getAttribute('data-candidato-card');
const caixaCancel = await cardTriagem.boundingBox();
const antesCancel = (await medir()).colunas;
await page.mouse.move(caixaCancel.x + 26, caixaCancel.y + 34);
await page.mouse.down();
await page.mouse.move(caixaCancel.x + 66, caixaCancel.y + 74, { steps: 6 });
await page.waitForTimeout(200);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.mouse.up();
await page.waitForTimeout(600);
const depoisCancel = (await medir()).colunas;
console.log(
  'CANCELAMENTO:',
  JSON.stringify({
    id: idCancel,
    origemAntes: antesCancel.find((c) => c.id === 'triagem')?.cards,
    origemDepois: depoisCancel.find((c) => c.id === 'triagem')?.cards,
    destinoAntes: antesCancel.find((c) => c.id === 'entrevista')?.cards,
    destinoDepois: depoisCancel.find((c) => c.id === 'entrevista')?.cards,
  })
);

// ── Clique normal no card abre o dossiê ──────────────────────────────────────
await page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').first().click();
await page.waitForTimeout(900);
console.log('DIALOGO ABERTO:', await page.locator('[role="dialog"]').count());
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

// ── Filtro + coluna vazia (Teste E/H) ────────────────────────────────────────
const busca = page.locator('input[aria-label="Buscar candidatos"]');
await busca.fill('Thiago');
await page.waitForTimeout(700);
const filtrado = await medir();
console.log(
  'FILTRO THIAGO:',
  JSON.stringify({
    cards: await page.locator('[data-pipeline-board] [data-candidato-card]').count(),
    colunas: filtrado.colunas.map((c) => ({ id: c.id, cards: c.cards })),
    vazioEntrevista: await page.locator('[data-pipeline-coluna="entrevista"] [data-pipeline-vazio]').count(),
  })
);

const cardFiltro = page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').first();
const idFiltro = await cardFiltro.getAttribute('data-candidato-card');
const caixaFiltro = await cardFiltro.boundingBox();
const vazioDestino = await page.locator('[data-pipeline-coluna="entrevista"] [data-pipeline-lista]').boundingBox();
await page.mouse.move(caixaFiltro.x + 26, caixaFiltro.y + 34);
await page.mouse.down();
await page.mouse.move(caixaFiltro.x + 38, caixaFiltro.y + 46, { steps: 4 });
await page.waitForTimeout(150);
await page.mouse.move(vazioDestino.x + vazioDestino.width / 2, vazioDestino.y + 80, { steps: 16 });
await page.waitForTimeout(250);
await page.mouse.up();
await page.waitForTimeout(1300);
const aposFiltro = await medir();
console.log(
  'FILTRO POS-DROP:',
  JSON.stringify({
    destino: await page.locator(`[data-pipeline-coluna="entrevista"] [data-candidato-card="${idFiltro}"]`).count(),
    origem: await page.locator(`[data-pipeline-coluna="triagem"] [data-candidato-card="${idFiltro}"]`).count(),
    colunas: aposFiltro.colunas.map((c) => ({ id: c.id, cards: c.cards })),
    footer: await page.locator('[data-pipeline-footer]').innerText(),
  })
);
await page.screenshot({ path: `${PASTA}/05-filtro-coluna-vazia.png` });
await busca.fill('');
await page.waitForTimeout(900);

// ── Mobile ───────────────────────────────────────────────────────────────────
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.evaluate(() => {
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
});
const cardMobile = await page
  .locator('[data-pipeline-coluna="triagem"] [data-candidato-card]')
  .first()
  .boundingBox();
await page.mouse.move(cardMobile.x + 20, cardMobile.y + 20);
await page.mouse.wheel(0, 500);
await page.waitForTimeout(400);
const mobile = await medir();
console.log('SCROLL MOBILE:', JSON.stringify({ top: mobile.mainScrollTop }));
await page.screenshot({ path: `${PASTA}/05-mobile.png` });

await page.setViewportSize({ width: 1600, height: 900 });
await page.waitForTimeout(700);
await page.evaluate(() => {
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
});
await page.screenshot({ path: `${PASTA}/06-desktop-1600.png` });
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${PASTA}/07-notebook-1366.png` });

// ── Inspeção visual do card arrastado ────────────────────────────────────────
const cardInsp = page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').first();
const idInsp = await cardInsp.getAttribute('data-candidato-card');
const caixaInsp = await cardInsp.boundingBox();
await page.evaluate(() => {
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
});
await page.waitForTimeout(250);
await page.mouse.move(caixaInsp.x + 26, caixaInsp.y + 34);
await page.mouse.down();
await page.mouse.move(caixaInsp.x + 80, caixaInsp.y + 90, { steps: 6 });
await page.waitForTimeout(200);
const overlay = page.locator('[data-pipeline-arrastado]');
console.log(
  'OVERLAY:',
  JSON.stringify({
    existe: await overlay.count(),
    caixa: await overlay.boundingBox(),
    cardOriginal: await page.locator(`[data-pipeline-coluna="triagem"] [data-candidato-card="${idInsp}"]`).boundingBox(),
    estilo: await overlay.evaluate((no) => {
      const artigo = no.querySelector('article');
      const alca = no.querySelector('[data-pipeline-alca]');
      const es = artigo ? getComputedStyle(artigo) : null;
      return {
        etapaCor: getComputedStyle(no).getPropertyValue('--etapa-cor').trim(),
        border: es?.borderColor,
        shadow: es?.boxShadow,
        background: es?.backgroundImage?.slice(0, 120),
        alcaDisplay: alca ? getComputedStyle(alca).display : 'sem-alca',
      };
    }),
  })
);
await overlay.screenshot({ path: `${PASTA}/08-card-arrastado.png` });
await page.screenshot({ path: `${PASTA}/09-drag-livre.png` });
await page.mouse.up();
await page.waitForTimeout(900);

console.log('SCROLL RESULTADO', JSON.stringify(resultadoScroll));
await browser.close();

