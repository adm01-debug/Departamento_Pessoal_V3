/** TEMPORÁRIO — foco visível + alinhamento vertical do cabeçalho. */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-botoes-cabecalho');
const browser = await chromium.launch();
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const contexto = await browser.newContext({
  storageState: state,
  viewport: { width: 1440, height: 900 },
});
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor();
await page.getByRole('tab', { name: /Catálogo/i }).click();
await page.waitForTimeout(1200);

const alinhamento = await page.evaluate(() => {
  const h1 = Array.from(document.querySelectorAll('h1')).find(
    (e) => (e.textContent ?? '').trim() === 'Treinamentos',
  );
  const hr = h1.getBoundingClientRect();
  const botoes = Array.from(document.querySelectorAll('button')).filter((b) =>
    /^(Novo Treinamento|Novo Curso)$/.test((b.textContent ?? '').trim()),
  );
  return botoes.map((b) => {
    const r = b.getBoundingClientRect();
    return {
      texto: b.textContent.trim(),
      tituloCentroY: Math.round(hr.top + hr.height / 2),
      botaoCentroY: Math.round(r.y + r.height / 2),
      delta: Math.round(r.y + r.height / 2 - (hr.top + hr.height / 2)),
    };
  });
});

await page.keyboard.press('Tab');
const alvo = page.getByRole('button', { name: 'Novo Curso' });
await alvo.focus();
await page.waitForTimeout(250);
const foco = await alvo.evaluate((el) => {
  const cs = getComputedStyle(el);
  return {
    focusVisible: el.matches(':focus-visible'),
    boxShadow: cs.boxShadow,
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
  };
});
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({
  path: path.join(SAIDA, 'estado-foco-catalogo-1440.png'),
  clip: { x: 1000, y: 60, width: 440, height: 130 },
});

console.log(JSON.stringify({ alinhamento, foco }, null, 2));
await contexto.close();
await browser.close();
