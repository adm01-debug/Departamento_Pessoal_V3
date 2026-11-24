/** TEMPORÁRIO — larguras reais dos botões de ação (natural × atual). */
import { chromium } from '@playwright/test';
import { appendFileSync, existsSync } from 'node:fs';

const log = (m) => appendFileSync('tmp-pagamentos-grid/acoes.log', `${m}\n`);
const browser = await chromium.launch();
const contexto = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: existsSync('e2e/.auth/user.json') ? 'e2e/.auth/user.json' : undefined,
});
await contexto.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await contexto.newPage();
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: /^Pagamentos$/ }).click();
await page.locator('tbody tr').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2200);

const dados = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  return [...document.querySelectorAll('tbody tr')].slice(0, 6).map((tr) => {
    const td = tr.children[7];
    const botao = td.querySelector('button');
    const cs = getComputedStyle(botao);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const texto = (botao?.textContent ?? '').trim();
    const larguraTexto = Math.ceil(ctx.measureText(texto).width);
    return {
      texto,
      larguraTexto,
      botaoW: Math.ceil(botao.getBoundingClientRect().width),
      botaoScrollW: botao.scrollWidth,
      grupoConteudo: Math.ceil(
        [...td.firstElementChild.children].reduce((soma, el) => soma + el.getBoundingClientRect().width, 0) +
          6 * ([...td.firstElementChild.children].length - 1)
      ),
    };
  });
});
log(JSON.stringify(dados, null, 2));
await browser.close();
