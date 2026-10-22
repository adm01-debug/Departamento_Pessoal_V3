/** TEMPORÁRIO — mede alinhamento cabeçalho × dados na tabela de Campanhas. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const SAIDA = 'tmp-campanhas-grid';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const contexto = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: 'e2e/.auth/user.json',
});
await contexto.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await contexto.newPage();
page.setDefaultTimeout(20000);
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));

await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
await page.locator('tbody tr').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);

const relatorio = [];
for (const [w, h] of [
  [1920, 1080],
  [1440, 900],
  [1366, 768],
  [1280, 800],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(700);

  const dados = await page.evaluate(() => {
    const tabela = document.querySelector('table');
    const ths = [...document.querySelectorAll('thead th')];
    const linha = document.querySelector('tbody tr');
    const tds = linha ? [...linha.children] : [];
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width) };
    };
    const conteudoTd = (td) => {
      const alvo = td.querySelector('div, span, p, button, a') ?? td;
      return r(alvo);
    };
    return {
      tabela: r(tabela),
      scroll: { w: document.documentElement.scrollWidth, client: document.documentElement.clientWidth },
      ths: ths.map((th, i) => ({
        i,
        rotulo: (th.textContent ?? '').trim(),
        th: r(th),
        span: r(th.querySelector('span') ?? th),
        dados: tds[i] ? r(tds[i]) : null,
        conteudo: tds[i] ? conteudoTd(tds[i]) : null,
      })),
    };
  });
  relatorio.push({ viewport: `${w}x${h}`, ...dados });
  if (w === 1440 || w === 1280) {
    await page.screenshot({ path: `${SAIDA}/antes-${w}.png` });
  }
}

writeFileSync(`${SAIDA}/antes.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
console.log('ERROS', JSON.stringify(erros));
await browser.close();
