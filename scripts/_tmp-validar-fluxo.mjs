/**
 * TEMPORÁRIO — validação visual do FLUXO DE PAGAMENTO (referência aprovada).
 *
 * Mede no DOM real: barra única em uma linha, título à esquerda, cinco etapas sem
 * cartões, círculos 32–36px, contadores abaixo dos nomes, chevrons centrados, sem
 * valores monetários, altura da barra e o acesso a "fora do fluxo" (que saiu da
 * barra para a área de filtros). Também confere a responsividade.
 *
 * Uso: node scripts/_tmp-validar-fluxo.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';
const SAIDA = 'tmp-fluxo-pagamento';
mkdirSync(SAIDA, { recursive: true });

const MEDIR = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const h3 = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Fluxo de Pagamento');
  const barra = h3?.closest('section');
  const subtitulo = barra ? Array.from(barra.querySelectorAll('p')).find((p) => /Acompanhe cada etapa/.test(texto(p))) : null;
  const itens = Array.from(barra?.querySelectorAll('ol > li') ?? []);
  const circulos = Array.from(barra?.querySelectorAll('ol > li button > span:first-child') ?? []);
  const nomes = Array.from(barra?.querySelectorAll('ol > li button > span:last-child > span:first-child') ?? []);
  const contadores = Array.from(barra?.querySelectorAll('ol > li button > span:last-child > span:last-child') ?? []);
  const chevrons = Array.from(barra?.querySelectorAll('ol > li > svg') ?? []);
  const cx = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cy: Math.round(r.y + r.height / 2) };
  };
  const cs = (el) => getComputedStyle(el);
  const rb = barra?.getBoundingClientRect();
  const topoDe = (el) => Math.round(el.getBoundingClientRect().top);
  return {
    existe: !!barra,
    alturaBarra: rb ? Math.round(rb.height) : null,
    textoDaBarra: texto(barra).slice(0, 220),
    temValorMonetario: /R\$/.test(texto(barra)),
    temForaDoFluxo: /fora do fluxo/i.test(texto(barra)),
    titulo: h3 ? cx(h3) : null,
    subtitulo: subtitulo ? cx(subtitulo) : null,
    tituloEhEsquerda: h3 && circulos[0] ? h3.getBoundingClientRect().right <= circulos[0].getBoundingClientRect().left + 2 : null,
    itens: itens.length,
    circulos: circulos.map((c) => ({ ...cx(c), borda: cs(c).borderTopWidth })),
    nomes: nomes.map((n) => texto(n)),
    contadores: contadores.map((c) => texto(c)),
    contadorAbaixoDoNome: nomes.map((n, i) => (contadores[i] ? contadores[i].getBoundingClientRect().top >= n.getBoundingClientRect().bottom - 1 : null)),
    botoesSemCartao: Array.from(barra?.querySelectorAll('ol > li button') ?? []).map((b) => ({
      borda: cs(b).borderTopWidth,
      fundo: cs(b).backgroundColor,
    })),
    diferencaVerticalEntreEtapas: itens.length > 0 ? Math.max(...itens.map(topoDe)) - Math.min(...itens.map(topoDe)) : null,
    chevrons: chevrons.length,
    chevronsCentrados: chevrons.every((c) => Math.abs(cx(c).cy - cx(circulos[0]).cy) <= 6),
    chipForaDoFluxo: (() => {
      const chip = Array.from(document.querySelectorAll('button')).find((b) => /fora do fluxo/.test(texto(b)));
      return chip ? { texto: texto(chip), ariaPressed: chip.getAttribute('aria-pressed') } : null;
    })(),
    rolagemHorizontalPagina: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
};

const browser = await chromium.launch();
const resultados = {};

// UM contexto só: a viewport é redimensionada entre as medições (sem novo load),
// o que mantém a execução curta o suficiente para rodar de ponta a ponta.
const contexto = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1456, height: 1000 },
});
const page = await contexto.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)));
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.getByRole('heading', { name: /Pagamentos & Premiações/ }).waitFor({ timeout: 15_000 });
await page.waitForTimeout(2200);

for (const [nome, largura, altura] of [
  ['desktop-1456', 1456, 1000],
  ['tablet-1024', 1024, 1000],
  ['mobile-390', 390, 900],
]) {
  await page.setViewportSize({ width: largura, height: altura });
  await page.waitForTimeout(600);
  resultados[nome] = await page.evaluate(MEDIR);

  const caixa = await page.evaluate(() => {
    const h3 = Array.from(document.querySelectorAll('h3')).find((h) => (h.textContent ?? '').trim() === 'Fluxo de Pagamento');
    const r = h3?.closest('section')?.getBoundingClientRect();
    return r
      ? { x: Math.max(0, Math.round(r.x) - 4), y: Math.max(0, Math.round(r.y) - 4), width: Math.round(r.width) + 8, height: Math.round(r.height) + 8 }
      : null;
  });
  if (caixa) {
    try {
      await page.screenshot({ path: `${SAIDA}/${nome}-fluxo.png`, clip: caixa, fullPage: true });
    } catch (e) {
      erros.push(`screenshot ${nome}: ${String(e.message).slice(0, 100)}`);
    }
  }
  await page.screenshot({ path: `${SAIDA}/${nome}-pagina.png` });

  // O acesso a "fora do fluxo" passou para o seletor de etapa (sem mexer no
  // layout aprovado da barra de filtros). Confere a opção com a contagem e que a
  // barra continua em UMA linha.
  await page.getByLabel('Etapa do fluxo').click();
  await page.waitForTimeout(500);
  const opcoes = await page.locator('[role="option"]').allInnerTexts();
  resultados[nome].opcaoForaDoFluxo = opcoes.find((o) => /Fora do fluxo/.test(o)) ?? null;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  resultados[nome].alturaBarraFiltros = await page.evaluate(() => {
    const barra = document.querySelector('input[aria-label="Buscar pagamentos"]')?.closest('.flex-wrap');
    return barra ? Math.round(barra.getBoundingClientRect().height) : null;
  });
}

// Clicar numa etapa do fluxo também filtra a tabela
const etapa1 = page.getByRole('button', { name: /Calculado/ }).first();
if ((await etapa1.count()) > 0) {
  await etapa1.click();
  await page.waitForTimeout(600);
  resultados.etapaCalculadoFiltra = await page.locator('p', { hasText: /Mostrando/ }).first().innerText();
  await etapa1.click();
  await page.waitForTimeout(300);
}

resultados.erros = erros;
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify(resultados, null, 2));

await contexto.close();
await browser.close();
