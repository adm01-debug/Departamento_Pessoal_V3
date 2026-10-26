/**
 * TEMPORÁRIO — valida os três filtros pill de Vagas contra a referência do Hub
 * de Premiações (ColoredFilterChip): dimensões, cores, estados, cascata,
 * sincronização com o select Status e responsividade.
 */
import { chromium } from '@playwright/test';

const larguras = process.argv.slice(2).map(Number);
const alvos = larguras.length ? larguras : [1600, 1280, 1024, 390];
const b = await chromium.launch();
const saida = [];

const medirChips = () =>
  [...document.querySelectorAll('[aria-label="Filtrar vagas por status"] > div > button')].map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const ponto = el.querySelector('span[aria-hidden]');
    const contador = el.querySelectorAll('span')[1];
    return {
      texto: el.innerText.replace(/\n/g, ' | '),
      label: el.getAttribute('aria-label'),
      pressed: el.getAttribute('aria-pressed'),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      raio: cs.borderRadius,
      fundo: cs.backgroundColor,
      borda: cs.borderTopColor,
      cor: cs.color,
      sombra: cs.boxShadow,
      fonte: cs.fontSize,
      paddingX: `${cs.paddingLeft}/${cs.paddingRight}`,
      gapInterno: cs.columnGap,
      transicao: cs.transitionDuration,
      ponto: ponto
        ? { w: Math.round(ponto.getBoundingClientRect().width), cor: getComputedStyle(ponto).backgroundColor }
        : null,
      contador: contador
        ? {
            w: Math.round(contador.getBoundingClientRect().width),
            h: Math.round(contador.getBoundingClientRect().height),
            fundo: getComputedStyle(contador).backgroundColor,
            cor: getComputedStyle(contador).color,
            raio: getComputedStyle(contador).borderRadius,
            fonte: getComputedStyle(contador).fontSize,
          }
        : null,
    };
  });

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
  await p.waitForTimeout(2000);

  const ui = await p.evaluate(() => {
    const medir = [...document.querySelectorAll('[aria-label="Filtrar vagas por status"] > div > button')].map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const ponto = el.querySelector('span[aria-hidden]');
      const contador = el.querySelectorAll('span')[1];
      return {
        texto: el.innerText.replace(/\n/g, ' | '),
        label: el.getAttribute('aria-label'),
        pressed: el.getAttribute('aria-pressed'),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        raio: cs.borderRadius,
        fundo: cs.backgroundColor,
        borda: cs.borderTopColor,
        cor: cs.color,
        sombra: cs.boxShadow,
        fonte: cs.fontSize,
        paddingX: `${cs.paddingLeft}/${cs.paddingRight}`,
        gapInterno: cs.columnGap,
        transicao: cs.transitionDuration,
        ponto: ponto
          ? { w: Math.round(ponto.getBoundingClientRect().width), cor: getComputedStyle(ponto).backgroundColor }
          : null,
        contador: contador
          ? {
              w: Math.round(contador.getBoundingClientRect().width),
              h: Math.round(contador.getBoundingClientRect().height),
              fundo: getComputedStyle(contador).backgroundColor,
              cor: getComputedStyle(contador).color,
              raio: getComputedStyle(contador).borderRadius,
              fonte: getComputedStyle(contador).fontSize,
            }
          : null,
      };
    });
    const grupo = document.querySelector('[aria-label="Filtrar vagas por status"]');
    const dropdowns = ['Departamento', 'Modalidade', 'Status', 'Ordenar por'].map((nome) => {
      const el = document.querySelector(`[aria-label="${nome}"]`);
      const r = el?.getBoundingClientRect();
      return { nome, x: r ? Math.round(r.x) : null, y: r ? Math.round(r.y) : null };
    });
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      grupo: grupo ? { ...grupo.getBoundingClientRect().toJSON(), scrollW: grupo.scrollWidth, clientW: grupo.clientWidth } : null,
      cards: document.querySelectorAll('[data-vaga-card]').length,
      chips: medir,
      dropdowns,
      kpiAntigos: document.querySelectorAll('button.xl\\:w-\\[150px\\]').length,
    };
  }, medirChips.toString());

  const interacoes = {};
  if (width === 1600) {
    const cards = p.locator('[data-vaga-card]');
    interacoes.inicial = {
      cards: await cards.count(),
      status: (await p.getByLabel('Status', { exact: true }).textContent())?.trim(),
      chips: await p.evaluate(medirChips),
    };

    await p.getByRole('button', { name: /^Abertas:/i }).click();
    await p.waitForTimeout(300);
    interacoes.abertas = {
      cards: await cards.count(),
      status: (await p.getByLabel('Status', { exact: true }).textContent())?.trim(),
      chips: await p.evaluate(medirChips),
      hover: await p.getByRole('button', { name: /^Fechadas:/i }).hover().then(() => true),
    };

    await p.getByRole('button', { name: /^Fechadas:/i }).click();
    await p.waitForTimeout(300);
    interacoes.fechadas = {
      cards: await cards.count(),
      status: (await p.getByLabel('Status', { exact: true }).textContent())?.trim(),
      chips: await p.evaluate(medirChips),
    };

    await p.getByRole('button', { name: /^Todas:/i }).click();
    await p.waitForTimeout(300);
    interacoes.todas = {
      cards: await cards.count(),
      status: (await p.getByLabel('Status', { exact: true }).textContent())?.trim(),
    };

    // Dropdown Status deve refletir no chip (mesma fonte de estado).
    await p.getByLabel('Status', { exact: true }).click();
    await p.getByRole('option', { name: 'Fechadas' }).click();
    await p.waitForTimeout(300);
    interacoes.statusDropdown = {
      cards: await cards.count(),
      chips: await p.evaluate(medirChips),
    };

    await p.getByRole('button', { name: /^Todas:/i }).click();
    await p.waitForTimeout(300);
  }

  await p.screenshot({ path: `tmp-turmas-fidelidade/vagas-pills-${width}.png`, fullPage: false });
  const chipsShot = p.locator('[aria-label="Filtrar vagas por status"]');
  if (await chipsShot.count()) {
    await chipsShot.screenshot({ path: `tmp-turmas-fidelidade/vagas-pills-crop-${width}.png` });
  }

  saida.push({ width, ui, interacoes, erros });
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
