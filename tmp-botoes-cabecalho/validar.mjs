/** TEMPORÁRIO — validação funcional/geométrica dos CTAs do cabeçalho. */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-botoes-cabecalho');
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const erros = [];
const resultados = {};

async function abrir(w, h) {
  const contexto = await browser.newContext({
    storageState: state,
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
  });
  const page = await contexto.newPage();
  page.on('pageerror', (err) => erros.push(err.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  return { contexto, page };
}


// 1) Desktop 1440 — alinhamento, gap, hover, foco, modais.
{
  const { contexto, page } = await abrir(1440, 900);
  const metrica = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const r = h1.getBoundingClientRect();
    return {
      tituloCentroY: Math.round(r.top + r.height / 2),
      botao: (() => {
        const b = Array.from(document.querySelectorAll('button')).find(
          (x) => (x.textContent ?? '').trim() === 'Novo Treinamento',
        );
        const br = b.getBoundingClientRect();
        return { y: Math.round(br.y), h: Math.round(br.height), centroY: Math.round(br.y + br.height / 2) };
      })(),
      overflowMain: document.querySelector('main')
        ? document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth
        : null,
    };
  });

  await page.getByRole('tab', { name: /Catálogo/i }).click();
  await page.waitForTimeout(800);
  const gapCatalogo = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).filter((x) =>
      /^(Novo Treinamento|Novo Curso)$/.test((x.textContent ?? '').trim()),
    );
    if (b.length < 2) return null;
    const a = b[0].getBoundingClientRect();
    const c = b[1].getBoundingClientRect();
    return {
      horizontal: Math.round(c.x - (a.x + a.width)),
      vertical: Math.round(c.y - (a.y + a.height)),
      alturas: [Math.round(a.height), Math.round(c.height)],
      centrosY: [Math.round(a.y + a.height / 2), Math.round(c.y + c.height / 2)],
    };
  });

  const nvTrein = page.getByRole('button', { name: 'Novo Treinamento' });
  const nvCurso = page.getByRole('button', { name: 'Novo Curso' });

  await nvCurso.hover();
  await page.waitForTimeout(350);
  await page.screenshot({
    path: path.join(SAIDA, 'estado-hover-catalogo-1440.png'),
    clip: { x: 1000, y: 60, width: 430, height: 130 },
  });

  let focoOk = false;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const ativo = await page.evaluate(() => (document.activeElement?.textContent ?? '').trim());
    if (ativo === 'Novo Curso') {
      focoOk = await page.evaluate(() => {
        const cs = getComputedStyle(document.activeElement);
        return cs.outlineStyle !== 'none' || cs.boxShadow !== 'none';
      });
      break;
    }
  }
  await page.screenshot({
    path: path.join(SAIDA, 'estado-foco-catalogo-1440.png'),
    clip: { x: 1000, y: 60, width: 430, height: 130 },
  });

  await nvTrein.click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 8000 });
  const tituloTrein = await page.getByRole('dialog').getByRole('heading').first().textContent();
  await page.screenshot({ path: path.join(SAIDA, 'modal-novo-treinamento-1440.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  await nvCurso.click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 8000 });
  const tituloCurso = await page.getByRole('dialog').getByRole('heading').first().textContent();
  await page.screenshot({ path: path.join(SAIDA, 'modal-novo-curso-1440.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  await page.getByRole('tab', { name: /Trilhas/i }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Nova Trilha' }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 8000 });
  const tituloTrilha = await page.getByRole('dialog').getByRole('heading').first().textContent();
  await page.screenshot({ path: path.join(SAIDA, 'modal-nova-trilha-1440.png') });

  resultados.desktop = { metrica, gapCatalogo, focoVisivel: focoOk };
  resultados.modais = { tituloTrein, tituloCurso, tituloTrilha };
  await contexto.close();
}


// 2) Mobile 390 — área de toque, rótulos sem corte e sem overflow do main.
{
  const { contexto, page } = await abrir(390, 844);
  await page.getByRole('tab', { name: /Catálogo/i }).click();
  await page.waitForTimeout(800);
  resultados.mobile = await page.evaluate(() => {
    const botoes = Array.from(document.querySelectorAll('button')).filter((b) =>
      /^(Novo Treinamento|Novo Curso)$/.test((b.textContent ?? '').trim()),
    );
    return {
      botoes: botoes.map((b) => {
        const r = b.getBoundingClientRect();
        return {
          texto: b.textContent.trim(),
          w: Math.round(r.width),
          h: Math.round(r.height),
          cortado: b.scrollWidth > b.clientWidth + 1,
          dentroDaTela: r.left >= 0 && r.right <= window.innerWidth,
        };
      }),
      overflowMain: document.querySelector('main')
        ? document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth
        : null,
    };
  });
  await page.screenshot({ path: path.join(SAIDA, 'final-catalogo-390x844.png') });
  await contexto.close();
}

console.log(JSON.stringify({ resultados, erros: [...new Set(erros)] }, null, 2));
await browser.close();
