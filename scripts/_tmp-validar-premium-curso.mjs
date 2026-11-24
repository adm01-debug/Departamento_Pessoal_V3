/** TEMPORÁRIO — valida o refinamento premium e as dimensões preservadas. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const OUT = 'tmp-redesign-curso';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--disable-frame-rate-limit'] });
const rel = {};

async function abrir(page) {
  await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2700);
  await page.getByRole('tab', { name: 'Catálogo' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Ver curso/ }).first().click();
  await page.waitForTimeout(2000);
}

try {
  for (const [nome, theme, w, h] of [
    ['premium-dark-1440', 'dark', 1440, 900],
    ['premium-light-1440', 'light', 1440, 900],
    ['premium-dark-390', 'dark', 390, 844],
  ]) {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: w, height: h } });
    await context.addInitScript(
      ({ t }) => {
        localStorage.setItem('dp-tour-completed', 'true');
        localStorage.setItem('ui-theme', t);
      },
      { t: theme }
    );
    const page = await context.newPage();
    await abrir(page);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${nome}.png` });
    if (nome === 'premium-dark-1440') {
      rel.estilos = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const r = d.getBoundingClientRect();
        const icon = d.querySelector('h2')?.parentElement?.parentElement?.querySelector('span[aria-hidden]');
        const badgeCat = d.querySelector('span[title], span') && null;
        const spans = Array.from(d.querySelectorAll('span'));
        const cat = spans.find((s) => s.textContent.trim() === 'Desenvolvimento Pessoal' && s.className.includes('rounded-full'));
        const obrig = spans.find((s) => s.textContent.trim() === 'Opcional');
        const tiles = Array.from(d.querySelectorAll('dd > span[aria-hidden]'));
        const divisor = d.querySelectorAll('.h-px')[0];
        const painel = Array.from(d.querySelectorAll('div')).find((x) => String(x.className).includes('linear-gradient'));
        const contador = spans.find((s) => s.textContent.trim() === '50' && s.className.includes('rounded-full'));
        const descricao = d.querySelector('p');
        const cs = (el) => (el ? getComputedStyle(el) : null);
        const est = (el) => {
          const s = cs(el);
          return s
            ? {
                bg: s.backgroundColor,
                bgImage: s.backgroundImage === 'none' ? 'none' : 'gradient',
                border: s.borderColor,
                cor: s.color,
                sombra: s.boxShadow === 'none' ? 'none' : s.boxShadow.slice(0, 60),
              }
            : null;
        };
        return {
          largura: +r.width.toFixed(2),
          altura: +r.height.toFixed(2),
          icone: est(icon),
          badgeCategoria: est(cat),
          badgeObrigatoria: est(obrig),
          tiles: tiles.map(est),
          divisor: divisor ? { bgImage: cs(divisor).backgroundImage === 'none' ? 'none' : 'gradient' } : null,
          painel: est(painel),
          contador: est(contador),
          descricaoCor: descricao ? cs(descricao).color : null,
          largos: Array.from(d.querySelectorAll('*')).filter((el) => el.getBoundingClientRect().width > r.width + 1).length,
        };
      });
    }
    await context.close();
  }
} catch (erro) {
  rel.erro = String(erro?.stack ?? erro).slice(0, 1200);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio-premium.json`, JSON.stringify(rel, null, 2));
  console.log(JSON.stringify(rel, null, 2).slice(0, 8000));
}
