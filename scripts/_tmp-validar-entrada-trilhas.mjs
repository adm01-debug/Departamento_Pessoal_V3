/** TEMPORÁRIO — valida a cascata da aba Trilhas contra a referência dos KPIs. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const OUT = 'tmp-entrada-trilhas';
mkdirSync(OUT, { recursive: true });
const rel = {};
const browser = await chromium.launch({ args: ['--disable-frame-rate-limit', '--disable-gpu-vsync'] });

const INSTALAR = () => {
  const acharPaiAnimado = (el) => {
    let atual = el;
    while (atual && !String(atual.getAttribute?.('style') || '').includes('opacity')) atual = atual.parentElement;
    return atual;
  };
  const alvos = () => {
    const cards = [...document.querySelectorAll('[class*="group/card"]')];
    const paginacao = (() => {
      const botao = document.querySelector('button[aria-label="Página anterior"]');
      return botao ? acharPaiAnimado(botao) : null;
    })();
    return {
      busca: document.querySelector('input[aria-label="Buscar trilhas"]')?.parentElement ?? null,
      categoria: document.querySelector('[aria-label="Categoria"]')?.parentElement ?? null,
      nivel: document.querySelector('[aria-label="Nível"]')?.parentElement ?? null,
      status: document.querySelector('[aria-label="Status"]')?.parentElement ?? null,
      limpar: document.querySelector('button[aria-label="Limpar filtros"]') ?? null,
      cards,
      paginacao,
    };
  };
  const medir = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    const m = s.transform.match(/matrix(?:3d)?\(([^)]+)\)/);
    let y = 0;
    if (m) {
      const v = m[1].split(',').map(Number);
      y = v.length === 6 ? v[5] : v[13];
    }
    return { o: +s.opacity, y: +y.toFixed(1) };
  };
  window.__rec = { t0: performance.now(), frames: [], raf: 0 };
  const tick = () => {
    const t = alvos();
    window.__rec.frames.push({
      t: Math.round(performance.now() - window.__rec.t0),
      busca: medir(t.busca),
      categoria: medir(t.categoria),
      nivel: medir(t.nivel),
      status: medir(t.status),
      limpar: medir(t.limpar),
      cards: t.cards.map(medir),
      paginacao: medir(t.paginacao),
    });
    window.__rec.raf = requestAnimationFrame(tick);
  };
  tick();
};

async function abrirTrilhas(page) {
  await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);
  await page.evaluate(INSTALAR);
  await page.getByRole('tab', { name: 'Trilhas' }).click();
  await page.waitForTimeout(1700);
  const frames = await page.evaluate(() => {
    cancelAnimationFrame(window.__rec.raf);
    return window.__rec.frames;
  });
  return frames;
}

function inicios(frames) {
  const chaves = ['busca', 'categoria', 'nivel', 'status', 'limpar', 'paginacao'];
  const res = {};
  for (const chave of chaves) {
    const f = frames.find((x) => (x[chave]?.o ?? 0) > 0.05);
    res[chave] = f ? f.t : null;
  }
  res.cards = [0, 1, 2].map((i) => {
    const f = frames.find((x) => (x.cards[i]?.o ?? 0) > 0.05);
    return f ? f.t : null;
  });
  return res;
}

try {
  const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
  });
  const page = await context.newPage();

  const frames = await abrirTrilhas(page);
  rel.entrada = inicios(frames);
  const ultimo = frames[frames.length - 1];
  rel.final = {
    busca: ultimo.busca,
    cards: ultimo.cards,
    paginacao: ultimo.paginacao,
    cardsY: ultimo.cards.map((c) => c?.y),
  };
  await page.screenshot({ path: `${OUT}/entrada-1440.png` });

  const antesFiltro = await page.evaluate(() => {
    const busca = document.querySelector('input[aria-label="Buscar trilhas"]');
    const card = document.querySelector('[class*="group/card"]');
    return { buscaO: +getComputedStyle(busca.parentElement).opacity, cardO: +getComputedStyle(card).opacity };
  });
  await page.getByLabel('Buscar trilhas').fill('Integração');
  await page.waitForTimeout(450);
  const depoisFiltro = await page.evaluate(() => {
    const busca = document.querySelector('input[aria-label="Buscar trilhas"]');
    const card = document.querySelector('[class*="group/card"]');
    return {
      buscaO: +getComputedStyle(busca.parentElement).opacity,
      cardO: card ? +getComputedStyle(card).opacity : null,
    };
  });
  await page.getByLabel('Limpar filtros').click();
  await page.waitForTimeout(450);
  rel.filtros = { antesFiltro, depoisFiltro };

  await page.getByRole('button', { name: 'Explorar trilha', exact: true }).first().click();
  await page.waitForTimeout(1800);
  rel.modal = await page.evaluate(() => {
    const busca = document.querySelector('input[aria-label="Buscar trilhas"]');
    const cards = [...document.querySelectorAll('[class*="group/card"]')];
    return {
      modalAberto: !!document.querySelector('[role="dialog"]'),
      buscaO: +getComputedStyle(busca.parentElement).opacity,
      cardsO: cards.map((c) => +getComputedStyle(c).opacity),
    };
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);

  await page.getByRole('tab', { name: 'Catálogo' }).click();
  await page.waitForTimeout(900);
  await page.evaluate(INSTALAR);
  await page.getByRole('tab', { name: 'Trilhas' }).click();
  await page.waitForTimeout(1600);
  const framesVolta = await page.evaluate(() => {
    cancelAnimationFrame(window.__rec.raf);
    return window.__rec.frames;
  });
  rel.retorno = inicios(framesVolta);

  rel.responsivo = [];
  for (const [w, h] of [[1920, 1080], [1600, 900], [1366, 768], [1024, 768], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    const med = await page.evaluate(() => {
      const filtros = document.querySelector('input[aria-label="Buscar trilhas"]')?.closest('div.flex');
      const cards = [...document.querySelectorAll('[class*="group/card"]')];
      return {
        overflowX: document.documentElement.scrollWidth > innerWidth,
        filtrosOk: filtros ? filtros.getBoundingClientRect().right <= innerWidth + 1 : null,
        cards: cards.length,
        primeira: cards[0]?.getBoundingClientRect().width ?? null,
      };
    });
    rel.responsivo.push({ viewport: `${w}x${h}`, ...med });
    await page.screenshot({ path: `${OUT}/trilhas-${w}x${h}.png` });
  }
  await context.close();

  const ctxRed = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  await ctxRed.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('dp-force-motion', 'off');
    localStorage.setItem('ui-theme', 'dark');
  });
  const pagRed = await ctxRed.newPage();
  await pagRed.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
  await pagRed.waitForTimeout(2600);
  await pagRed.getByRole('tab', { name: 'Trilhas' }).click();
  await pagRed.waitForTimeout(1700);
  rel.reduced = await pagRed.evaluate(() => {
    const busca = document.querySelector('input[aria-label="Buscar trilhas"]');
    const cards = [...document.querySelectorAll('[class*="group/card"]')];
    return {
      buscaO: +getComputedStyle(busca.parentElement).opacity,
      cardsO: cards.map((c) => +getComputedStyle(c).opacity),
      cardsTransform: cards.map((c) => getComputedStyle(c).transform),
    };
  });
  await pagRed.screenshot({ path: `${OUT}/reduced-1440.png` });
  await ctxRed.close();
} catch (erro) {
  rel.erro = String(erro?.stack ?? erro).slice(0, 1500);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(rel, null, 2));
  console.log(JSON.stringify(rel, null, 2).slice(0, 12000));
}
