import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const [width, height] of [[1600, 1000], [1440, 900], [390, 844], [768, 1024]]) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
  await p.waitForTimeout(1600);
  const out = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const pag = [...document.querySelectorAll('p')].find((el) => el.textContent?.includes('Mostrando'));
    const paginacao = pag?.closest('.border-t') ?? pag?.parentElement;
    const cards = [...document.querySelectorAll('div.md\\:hidden > div')].filter((el) => el.getClientRects().length > 0);
    return {
      scrollY: document.documentElement.scrollHeight,
      paginacaoY: paginacao ? Math.round(r(paginacao).top) : null,
      paginacaoH: paginacao ? Math.round(r(paginacao).height) : null,
      viewportH: window.innerHeight,
      cards: cards.slice(0, 2).map((el) => ({
        h: Math.round(r(el).height),
        w: Math.round(r(el).width),
        overflow: el.scrollWidth - el.clientWidth,
        texto: el.innerText.replace(/\n/g, ' | ').slice(0, 160),
      })),
      cardOverflowTotal: cards.reduce((total, el) => total + (el.scrollWidth - el.clientWidth), 0),
      linhas: [...document.querySelectorAll('tbody tr')].length,
    };
  });
  console.log(width, JSON.stringify(out));
  await c.close();
}
await b.close();
