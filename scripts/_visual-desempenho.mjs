/**
 * TEMPORÁRIO — diagnóstico visual da Gestão de Desempenho.
 * Uso: node scripts/_visual-desempenho.mjs <out.txt> <width>
 */
import { chromium } from '@playwright/test';

const OUT = process.argv[2] ?? 'desempenho-out.txt';
const WIDTH = Number(process.argv[3] ?? 1600);

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: WIDTH, height: 1000 },
});
const page = await context.newPage();
// Tema dark (o da referência) + tour já visto.
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });
await page.waitForTimeout(2000);

const dados = await page.evaluate(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      height: Math.round(r.height),
      left: Math.round(r.left),
      right: Math.round(r.right),
      width: Math.round(r.width),
    };
  };

  const tablist = document.querySelector('[role="tablist"]');
  const csTab = tablist ? getComputedStyle(tablist) : null;
  const tabs = [...document.querySelectorAll('[role="tab"]')].map((t) => ({
    texto: t.textContent?.trim(),
    box: box(t),
    cortado: t.scrollWidth > t.clientWidth + 1,
  }));

  const combobox = document.querySelector('[role="combobox"]');
  const novoCiclo = [...document.querySelectorAll('button')].find((b) => /Novo Ciclo/i.test(b.textContent ?? ''));

  // Card "Ciclo Ativo": primeiro ancestral do badge com rounded pontual.
  const badge = [...document.querySelectorAll('span,div')].find((e) => /^ciclo ativo$/i.test((e.textContent ?? '').trim()));
  let card = badge;
  while (card && !getComputedStyle(card).borderRadius.startsWith('16')) card = card.parentElement;

  return {
    tablist: tablist
      ? {
          ...box(tablist),
          className: tablist.className,
          overflowX: csTab.overflowX,
          overflowY: csTab.overflowY,
          clientHeight: tablist.clientHeight,
          scrollHeight: tablist.scrollHeight,
          clientWidth: tablist.clientWidth,
          scrollWidth: tablist.scrollWidth,
          scrollVertical: tablist.scrollHeight > tablist.clientHeight + 1,
          scrollHorizontal: tablist.scrollWidth > tablist.clientWidth + 1,
        }
      : null,
    abas: tabs,
    seletorCiclo: box(combobox),
    novoCiclo: box(novoCiclo),
    cardCicloAtivo: box(card),
    viewportWidth: window.innerWidth,
  };
});

const fs = await import('node:fs');
fs.writeFileSync(OUT, JSON.stringify({ width: WIDTH, ...dados }, null, 2));
console.log(JSON.stringify({ width: WIDTH, ...dados }, null, 2));
await page.screenshot({ path: OUT.replace(/\.txt$/, '.png'), fullPage: true });
await browser.close();
