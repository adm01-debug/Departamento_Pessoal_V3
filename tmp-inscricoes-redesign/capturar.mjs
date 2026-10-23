/** TEMPORÁRIO — validação visual/funcional da aba Inscrições. */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-inscricoes-redesign');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const larguras = [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
];

const medir = () => {
  const ret = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), right: +r.right.toFixed(1) };
  };
  const tabela = document.querySelector('[role="table"][aria-label="Inscrições"]');
  const cabecalho = tabela?.querySelector('[role="columnheader"]')?.parentElement;
  const linhas = [...document.querySelectorAll('[data-inscricao-row]')];
  const primeira = linhas[0];
  const celulas = primeira ? [...primeira.querySelectorAll('[role="cell"]')].map(ret) : [];
  const cards = [...document.querySelectorAll('[data-inscricao-card]')];
  const segmentos = [...document.querySelectorAll('[data-segmento]')].map((b) => ({
    valor: b.getAttribute('data-segmento'),
    texto: (b.textContent ?? '').trim(),
    ...ret(b),
    fundo: getComputedStyle(b).backgroundColor,
    cor: getComputedStyle(b).color,
    borda: getComputedStyle(b).borderColor,
    pressed: b.getAttribute('aria-pressed'),
    disabled: b.hasAttribute('disabled'),
  }));
  const filtros = [...document.querySelectorAll('[aria-label="Status"],[aria-label="Curso"],[aria-label="Departamento"],[aria-label="Período"],[aria-label="Limpar filtros"],[aria-label="Buscar inscrições por colaborador ou curso"]')].map(ret);
  return {
    tabelaVisivel: !!tabela && tabela.getBoundingClientRect().width > 0,
    tabela: ret(tabela),
    gridCabecalho: cabecalho ? getComputedStyle(cabecalho).gridTemplateColumns : null,
    gridLinha: primeira ? getComputedStyle(primeira).gridTemplateColumns : null,
    linhas: linhas.length,
    linhaAltura: primeira ? ret(primeira).h : null,
    celulas,
    cards: cards.length,
    cardColunas: cards.length ? new Set(cards.map((c) => Math.round(c.getBoundingClientRect().x))).size : 0,
    cardLargura: cards[0] ? ret(cards[0]).w : null,
    segmentos,
    filtros,
    filtrosY: [...new Set(filtros.map((f) => f?.y))].length,
    statusTexto: document.querySelector('[aria-label="Status"]')?.textContent ?? null,
    progressos: [...document.querySelectorAll('[data-inscricao-row] [role="progressbar"]')].length,
    naoInformado: [...document.querySelectorAll('[data-inscricao-row]')].filter((r) => /Não informado/.test(r.textContent ?? '')).length,
    acoes: document.querySelectorAll('[data-inscricao-row] button[title="Ver prévia do certificado"]').length,
    paginacao: [...document.querySelectorAll('nav[aria-label="Paginação"]')].length
      ? document.body.textContent?.match(/Mostrando \d+–\d+ de \d+ inscrições?/)?.[0] ?? null
      : null,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    mainOverflow: document.querySelector('main') ? document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth : null,
    overflowTabela: tabela ? tabela.scrollWidth - tabela.clientWidth : null,
  };
};

async function abrir(browser, w, h) {
  const contexto = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await contexto.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Inscrições' }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: 'Inscrições' }).click();
  await page.waitForTimeout(2400);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  });
  return { contexto, page, erros };
}

for (const [w, h] of larguras) {
  const browser = await chromium.launch();
  const { contexto, page, erros } = await abrir(browser, w, h);
  const dados = await page.evaluate(medir);
  console.log(JSON.stringify({ viewport: `${w}x${h}`, ...dados, erros: [...new Set(erros)].slice(0, 3) }));
  await page.screenshot({ path: path.join(SAIDA, `inscricoes-${w}x${h}.png`) });
  await contexto.close();
  await browser.close();
}

const browser = await chromium.launch();
const { contexto, page, erros } = await abrir(browser, 1440, 900);

const estado = async () => page.evaluate(medir);
const busca = page.getByLabel('Buscar inscrições por colaborador ou curso');
await busca.fill('Fernanda');
await page.waitForTimeout(500);
const buscaFernanda = await estado();
await page.screenshot({ path: path.join(SAIDA, 'inscricoes-busca-1440.png') });
await busca.fill('');
await page.waitForTimeout(500);

await page.locator('[data-segmento="em_andamento"]').click();
await page.waitForTimeout(650);
const badgeAndamento = await estado();
await page.screenshot({ path: path.join(SAIDA, 'inscricoes-badge-1440.png') });

await page.getByLabel('Limpar filtros').first().click();
await page.waitForTimeout(650);

await page.getByRole('button', { name: /^Certificado$/ }).first().click();
await page.waitForTimeout(700);
const dialogo = await page.evaluate(() => ({
  aberto: !!document.querySelector('[role="dialog"]'),
  texto: (document.querySelector('[role="dialog"]')?.textContent ?? '').slice(0, 160),
}));
await page.screenshot({ path: path.join(SAIDA, 'inscricoes-certificado-1440.png') });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

const primeiraLinha = page.locator('[data-inscricao-row]').first();
await primeiraLinha.hover();
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(SAIDA, 'inscricoes-hover-1440.png') });

await busca.fill('termo sem resultado');
await page.waitForTimeout(500);
const vazio = await page.evaluate(() => ({
  titulo: [...document.querySelectorAll('p')].find((p) => p.textContent === 'Nenhuma inscrição encontrada')?.textContent ?? null,
  ajuda: [...document.querySelectorAll('p')].find((p) => p.textContent === 'Ajuste os filtros para visualizar outras inscrições.')?.textContent ?? null,
}));
await page.screenshot({ path: path.join(SAIDA, 'inscricoes-vazio-1440.png') });
console.log(JSON.stringify({ tipo: 'interacoes', buscaFernanda, badgeAndamento, dialogo, vazio, erros: [...new Set(erros)].slice(0, 5) }));

await contexto.close();
await browser.close();
