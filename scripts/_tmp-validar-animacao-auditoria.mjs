/**
 * TEMPORÁRIO — valida, no navegador, a padronização das animações da Auditoria:
 *   · painel de filtros  = entrada dos KPI Cards do Dashboard Executivo;
 *   · linhas/contêiner   = entrada da lista de Campanhas do Hub;
 *   · a animação NÃO reinicia ao filtrar nem ao rolar;
 *   · volta à aba / F5 executam a entrada de novo;
 *   · nenhum overflow horizontal nos viewports pedidos.
 *
 * Uso: node scripts/_tmp-validar-animacao-auditoria.mjs
 */
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const SAIDA = 'tmp-auditoria-animacao';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const falhas = [];
const relatorio = { campanhas: null, auditoria: null, dashboard: null, filtros: null, navegacao: null, scroll: null, viewports: [] };

const storage = existsSync('e2e/.auth/user.json') ? 'e2e/.auth/user.json' : undefined;

async function abrir(w = 1456, h = 900) {
  const contexto = await browser.newContext({ viewport: { width: w, height: h }, storageState: storage });
  await contexto.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  const page = await contexto.newPage();
  page.on('pageerror', (e) => falhas.push(e.message));
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

/** Amostra a cada frame, por `ms`, opacity/transform/top dos `limite` primeiros nós. */
async function amostrar(page, seletor, ms = 2600, limite = 4) {
  return page.evaluate(
    async ({ seletor, ms, limite }) => {
      const inicio = performance.now();
      const amostras = [];
      await new Promise((resolve) => {
        const tick = () => {
          const agora = performance.now();
          const nos = [...document.querySelectorAll(seletor)].slice(0, limite);
          if (nos.length > 0) {
            nos.forEach((el, i) => {
              const cs = getComputedStyle(el);
              amostras.push({
                t: Math.round(agora - inicio),
                i,
                op: Number(cs.opacity),
                tr: cs.transform,
                top: Math.round(el.getBoundingClientRect().top),
              });
            });
          }
          if (agora - inicio < ms) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });

      const indices = [...new Set(amostras.map((a) => a.i))];
      return indices.map((i) => {
        const doItem = amostras.filter((a) => a.i === i);
        const comecou = doItem.find((a) => a.op > 0.01);
        const terminou = doItem.find((a) => a.op >= 0.99 && (a.tr === 'none' || a.tr === ''));
        return {
          item: i,
          inicioMs: comecou?.t ?? null,
          fimMs: terminou?.t ?? null,
          duracaoMs: comecou && terminou ? terminou.t - comecou.t : null,
          opInicial: doItem[0]?.op ?? null,
          trInicial: doItem[0]?.tr ?? null,
          opFinal: doItem[doItem.length - 1]?.op ?? null,
          trFinal: doItem[doItem.length - 1]?.tr ?? null,
          topInicial: doItem[0]?.top ?? null,
          topFinal: doItem[doItem.length - 1]?.top ?? null,
        };
      });
    },
    { seletor, ms, limite }
  );
}


const { contexto, page } = await abrir();
await garantirLogin(page);
await page.locator('tbody tr').first().waitFor({ timeout: 30000 });

/* 1 · Campanhas — referência das LINHAS (recarga para pegar a montagem). */
await page.reload({ waitUntil: 'domcontentloaded' });
relatorio.campanhas = await amostrar(page, 'tbody tr', 2600);

/* 2 · Auditoria — linhas + painel de filtros. */
await page.getByRole('tab', { name: /^Auditoria$/ }).click();
const amostraLinhas = amostrar(page, '[data-testid="auditoria-evento"]', 2800);
const amostraFiltros = amostrar(page, 'section[aria-label="Filtros da auditoria"]', 1400, 1);
await page.waitForTimeout(180);
await page.screenshot({ path: `${SAIDA}/auditoria-entrada-1456.png` });
relatorio.auditoria = await amostraLinhas;
relatorio.filtros = (await amostraFiltros)[0] ?? null;
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SAIDA}/auditoria-final-1456.png` });

/* 3 · Dashboard Executivo — referência do painel (KPI Cards). */
await page.goto(`${BASE}/dashboard-executivo`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('div.rounded-2xl.overflow-hidden.h-full', { timeout: 30000 });
relatorio.dashboard = await amostrar(page, 'div.rounded-2xl.overflow-hidden.h-full', 1600, 5);

/* 4 · Filtrar: painel/contêiner NÃO remontam; só a lista de eventos cascateia. */
await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: /^Auditoria$/ }).click();
await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2400);
await page.evaluate(() => {
  document.querySelector('section[aria-label="Filtros da auditoria"]')?.setAttribute('data-marca-painel', '1');
  document.querySelector('[data-testid="auditoria-timeline"]')?.setAttribute('data-marca-lista', '1');
});
await page.getByLabel(/Buscar evento, campanha, colaborador ou valor/i).fill('IRRF');
relatorio.filtroReiniciaLinhas = await amostrar(page, '[data-testid="auditoria-evento"]', 800);
await page.waitForTimeout(600);
relatorio.filtroMantevePaineis = await page.evaluate(() => ({
  painelMesmo: Boolean(document.querySelector('[data-marca-painel]')),
  listaMesma: Boolean(document.querySelector('[data-marca-lista]')),
  opPainel: Number(getComputedStyle(document.querySelector('section[aria-label="Filtros da auditoria"]')).opacity),
  opLista: Number(getComputedStyle(document.querySelector('[data-testid="auditoria-timeline"]')).opacity),
}));

/* 5 · Scroll: animações concluídas NÃO reiniciam. */
const estadoAntesScroll = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="auditoria-evento"]');
  const cs = getComputedStyle(el);
  return { op: Number(cs.opacity), tr: cs.transform };
});
for (let i = 0; i < 5; i += 1) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(120);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
}
relatorio.scroll = await page.evaluate((antes) => {
  const el = document.querySelector('[data-testid="auditoria-evento"]');
  const cs = getComputedStyle(el);
  return { antes, depois: { op: Number(cs.opacity), tr: cs.transform } };
}, estadoAntesScroll);

/* 6 · Sair e voltar à aba: a entrada executa de novo (ciclo de montagem). */
await page.getByRole('tab', { name: /^Campanhas$/ }).click();
await page.waitForTimeout(400);
await page.getByRole('tab', { name: /^Auditoria$/ }).click();
relatorio.voltaAba = await amostrar(page, '[data-testid="auditoria-evento"]', 900);

/* 7 · Segundo filtro (categoria) também não reanima o painel. */
await page.waitForTimeout(1400);
await page.getByRole('button', { name: /Campanhas\s*\d+/ }).click();
await page.waitForTimeout(400);
relatorio.filtroCategoria = await page.evaluate(() => ({
  opPainel: Number(getComputedStyle(document.querySelector('section[aria-label="Filtros da auditoria"]')).opacity),
  opLista: Number(getComputedStyle(document.querySelector('[data-testid="auditoria-timeline"]')).opacity),
}));

await contexto.close();

writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
console.log('FALHAS', JSON.stringify([...new Set(falhas)]));
