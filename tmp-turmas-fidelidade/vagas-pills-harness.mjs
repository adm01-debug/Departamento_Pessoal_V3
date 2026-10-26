/**
 * TEMPORÁRIO — mede os filtros pill de Vagas no harness isolado.
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
  const c = await b.newContext({ viewport: { width, height: 900 } });
  const p = await c.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text().slice(0, 240));
  });
  await p.goto('http://localhost:8080/tmp-turmas-fidelidade/vagas-harness.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1600);

  const ui = await p.evaluate(() => {
    const grupo = document.querySelector('[aria-label="Filtrar vagas por status"]');
    const dropdowns = ['Departamento', 'Modalidade', 'Status', 'Ordenar por'].map((nome) => {
      const el = document.querySelector(`[aria-label="${nome}"]`);
      const r = el?.getBoundingClientRect();
      return { nome, x: r ? Math.round(r.x) : null, y: r ? Math.round(r.y) : null, w: r ? Math.round(r.width) : null };
    });
    const chips = [...document.querySelectorAll('[aria-label="Filtrar vagas por status"] > div > button')];
    const retangulos = chips.map((el) => el.getBoundingClientRect());
    const gaps = retangulos.slice(1).map((r, i) => Math.round(r.left - retangulos[i].right));
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflowPainel: grupo ? grupo.scrollWidth - grupo.clientWidth : null,
      grupo: grupo
        ? {
            x: Math.round(grupo.getBoundingClientRect().x),
            y: Math.round(grupo.getBoundingClientRect().y),
            w: Math.round(grupo.getBoundingClientRect().width),
            h: Math.round(grupo.getBoundingClientRect().height),
          }
        : null,
      gaps,
      dropdowns,
      cards: document.querySelectorAll('[data-vaga-card]').length,
      kpiAntigos: document.querySelectorAll('button.xl\\:w-\\[150px\\]').length,
    };
  });

  const interacoes = {};
  if (width === 1600) {
    const cards = p.locator('[data-vaga-card]');
    interacoes.inicial = {
      cards: await cards.count(),
      status: (await p.getByLabel('Status', { exact: true }).textContent())?.trim(),
      chips: await p.evaluate(medirChips),
      chipY: await p.evaluate(() => {
        const chips = [...document.querySelectorAll('[aria-label="Filtrar vagas por status"] > div > button')];
        return chips.map((el) => Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height / 2));
      }),
      dropdownY: await p.evaluate(() => {
        const el = document.querySelector('[aria-label="Status"]');
        return el ? Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height / 2) : null;
      }),
    };

    await p.getByRole('button', { name: /^Abertas:/i }).click();
    await p.waitForTimeout(300);
    interacoes.abertas = {
      cards: await cards.count(),
      status: (await p.getByLabel('Status', { exact: true }).textContent())?.trim(),
      chips: await p.evaluate(medirChips),
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

    // Inverso: dropdown Status -> chip correspondente selecionado.
    await p.getByLabel('Status', { exact: true }).click();
    await p.getByRole('option', { name: 'Fechadas' }).click();
    await p.waitForTimeout(300);
    interacoes.statusDropdown = {
      cards: await cards.count(),
      chips: await p.evaluate(medirChips),
    };

    await p.getByRole('button', { name: /^Todas:/i }).click();
    await p.waitForTimeout(300);

    // Hover no chip não selecionado (cor semântica preservada).
    await p.getByRole('button', { name: /^Abertas:/i }).hover();
    await p.waitForTimeout(300);
    interacoes.hoverAbertas = (await p.evaluate(medirChips))[1];
  }

  await p.screenshot({ path: `tmp-turmas-fidelidade/vagas-pills-${width}.png`, fullPage: false });
  await p.locator('[aria-label="Filtrar vagas por status"]').screenshot({
    path: `tmp-turmas-fidelidade/vagas-pills-crop-${width}.png`,
  });

  saida.push({ width, ui, interacoes, erros });
  await c.close();
}

// prefers-reduced-motion: a transição do chip deve ir a 0s.
{
  const c = await b.newContext({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
  const p = await c.newPage();
  await p.goto('http://localhost:8080/tmp-turmas-fidelidade/vagas-harness.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await p.getByRole('button', { name: /^Abertas:/i }).click();
  const reduzido = await p.evaluate(medirChips);
  saida.push({ reduzido: reduzido.map((chip) => ({ texto: chip.texto, transicao: chip.transicao })) });
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
