/**
 * TEMPORÁRIO — valida o hover de linha nas tabelas de PAGAMENTOS e CAMPANHAS:
 * fundo escurecido em toda a linha, transição 200ms ease-in-out, geometria
 * intacta, cores internas (badges/avatares/ícones) preservadas, checkbox e menu
 * funcionando, e o MESMO efeito nos dois módulos.
 * Uso: node scripts/_tmp-validar-hover-tabelas.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const SAIDA = 'tmp-hover-tabelas';
mkdirSync(SAIDA, { recursive: true });

const LINHAS = (tabela) => {
  const t = document.querySelectorAll('table')[tabela];
  return Array.from(t.querySelectorAll('tbody tr')).map((tr) => {
    const r = tr.getBoundingClientRect();
    const cs = getComputedStyle(tr);
    const badge = tr.querySelector('span.rounded-full');
    const avatar = tr.querySelector('img, span[title]');
    return {
      fundo: cs.backgroundColor,
      fundoDoBadge: badge ? getComputedStyle(badge).backgroundColor : null,
      corDoAvatar: avatar ? getComputedStyle(avatar).color + '|' + getComputedStyle(avatar).backgroundColor : null,
      transicao: cs.transitionDuration + ' ' + cs.transitionTimingFunction,
      sombra: cs.boxShadow,
      borda: cs.borderTopWidth + ' ' + cs.borderTopColor,
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      escala: cs.transform,
    };
  });
};

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1512, height: 1200 } });
const page = await contexto.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 140)));
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });

const coletar = async (indiceTabela, indice, prefixo, tabela) => {
  await page.mouse.move(10, 10);
  await page.waitForTimeout(400);
  const antes = (await page.evaluate(LINHAS, tabela))[indice];
  await page.mouse.move(antes.box.x + antes.box.w / 2, antes.box.y + antes.box.h / 2);
  await page.waitForTimeout(350);
  const durante = (await page.evaluate(LINHAS, tabela))[indice];
  const outras = (await page.evaluate(LINHAS, tabela)).filter((_, i) => i !== indice);
  await page.screenshot({
    path: `${SAIDA}/${prefixo}-linha-${indice + 1}.png`,
    clip: { x: antes.box.x, y: antes.box.y, width: antes.box.w, height: antes.box.h },
  });
  await page.mouse.move(10, 10);
  await page.waitForTimeout(400);
  const depois = (await page.evaluate(LINHAS, tabela))[indice];
  return {
    antes,
    durante,
    depois,
    outrasLinhasIntactas: outras.every((o) => o.fundo === 'rgba(0, 0, 0, 0)'),
  };
};

const resultados = { pagamentos: [], campanhas: [], erros: [] };

await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(4200);
for (let i = 0; i < 6; i += 1) {
  resultados.pagamentos.push(await coletar(0, i, 'pagamentos', 0));
}

// Interações continuam funcionando na tabela de Pagamentos: checkbox e menu
await page.locator('tbody tr').first().locator('button[role="checkbox"]').click();
await page.waitForTimeout(600);
resultados.checkboxFunciona = await page.evaluate(() => {
  const cb = document.querySelector('tbody tr button[role="checkbox"]');
  const barra = Array.from(document.querySelectorAll('button')).some((b) => /Aprovar selecionados/i.test(b.textContent ?? ''));
  return { estadoDoCheckbox: cb?.getAttribute('data-state'), barraDeSelecao: barra };
});
await page.locator('tbody tr').nth(1).locator('button[aria-label^="Mais ações"]').click();
await page.waitForTimeout(700);
resultados.menuAbre = await page.getByRole('menu').isVisible().catch(() => false);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// Tabela de Campanhas
await page.getByRole('tab', { name: /^Campanhas/ }).click();
await page.waitForTimeout(4200);
const totalCampanhas = await page.evaluate(() => document.querySelectorAll('table')[0].querySelectorAll('tbody tr').length);
for (let i = 0; i < Math.min(totalCampanhas, 4); i += 1) {
  resultados.campanhas.push(await coletar(0, i, 'campanhas', 0));
}
resultados.tabelaCampanhasLinhas = totalCampanhas;

resultados.erros = erros;
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify({
  pagamentos: resultados.pagamentos.map((p) => ({ antes: p.antes.fundo, hover: p.durante.fundo, depois: p.depois.fundo, transicao: p.durante.transicao, sombra: p.durante.sombra, escala: p.durante.escala, box: `${p.antes.box.w}x${p.antes.box.h}->${p.durante.box.w}x${p.durante.box.h}`, badge: `${p.antes.fundoDoBadge}->${p.durante.fundoDoBadge}`, outrasIntactas: p.outrasLinhasIntactas })),
  campanhas: resultados.campanhas.map((c) => ({ antes: c.antes.fundo, hover: c.durante.fundo, depois: c.depois.fundo, transicao: c.durante.transicao, box: `${c.antes.box.w}x${c.antes.box.h}->${c.durante.box.w}x${c.durante.box.h}`, badge: `${c.antes.fundoDoBadge}->${c.durante.fundoDoBadge}`, outrasIntactas: c.outrasLinhasIntactas })),
  checkboxFunciona: resultados.checkboxFunciona,
  menuAbre: resultados.menuAbre,
  tabelaCampanhasLinhas: totalCampanhas,
  erros,
}, null, 2));
await contexto.close();
await browser.close();
