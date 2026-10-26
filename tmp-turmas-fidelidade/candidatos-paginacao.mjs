import { chromium } from '@playwright/test';
const b = await chromium.launch();
const saida = [];
for (const [width, height] of [[1650, 900], [1440, 900], [1024, 768], [768, 1024], [390, 844], [375, 812]]) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
  await p.waitForTimeout(1600);

  const ui = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const texto = [...document.querySelectorAll('p')].find((el) => el.textContent?.includes('Mostrando'));
    const rodape = texto?.closest('.border-t');
    const grupoDireita = rodape?.lastElementChild;
    const nav = grupoDireita?.firstElementChild;
    const seletor = grupoDireita?.lastElementChild;
    const anterior = document.querySelector('[aria-label="Página anterior"]');
    const proxima = document.querySelector('[aria-label="Próxima página"]');
    const pagina1 = document.querySelector('[aria-label="Página 1"]');
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      rodape: rodape ? { x: Math.round(r(rodape).x), w: Math.round(r(rodape).width), y: Math.round(r(rodape).y), h: Math.round(r(rodape).height) } : null,
      contador: texto ? { x: Math.round(r(texto).x), right: Math.round(r(texto).right), cy: Math.round(r(texto).top + r(texto).height / 2) } : null,
      grupoDireita: grupoDireita ? { x: Math.round(r(grupoDireita).x), right: Math.round(r(grupoDireita).right), w: Math.round(r(grupoDireita).width), justify: getComputedStyle(grupoDireita).justifyContent } : null,
      nav: nav ? { x: Math.round(r(nav).x), right: Math.round(r(nav).right), cy: Math.round(r(nav).top + r(nav).height / 2) } : null,
      seletor: seletor ? { x: Math.round(r(seletor).x), right: Math.round(r(seletor).right), cy: Math.round(r(seletor).top + r(seletor).height / 2) } : null,
      gapNavSeletor: nav && seletor ? Math.round(r(seletor).x - r(nav).right) : null,
      gapBotoes: anterior && pagina1 ? Math.round(r(pagina1).x - r(anterior).right) : null,
      botoes: [anterior, pagina1, proxima].map((el) => (el ? Math.round(r(el).width) : null)),
    };
  });

  // Navegação funcional.
  const rows = p.locator('tbody tr');
  await p.getByRole('button', { name: 'Próxima página' }).click();
  await p.waitForTimeout(300);
  const depois = { rows: await rows.count(), texto: (await p.locator('body').innerText()).match(/Mostrando[^\n]*/)?.[0] };
  await p.screenshot({ path: `tmp-turmas-fidelidade/candidatos-paginacao-${width}.png` });
  saida.push({ width, ui, depois, erros });
  await c.close();
}
console.log(JSON.stringify(saida, null, 2));
await b.close();
