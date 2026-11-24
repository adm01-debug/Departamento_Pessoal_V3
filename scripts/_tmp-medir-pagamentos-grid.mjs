/** TEMPORÁRIO — mede a tabela de Pagamentos ANTES do grid compartilhado. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const SAIDA = 'tmp-pagamentos-grid';
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
await page.getByRole('tab', { name: /^Pagamentos$/ }).click();
await page.locator('tbody tr').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);

const relatorio = [];
for (const [w, h] of [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(700);

  const dados = await page.evaluate(() => {
    const tabela = document.querySelector('table');
    const ths = [...document.querySelectorAll('thead th')];
    const linhas = [...document.querySelectorAll('tbody tr')].slice(0, 5);
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width) };
    };
    return {
      tabela: r(tabela),
      rolagem: { scrollW: tabela.parentElement.scrollWidth, clientW: tabela.parentElement.clientWidth },
      pagina: { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth },
      colunas: ths.map((th, i) => {
        const rotulo = th.querySelector('span') ?? th;
        const medidas = linhas.map((tr) => {
          const td = tr.children[i];
          if (!td) return null;
          const conteudo = td.firstElementChild ?? td;
          const filhos = [...td.querySelectorAll('*')]
            .filter((el) => el.children.length === 0 && (el.textContent ?? '').trim())
            .map((el) => ({ texto: (el.textContent ?? '').trim().slice(0, 32), w: Math.ceil(el.getBoundingClientRect().width) }));
          const maior = filhos.sort((a, b) => b.w - a.w)[0] ?? null;
          return {
            tdW: Math.round(td.getBoundingClientRect().width),
            scrollW: td.scrollWidth,
            conteudoX: Math.round(conteudo.getBoundingClientRect().left),
            maiorTexto: maior,
          };
        });
        return {
          i,
          rotulo: (th.textContent ?? '').trim(),
          th: r(th),
          rotuloX: Math.round(rotulo.getBoundingClientRect().left),
          medidas,
        };
      }),
    };
  });
  relatorio.push({ viewport: `${w}x${h}`, ...dados });
  if (w === 1920 || w === 1440 || w === 1280) {
    await page.screenshot({ path: `${SAIDA}/antes-${w}.png` });
  }
}

writeFileSync(`${SAIDA}/antes.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
console.log('ERROS', JSON.stringify(erros));
await browser.close();
