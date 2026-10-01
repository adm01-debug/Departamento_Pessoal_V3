/**
 * VERIFICAÇÃO VISUAL TEMPORÁRIA (apagar no fim).
 * Abre a visão "Cards" de Gestão de Candidatos no dev server real, em tema
 * escuro, e:
 *   1) imprime o CSS COMPUTADO do card (fundo base, gradiente, borda, sombra);
 *   2) amostra os PIXELS REAIS do topo / meio / base do card (o screenshot é
 *      decodificado num <canvas> dentro da própria página): prova que topo e
 *      base ganham o verde `--success` e que o miolo segue navy;
 *   3) salva um PNG da grade para inspeção e mede o hover.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://localhost:8080';
const state = fs.existsSync('e2e/.auth/user.json') ? 'e2e/.auth/user.json' : undefined;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
  deviceScaleFactor: 1,
  ...(state ? { storageState: state } : {}),
});
await ctx.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await ctx.newPage();

await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });

if (page.url().includes('/login')) {
  console.log('sessão expirada — autenticando como admin de teste');
  await page.getByLabel(/e-?mail/i).first().fill(process.env.E2E_USER_EMAIL ?? 'admin@teste.local');
  await page.getByLabel(/senha|password/i).first().fill(process.env.E2E_USER_PASSWORD ?? 'Admin@2026!');
  await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
}

console.log('URL:', page.url(), '| tema:', await page.evaluate(() => document.documentElement.className));

// A tela /admissoes abre na aba Dashboard — "Gestão de Candidatos" é uma aba.
await page.getByRole('tab', { name: 'Gestão de Candidatos' }).first().click({ timeout: 20000 });
await page.waitForTimeout(800);

await page.getByRole('button', { name: 'Cards', exact: true }).first().click({ timeout: 20000 });
const grade = page.locator('[class*="xl:grid-cols-3"]').first();
await grade.waitFor({ state: 'visible', timeout: 20000 });
await page.waitForTimeout(700);

const card = grade.locator('> div').first();
const computed = await card.evaluate((el) => {
  const s = getComputedStyle(el);
  return {
    'background-color': s.backgroundColor,
    'background-image': s.backgroundImage,
    'border-color': s.borderColor,
    'box-shadow': s.boxShadow.replace(/\)\s*/g, ') '),
    'border-radius': s.borderRadius,
    'padding': s.padding,
  };
});
console.log('\n=== CSS COMPUTADO DO CARD ===');
for (const [k, v] of Object.entries(computed)) console.log(`${k}: ${v}`);

const box = await card.boundingBox();
const shot = await card.screenshot();
const amostras = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const at = (y) =>
    `y=${String(y).padStart(3)}  rgb(` +
    Array.from(g.getImageData(Math.round(img.width * 0.5), y, 1, 1).data)
      .slice(0, 3)
      .join(', ') +
    ')';
  const ys = [1, 4, Math.round(img.height * 0.15), Math.round(img.height / 2), Math.round(img.height * 0.85), img.height - 5, img.height - 2];
  return { tamanho: `${img.width}x${img.height}`, linhas: ys.map(at) };
}, shot.toString('base64'));
console.log('\n=== PIXELS REAIS DO CARD (coluna central, topo → base) ===');
console.log('tamanho:', amostras.tamanho);
console.log(amostras.linhas.join('\n'));

await card.hover();
await page.waitForTimeout(400);
const hover = await card.evaluate((el) => {
  const s = getComputedStyle(el);
  return { 'border-color': s.borderColor, 'background-color': s.backgroundColor, 'box-shadow': s.boxShadow.slice(0, 90) };
});
console.log('\n=== CARD EM HOVER ===');
for (const [k, v] of Object.entries(hover)) console.log(`${k}: ${v}`);

await page.mouse.move(5, 5);
await page.waitForTimeout(300);
fs.writeFileSync('tmp-cards-grade-dark.png', await grade.screenshot());
console.log('\nPNG salvo: tmp-cards-grade-dark.png | card box:', JSON.stringify(box));

await browser.close();
