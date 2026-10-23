import { chromium } from '@playwright/test';

/** AUDITORIA VISUAL — B-05: lista completa de turmas do dia. */
const resultados = [];
const registrar = (id, esperado, obtido) => {
  const ok = JSON.stringify(esperado) === JSON.stringify(obtido);
  resultados.push({ id, status: ok ? 'APROVADO' : 'REPROVADO', esperado, obtido });
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const base = 'http://localhost:8080/tmp-auditoria/harness-b05.html';

const abrir = async (modo) => {
  await page.goto(`${base}?modo=${modo}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
};

const lerPopover = () =>
  page.evaluate(() => ({
    lista: [...document.querySelectorAll('[data-dia-popover-turma]')].map((item) => ({
      id: item.getAttribute('data-dia-popover-turma'),
      texto: item.innerText.replace(/\n+/g, ' · ').trim(),
      title: item.getAttribute('title'),
      botao: item.tagName,
    })),
    cabecalho: document.querySelector('[data-dia-popover-lista]')?.previousElementSibling?.textContent?.trim() ?? null,
  }));

/* Agenda */
await abrir('agenda');
const gatilho = page.locator('[data-dia-popover-trigger]');
registrar('B05-01', { quantidade: 1, texto: '+3 outras turmas' }, {
  quantidade: await gatilho.count(),
  texto: (await gatilho.first().innerText()).trim(),
});
await page.screenshot({ path: 'tmp-auditoria/b05-agenda-fechado.png' });

await gatilho.first().click();
await page.waitForTimeout(500);
const agenda = await lerPopover();
registrar('B05-02', 5, agenda.lista.length);
registrar('B05-03', 5, new Set(agenda.lista.map((item) => item.id)).size);
registrar(
  'B05-04',
  {
    nomes: 5,
    planejado: true,
    andamento: true,
    concluido: true,
    horarios: true,
    botoes: true,
    nomeLongo: true,
  },
  {
    nomes: agenda.lista.filter((item) => item.texto.length > 0).length,
    planejado: agenda.lista.some((item) => item.texto.includes('Planejado')),
    andamento: agenda.lista.some((item) => item.texto.includes('Em andamento')),
    concluido: agenda.lista.some((item) => item.texto.includes('Concluído')),
    horarios: agenda.lista.filter((item) => /\d{2}:\d{2}/.test(item.texto)).length === 5,
    botoes: agenda.lista.every((item) => item.botao === 'BUTTON'),
    nomeLongo: agenda.lista.some((item) => item.title?.includes('Operações de Alta Complexidade')),
  }
);
await page.screenshot({ path: 'tmp-auditoria/b05-agenda-popover.png' });

await page.keyboard.press('Escape');
await page.waitForTimeout(400);
registrar('B05-05', 0, await page.locator('[data-dia-popover-lista]').count());

/* Calendário */
await abrir('calendario');
const gatilhoCal = page.locator('[data-dia-popover-trigger]');
registrar('B05-06', { quantidade: 1, texto: '+3 turma(s)' }, {
  quantidade: await gatilhoCal.count(),
  texto: (await gatilhoCal.first().innerText()).trim(),
});
await gatilhoCal.first().click();
await page.waitForTimeout(500);
const calendario = await lerPopover();
registrar('B05-07', 5, calendario.lista.length);
registrar('B05-08', 5, new Set(calendario.lista.map((item) => item.id)).size);
await page.screenshot({ path: 'tmp-auditoria/b05-calendario-popover.png' });

/* Mobile */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.screenshot({ path: 'tmp-auditoria/b05-mobile-popover.png', fullPage: true });
registrar(
  'B05-09',
  { semOverflowHorizontal: true, listaAcessivel: true },
  await page.evaluate(() => {
    const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
    return {
      semOverflowHorizontal: (dialogo?.scrollWidth ?? 0) <= (dialogo?.clientWidth ?? 0),
      listaAcessivel: Boolean(dialogo?.querySelector('[data-dia-popover-lista]')),
    };
  })
);

/* Mobile — agenda (o gatilho fica visível na linha do dia) */
await abrir('agenda');
const gatilhoMobile = page.locator('[data-dia-popover-trigger]').first();
await gatilhoMobile.click();
await page.waitForTimeout(500);
const mobile = await page.evaluate(() => {
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  const lista = document.querySelector('[data-dia-popover-lista]');
  const conteudo = lista?.closest('[role="dialog"]');
  const gatilho = document.querySelector('[data-dia-popover-trigger]');
  const centro = gatilho
    ? { x: r(gatilho).x + r(gatilho).width / 2, y: r(gatilho).y + r(gatilho).height / 2 }
    : null;
  return {
    itens: document.querySelectorAll('[data-dia-popover-turma]').length,
    larguraPopover: Math.round(r(conteudo)?.width ?? 0),
    viewport: window.innerWidth,
    overflowX: (conteudo?.scrollWidth ?? 0) - (conteudo?.clientWidth ?? 0),
    gatilhoNoTopo: centro ? document.elementFromPoint(centro.x, centro.y)?.hasAttribute('data-dia-popover-trigger') : false,
  };
});
registrar(
  'B05-10',
  { itens: 5, cabeNaTela: true, overflowX: 0, gatilhoClicavel: true },
  {
    itens: mobile.itens,
    cabeNaTela: mobile.larguraPopover <= mobile.viewport,
    overflowX: mobile.overflowX,
    gatilhoClicavel: mobile.gatilhoNoTopo,
  }
);
await page.screenshot({ path: 'tmp-auditoria/b05-mobile-agenda-popover.png', fullPage: true });

console.log(JSON.stringify(resultados, null, 2));
await browser.close();
