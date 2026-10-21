/**
 * TEMPORÁRIO — confere, na aba Pagamentos:
 *  1. `prefers-reduced-motion`: o fade continua e o deslocamento (y) é desligado;
 *  2. 390px: nenhuma rolagem horizontal na PÁGINA (a tabela rola por dentro) e
 *     a cascata continua acontecendo.
 *
 * Uso: node scripts/_tmp-checar-pagamentos-reduzido.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';

const PORTA = 8080;
const URL = `http://localhost:${PORTA}/premiacoes`;

const portaAtiva = async () => {
  try {
    const r = await fetch(URL, { redirect: 'manual' });
    return r.status < 500;
  } catch {
    return false;
  }
};

const jaServindo = await portaAtiva();
const servidor = jaServindo
  ? null
  : spawn('cmd.exe', ['/c', `npx vite --port ${PORTA} --strictPort`], { stdio: 'ignore', windowsHide: true });
const pronto = async () => {
  for (let i = 0; i < 90; i++) {
    if (await portaAtiva()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

const cardKpi = () => {
  const p = [...document.querySelectorAll('p')].find((x) => (x.textContent || '').includes('Total Aprovado'));
  return p ? p.closest('.min-w-0.flex-1')?.parentElement : null;
};

let browser;
try {
  if (!(await pronto())) throw new Error('servidor Vite não ficou pronto');
  browser = await chromium.launch();

  for (const cenario of [
    { nome: 'reduzido-1456', largura: 1456, altura: 816, reduzido: true },
    { nome: 'normal-390', largura: 390, altura: 900, reduzido: false },
  ]) {
    const contexto = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
      viewport: { width: cenario.largura, height: cenario.altura },
      ...(cenario.reduzido ? { reducedMotion: 'reduce' } : {}),
    });
    const page = await contexto.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('ui-theme', 'dark');
      localStorage.setItem('dp-tour-completed', 'true');
      localStorage.setItem('dp-force-motion', 'off');
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
    await page.getByRole('tab', { name: /Pagamentos/ }).click();
    await page.getByRole('textbox', { name: 'Buscar pagamentos' }).waitFor({ timeout: 15_000 });

    // No pico da entrada (logo após o clique), com movimento reduzido o Y é zero.
    const pico = await page.evaluate(cardKpi);
    const amostras = [];
    for (let i = 0; i < 6; i += 1) {
      amostras.push(
        await page.evaluate(() => {
          const card = (() => {
            const p = [...document.querySelectorAll('p')].find((x) => (x.textContent || '').includes('Total Aprovado'));
            return p ? p.closest('.min-w-0.flex-1')?.parentElement : null;
          })();
          if (!card) return null;
          const cs = getComputedStyle(card);
          return { opacidade: Number.parseFloat(cs.opacity), transform: cs.transform };
        }),
      );
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(1600);
    const final = await page.evaluate(() => {
      const card = (() => {
        const p = [...document.querySelectorAll('p')].find((x) => (x.textContent || '').includes('Total Aprovado'));
        return p ? p.closest('.min-w-0.flex-1')?.parentElement : null;
      })();
      const cs = getComputedStyle(card);
      return {
        opacidade: Number.parseFloat(cs.opacity),
        transform: cs.transform,
        rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
        larguraPagina: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        excedentes: [...document.querySelectorAll('body *')]
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { tag: el.tagName, cls: String(el.className).slice(0, 90), right: Math.round(r.right), w: Math.round(r.width) };
          })
          .filter((e) => e.right > window.innerWidth + 1 && e.w > 40)
          .slice(0, 8),
      };
    });
    // eslint-disable-next-line no-console
    console.log(cenario.nome, JSON.stringify({ pico: !!pico, amostras, final }, null, 2));
    await contexto.close();
  }
} finally {
  if (browser) await browser.close();
  if (servidor) {
    try {
      execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* já encerrado */
    }
  }
}
