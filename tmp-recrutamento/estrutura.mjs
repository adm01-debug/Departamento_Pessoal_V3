import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const medir = () =>
  page.evaluate(() => {
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const tablist = document.querySelector('[role="tablist"]');
    const board = document.querySelector('[data-pipeline-board]');
    const colunas = [...document.querySelectorAll('[data-pipeline-coluna]')];
    const listas = [...document.querySelectorAll('[data-pipeline-lista]')];
    const rodapes = [...document.querySelectorAll('[data-pipeline-rodape]')];
    const cards = [...document.querySelectorAll('[data-candidato-card]')];
    const footerInfo = document.querySelector('[data-pipeline-footer]');
    return {
      gapTabsBoard: tablist && board ? Math.round(rect(board).top - rect(tablist).bottom) : null,
      board: board
        ? {
            h: Math.round(rect(board).height),
            top: Math.round(rect(board).top),
            bottom: Math.round(rect(board).bottom),
            client: board.clientWidth,
            scroll: board.scrollWidth,
          }
        : null,
      colunas: colunas.map((coluna, i) => {
        const r = rect(coluna);
        const lista = listas[i];
        const rodape = rodapes[i];
        return {
          id: coluna.getAttribute('data-pipeline-coluna'),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          h: Math.round(r.height),
          rodapeBottom: rodape ? Math.round(rect(rodape).bottom) : null,
          listaClient: lista?.clientHeight,
          listaScroll: lista?.scrollHeight,
          rolagem: Boolean(lista && lista.scrollHeight > lista.clientHeight),
          vazia: Boolean(coluna.querySelector('[data-candidato-card]') === null),
        };
      }),
      cards: cards.map((card) => Math.round(rect(card).height)),
      gapBoardFooter: footerInfo && board ? Math.round(rect(footerInfo).top - rect(board).bottom) : null,
      footerInfoTexto: footerInfo?.innerText.replace(/\n+/g, ' · ').trim(),
    };
  });

function conferir(nome, dados) {
  const alturas = dados.colunas.map((c) => c.h);
  const topos = dados.colunas.map((c) => c.top);
  const basesRodape = dados.colunas.map((c) => c.rodapeBottom);
  const uniforme = Math.max(...alturas) - Math.min(...alturas) <= 1;
  const topoUniforme = Math.max(...topos) - Math.min(...topos) <= 1;
  const rodapesUniformes = Math.max(...basesRodape) - Math.min(...basesRodape) <= 1;
  console.log(
    nome,
    JSON.stringify(
      {
        gapTabsBoard: dados.gapTabsBoard,
        boardHeight: dados.board?.h,
        alturas,
        uniforme,
        topoUniforme,
        rodapesUniformes,
        basesRodape,
        rolagem: dados.colunas.map((c) => ({ id: c.id, rolagem: c.rolagem, client: c.listaClient, scroll: c.listaScroll })),
        cards: dados.cards,
        gapBoardFooter: dados.gapBoardFooter,
        footer: dados.footerInfoTexto,
      },
      null,
      2
    )
  );
  if (!uniforme || !topoUniforme || !rodapesUniformes) {
    throw new Error(`${nome}: colunas/rodapés desalinhados`);
  }
}

const viewports = [
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [390, 844],
];

for (const [width, height] of viewports) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(700);
  const dados = await medir();
  conferir(`${width}x${height}`, dados);
  await page.screenshot({ path: `tmp-recrutamento/estrutura-${width}.jpg`, type: 'jpeg', quality: 70 });
}

/* Cenário C: rolagem interna com a altura reduzida de 768 */
await page.setViewportSize({ width: 1366, height: 768 });
await page.waitForTimeout(600);
const antes = await medir();
const triagem = antes.colunas.find((c) => c.id === 'triagem');
console.log('ROLAGEM_INTERNA', JSON.stringify({ triagem, cards: antes.cards }));
const rolou = await page.evaluate(() => {
  const lista = document.querySelector('[data-pipeline-coluna="triagem"] [data-pipeline-lista]');
  if (!lista) return null;
  const antesRodape = document.querySelector('[data-pipeline-coluna="triagem"] [data-pipeline-rodape]').getBoundingClientRect().bottom;
  lista.scrollTop = lista.scrollHeight;
  const depoisRodape = document.querySelector('[data-pipeline-coluna="triagem"] [data-pipeline-rodape]').getBoundingClientRect().bottom;
  return { scrollTop: lista.scrollTop, antesRodape, depoisRodape, headerVisivel: Boolean(document.querySelector('[data-pipeline-coluna="triagem"] header')) };
});
console.log('ROLAGEM_APLICADA', JSON.stringify(rolou));

/* Cenário D/E: filtro com colunas vazias */
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(500);
const combo = page.locator('[data-pipeline-toolbar] [role="combobox"]');
await combo.click();
await page.getByRole('option', { name: 'Analista de Dados' }).click();
await page.waitForTimeout(1600);
const filtrado = await medir();
conferir('FILTRO_ANALISTA_DADOS', filtrado);
console.log('VAZIAS', JSON.stringify(filtrado.colunas.filter((c) => c.vazia).map((c) => c.id)));
await page.screenshot({ path: 'tmp-recrutamento/estrutura-filtro.jpg', type: 'jpeg', quality: 70 });

await browser.close();
