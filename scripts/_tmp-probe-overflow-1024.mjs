/** TEMPORÁRIO — quem causa overflow horizontal em 1024? */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1024, height: 950 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
const page = await context.newPage();
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.waitForTimeout(1500);
await page
  .getByRole('group', { name: 'Segmentar por tipo de feedback' })
  .getByRole('button', { name: /Aguardando gestor/ })
  .first()
  .click();
await page.waitForTimeout(1800);

const out = await page.evaluate(() => {
  const vw = window.innerWidth;
  const estouram = Array.from(document.querySelectorAll('body *'))
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.right > vw + 1)
    .map(({ el, r }) => ({
      tag: el.tagName.toLowerCase(),
      classe: String(el.className ?? '').slice(0, 120),
      texto: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
      right: Number(r.right.toFixed(2)),
      width: Number(r.width.toFixed(2)),
    }))
    .slice(0, 12);
  const card = Array.from(document.querySelectorAll('div[class*="rounded-xl"]')).find((el) =>
    /gestor responsável/i.test(el.innerText ?? '')
  );
  const colunas = card
    ? Array.from(card.children).map((c) => ({
        classe: String(c.className ?? '').slice(0, 80),
        width: Number(c.getBoundingClientRect().width.toFixed(2)),
      }))
    : [];
  return {
    vw,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth,
    estouram,
    cardScroll: card ? { client: card.clientWidth, scroll: card.scrollWidth } : null,
    colunas,
  };
});
console.log(JSON.stringify(out, null, 2).slice(0, 4000));
await page.screenshot({ path: 'tmp-alinhamento-direita/overflow-1024.png' });
await browser.close();
