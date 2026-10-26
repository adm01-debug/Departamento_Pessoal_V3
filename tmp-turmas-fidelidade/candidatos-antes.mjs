import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1650, height: 900 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);
await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
await p.waitForTimeout(1800);
await p.screenshot({ path: 'tmp-turmas-fidelidade/candidatos-antes-1650.png' });
const info = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('tbody tr')];
  return {
    titulo: document.querySelector('h1')?.textContent,
    tabela: rows.length,
    cabecalhos: [...document.querySelectorAll('thead th')].map((th) => th.textContent?.trim()),
    linhas: rows.slice(0, 3).map((tr) => tr.innerText.replace(/\n/g, ' | ')),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
