/**
 * TEMPORÁRIO — valida o hover dos 3 itens de "Próximas ações": fundo escurecido
 * na linha inteira, raio 10px, transição 200ms ease-in-out, geometria e cores
 * dos ícones inalteradas, volta suave ao estado normal, cursor pointer e foco
 * visível por teclado.
 * Uso: node scripts/_tmp-validar-hover-proximas-acoes.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const SAIDA = 'tmp-hover-proximas-acoes';
mkdirSync(SAIDA, { recursive: true });

const LER = (indice) => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const card = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Próximas ações')?.closest('section');
  const itens = Array.from(card.querySelectorAll('button'));
  const item = itens[indice];
  const cs = getComputedStyle(item);
  const r = item.getBoundingClientRect();
  const svg = item.querySelector('svg');
  const seta = item.querySelector('svg:last-of-type');
  return {
    itens: itens.length,
    rotulo: texto(item).slice(0, 40),
    fundo: cs.backgroundColor,
    raio: cs.borderRadius,
    transicaoPropriedade: cs.transitionProperty,
    transicaoDuracao: cs.transitionDuration,
    transicaoTiming: cs.transitionTimingFunction,
    cursor: cs.cursor,
    box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    corDoIcone: svg ? getComputedStyle(svg).color : null,
    corDaSeta: seta ? getComputedStyle(seta).color : null,
    fonte: cs.fontSize + ' ' + cs.fontWeight,
    gap: cs.gap,
  };
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
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(4500);

const itens = page.locator('section:has(> h3:text-is("Próximas ações")) button');
const quantos = await itens.count();
const card = page.locator('section:has(> h3:text-is("Próximas ações"))');
const caixaDoCard = await card.boundingBox();
const resultados = { quantidadeDeItens: quantos, caixaDoCard, itens: [] };

for (let i = 0; i < quantos; i += 1) {
  await page.mouse.move(10, 10);
  await page.waitForTimeout(350);
  const normal = await page.evaluate(LER, i);
  const caixa = await itens.nth(i).boundingBox();
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await page.waitForTimeout(350);
  const hover = await page.evaluate(LER, i);
  await card.screenshot({ path: `${SAIDA}/item-${i + 1}-hover.png` });
  await page.mouse.move(10, 10);
  await page.waitForTimeout(400);
  const voltou = await page.evaluate(LER, i);
  resultados.itens.push({ indice: i + 1, normal, hover, voltou });
}

// As três linhas na largura total do card + o card inteiro SEM hover
await page.mouse.move(10, 10);
await page.evaluate(() => document.activeElement?.blur());
await page.waitForTimeout(400);
const cardAcoes = page.locator('section:has(> h3:text-is("Próximas ações"))');
await cardAcoes.screenshot({ path: `${SAIDA}/card-normal.png` });
await page.screenshot({ path: `${SAIDA}/pagina-completa.png` });

// Foco por teclado no primeiro item (fundo + anel de foco do DS).
// `page.keyboard.press('Tab')` antes de focar coloca o navegador em "modo
// teclado", que é o que faz o heurístico do `:focus-visible` casar.
await page.mouse.move(10, 10);
await page.keyboard.press('Tab');
await itens.first().focus();
await page.waitForTimeout(350);
resultados.focoPorTeclado = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const card = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Próximas ações')?.closest('section');
  const item = card.querySelector('button');
  const cs = getComputedStyle(item);
  return { fundo: cs.backgroundColor, sombra: cs.boxShadow ? 'presente' : 'nenhuma', outline: cs.outlineStyle };
});
await page.screenshot({ path: `${SAIDA}/foco-teclado.png`, fullPage: false });

resultados.erros = erros;
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify(resultados, null, 2));
await contexto.close();
await browser.close();
