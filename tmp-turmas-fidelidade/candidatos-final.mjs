/**
 * TEMPORÁRIO — capturas finais e métricas da área Candidatos.
 */
import { chromium } from '@playwright/test';

const alvos = [
  { width: 1650, height: 900, nome: '1650' },
  { width: 1440, height: 900, nome: '1440' },
  { width: 1024, height: 768, nome: '1024' },
  { width: 768, height: 1024, nome: '768' },
  { width: 390, height: 844, nome: '390' },
  { width: 375, height: 812, nome: '375' },
];
const b = await chromium.launch();
const saida = [];

for (const alvo of alvos) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: alvo.width, height: alvo.height } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
  await p.waitForTimeout(1800);

  const ui = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const pag = [...document.querySelectorAll('p')].find((el) => el.textContent?.includes('Mostrando'));
    const paginacao = pag?.closest('.border-t') ?? pag?.parentElement;
    const rows = [...document.querySelectorAll('tbody tr')];
    const cards = [...document.querySelectorAll('div.md\\:hidden > div')].filter((el) => el.getClientRects().length > 0);
    const tabela = document.querySelector('table');
    const wrap = tabela?.parentElement ?? null;
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      indicadores: [...document.querySelectorAll('[aria-label="Filtrar candidatos por situação"] button')].map((el) => ({
        texto: el.innerText.replace(/\n/g, ' '),
        pressed: el.getAttribute('aria-pressed'),
        h: Math.round(r(el).height),
      })),
      filtros: ['Vaga', 'Etapa', 'Origem', 'Ordenar por'].map((nome) => ({
        nome,
        y: Math.round(r(document.querySelector(`[aria-label="${nome}"]`)).y),
      })),
      tabela: tabela
        ? {
            visivel: getComputedStyle(tabela.closest('.md\\:block') ?? tabela).display !== 'none',
            wrapOverflow: wrap ? wrap.scrollWidth - wrap.clientWidth : null,
            rowH: rows[0] ? Math.round(r(rows[0]).height) : null,
            rows: rows.length,
            theadH: Math.round(r(document.querySelector('thead tr')).height),
          }
        : null,
      cards: cards.map((el) => ({ h: Math.round(r(el).height), w: Math.round(r(el).width), overflow: el.scrollWidth - el.clientWidth })),
      pagina: pag?.textContent?.trim() ?? null,
      paginacaoY: paginacao ? Math.round(r(paginacao).top) : null,
      paginacaoH: paginacao ? Math.round(r(paginacao).height) : null,
      viewportH: window.innerHeight,
    };
  });

  await p.screenshot({ path: `tmp-turmas-fidelidade/candidatos-final-${alvo.nome}.png` });
  saida.push({ alvo, ui, erros });
  await c.close();
}
console.log(JSON.stringify(saida, null, 2));
await b.close();
