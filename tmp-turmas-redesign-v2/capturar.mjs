/** TEMPORÁRIO — validação estrutural dos cards de Turmas. */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-turmas-redesign-v2');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const erros = [];

async function abrir(browser, w, h, espera = 2100) {
  const contexto = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await contexto.newPage();
  page.on('pageerror', (err) => erros.push(`pageerror: ${err.message}`));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
  await page.waitForTimeout(espera);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  });
  return { contexto, page };
}

function medir() {
  const ret = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const cards = Array.from(document.querySelectorAll('[data-turma-card]'));
  const info = cards.map((card) => {
    const cr = card.getBoundingClientRect();
    const header = card.querySelector('[data-turma-header]');
    const titulo = card.querySelector('[data-turma-titulo]');
    const categoria = card.querySelector('[data-turma-categoria]');
    const meta = card.querySelector('[data-turma-meta]');
    const instrutor = card.querySelector('[data-turma-instrutor]');
    const rodape = card.querySelector('[data-turma-rodape]');
    const hr = header?.getBoundingClientRect();
    const tr = titulo?.getBoundingClientRect();
    const headerDentro =
      hr && tr ? tr.top >= hr.top - 1 && tr.bottom <= hr.bottom + 1 : null;
    return {
      id: card.getAttribute('data-turma-card'),
      card: { w: Math.round(cr.width), h: Math.round(cr.height), ratio: Number((cr.width / cr.height).toFixed(2)) },
      header: ret(header),
      titulo: { ...ret(titulo), cor: titulo ? getComputedStyle(titulo).color : null, dentroDoHeader: headerDentro },
      categoria: { ...ret(categoria), cor: categoria ? getComputedStyle(categoria).color : null },
      meta: ret(meta),
      instrutor: ret(instrutor),
      rodape: ret(rodape),
      headerLarguraIgualAoCard: hr ? Math.abs(hr.width - cr.width) <= 1 : null,
      overflowVertical: card.scrollHeight - card.clientHeight,
      overflowHorizontal: card.scrollWidth - card.clientWidth,
    };
  });
  const especial = document.querySelector('[data-mais-turmas-em-breve]');
  return {
    cards: info,
    especial: ret(especial),
    botaoNovaTurma: Array.from(document.querySelectorAll('button')).some((b) =>
      /nova turma/i.test(b.textContent ?? '')
    ),
    colunas: Array.from(document.querySelectorAll('[data-turmas-coluna]')).map((c) => ({
      nome: c.getAttribute('data-turmas-coluna'),
      ...ret(c),
    })),
    overflowMain: document.querySelector('main')
      ? document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth
      : null,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

for (const [w, h] of [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
  [390, 844],
]) {
  const browser = await chromium.launch();
  const { contexto, page } = await abrir(browser, w, h);
  const dados = await page.evaluate(medir);
  console.log(JSON.stringify({ viewport: `${w}x${h}`, ...dados }));
  await page.screenshot({ path: path.join(SAIDA, `turmas-${w}x${h}.png`) });
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, main.scrollHeight);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SAIDA, `turmas-${w}x${h}-base.png`) });
  await contexto.close();
  await browser.close();
}

console.log('ERROS', JSON.stringify([...new Set(erros)]));
