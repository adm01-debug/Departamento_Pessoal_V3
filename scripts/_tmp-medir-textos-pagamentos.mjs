/** TEMPORÁRIO — larguras naturais de texto (canvas) para calibrar mínimos. */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const contexto = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  storageState: 'e2e/.auth/user.json',
});
await contexto.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await contexto.newPage();
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: /^Pagamentos$/ }).click();
await page.locator('tbody tr').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);

const dados = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const larguraTexto = (el, texto) => {
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return Math.ceil(ctx.measureText(texto).width);
  };
  const linhas = [...document.querySelectorAll('tbody tr')].slice(0, 6);
  const ths = [...document.querySelectorAll('thead th')].map((th) => (th.textContent ?? '').trim());

  const nomes = linhas.map((tr) => {
    const td = tr.children[1];
    const span = td.querySelector('span.break-words') ?? td;
    const texto = (span.textContent ?? '').trim();
    return { texto, w: larguraTexto(span, texto) };
  });
  const campanhas = linhas.map((tr) => {
    const td = tr.children[2];
    const span = td.querySelector('span.break-words') ?? td;
    const texto = (span.textContent ?? '').trim();
    return { texto, w: larguraTexto(span, texto) };
  });
  const valores = [3, 4, 5].map((i) =>
    linhas.map((tr) => {
      const td = tr.children[i];
      const texto = (td.textContent ?? '').trim();
      return { texto, w: larguraTexto(td, texto) };
    })
  );
  const badges = linhas.map((tr) => {
    const badge = tr.children[6]?.querySelector('span');
    const texto = (badge?.textContent ?? '').trim();
    return badge ? { texto, w: larguraTexto(badge, texto) + 8 } : null;
  });
  const acoes = linhas.map((tr) => {
    const grupo = tr.children[7]?.firstElementChild;
    return grupo ? Math.ceil(grupo.getBoundingClientRect().width) : null;
  });
  return {
    ths,
    nomes,
    campanhas,
    valores,
    badges,
    acoes,
    checkbox: (() => {
      const cb = document.querySelector('tbody tr td button[role="checkbox"], tbody tr td [role="checkbox"]');
      return cb ? Math.ceil(cb.getBoundingClientRect().width) : null;
    })(),
  };
});

writeFileSync('tmp-pagamentos-grid/textos.json', JSON.stringify(dados, null, 2));
console.log(JSON.stringify(dados, null, 2));
await browser.close();
