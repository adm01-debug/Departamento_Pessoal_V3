/**
 * TEMPORÁRIO — mede a altura real dos três cards analíticos da Gestão de
 * Desempenho. Uso: node scripts/_medir-cards.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const ALVO = process.argv[2] ?? 'tmp-cards-grid.png';
const LARGURA = Number(process.argv[3] ?? 1586);

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: LARGURA, height: 1000 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.locator('[role="tablist"]').first().waitFor({ timeout: 30000 });
await page.getByText('Feedbacks por Status').first().waitFor({ timeout: 15000 });
await page.waitForTimeout(3200);

const dados = await page.evaluate(() => {
  const round = (n) => Math.round(n * 10) / 10;
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: round(r.width), h: round(r.height), top: round(r.top), bottom: round(r.bottom) };
  };
  const grade = [...document.querySelectorAll('div')].find((e) => /xl:grid-cols-3/.test(String(e.className)));
  const cards = [...document.querySelectorAll('div')].filter(
    (e) => /border-border\/30/.test(String(e.className)) && /h-full/.test(String(e.className))
  );
  const detalhe = (card) => {
    const header = card.querySelector(':scope > div');
    const content = card.querySelector(':scope > div:nth-child(2)');
    // Donut: container `relative` com lado em px (card A)
    const donut = card.querySelector('div.relative[class*="h-["]');
    // Linhas de dados = elementos "linha" mais internos (flex/grid com spans)
    const todos = [...content.querySelectorAll('*')].filter(
      (e) => /items-center/.test(String(e.className)) && e.querySelector('span')
    );
    const candidatos = todos.filter((e) => !todos.some((o) => o !== e && e.contains(o)));
    const linhasBox = candidatos.map(box);
    // Linhas reais (containers) — card B: `h-[26px]`; card C: `min-h-[27px]`
    const reais = [...content.querySelectorAll('*')].filter((e) =>
      /h-\[26px\]|min-h-\[27px\]/.test(String(e.className))
    );
    const reaisBox = reais.map(box);
    const blocoTopo = reaisBox.length ? round(reaisBox[0].top) : null;
    const blocoBase = reaisBox.length ? round(reaisBox[reaisBox.length - 1].bottom) : null;
    const primeiro = linhasBox[0];
    const ultimo = linhasBox[linhasBox.length - 1];
    const conteudoBox = box(content);
    // Auditoria de corte/estouro: elementos com conteúdo mais largo que a caixa
    // (clipping) e elementos que ultrapassam os limites do card em X.
    const cardBox = card.getBoundingClientRect();
    const estouros = [...card.querySelectorAll('*')]
      .filter((e) => {
        if (e.scrollWidth > e.clientWidth + 1) return true;
        const r = e.getBoundingClientRect();
        return r.width > 0 && (r.right > cardBox.right + 1 || r.left < cardBox.left - 1);
      })
      .map((e) => ({
        tag: e.tagName.toLowerCase(),
        cls: String(e.className).slice(0, 60),
        texto: (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 30),
      }));
    return {
      titulo: (card.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 30),
      card: box(card),
      header: box(header),
      content: conteudoBox,
      donut: box(donut),
      linhas: linhasBox.length,
      alturasLinhas: linhasBox.map((b) => b.h),
      alturaLinhasReais: reaisBox.map((b) => b.h),
      blocoLinhasAltura: blocoTopo !== null ? round(blocoBase - blocoTopo) : null,
      espacoAbaixoDoBloco: blocoBase !== null && conteudoBox ? round(conteudoBox.bottom - blocoBase) : null,
      espacoLivreTopo: primeiro && conteudoBox ? round(primeiro.top - conteudoBox.top) : null,
      espacoLivreBase: ultimo && conteudoBox ? round(conteudoBox.bottom - ultimo.bottom) : null,
      estouros: estouros.length,
      exemplosEstouro: estouros.slice(0, 4),
      pai: box(card.parentElement),
    };
  };
  return { viewport: window.innerWidth, grade: box(grade), cards: cards.map(detalhe) };
});

fs.writeFileSync('tmp-cards-medidas.json', JSON.stringify(dados, null, 2));
console.log(JSON.stringify(dados, null, 2));

const grade = await page.locator('div', { has: page.getByText('Feedbacks por Status') }).first();
const gridBox = await page.evaluate(() => {
  const g = [...document.querySelectorAll('div')].find((e) => /xl:grid-cols-3/.test(String(e.className)));
  if (!g) return null;
  const r = g.getBoundingClientRect();
  return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
});
if (gridBox) {
  await page.screenshot({ path: ALVO, clip: gridBox });
}
await browser.close();
