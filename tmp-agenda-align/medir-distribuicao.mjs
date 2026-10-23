import { chromium } from '@playwright/test';

/**
 * Mede a distribuição vertical dos sete dias da Agenda da semana.
 * Uso: node tmp-agenda-align/medir-distribuicao.mjs [largura] [altura]
 */
const larguras = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const alvos = larguras.length ? larguras : [1440];

const browser = await chromium.launch();
const saida = [];

for (const largura of alvos) {
  const altura = largura <= 1024 ? 768 : 900;
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: largura, height: altura },
  });
  await context.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.getByRole('tab', { name: 'Turmas' }).click();
  await page.waitForTimeout(2200);

  const dados = await page.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const painel = document.querySelector('[data-turmas-agenda]');
    const wrapper = painel?.parentElement;
    const header = painel?.querySelector('header');
    const lista = document.querySelector('[data-agenda-lista]');
    const dias = [...document.querySelectorAll('[data-agenda-dia]')];
    const ultimo = dias.at(-1);
    const colunas = [...document.querySelectorAll('[data-turmas-coluna]')];
    const cards = [...document.querySelectorAll('[data-turma-card]')];
    const baseCards = cards.length
      ? Math.max(...cards.map((c) => r(c).bottom))
      : null;
    const alturas = dias.map((dia) => Math.round(r(dia).height));

    return {
      viewport: { largura: window.innerWidth, altura: window.innerHeight },
      painel: r(painel) && { top: Math.round(r(painel).top), h: Math.round(r(painel).height) },
      wrapper: r(wrapper) && { h: Math.round(r(wrapper).height) },
      header: r(header) && { h: Math.round(r(header).height) },
      lista: r(lista) && { h: Math.round(r(lista).height) },
      dias: dias.map((dia) => ({
        data: dia.getAttribute('data-agenda-dia')?.slice(0, 10),
        h: Math.round(r(dia).height),
        overflow: dia.scrollHeight - dia.clientHeight,
      })),
      alturaMin: Math.min(...alturas),
      alturaMax: Math.max(...alturas),
      ultimoDiaH: ultimo && Math.round(r(ultimo).height),
      sobraAbaixoDoUltimoDia: ultimo && Math.round(r(painel).bottom - r(ultimo).bottom),
      baseCards: baseCards && Math.round(baseCards),
      baseAgenda: Math.round(r(painel).bottom),
      diferencaBases: baseCards ? Math.round(r(painel).bottom - baseCards) : null,
      alturaColunas: colunas.map((c) => Math.round(r(c).height)),
      cards: cards.length,
      overflowPainel: painel ? painel.scrollHeight - painel.clientHeight : null,
      overflowDocumento: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  saida.push({ largura, ...dados });
  await page.screenshot({
    path: `tmp-agenda-align/distribuicao-${largura}x${altura}.png`,
    fullPage: true,
  });
  await context.close();
}

console.log(JSON.stringify(saida, null, 2));
await browser.close();
