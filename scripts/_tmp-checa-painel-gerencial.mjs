/** TEMPORÁRIO — confirma que o Painel Gerencial (IMAGEM 3) segue na aba Pagamentos. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const contexto = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1456, height: 1000 },
});
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(1500);

const painel = await page
  .getByText(/Painel Gerencial de Auditoria & ROI v1\.2/)
  .count();
const colunasPainel = await page.evaluate(() => {
  const tabelas = Array.from(document.querySelectorAll('table'));
  const gerencial = tabelas.find((t) => /COLABORADOR/i.test(t.textContent ?? '') && t.querySelectorAll('thead th').length === 6);
  return {
    tabelasNaAba: tabelas.length,
    colunasDoPainel: Array.from(gerencial?.querySelectorAll('thead th') ?? []).map((t) =>
      (t.textContent ?? '').trim(),
    ),
    selectsDoPainel: document.querySelectorAll('select').length,
    botoesCsvPdf: ['CSV', 'PDF'].map((rotulo) =>
      Array.from(document.querySelectorAll('button')).some((b) => (b.textContent ?? '').includes(rotulo)),
    ),
  };
});
console.log(JSON.stringify({ painelGerencial: painel > 0, ...colunasPainel }, null, 2));
await contexto.close();
await browser.close();
