/**
 * TEMPORÁRIO — mede a nova estrutura do painel de filtros de Vagas.
 */
import { chromium } from '@playwright/test';

const larguras = process.argv.slice(2).map(Number);
const alvos = larguras.length ? larguras : [1920, 1600, 1440, 1366, 1280, 1024, 768, 390];
const b = await chromium.launch();
const saida = [];

const medir = () =>
  (() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const grupo = document.querySelector('[aria-label="Filtrar vagas por status"]');
    const painel = grupo ? grupo.closest('.rounded-xl') : null;
    const tablist = document.querySelector('[role="tablist"]');
    const grid = document.querySelector('[data-vagas-grid]');
    const chips = [...(grupo?.querySelectorAll('button') ?? [])];
    const selects = ['Departamento', 'Modalidade', 'Status', 'Ordenar por'].map((nome) =>
      document.querySelector(`[aria-label="${nome}"]`)
    );
    const caixasSelects = selects.map((el) => el?.closest('.rounded-lg'));
    const centro = (el) => (el ? Math.round(r(el).top + r(el).height / 2) : null);
    const estilo = painel ? getComputedStyle(painel) : null;
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflowPainel: painel ? painel.scrollWidth - painel.clientWidth : null,
      gapTablistPainel: painel ? Math.round(r(painel).top - r(tablist).bottom) : null,
      gapPainelGrid: painel && grid ? Math.round(r(grid).top - r(painel).bottom) : null,
      tablist: tablist ? { top: Math.round(r(tablist).top), bottom: Math.round(r(tablist).bottom) } : null,
      painel: painel
        ? {
            top: Math.round(r(painel).top),
            bottom: Math.round(r(painel).bottom),
            h: Math.round(r(painel).height),
            w: Math.round(r(painel).width),
            bg: estilo.backgroundColor,
            border: estilo.borderTopColor,
            radius: estilo.borderRadius,
            padding: estilo.padding,
            bgImage: estilo.backgroundImage,
            shadow: estilo.boxShadow,
          }
        : null,
      chips: chips.map((el) => ({
        texto: el.innerText.replace(/\n/g, ' '),
        cy: centro(el),
        h: Math.round(r(el).height),
        x: Math.round(r(el).x),
      })),
      selects: selects.map((el, i) => ({
        nome: el?.getAttribute('aria-label'),
        cy: centro(caixasSelects[i]),
        caixaH: caixasSelects[i] ? Math.round(r(caixasSelects[i]).height) : null,
        x: caixasSelects[i] ? Math.round(r(caixasSelects[i]).x) : null,
      })),
      linhasDistintas: new Set([
        ...chips.map((el) => Math.round(r(el).top)),
        ...caixasSelects.filter(Boolean).map((el) => Math.round(r(el).top)),
      ]).size,
      cards: document.querySelectorAll('[data-vaga-card]').length,
    };
  })();

for (const width of alvos) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height: 900 } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1600);
  await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
  await p.waitForTimeout(1700);
  const ui = await p.evaluate(medir);

  const interacoes = {};
  if (width === 1600) {
    const cards = p.locator('[data-vaga-card]');
    await p.getByRole('button', { name: /^Abertas:/i }).click();
    await p.waitForTimeout(250);
    interacoes.abertas = { cards: await cards.count(), status: (await p.getByLabel('Status', { exact: true }).textContent())?.trim() };
    await p.getByRole('button', { name: /^Todas:/i }).click();
    await p.waitForTimeout(250);
    await p.getByLabel('Status', { exact: true }).click();
    await p.getByRole('option', { name: 'Fechadas' }).click();
    await p.waitForTimeout(250);
    interacoes.fechadasPorSelect = {
      cards: await cards.count(),
      chips: await p.evaluate(() =>
        [...document.querySelectorAll('[aria-label="Filtrar vagas por status"] button')].map((el) => ({
          texto: el.innerText.replace(/\n/g, ' '),
          pressed: el.getAttribute('aria-pressed'),
        }))
      ),
    };
    await p.getByRole('button', { name: /^Todas:/i }).click();
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `tmp-turmas-fidelidade/painel-vagas-${width}.png`, fullPage: false });
  } else {
    await p.screenshot({ path: `tmp-turmas-fidelidade/painel-vagas-${width}.png`, fullPage: false });
  }
  saida.push({ width, ui, interacoes, erros });
  await c.close();
}
console.log(JSON.stringify(saida, null, 2));
await b.close();
