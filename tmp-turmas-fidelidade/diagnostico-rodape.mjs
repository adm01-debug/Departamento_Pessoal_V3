import { chromium } from '@playwright/test';

const log = (...args) => console.error('[diag]', ...args);

log('start', new Date().toISOString());
const b = await chromium.launch();
log('launched');
const c = await b.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1650, height: 900 },
});
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});
const p = await c.newPage();
p.setDefaultTimeout(90000);
log('page');
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'commit', timeout: 90000 });
log('commit');
await p.waitForTimeout(3000);
log('title', await p.title());
log('url', p.url());
const tabs = await p.getByRole('tab').allTextContents();
log('tabs', JSON.stringify(tabs));
await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
log('clicked');
await p.waitForTimeout(2500);
const texto = await p.locator('p', { hasText: 'Mostrando' }).first().textContent();
log('mostrando', texto);
const ui = await p.evaluate(() => {
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  const t = [...document.querySelectorAll('p')].find((el) => el.textContent?.includes('Mostrando'));
  const rodape = t?.closest('.border-t');
  const contador = t?.parentElement;
  const grupo = rodape?.lastElementChild;
  const nav = grupo?.firstElementChild;
  const seletor = grupo?.lastElementChild;
  return {
    overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rodape: rodape ? { x: r(rodape).x, right: r(rodape).right } : null,
    contador: contador ? { x: r(contador).x, cy: r(contador).top + r(contador).height / 2 } : null,
    grupo: grupo
      ? { x: r(grupo).x, right: r(grupo).right, cy: r(grupo).top + r(grupo).height / 2 }
      : null,
    nav: nav ? { right: r(nav).right } : null,
    seletor: seletor ? { x: r(seletor).x } : null,
    gap: nav && seletor ? Math.round(r(seletor).x - r(nav).right) : null,
  };
});
log('ui', JSON.stringify(ui));
await p.screenshot({ path: 'tmp-turmas-fidelidade/candidatos-rodape-diagnostico.png' });
log('done');
await c.close();
await b.close();
