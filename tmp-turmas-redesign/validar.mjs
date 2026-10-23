/** TEMPORÁRIO — validação funcional/geométrica da aba Turmas / Instâncias. */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-turmas-redesign');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const erros = [];
const resultado = {};

async function abrir(w = 1440, h = 900, opcoes = {}) {
  const contexto = await browser.newContext({
    storageState: state,
    viewport: { width: w, height: h },
    ...opcoes,
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
  return { contexto, page };
}

// 1) Geometria e integridade visual
{
  const { contexto, page } = await abrir();
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0));

  resultado.geometria = await page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const headers = Array.from(document.querySelectorAll('[data-turmas-coluna] header'));
    const cards = Array.from(document.querySelectorAll('[data-turma-card]'));
    const seletores = 'input[aria-label="Buscar turmas"], [aria-label="Status"], [aria-label="Modalidade"], [aria-label="Período"], [aria-label="Ordenar por"], [aria-label="Limpar filtros"]';
    const filtros = Array.from(document.querySelectorAll(seletores));
    const triggers = Array.from(document.querySelectorAll('[aria-label="Status"], [aria-label="Modalidade"], [aria-label="Período"], [aria-label="Ordenar por"]'));
    return {
      headersY: headers.map((h) => Math.round(h.getBoundingClientRect().y)),
      cards: cards.map((c) => ({ ...rect(c), cortado: c.scrollWidth > c.clientWidth + 1 })),
      filtros: filtros.map((f) => ({ label: f.getAttribute('aria-label'), ...rect(f) })),
      filtrosMesmaLinha: new Set(filtros.map((f) => Math.round(f.getBoundingClientRect().y))).size === 1,
      triggersSemCorte: triggers.map((t) => ({
        label: t.getAttribute('aria-label'),
        scrollWidth: t.scrollWidth,
        clientWidth: t.clientWidth,
        ok: t.scrollWidth <= t.clientWidth + 1,
      })),
      overflowMain: document.querySelector('main')
        ? document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth
        : null,
      contadores: Array.from(document.querySelectorAll('[data-turmas-coluna] h2 + span')).map((s) => s.textContent),
    };
  });
  await contexto.close();

// 2) Filtros combinados, busca, ordenação e limpeza
{
  const { contexto, page } = await abrir();
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
  await page.waitForTimeout(1600);
  const titulos = () => page.locator('[data-turma-card] h3').allTextContents();

  await page.getByLabel('Status').click();
  await page.getByRole('option', { name: 'Planejado' }).click();
  await page.waitForTimeout(300);
  await page.getByLabel('Modalidade').click();
  await page.getByRole('option', { name: 'Presencial' }).click();
  await page.waitForTimeout(500);
  const combinado = await titulos();

  await page.getByLabel('Período').click();
  await page.getByRole('option', { name: 'Este mês' }).click();
  await page.waitForTimeout(500);
  const vazio = await page.evaluate(() => ({
    cards: document.querySelectorAll('[data-turma-card]').length,
    aviso: document.body.textContent?.includes('Nenhuma turma encontrada'),
  }));

  await page.getByRole('button', { name: /Limpar filtros/i }).first().click();
  await page.waitForTimeout(500);
  const limpo = { cards: (await titulos()).length };

  await page.getByLabel('Buscar turmas').fill('Rafaela');
  await page.waitForTimeout(500);
  const buscaInstrutor = await titulos();

  await page.getByRole('button', { name: /Limpar filtros/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByLabel('Ordenar por').click();
  await page.getByRole('option', { name: 'Curso (A–Z)' }).click();
  await page.waitForTimeout(500);
  const ordenado = await titulos();

  await page.getByLabel('Modalidade').click();
  await page.getByRole('option', { name: 'Online' }).click();
  await page.waitForTimeout(500);
  const porModalidade = await titulos();

  resultado.filtros = { combinado, vazio, limpo, buscaInstrutor, ordenado, porModalidade };
  await contexto.close();
}

// 3) Card, menu contextual, modal e foco por teclado
{
  const { contexto, page } = await abrir();
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
  await page.waitForTimeout(1600);

  await page.getByRole('button', { name: /Ações da turma/i }).first().click();
  const menuItens = await page.getByRole('menuitem').allTextContents();
  await page.keyboard.press('Escape');
  const menuFechado = (await page.getByRole('menuitem').count()) === 0;

  const abrirTurma = page.getByRole('button', { name: /^Ver turma/i }).first();
  await page.keyboard.press('Tab');
  await abrirTurma.focus();
  const foco = await abrirTurma.evaluate((el) => ({
    focusVisible: el.matches(':focus-visible'),
    ring: getComputedStyle(el).boxShadow.includes('inset'),
  }));
  await abrirTurma.click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  const modal = await page.getByRole('dialog').evaluate((el) => (el.textContent || '').replace(/\s+/g, ' ').trim());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const modalFechado = (await page.getByRole('dialog').count()) === 0;

  const rangeInicial = (await page.locator('[data-agenda-range]').textContent()) ?? '';
  await page.getByRole('button', { name: 'Próxima semana' }).click();
  await page.waitForTimeout(250);
  const rangeSeguinte = (await page.locator('[data-agenda-range]').textContent()) ?? '';
  await page.getByRole('button', { name: 'Semana anterior' }).click();
  const rangeVolta = (await page.locator('[data-agenda-range]').textContent()) ?? '';
  const registrosAntes = await page.locator('[data-turma-card]').count();

  resultado.interacoes = {
    menuItens,
    menuFechado,
    foco,
    modal,
    modalFechado,
    agenda: { rangeInicial, rangeSeguinte, rangeVolta, registrosAntes },
  };
  await contexto.close();
}


// 4) Animação: entrada em cascata + não reinício ao filtrar + vídeo
{
  const videoDir = path.join(SAIDA, 'video');
  mkdirSync(videoDir, { recursive: true });
  const { contexto, page } = await abrir(1440, 900, {
    recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
  });
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
  await page.locator('[data-turma-card]').first().waitFor({ timeout: 10_000 });
  const amostras = await page.evaluate(async () => {
    const cards = Array.from(document.querySelectorAll('[data-turma-card]')).map((el) => el.parentElement);
    const inicio = performance.now();
    const saida = [];
    await new Promise((resolve) => {
      const tick = () => {
        const t = performance.now() - inicio;
        saida.push({ t: Math.round(t), op: cards.map((c) => Number(getComputedStyle(c).opacity)) });
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
  const maxFim = Math.max(...Object.values(primeiraVisivel));

  await page.waitForTimeout(1200);
  const antesFiltro = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-turma-card]')).map((el) => Number(getComputedStyle(el.parentElement).opacity))
  );
  await page.getByLabel('Status').click();
  await page.getByRole('option', { name: 'Concluído' }).click();
  const duranteFiltro = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-turma-card]')).map((el) => Number(getComputedStyle(el.parentElement).opacity))
  );
  await page.waitForTimeout(600);
  const depoisFiltro = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-turma-card]')).map((el) => Number(getComputedStyle(el.parentElement).opacity))
  );

  resultado.animacao = {
    primeiraVisivel,
    maxFim,
    amostras: amostras.filter((_, i) => i % 8 === 0),
    antesFiltro,
    duranteFiltro,
    depoisFiltro,
    ordemCascata: Object.entries(primeiraVisivel)
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .map(([i]) => Number(i)),
  };
  const video = page.video();
  await contexto.close();
  if (video) await video.saveAs(path.join(SAIDA, 'entrada-cascata-turmas.webm'));
}

console.log(JSON.stringify({ resultado, erros: [...new Set(erros)] }, null, 2));
await browser.close();

}
