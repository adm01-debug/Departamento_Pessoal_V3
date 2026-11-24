/**
 * TEMPORÁRIO — valida a padronização dos botões da coluna AÇÕES (Campanhas):
 * mesma cor de fundo/borda/texto/tipografia em TODAS as linhas, hover com fundo
 * mais intenso e sem alteração de dimensões, e preservação do que está em volta.
 * Uso: node scripts/_tmp-validar-botoes-acoes.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const SAIDA = 'tmp-botoes-acoes';
mkdirSync(SAIDA, { recursive: true });

const LER = () => {
  const tabela = document.querySelector('table');
  const linhas = Array.from(tabela.querySelectorAll('tbody tr'));
  return linhas.map((tr) => {
    const celula = tr.children[tr.children.length - 1];
    const botao = celula.querySelector('button');
    const seta = botao.querySelector('svg');
    const cs = getComputedStyle(botao);
    const r = botao.getBoundingClientRect();
    const badge = tr.querySelector('span.rounded-full');
    const barra = tr.querySelector('div[class*="rounded-full"][class*="bg-"]');
    return {
      rotulo: (botao.textContent ?? '').replace(/\s+/g, ' ').trim(),
      fundo: cs.backgroundColor,
      borda: cs.borderTopColor + ' ' + cs.borderTopWidth,
      texto: cs.color,
      icone: seta ? getComputedStyle(seta).color : null,
      raio: cs.borderRadius,
      fonte: cs.fontSize + '/' + cs.fontWeight,
      caixa: `${Math.round(r.width)}x${Math.round(r.height)}`,
      transicao: cs.transitionDuration + ' ' + cs.transitionTimingFunction,
      fundoDoBadgeDaCampanha: badge ? getComputedStyle(badge).backgroundColor : null,
      barra: barra ? getComputedStyle(barra).backgroundColor : null,
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
await page.getByRole('tab', { name: /^Campanhas/ }).click();
await page.waitForTimeout(4500);
await page.mouse.move(10, 10);
await page.waitForTimeout(400);

const normal = await page.evaluate(LER);

// Hover no primeiro botão da coluna
const alvo = await page.evaluate(() => {
  const tr = document.querySelectorAll('table tbody tr')[0];
  const b = tr.children[tr.children.length - 1].querySelector('button').getBoundingClientRect();
  return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), caixa: { x: Math.round(b.x) - 8, y: Math.round(b.y) - 8, width: Math.round(b.width) + 130, height: Math.round(b.height) + 16 } };
});
await page.mouse.move(alvo.x, alvo.y);
await page.waitForTimeout(400);
const comHover = await page.evaluate(LER);
await page.screenshot({ path: `${SAIDA}/botao-hover.png`, clip: alvo.caixa });
await page.mouse.move(10, 10);
await page.waitForTimeout(400);
const depois = await page.evaluate(LER);

// Recorte de todas as linhas (badges/indicadores/avatares/barras ao lado)
const recorteTabela = await page.evaluate(() => {
  const t = document.querySelector('table');
  const a = t.querySelectorAll('tbody tr')[0].getBoundingClientRect();
  const b = t.querySelectorAll('tbody tr')[3]?.getBoundingClientRect() ?? a;
  return { x: Math.round(a.x) - 6, y: Math.round(a.y) - 6, width: Math.round(a.width) + 12, height: Math.round(b.bottom - a.top) + 12 };
});
await page.screenshot({ path: `${SAIDA}/campanhas-todas-linhas.png`, clip: recorteTabela });

const iguais = (lista) => {
  // A largura acompanha o texto de cada ação (dimensão preservada do botão é
  // altura, raio, padding e tipografia) — a comparação ignora só a largura.
  const chave = (b) => [b.fundo, b.borda, b.texto, b.icone, b.raio, b.fonte, b.caixa.split('x')[1], b.transicao].join('|');
  return lista.every((b) => chave(b) === chave(lista[0]));
};

const resultados = {
  normal,
  comHover: comHover[0],
  depois: depois[0],
  todosIguaisNoNormal: iguais(normal),
  hoverMudaFundo: comHover[0].fundo !== normal[0].fundo,
  hoverMantemDimensoes: comHover[0].caixa === normal[0].caixa,
  voltaAoNormal: depois[0].fundo === normal[0].fundo,
  erros,
};
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify(resultados, null, 2));
await contexto.close();
await browser.close();
