/**
 * TEMPORÁRIO — prova de ORIGEM DE DADOS no módulo de Desempenho (SOMENTE LEITURA).
 * Abre /avaliacao com a sessão salva e fotografa Ciclos, Feedbacks e Nine-Box.
 * Uso: node scripts/_tmp-probe-desempenho.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:8080';
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1500, height: 950 },
});
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)));

const abas = [];
async function abrirAba(nome, arquivo) {
  const registro = { aba: nome };
  try {
    await page.getByRole('tab', { name: nome }).first().click({ timeout: 12000 });
    await page.waitForTimeout(3500);
  } catch (e) {
    registro.erroClique = String(e.message).slice(0, 120);
  }
  try {
    await page.screenshot({ path: arquivo, fullPage: false });
    registro.texto = await page.evaluate(() => (document.body.innerText ?? '').replace(/\s+/g, ' ').slice(0, 260));
    registro.qtdLinhas = await page.evaluate(
      () => document.querySelectorAll('[data-slot], article, li, tr').length
    );
  } catch (e) {
    registro.erroLeitura = String(e.message).slice(0, 120);
  }
  abas.push(registro);
}

try {
  await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);
  await abrirAba('Ciclos', 'tmp-real-ciclos.png');
  await abrirAba('Feedbacks', 'tmp-real-feedbacks.png');
  await abrirAba('Nine-Box', 'tmp-real-ninebox.png');
  console.log(JSON.stringify({ abas, erros: erros.slice(0, 5) }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ fatal: String(e.message).slice(0, 300), abas, erros }, null, 2));
} finally {
  await browser.close();
  process.exit(0);
}

