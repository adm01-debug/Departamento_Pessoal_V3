/**
 * TEMPORÁRIO — (a) quem transborda a página em 390px (o botão Limpar filtros
 * não pode ser a causa) e (b) teste explícito de "voltar para a página 1".
 * Uso: node scripts/_tmp-checar-overflow-mobile.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 390, height: 900 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(4500);

const overflow = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const limite = document.documentElement.clientWidth;
  const culpados = [];
  document.querySelectorAll('main *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > limite + 1 && r.width > 20 && r.height > 8) {
      culpados.push({
        tag: el.tagName.toLowerCase(),
        classe: (el.className || '').toString().slice(0, 40),
        texto: texto(el).slice(0, 24),
        excesso: Math.round(r.right - limite),
      });
    }
  });
  const botao = document.querySelector('[aria-label="Limpar filtros"]');
  const rBotao = botao.getBoundingClientRect();
  return {
    limite,
    excessoDocumento: document.documentElement.scrollWidth - limite,
    botaoDentroDaTela: rBotao.right <= limite + 1,
    botaoBox: { x: Math.round(rBotao.x), right: Math.round(rBotao.right), w: Math.round(rBotao.width) },
    culpados: culpados.slice(0, 6),
  };
});
console.log('OVERFLOW 390:', JSON.stringify(overflow, null, 2));

// Página 2 sem filtros e depois a limpeza voltando para a 1
await page.setViewportSize({ width: 1512, height: 1200 });
await page.waitForTimeout(800);
const paginaAtual = () => page.evaluate(() => {
  const rodape = document.querySelector('table')?.closest('section')?.querySelector('footer');
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    pagina: texto(rodape?.querySelector('[aria-current="page"]')),
    linhas: document.querySelectorAll('tbody tr').length,
  };
});
await page.getByLabel('Buscar pagamentos').fill('a');
await page.waitForTimeout(900);
const p1 = await paginaAtual();
await page.getByRole('button', { name: 'Próxima página' }).click();
await page.waitForTimeout(900);
const p2 = await paginaAtual();
await page.getByLabel('Limpar filtros').click();
await page.waitForTimeout(900);
const p3 = await paginaAtual();
console.log('PAGINACAO:', JSON.stringify({ comFiltro: p1, aposAvancar: p2, aposLimpar: p3 }));
await contexto.close();
await browser.close();
