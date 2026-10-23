import { chromium } from '@playwright/test';

/**
 * Diagnóstico: isola qual classe faz a linha da grade crescer além dos cards.
 * Uso: node tmp-agenda-align/diagnosticar-altura.mjs
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
await page.getByRole('tab', { name: 'Turmas' }).click();
await page.waitForTimeout(2200);

const resultado = await page.evaluate(() => {
  const grid = document.querySelector('[data-turmas-grid]');
  const painel = document.querySelector('[data-turmas-agenda]');
  const wrapper = painel?.parentElement;
  const lista = document.querySelector('[data-agenda-lista]');

  const medir = (rotulo) => ({
    rotulo,
    gridH: Math.round(grid.getBoundingClientRect().height),
    painelH: Math.round(painel.getBoundingClientRect().height),
    wrapperH: Math.round(wrapper.getBoundingClientRect().height),
    listaH: Math.round(lista.getBoundingClientRect().height),
    linhas: [...document.querySelectorAll('[data-agenda-dia]')].map((dia) =>
      Math.round(dia.getBoundingClientRect().height)
    ),
  });

  const snapshots = [medir('estado atual')];

  // 1. remove min-h-0 do painel
  painel.classList.remove('min-h-0');
  snapshots.push(medir('sem min-h-0 no painel'));

  // 2. remove min-h-0 do wrapper
  wrapper.classList.remove('min-h-0');
  snapshots.push(medir('sem min-h-0 no wrapper'));

  // 3. remove a definição explícita de 7 linhas
  const classeLinhas = [...lista.classList].find((c) => c.startsWith('grid-rows-'));
  if (classeLinhas) lista.classList.remove(classeLinhas);
  snapshots.push(medir('sem grid-rows-7'));

  // 4. remove min-h-0 da lista
  lista.classList.remove('min-h-0');
  snapshots.push(medir('sem min-h-0 na lista'));

  // 5. remove shrink-0 do cabeçalho
  painel.querySelector('header')?.classList.remove('shrink-0');
  snapshots.push(medir('sem shrink-0 no cabeçalho'));

  return { classeLinhas, snapshots,
    colunas: [...document.querySelectorAll('[data-turmas-coluna]')].map((col) => ({
      chave: col.getAttribute('data-turmas-coluna'),
      h: Math.round(col.getBoundingClientRect().height),
      conteudoH: Math.round(col.lastElementChild.getBoundingClientRect().height),
    })),
    agendaInterno: {
      painelScroll: painel.scrollHeight,
      painelOffset: painel.offsetHeight,
      painelFlex: getComputedStyle(painel).flex,
      painelMinHeight: getComputedStyle(painel).minHeight,
      wrapperFlex: getComputedStyle(wrapper).flex,
      listaScroll: lista.scrollHeight,
    },
  };
});

console.log(JSON.stringify(resultado, null, 2));
await browser.close();
