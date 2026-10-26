/**
 * TEMPORÁRIO — valida a nova área Vagas (indicadores, filtros, cards, funil).
 */
import { chromium } from '@playwright/test';

const larguras = process.argv.slice(2).map(Number);
const alvos = larguras.length ? larguras : [1600, 1280, 1024, 390];
const b = await chromium.launch();
const saida = [];

for (const width of alvos) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height: 900 } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
  await p.waitForTimeout(2200);

  const ui = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const grid = document.querySelector('[data-vagas-grid]');
    const cards = [...document.querySelectorAll('[data-vaga-card]')];
    const indicadores = [...document.querySelectorAll('[aria-pressed]')].map((el) => ({
      texto: el.innerText.replace(/\n/g, ' | '),
      pressed: el.getAttribute('aria-pressed'),
    }));
    const filtros = ['Departamento', 'Modalidade', 'Status', 'Ordenar por'].map((nome) => ({
      nome,
      valor: document.querySelector(`[aria-label="${nome}"]`)?.textContent?.trim() ?? null,
    }));
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      cards: cards.map((card) => {
        const funil = card.querySelector('[data-vaga-funil]');
        const botao = card.querySelector('button[aria-label^="Gerenciar vaga"]');
        const menu = card.querySelector('button[aria-label^="Ações da vaga"]');
        return {
          id: card.getAttribute('data-vaga-card'),
          status: card.getAttribute('data-vaga-status'),
          titulo: card.querySelector('h3')?.textContent?.trim(),
          h: Math.round(r(card).height),
          w: Math.round(r(card).width),
          overflow: card.scrollWidth - card.clientWidth,
          funil: funil?.innerText.replace(/\n/g, ' | '),
          botao: botao
            ? {
                texto: botao.textContent?.trim(),
                bg: getComputedStyle(botao).backgroundColor,
                border: getComputedStyle(botao).borderTopColor,
                h: Math.round(r(botao).height),
              }
            : null,
          temMenu: !!menu,
        };
      }),
      indicadores,
      filtros,
    };
  });

  const interacoes = {};
  if (width === 1600) {
    const cards = p.locator('[data-vaga-card]');
    interacoes.total = await cards.count();

    await p.getByRole('button', { name: /^Abertas:/i }).click();
    await p.waitForTimeout(250);
    interacoes.abertas = await cards.count();
    interacoes.statusSelect = await p.getByLabel('Status', { exact: true }).textContent();

    await p.getByRole('button', { name: /^Fechadas:/i }).click();
    await p.waitForTimeout(250);
    interacoes.fechadas = await cards.count();

    await p.getByRole('button', { name: /^Todas:/i }).click();
    await p.waitForTimeout(250);
    interacoes.todas = await cards.count();

    await p.getByLabel('Departamento', { exact: true }).click();
    await p.getByRole('option', { name: 'Tecnologia' }).click();
    await p.waitForTimeout(250);
    interacoes.tecnologia = await cards.count();
    interacoes.tecnologiaTitulos = await cards.locator('h3').allInnerTexts();

    await p.getByLabel('Departamento', { exact: true }).click();
    await p.getByRole('option', { name: 'Todos' }).click();
    await p.getByLabel('Ordenar por', { exact: true }).click();
    await p.getByRole('option', { name: 'Mais antigas' }).click();
    await p.waitForTimeout(250);
    interacoes.primeiroPorAntigas = await cards.first().locator('h3').innerText();
    await p.getByLabel('Ordenar por', { exact: true }).click();
    await p.getByRole('option', { name: 'Mais recentes' }).click();
    await p.waitForTimeout(250);

    const primeiro = cards.first();
    await primeiro.locator('button[aria-label^="Ações da vaga"]').click();
    await p.waitForTimeout(300);
    interacoes.menu = await p.getByRole('menuitem').allInnerTexts();
    await p.keyboard.press('Escape');
    await p.waitForTimeout(250);

    // Gerenciar abre o Pipeline já filtrado.
    await primeiro.locator('button[aria-label^="Gerenciar vaga"]').click();
    await p.waitForTimeout(1200);
    interacoes.pipelineAberto = await p.getByRole('tab', { name: 'Pipeline', exact: true }).getAttribute('aria-selected');
    interacoes.pipelineTitulo = await p.getByRole('tab', { name: 'Pipeline', exact: true }).textContent();

    await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
    await p.waitForTimeout(900);
    const atual = p.locator('[data-vaga-card]').first();
    await atual.locator('button[aria-label^="Ações da vaga"]').click();
    await p.waitForTimeout(250);
    await p.getByRole('menuitem', { name: /Ver análises/i }).click();
    await p.waitForTimeout(600);
    interacoes.analyticsAberto = await p.getByRole('tab', { name: 'Analytics', exact: true }).getAttribute('aria-selected');
  }

  saida.push({ width, ui, interacoes });
  await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `tmp-turmas-fidelidade/vagas-${width}.png`, fullPage: true });
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();

