import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto('http://localhost:8080/tmp-auditoria/harness-b05.html?modo=agenda', {
  waitUntil: 'domcontentloaded',
});
await page.waitForTimeout(1500);

const dados = await page.evaluate(() => {
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  const painel = document.querySelector('[data-turmas-agenda]');
  const lista = document.querySelector('[data-agenda-lista]');
  const dias = [...document.querySelectorAll('[data-agenda-dia]')];
  const gatilho = document.querySelector('[data-dia-popover-trigger]');
  const centro = gatilho ? { x: r(gatilho).x + r(gatilho).width / 2, y: r(gatilho).y + r(gatilho).height / 2 } : null;
  return {
    painel: { h: Math.round(r(painel).height), top: Math.round(r(painel).top) },
    lista: { h: Math.round(r(lista).height), rows: getComputedStyle(lista).gridTemplateRows },
    dias: dias.map((dia) => {
      const conteudo = dia.lastElementChild;
      return {
        data: dia.getAttribute('data-agenda-dia')?.slice(0, 10),
        h: Math.round(r(dia).height),
        top: Math.round(r(dia).top),
        bottom: Math.round(r(dia).bottom),
        conteudoH: Math.round(r(conteudo).height),
        conteudoScroll: conteudo.scrollHeight,
        overflow: conteudo.scrollHeight - conteudo.clientHeight,
      };
    }),
    gatilho: gatilho
      ? { top: Math.round(r(gatilho).top), bottom: Math.round(r(gatilho).bottom), h: Math.round(r(gatilho).height) }
      : null,
    elementoNoCentro: centro ? document.elementFromPoint(centro.x, centro.y)?.outerHTML.slice(0, 160) : null,
  };
});

console.log(JSON.stringify(dados, null, 2));
await page.screenshot({ path: 'tmp-auditoria/b05-medicao.png' });
await browser.close();
