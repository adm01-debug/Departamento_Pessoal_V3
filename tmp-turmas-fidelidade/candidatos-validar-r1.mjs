import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1650, height: 1000 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(e.message));
p.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text().slice(0, 250));
});
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);
await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
await p.waitForTimeout(2000);
const info = await p.evaluate(() => {
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  const indicadores = [...document.querySelectorAll('[aria-label="Filtrar candidatos por situação"] button')];
  const rows = [...document.querySelectorAll('tbody tr')];
  return {
    indicadores: indicadores.map((el) => ({
      texto: el.innerText.replace(/\n/g, ' | '),
      pressed: el.getAttribute('aria-pressed'),
      h: Math.round(r(el).height),
    })),
    cabecalhos: [...document.querySelectorAll('thead th')].map((th) => th.textContent?.trim()),
    linhas: rows.length,
    primeira: rows[0]?.innerText.replace(/\n/g, ' | '),
    pagina: document.body.innerText.match(/Mostrando[^\n]*/)?.[0] ?? null,
    overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    overflowTabela: (() => {
      const t = document.querySelector('table');
      const w = t?.parentElement;
      return w ? w.scrollWidth - w.clientWidth : null;
    })(),
  };
});
await p.screenshot({ path: 'tmp-turmas-fidelidade/candidatos-depois-r1.png' });
console.log(JSON.stringify({ info, erros }, null, 2));
await b.close();
