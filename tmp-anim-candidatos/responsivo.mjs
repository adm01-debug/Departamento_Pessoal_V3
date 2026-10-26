import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const SAIDA = 'tmp-anim-candidatos';
mkdirSync(SAIDA, { recursive: true });
const VIEWPORTS = [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
];

const medir = () => {
  const tabela = document.querySelector('table');
  const wrap = tabela?.parentElement;
  const ths = [...(tabela?.querySelectorAll('thead th') ?? [])];
  const trs = [...(tabela?.querySelectorAll('tbody tr') ?? [])];
  const r = tabela?.getBoundingClientRect();
  return {
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    tabelaVisivel: !!r && r.width > 0 && getComputedStyle(tabela).display !== 'none',
    tabelaW: r ? Math.round(r.width) : 0,
    wrapClient: wrap ? wrap.clientWidth : 0,
    wrapScroll: wrap ? wrap.scrollWidth : 0,
    colunas: ths.map((th) => Math.round(th.getBoundingClientRect().width)),
    linhas: trs.length,
    alturas: trs.map((tr) => Math.round(tr.getBoundingClientRect().height)),
    cards: document.querySelectorAll('[data-candidato-card]').length,
  };
};

const browser = await chromium.launch();
const resultados = [];

for (const [width, height] of VIEWPORTS) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width, height },
  });
  await context.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));

  await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Candidatos', exact: true }).click();
  await page.locator('table tbody tr').first().waitFor({ state: 'attached' }).catch(() => {});
  await page.waitForTimeout(450);
  const meio = await page.evaluate(medir);
  await page.waitForTimeout(1500);
  const fim = await page.evaluate(medir);
  await page.screenshot({ path: `${SAIDA}/resp-${width}x${height}.png` });

  const colunasIguais = JSON.stringify(meio.colunas) === JSON.stringify(fim.colunas);
  const alturasIguais = JSON.stringify(meio.alturas) === JSON.stringify(fim.alturas);
  const semOverflowTabela = fim.wrapScroll <= fim.wrapClient + 1;

  resultados.push({
    viewport: `${width}x${height}`,
    meio,
    fim,
    colunasIguais,
    alturasIguais,
    semOverflowTabela,
    erros,
    semInstabilidade: await page.evaluate(
      () => !document.body.innerText.includes('Instabilidade Detectada')
    ),
  });
  console.error('[resp]', width, JSON.stringify({ colunasIguais, alturasIguais, semOverflowTabela, docOverflow: fim.docOverflow }));
  await context.close();
}

writeFileSync(`${SAIDA}/responsivo.json`, JSON.stringify(resultados, null, 2), 'utf8');
console.log(JSON.stringify(resultados, null, 2));
await browser.close();
