/**
 * TEMPORÁRIO — quem causa o scroll horizontal em 1024/390 na Auditoria?
 * Confirma se é anterior à padronização de movimento (nenhuma classe de layout
 * foi alterada) listando os elementos que ultrapassam o viewport.
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const storage = existsSync('e2e/.auth/user.json') ? 'e2e/.auth/user.json' : undefined;
const browser = await chromium.launch();

for (const [w, h] of [
  [1024, 768],
  [390, 844],
]) {
  const contexto = await browser.newContext({ viewport: { width: w, height: h }, storageState: storage });
  await contexto.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  const page = await contexto.newPage();
  await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login')) {
    await page.getByLabel(/e-?mail/i).first().fill('admin@teste.local');
    await page.getByLabel(/senha|password/i).first().fill('Admin@2026!');
    await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  }
  await page.getByRole('tab', { name: /^Auditoria$/ }).click();
  await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(2200);

  const dados = await page.evaluate(() => {
    const largura = document.documentElement.clientWidth;
    const culpados = [...document.querySelectorAll('body *')]
      .map((el) => {
        const b = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 90),
          left: Math.round(b.left),
          right: Math.round(b.right),
          w: Math.round(b.width),
        };
      })
      .filter((e) => e.right > largura + 2 && e.w > 20)
      .slice(0, 14);
    const secao = document.querySelector('section[aria-label="Filtros da auditoria"]').getBoundingClientRect();
    const grade = document.querySelector('section[aria-label="Filtros da auditoria"] > div').getBoundingClientRect();
    return {
      largura,
      scrollWidth: document.documentElement.scrollWidth,
      secao: { left: Math.round(secao.left), right: Math.round(secao.right), w: Math.round(secao.width) },
      grade: { left: Math.round(grade.left), right: Math.round(grade.right), w: Math.round(grade.width) },
      culpados,
    };
  });
  console.log(w, JSON.stringify(dados, null, 2));
  await contexto.close();
}

await browser.close();
