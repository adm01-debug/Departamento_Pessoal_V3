/** TEMPORÁRIO — capturas finais do bloco à direita (tema escuro). */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1568, height: 1000 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.waitForTimeout(1500);

const trocarCiclo = async (nome) => {
  await page.locator('[role="combobox"]').first().click();
  await page.waitForTimeout(600);
  const opcoes = page.getByRole('option');
  const total = await opcoes.count();
  for (let i = 0; i < total; i += 1) {
    const t = ((await opcoes.nth(i).textContent()) ?? '').trim();
    if (t.includes(nome)) {
      await opcoes.nth(i).click();
      break;
    }
  }
  await page.waitForTimeout(2000);
};

for (const ciclo of ['Ciclo S1 2026', 'Ciclo S2 2026']) {
  await trocarCiclo(ciclo);
  await page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Aguardando gestor/ })
    .first()
    .click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `tmp-alinhamento-direita/final-${ciclo.replace(/\s+/g, '')}.png` });
  await page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Todos/ })
    .first()
    .click();
  await page.waitForTimeout(1400);
}
await page.screenshot({ path: 'tmp-alinhamento-direita/final-lista.png' });
await browser.close();
console.log('capturas ok');
