/**
 * TEMPORÁRIO — mede a estrutura interna do 1º cartão de indicador e dos itens dos
 * painéis laterais (para calibrar densidade sem chutar).
 * Uso: node scripts/_tmp-medir-cartoes.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 816 },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);

  const dados = await page.evaluate(() => {
    const r = (el) => (el ? { a: Math.round(el.getBoundingClientRect().height), w: Math.round(el.getBoundingClientRect().width) } : null);
    const tablist = document.querySelector('[role="tablist"]');
    const grid = tablist?.parentElement?.nextElementSibling;
    const cartoes = Array.from(grid?.children ?? []);
    const detalhe = cartoes.map((c) => ({
      altura: r(c)?.a,
      largura: r(c)?.w,
      conteudo: Array.from(c.children).map((f) => ({
        tag: f.tagName.toLowerCase(),
        classe: String(f.className).slice(0, 60),
        altura: r(f)?.a,
        filhos: Array.from(f.children).map((g) => ({ tag: g.tagName.toLowerCase(), altura: r(g)?.a, texto: (g.textContent ?? '').slice(0, 28) })),
      })),
    }));
    const painel = Array.from(document.querySelectorAll('h3')).find((h) => /PRÓXIMAS AÇÕES/i.test(h.textContent ?? ''))?.closest('section');
    const itensPainel = Array.from(painel?.querySelectorAll('li') ?? []).map((li) => r(li)?.a);
    return { cartoes: detalhe, itensPainel };
  });

  writeFileSync('tmp-medir-cartoes.json', JSON.stringify(dados, null, 2));
  console.log(JSON.stringify(dados, null, 2));
} finally {
  await browser.close();
}
