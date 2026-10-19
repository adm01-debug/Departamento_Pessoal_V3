/** TEMPORÁRIO — mapeia a geometria da grade/tabela/lateral nos dois estados. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1456, height: 1000 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(2400);

const MAPEAR = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const cx = (el, rotulo) => {
    if (!el) return { rotulo, ausente: true };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      rotulo,
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      altura: Math.round(r.height),
      classe: String(el.className).slice(0, 70),
      display: cs.display,
      flex: cs.flex,
      height: cs.height,
      contain: cs.contain,
    };
  };
  const grid = document.querySelector('section table')?.closest('div.grid');
  const tabela = document.querySelector('section table')?.closest('section');
  const colunaPrincipal = tabela?.parentElement;
  const lateralWrapper = colunaPrincipal?.nextElementSibling;
  const lateralRoot = lateralWrapper?.firstElementChild;
  const cardResumo = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Resumo Financeiro')?.closest('section');
  const cardAcoes = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Próximas ações')?.closest('section');
  const cardAtiv = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Atividade recente')?.closest('section');
  return {
    grid: cx(grid, 'grid'),
    colunaPrincipal: cx(colunaPrincipal, 'coluna principal'),
    tabela: cx(tabela, 'card da tabela'),
    rodapeDaTabela: cx(tabela?.querySelector('footer'), 'rodape da tabela'),
    lateralWrapper: cx(lateralWrapper, 'wrapper lateral'),
    lateralRoot: cx(lateralRoot, 'root lateral'),
    cardResumo: cx(cardResumo, 'resumo'),
    cardAcoes: cx(cardAcoes, 'acoes'),
    cardAtiv: cx(cardAtiv, 'atividade'),
  };
};

const saida = { inicial: await page.evaluate(MAPEAR) };
await page.getByLabel('Status').click();
await page.getByRole('option', { name: 'Rejeitado' }).click();
await page.waitForTimeout(900);
saida.filtrado = await page.evaluate(MAPEAR);

for (const [k, v] of Object.entries(saida)) {
  console.log('\n### ' + k);
  for (const [nome, m] of Object.entries(v)) {
    console.log(`  ${nome.padEnd(20)} top=${String(m.top).padStart(5)} bottom=${String(m.bottom).padStart(5)} h=${String(m.altura).padStart(4)} flex=${m.flex ?? '-'} height=${m.height ?? '-'} contain=${m.contain ?? '-'}`);
  }
}
await contexto.close();
await browser.close();
