import { chromium } from '@playwright/test';

const log = (...args) => console.error('[validar]', ...args);
const VIEWPORTS = [
  [1650, 900],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [375, 812],
];

const b = await chromium.launch();
const saida = [];

for (const [width, height] of VIEWPORTS) {
  log('viewport', width);
  const c = await b.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width, height },
  });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  p.setDefaultTimeout(90000);
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));

  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'commit', timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
  await p.waitForTimeout(2000);

  const ui = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const t = [...document.querySelectorAll('p')].find((el) => el.textContent?.includes('Mostrando'));
    const rodape = t?.closest('.border-t');
    const contador = t?.parentElement;
    const grupo = rodape?.lastElementChild;
    const nav = grupo?.firstElementChild;
    const seletor = grupo?.lastElementChild;
    const anterior = rodape?.querySelector('[aria-label="Página anterior"]');
    const pagina1 = rodape?.querySelector('[aria-label="Página 1"]');
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      rodape: rodape
        ? { x: Math.round(r(rodape).x), right: Math.round(r(rodape).right), w: Math.round(r(rodape).width) }
        : null,
      contador: contador ? { x: Math.round(r(contador).x), cy: Math.round(r(contador).top + r(contador).height / 2) } : null,
      grupo: grupo
        ? {
            x: Math.round(r(grupo).x),
            right: Math.round(r(grupo).right),
            w: Math.round(r(grupo).width),
            cy: Math.round(r(grupo).top + r(grupo).height / 2),
          }
        : null,
      nav: nav ? { right: Math.round(r(nav).right), h: Math.round(r(nav).height) } : null,
      seletor: seletor ? { x: Math.round(r(seletor).x) } : null,
      gapNavSeletor: nav && seletor ? Math.round(r(seletor).x - r(nav).right) : null,
      gapBotoes: anterior && pagina1 ? Math.round(r(pagina1).x - r(anterior).right) : null,
    };
  });

  const textoAntes = (await p.locator('body').innerText()).match(/Mostrando[^\n]*/)?.[0] ?? null;
  await p.getByRole('button', { name: 'Próxima página' }).click();
  await p.waitForTimeout(600);
  const textoDepois = (await p.locator('body').innerText()).match(/Mostrando[^\n]*/)?.[0] ?? null;
  const paginaAtiva = await p
    .locator('[aria-current="page"]')
    .first()
    .getAttribute('aria-label')
    .catch(() => null);

  await p.screenshot({ path: `tmp-turmas-fidelidade/candidatos-final-rodape-${width}.png` });
  saida.push({
    width,
    ui,
    textoAntes,
    textoDepois,
    paginaAtiva,
    erros,
    ok:
      ui.overflowDoc === 0 &&
      ui.rodape !== null &&
      ui.grupo !== null &&
      Math.abs(ui.rodape.right - ui.grupo.right) <= 16 &&
      (ui.contador.x ?? 0) < (ui.grupo.x ?? 0) &&
      (ui.gapNavSeletor ?? -1) >= 0 &&
      textoDepois !== textoAntes,
  });
  log('resultado', width, JSON.stringify(saida[saida.length - 1].ok));
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
