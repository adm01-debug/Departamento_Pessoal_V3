/** TEMPORÁRIO — 10 ciclos abrir/fechar com visibilidade final e foco. */
import { chromium } from '@playwright/test';
import { appendFileSync, existsSync } from 'node:fs';

const log = (m) => appendFileSync('tmp-modal-auditoria/ciclos.log', `${m}\n`);
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
page.setDefaultTimeout(20000);
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));

await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: /^Auditoria$/ }).click();
await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(1800);

for (let i = 0; i < 10; i += 1) {
  const inicio = Date.now();
  const botao = page.getByRole('button', { name: /Ver detalhes/ }).nth(i % 3);
  await botao.click();
  await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(2000);

  const estado = await page.evaluate(() => {
    const dialogo = document.querySelector('[role="dialog"]');
    const corpo = dialogo?.querySelector(':scope > div');
    const itens = corpo ? [...corpo.children] : [];
    const tr = dialogo ? getComputedStyle(dialogo).transform : null;
    return {
      blocos: itens.length,
      invisiveis: itens.filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
      transformFinal: tr,
    };
  });

  await page.keyboard.press('Escape');
  await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 6000 });
  await page.waitForTimeout(150);
  const foco = await page.evaluate(() => (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim());

  log(JSON.stringify({ ciclo: i + 1, ms: Date.now() - inicio, ...estado, foco }));
}

log(JSON.stringify({ erros }));
await browser.close();
