/**
 * TEMPORÁRIO — validação complementar da Auditoria:
 *   · 6 viewports (sem overflow/sobreposição, trilho alinhado, botões visíveis);
 *   · F5 (entrada inicial executa de novo);
 *   · prefers-reduced-motion: tudo visível e sem deslocamento;
 *   · navegação Pagamentos/Simulador → Auditoria.
 *
 * Uso: node scripts/_tmp-validar-animacao-auditoria-viewports.mjs
 */
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const SAIDA = 'tmp-auditoria-animacao';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const storage = existsSync('e2e/.auth/user.json') ? 'e2e/.auth/user.json' : undefined;
const falhas = [];
const relatorio = { viewports: [], f5: null, reduzido: null, navegacao: [], botoes: null };

async function abrir(w, h, extra = {}) {
  const contexto = await browser.newContext({ viewport: { width: w, height: h }, storageState: storage, ...extra });
  await contexto.addInitScript((forcarReduzido) => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
    if (forcarReduzido) localStorage.setItem('dp-force-motion', 'off');
  }, Boolean(extra.reducedMotion));
  const page = await contexto.newPage();
  page.on('pageerror', (e) => falhas.push(`${w}x${h}: ${e.message}`));
  return { contexto, page };
}

async function garantirLogin(page) {
  await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
  if (!page.url().includes('/login')) return;
  await page.getByLabel(/e-?mail/i).first().fill('admin@teste.local');
  await page.getByLabel(/senha|password/i).first().fill('Admin@2026!');
  await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
}

async function abrirAuditoria(page) {
  await page.getByRole('tab', { name: /^Auditoria$/ }).click();
  await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(2400);
}


for (const [w, h] of [
  [1920, 1080],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
  [390, 844],
]) {
  const { contexto, page } = await abrir(w, h);
  await garantirLogin(page);
  await abrirAuditoria(page);

  const medida = await page.evaluate(() => {
    const doc = document.documentElement;
    const rows = [...document.querySelectorAll('[data-testid="auditoria-evento"]')];
    const filtrosEl = document.querySelector('section[aria-label="Filtros da auditoria"]');
    const filtros = filtrosEl.getBoundingClientRect();
    const filhosFiltro = [...filtrosEl.children].map((el) => {
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) };
    });
    const grupos = [...document.querySelectorAll('section[aria-label]')].filter((s) =>
      s.querySelector('[data-testid="auditoria-evento"]')
    );
    const pontos = grupos.map((g) =>
      [...g.querySelectorAll('div[aria-hidden="true"] > span:last-child')].map((d) => {
        const b = d.getBoundingClientRect();
        return Math.round((b.left + b.right) / 2);
      })
    );
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > doc.clientWidth + 1,
      filtros: { top: Math.round(filtros.top), bottom: Math.round(filtros.bottom), left: Math.round(filtros.left), right: Math.round(filtros.right) },
      filhosFiltro,
      grupos: grupos.length,
      alturasGrupos: grupos.map((g) => Math.round(g.getBoundingClientRect().height)),
      toposCabecalho: grupos.map((g) => Math.round(g.querySelector('h3').getBoundingClientRect().top)),
      pontos,
      rows: rows.length,
      rowsInvisiveis: rows.filter((r) => Number(getComputedStyle(r).opacity) < 0.99).length,
      rowsForaDaTela: rows.filter((r) => r.getBoundingClientRect().width <= 0).length,
      botoesDetalhes: [...document.querySelectorAll('button[aria-label^="Ver detalhes"]')].length,
    };
  });
  relatorio.viewports.push({ w, h, ...medida });

  if (w === 1440 || w === 390) {
    await page.screenshot({ path: `${SAIDA}/view-${w}x${h}.png`, fullPage: false });
  }
  await contexto.close();
}

/* F5 — a entrada inicial executa de novo. */
{
  const { contexto, page } = await abrir(1440, 900);
  await garantirLogin(page);
  await abrirAuditoria(page);
  const urlAuditoria = page.url();
  await page.reload({ waitUntil: 'domcontentloaded' });
  if (!page.url().includes('auditoria')) {
    await page.getByRole('tab', { name: /^Auditoria$/ }).click();
  }
  await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
  relatorio.f5 = await page.evaluate(async () => {
    const inicio = performance.now();
    const primeira = await new Promise((resolve) => {
      const tick = () => {
        const el = document.querySelector('[data-testid="auditoria-evento"]');
        if (el) resolve({ op: Number(getComputedStyle(el).opacity), tr: getComputedStyle(el).transform });
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { url: location.pathname + location.search, ...primeira, msAtePrimeiraLeitura: Math.round(performance.now() - inicio) };
  });
  relatorio.f5.urlAuditoriaAntes = urlAuditoria;
  await contexto.close();
}

/* prefers-reduced-motion: reduce (dev: dp-force-motion = off). */
{
  const { contexto, page } = await abrir(1440, 900, { reducedMotion: 'reduce' });
  await garantirLogin(page);
  await abrirAuditoria(page);
  relatorio.reduzido = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-testid="auditoria-evento"]')];
    const painel = document.querySelector('section[aria-label="Filtros da auditoria"]');
    const lista = document.querySelector('[data-testid="auditoria-timeline"]');
    const estilo = (el) => ({ op: Number(getComputedStyle(el).opacity), tr: getComputedStyle(el).transform });
    return {
      classeHtml: document.documentElement.className,
      painel: estilo(painel),
      lista: estilo(lista),
      rows: rows.map(estilo),
      todosVisiveis: rows.every((r) => Number(getComputedStyle(r).opacity) >= 0.99),
    };
  });
  await page.screenshot({ path: `${SAIDA}/reduzido-1440x900.png` });
  await contexto.close();
}

/* Navegação entre abas do Hub. */
{
  const { contexto, page } = await abrir(1440, 900);
  await garantirLogin(page);
  for (const aba of ['Pagamentos', 'Simulador ROI', 'Campanhas']) {
    await page.getByRole('tab', { name: new RegExp(`^${aba}$`) }).click();
    await page.waitForTimeout(350);
    await page.getByRole('tab', { name: /^Auditoria$/ }).click();
    await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
    const leitura = await page.evaluate(async () => {
      const inicio = performance.now();
      return new Promise((resolve) => {
        const tick = () => {
          const el = document.querySelector('[data-testid="auditoria-evento"]');
          if (el) {
            const cs = getComputedStyle(el);
            resolve({ op: Number(cs.opacity), tr: cs.transform, ms: Math.round(performance.now() - inicio) });
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    });
    relatorio.navegacao.push({ vindoDe: aba, ...leitura });
    await page.waitForTimeout(1600);
  }
  await contexto.close();
}

await browser.close();
writeFileSync(`${SAIDA}/relatorio-viewports.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
console.log('FALHAS', JSON.stringify([...new Set(falhas)]));
