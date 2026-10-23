import { chromium } from '@playwright/test';

/**
 * Injeta dois minicards em um dia vazio e mede a grade da agenda.
 * Verifica se a linha do dia cresce sem sobrepor as vizinhas e se o painel
 * transborda (o painel tem altura fixada pela coluna de cards).
 */
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.getByRole('tab', { name: /Turmas/ }).click();
await page.waitForTimeout(2200);

const medir = (rotulo) =>
  page.evaluate((rotulo) => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const painel = document.querySelector('[data-turmas-agenda]');
    const lista = document.querySelector('[data-agenda-lista]');
    const dias = [...document.querySelectorAll('[data-agenda-dia]')];
    return {
      rotulo,
      painelH: Math.round(r(painel).height),
      listaCliente: lista.clientHeight,
      listaScroll: lista.scrollHeight,
      overflowLista: lista.scrollHeight - lista.clientHeight,
      overflowPainel: painel.scrollHeight - painel.clientHeight,
      linhas: dias.map((dia) => ({
        data: dia.getAttribute('data-agenda-dia')?.slice(5, 10),
        h: Math.round(r(dia).height),
        eventos: dia.querySelectorAll('[data-agenda-evento]').length,
        overflow: dia.scrollHeight - dia.clientHeight,
      })),
      ultimoBottom: Math.round(r(dias.at(-1)).bottom),
      painelBottom: Math.round(r(painel).bottom),
    };
  }, rotulo);

const snaps = [await medir('base (1 evento)')];

// Injeta dois minicards (um com título longo) no dia 16/09.
await page.evaluate(() => {
  const origem = document.querySelector('[data-agenda-evento]');
  const dia = [...document.querySelectorAll('[data-agenda-dia]')].find(
    (el) => el.getAttribute('data-agenda-dia')?.slice(0, 10) === '2026-09-16'
  );
  const alvo = dia.querySelector('.min-w-0');
  alvo.textContent = '';

  const container = document.createElement('div');
  container.className = 'flex flex-col gap-1';

  const primeiro = origem.cloneNode(true);
  const segundo = origem.cloneNode(true);
  segundo.querySelector('span.block.truncate').textContent =
    'Treinamento de Segurança do Trabalho para Operações de Alta Complexidade';

  container.append(primeiro, segundo);
  alvo.append(container);
});
await page.waitForTimeout(400);
snaps.push(await medir('dois eventos no dia'));

// Sem min-h-0 no painel: a altura intrínseca passa a contar na linha da grade.
await page.evaluate(() => {
  document.querySelector('[data-turmas-agenda]').classList.remove('min-h-0');
});
await page.waitForTimeout(300);
snaps.push(await medir('sem min-h-0 no painel'));

console.log(JSON.stringify(snaps, null, 2));
await page.screenshot({ path: 'tmp-agenda-align/dois-eventos.png', fullPage: true });
await browser.close();
