/** TEMPORÁRIO — probe: por que o modal some? (card "Concluído") */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-probe-concluido';
mkdirSync(OUT, { recursive: true });
const relat = [];
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 950 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
const page = await context.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') relat.push({ console: m.text().slice(0, 200) });
});
page.on('pageerror', (e) => relat.push({ pageerror: String(e).slice(0, 200) }));

const linha = () =>
  page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role="dialog"]'));
    return {
      t: Math.round(performance.now()),
      quantos: els.length,
      texto: els.length ? (els[els.length - 1].innerText ?? '').replace(/\s+/g, ' ').slice(0, 50) : null,
      cardsConcluido: Array.from(document.querySelectorAll('button')).filter(
        (b) => (b.textContent ?? '').trim() === 'Ver feedback'
      ).length,
    };
  });

try {
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.waitForTimeout(1500);

  const cards = page.locator('div[class*="rounded-xl"]').filter({ hasText: 'Concluído' });
  const total = await cards.count();
  relat.push({ passo: 'cards-com-Concluído', total });

  let abriu = false;
  for (let i = 0; i < total && !abriu; i += 1) {
    const botao = cards.nth(i).getByRole('button', { name: /Ver feedback|Ver avaliação/ }).first();
    if (!(await botao.isVisible().catch(() => false))) continue;
    await botao.click();
    abriu = await page
      .getByRole('dialog')
      .last()
      .waitFor({ timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    relat.push({ passo: `tentativa-${i}`, abriu });
  }

  for (let i = 0; i < 16; i += 1) {
    relat.push({ passo: `poll-${i}`, estado: await linha().catch((e) => ({ erro: String(e).slice(0, 120) })) });
    await page.waitForTimeout(750);
  }
  await page.screenshot({ path: `${OUT}/fim.png` });
} catch (erro) {
  relat.push({ passo: 'erro', detalhe: String(erro?.message ?? erro).slice(0, 400) });
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relat, null, 2));
  console.log(JSON.stringify(relat.slice(0, 40), null, 2));
}
