/** TEMPORÁRIO — os controles animados continuam funcionais (Select/ordenação). */
import { chromium } from '@playwright/test';
import { appendFileSync, existsSync } from 'node:fs';

const log = (m) => appendFileSync('tmp-auditoria-animacao-v2/interacao.log', `${m}\n`);
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
if (page.url().includes('/login')) {
  await page.getByLabel(/e-?mail/i).first().fill('admin@teste.local');
  await page.getByLabel(/senha|password/i).first().fill('Admin@2026!');
  await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
}
await page.getByRole('tab', { name: /^Auditoria$/ }).click();
await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2000);

const totalAntes = await page.locator('[data-testid="auditoria-evento"]').count();

// Abre o Select "Tipo de evento" e escolhe a 2ª opção (a 1ª é "Todos os tipos").
await page.locator('button[aria-label="Tipo de evento"]').click();
await page.getByRole('option').nth(1).click();
await page.waitForTimeout(1400);
const textoTipo = (await page.locator('button[aria-label="Tipo de evento"]').innerText()).trim();
const totalDepois = await page.locator('[data-testid="auditoria-evento"]').count();
const painel = await page.evaluate(() => {
  const el = document.querySelector('section[aria-label="Filtros da auditoria"]');
  const cs = getComputedStyle(el);
  return { op: Number(cs.opacity), tr: cs.transform };
});
log(JSON.stringify({ etapa: 'select tipo', textoTipo, totalAntes, totalDepois, painel }));

// Ordenação: "Mais antigos".
await page.locator('button[aria-label="Ordenar por"]').click();
await page.getByRole('option', { name: 'Mais antigos' }).click();
await page.waitForTimeout(1400);
const primeiroGrupo = (await page.locator('[data-testid="auditoria-grupo-cabecalho"] h3').first().innerText()).trim();
const ordem = (await page.locator('button[aria-label="Ordenar por"]').innerText()).trim();
const painel2 = await page.evaluate(() => {
  const el = document.querySelector('section[aria-label="Filtros da auditoria"]');
  return Number(getComputedStyle(el).opacity);
});
log(JSON.stringify({ etapa: 'ordenacao', ordem, primeiroGrupo, painel: painel2 }));

// Exportações continuam clicáveis (download simulado ou toast).
let downloads = 0;
page.on('download', () => (downloads += 1));
await page.getByRole('button', { name: 'CSV' }).click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'PDF' }).click();
await page.waitForTimeout(800);
log(JSON.stringify({ etapa: 'exportacoes', downloads, erros }));

await browser.close();
