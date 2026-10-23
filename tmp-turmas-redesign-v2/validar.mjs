/** TEMPORÁRIO — interações, card especial e animação dos cards v2. */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-turmas-redesign-v2');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const erros = [];
const resultado = {};

async function abrir(espera = 2000) {
  const contexto = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
  const page = await contexto.newPage();
  page.on('pageerror', (err) => erros.push(err.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
  if (espera) await page.waitForTimeout(espera);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  });
  return { contexto, page };
}

{
  const { contexto, page } = await abrir();
  resultado.estrutura = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-turma-card]'));
    const especial = document.querySelector('[data-mais-turmas-em-breve]');
    const coluna = document.querySelector('[data-turmas-coluna="andamento"]');
    const contador = coluna?.querySelector('header span[title$="turma(s)"]');
    const ret = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      qtdCards: cards.length,
      alturas: cards.map((c) => Math.round(c.getBoundingClientRect().height)),
      larguras: cards.map((c) => Math.round(c.getBoundingClientRect().width)),
      titulosDentroDoHeader: cards.every((c) => {
        const h = c.querySelector('[data-turma-header]')?.getBoundingClientRect();
        const t = c.querySelector('[data-turma-titulo]')?.getBoundingClientRect();
        return h && t ? t.top >= h.top && t.bottom <= h.bottom : false;
      }),
      categoriaDentroDoHeader: cards.every((c) => {
        const h = c.querySelector('[data-turma-header]')?.getBoundingClientRect();
        const t = c.querySelector('[data-turma-categoria]')?.getBoundingClientRect();
        return h && t ? t.top >= h.top && t.bottom <= h.bottom : false;
      }),
      barrasFicticias: document.querySelectorAll('[role="progressbar"]').length,
      ocupacaoIndisponivel: cards.filter((c) => (c.textContent ?? '').includes('Ocupação não informada')).length,
      especial: ret(especial),
      especialNaColunaAndamento: Boolean(coluna?.contains(especial ?? null)),
      especialEhUltimo: coluna?.lastElementChild?.contains(especial ?? null) ?? false,
      contadorAndamento: contador?.textContent ?? null,
      botaoNovaTurma: Array.from(document.querySelectorAll('button')).some((b) =>
        /nova turma/i.test(b.textContent ?? '')
      ),
      overflowMain: document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth,
    };
  });

  const card = page.locator('[data-turma-card]').first();
  await card.hover();
  await page.waitForTimeout(250);
  await card.screenshot({ path: path.join(SAIDA, 'card-hover-1440.png') });
  await page.screenshot({ path: path.join(SAIDA, 'cards-1440.png') });

  const especial = page.locator('[data-mais-turmas-em-breve]');
  await especial.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await especial.screenshot({ path: path.join(SAIDA, 'card-mais-turmas-1440.png') });

  resultado.interacoes = {};
  await contexto.close();

// 2) Menu, modal e animação
{
  const { contexto, page } = await abrir();
  await page.getByRole('button', { name: /Ações da turma/i }).first().click();
  await page.waitForTimeout(250);
  const menuItens = await page.getByRole('menuitem').allTextContents();
  await page.screenshot({ path: path.join(SAIDA, 'menu-1440.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const menuFechado = (await page.getByRole('menuitem').count()) === 0;

  await page.getByRole('button', { name: /Ver turma/i }).first().click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  const dialogo = (await page.getByRole('dialog').textContent())?.replace(/\s+/g, ' ').trim() ?? '';
  await page.screenshot({ path: path.join(SAIDA, 'modal-1440.png') });
  await page.keyboard.press('Escape');

  resultado.interacoes = {
    menuItens,
    menuFechado,
    dialogoIncluiCurso: dialogo.includes('NR-17 Ergonomia'),
    dialogoIncluiInstrutor: dialogo.includes('Gustavo Henrique Alves'),
  };
  await contexto.close();
}

{
  const { contexto, page } = await abrir(0);
  await page.locator('[data-turma-card]').first().waitFor({ timeout: 10_000 });
  const amostras = await page.evaluate(async () => {
    const alvos = Array.from(document.querySelectorAll('[data-turma-card], [data-mais-turmas-em-breve]')).map(
      (el) => el.parentElement
    );
    const inicio = performance.now();
    const saida = [];
    await new Promise((resolve) => {
      const tick = () => {
        const t = performance.now() - inicio;
        saida.push({ t: Math.round(t), op: alvos.map((c) => Number(getComputedStyle(c).opacity)) });
        if (t < 1800) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    return saida;
  });
  const primeiraVisivel = amostras.reduce((acc, s) => {
    s.op.forEach((op, i) => {
      if (op > 0.9 && acc[i] === undefined) acc[i] = s.t;
    });
    return acc;
  }, {});

  resultado.animacao = {
    primeiraVisivel,
    amostras: amostras.filter((_, i) => i % 10 === 0),
  };
  await contexto.close();
}

console.log(JSON.stringify({ resultado, erros: [...new Set(erros)] }, null, 2));
await browser.close();

}
