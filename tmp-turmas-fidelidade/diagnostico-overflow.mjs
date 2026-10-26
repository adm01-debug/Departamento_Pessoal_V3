import { chromium } from '@playwright/test';

const log = (...args) => console.error('[overflow]', ...args);
const b = await chromium.launch();
const saida = [];

for (const [width, height] of [
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  const c = await b.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width, height },
  });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
  });
  const p = await c.newPage();
  p.setDefaultTimeout(90000);
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'commit', timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
  await p.waitForTimeout(2000);

  const info = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const t = [...document.querySelectorAll('p')].find((el) => el.textContent?.includes('Mostrando'));
    const rodape = t?.closest('.border-t');
    const grupo = rodape?.lastElementChild;
    const nav = grupo?.firstElementChild;
    const seletor = grupo?.lastElementChild;
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const descrever = (el) => ({
      tag: el.tagName,
      classe: (el.className || '').toString().slice(0, 120),
      right: Math.round(rect(el).right),
      width: Math.round(rect(el).width),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: getComputedStyle(el).overflowX,
    });
    const culpados = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = rect(el);
        return r && r.right > vw + 1 && r.width > 0;
      })
      .slice(0, 15)
      .map(descrever);
    return {
      vw,
      doc: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
      },
      rodape: rodape
        ? {
            ...descrever(rodape),
            scrollWidth: rodape.scrollWidth,
            clientWidth: rodape.clientWidth,
            overflowX: getComputedStyle(rodape).overflowX,
          }
        : null,
      grupo: grupo
        ? {
            ...descrever(grupo),
            scrollWidth: grupo.scrollWidth,
            clientWidth: grupo.clientWidth,
            flexWrap: getComputedStyle(grupo).flexWrap,
            altura: Math.round(rect(grupo).height),
          }
        : null,
      nav: nav ? { width: Math.round(rect(nav).width), right: Math.round(rect(nav).right) } : null,
      seletor: seletor
        ? { width: Math.round(rect(seletor).width), x: Math.round(rect(seletor).x), right: Math.round(rect(seletor).right) }
        : null,
      culpados,
    };
  });

  saida.push({ width, ...info });
  log('width', width, 'doc', JSON.stringify(info.doc), 'rodapeScroll', info.rodape?.scrollWidth, info.rodape?.clientWidth);
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
