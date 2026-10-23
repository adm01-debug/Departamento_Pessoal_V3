/** TEMPORÁRIO — responsividade, tema escuro, linha conectora e reduced motion. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const OUT = 'tmp-redesign-trilha';
mkdirSync(OUT, { recursive: true });
const rel = { conectores: null, responsivo: [], temas: {}, reduced: null };

const browser = await chromium.launch();

async function abrir(page) {
  await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2700);
  await page.getByRole('tab', { name: 'Trilhas' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Explorar trilha', exact: true }).first().click();
  await page.waitForTimeout(2000);
}

try {
  // conectores + tema (claro e escuro)
  {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await abrir(page);
    rel.conectores = await page.evaluate(() => {
      const itens = Array.from(document.querySelectorAll('[role="dialog"] ol > li'));
      return itens.map((li, i) => {
        const linha = li.querySelector('[data-conector]');
        const r = linha?.getBoundingClientRect();
        const cs = linha ? getComputedStyle(linha) : null;
        return {
          item: i + 1,
          temLinha: !!linha,
          largura: r ? +r.width.toFixed(1) : null,
          altura: r ? +r.height.toFixed(1) : null,
          cor: cs?.backgroundColor ?? null,
          conectaAteProximo: i < itens.length - 1 ? (r ? r.bottom <= itens[i + 1].getBoundingClientRect().top + 2 : null) : null,
        };
      });
    });
    await page.screenshot({ path: `${OUT}/claro-1440.png` });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(1900);
    await page.getByRole('button', { name: 'Alternar tema' }).first().click();
    await page.waitForTimeout(900);
    rel.temas.escuroAtivo = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await abrir(page);
    await page.screenshot({ path: `${OUT}/escuro-1440.png` });
    await context.close();
  }

  // responsividade
  for (const [w, h] of [[1920, 1080], [1600, 900], [1366, 768], [1024, 768], [768, 1024], [390, 844]]) {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: w, height: h } });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await abrir(page);
    const med = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      const r = d.getBoundingClientRect();
      const pills = d.querySelector('span[title]')?.parentElement;
      return {
        dentro: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        largura: Math.round(r.width),
        altura: Math.round(r.height),
        overflowInternoX: d.scrollWidth > d.clientWidth + 1,
        scrollY: d.scrollHeight > d.clientHeight + 1,
        pillsLinhas: pills ? Math.round(pills.getBoundingClientRect().height / 40) : null,
        numeros: Array.from(d.querySelectorAll('ol li span[aria-hidden]')).map((el) => el.textContent).filter((t) => /^\d{2}$/.test(t)).length,
        botaoAdicionar: !!Array.from(d.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Adicionar curso')),
      };
    });
    rel.responsivo.push({ viewport: `${w}x${h}`, ...med });
    await page.screenshot({ path: `${OUT}/responsivo-${w}x${h}.png` });
    await context.close();
  }
} finally {
  await browser.close();
}

// movimento reduzido
{
  const b2 = await chromium.launch();
  const context = await b2.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
  await context.addInitScript(() => localStorage.setItem('dp-force-motion', 'off'));
  const page = await context.newPage();
  try {
    await abrir(page);
    rel.reduced = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      const itens = Array.from(d.querySelectorAll('*')).filter((el) => el.getAttribute('style')?.includes('opacity'));
      return {
        presente: !!d,
        opacidades: itens.map((el) => +getComputedStyle(el).opacity),
        transform: getComputedStyle(d).transform,
        numeros: Array.from(d.querySelectorAll('ol li span[aria-hidden]')).map((el) => el.textContent).filter((t) => /^\d{2}$/.test(t)).length,
      };
    });
    await page.screenshot({ path: `${OUT}/reduced-1440.png` });
  } finally {
    await b2.close();
  }
}

writeFileSync(`${OUT}/relatorio-aux.json`, JSON.stringify(rel, null, 2));
console.log(JSON.stringify(rel, null, 2));
