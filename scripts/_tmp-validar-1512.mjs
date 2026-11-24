/**
 * TEMPORÁRIO — validação final na VIEWPORT DE REFERÊNCIA (1512x1200):
 *  · distância entre as duas bases (<= 2px), na medição pedida pelo usuário;
 *  · 6 registros na 1ª página, 4 na 2ª, seletor e contador;
 *  · as 4 atividades inteiramente visíveis (sem corte/rolagem interna);
 *  · altura das linhas da tabela e dos cards intocada.
 * Uso: node scripts/_tmp-validar-1512.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const SAIDA = 'tmp-alinhamento-1512';
mkdirSync(SAIDA, { recursive: true });

const MEDIR = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const round = (n) => Math.round(n);
  const card = (t) => Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === t)?.closest('section') ?? null;
  const table = document.querySelector('table')?.closest('section');
  const activity = card('Atividade recente');
  const acoes = card('Próximas ações');
  const trs = Array.from(document.querySelectorAll('tbody tr'));
  const itens = Array.from(activity?.querySelectorAll('li') ?? []);
  const rT = table?.getBoundingClientRect();
  const rA = activity?.getBoundingClientRect();
  return {
    tableBottom: rT ? round(rT.bottom) : null,
    activityBottom: rA ? round(rA.bottom) : null,
    difference: rT && rA ? round(rA.bottom - rT.bottom) : null,
    absDifference: rT && rA ? Math.abs(round(rA.bottom - rT.bottom)) : null,
    linhas: trs.length,
    alturaDaLinha: trs[0] ? round(trs[0].getBoundingClientRect().height) : null,
    rodape: texto(table?.querySelector('footer')).slice(0, 40),
    seletor: texto(table?.querySelector('[aria-label="Linhas por página"]')),
    paginaAtiva: texto(table?.querySelector('[aria-current="page"]')),
    alturaAtividade: rA ? round(rA.height) : null,
    alturaTabela: rT ? round(rT.height) : null,
    alturaAcoes: acoes ? round(acoes.getBoundingClientRect().height) : null,
    gapEntreCards: acoes && rA ? round(rA.top - acoes.getBoundingClientRect().bottom) : null,
    atividades: itens.map((li) => ({ altura: round(li.getBoundingClientRect().height), texto: texto(li).slice(0, 70) })),
    vazioAbaixoDaUltimaAtividade: rA && itens.length ? round(rA.bottom - itens[itens.length - 1].getBoundingClientRect().bottom) : null,
    rolagemInterna: activity ? activity.scrollHeight - activity.clientHeight : null,
    alturaDosCardsLaterais: [card('Resumo Financeiro'), acoes, activity].map((el) => (el ? round(el.getBoundingClientRect().height) : null)),
    flexGrow: [card('Resumo Financeiro'), acoes, activity].map((el) => (el ? getComputedStyle(el).flexGrow : null)),
  };
};

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1512, height: 1200 } });
const page = await contexto.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)));
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(5000);

const resultados = { pagina1: await page.evaluate(MEDIR) };

// Régua exatamente na base do card Atividade recente
const guia = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const activity = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Atividade recente')?.closest('section');
  const table = document.querySelector('table')?.closest('section');
  const rA = activity.getBoundingClientRect();
  const rT = table.getBoundingClientRect();
  const d = document.createElement('div');
  d.style.cssText = `position:fixed;left:270px;width:1230px;top:${Math.round(rA.bottom)}px;height:1px;background:#a3e635;z-index:9999`;
  document.body.appendChild(d);
  return { baseAtividade: Math.round(rA.bottom), baseTabela: Math.round(rT.bottom) };
});
resultados.guia = guia;
await page.screenshot({ path: `${SAIDA}/bases-1512-com-guia.png`, clip: { x: 260, y: Math.max(0, guia.baseTabela - 240), width: 1240, height: 300 } });
await page.evaluate(() => document.querySelectorAll('div[style*="z-index:9999"]').forEach((d) => d.remove()));
await page.screenshot({ path: `${SAIDA}/desktop-1512.png`, fullPage: true });

await page.getByRole('button', { name: 'Próxima página' }).click();
await page.waitForTimeout(900);
resultados.pagina2 = await page.evaluate(MEDIR);
await page.screenshot({ path: `${SAIDA}/pagina-2.png`, fullPage: true });

await page.getByRole('button', { name: 'Página anterior' }).click();
await page.waitForTimeout(900);
resultados.semJanela = await page.evaluate(() => window.scrollX === 0);

// Estabilidade: repetir a medição da página 1 três vezes
resultados.repeticoes = [];
for (let i = 0; i < 3; i += 1) {
  await page.waitForTimeout(500);
  const m = await page.evaluate(MEDIR);
  resultados.repeticoes.push({ tableBottom: m.tableBottom, activityBottom: m.activityBottom, difference: m.difference });
}

resultados.erros = erros;
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify(resultados, null, 2));
await contexto.close();
await browser.close();
