/** TEMPORÁRIO — validação funcional/geométrica da aba Certificados. */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-certificados-redesign');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const erros = [];
const resultado = {};

async function abrir(browser, opcoes = {}, espera = 1800) {
  const contexto = await browser.newContext({
    storageState: state,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    permissions: ['clipboard-read', 'clipboard-write'],
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
  await page.getByRole('tab', { name: /^Certificados$/ }).click();
  if (espera > 0) await page.waitForTimeout(espera);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  });
  return { contexto, page };
}

// 1) Geometria
{
  const browser = await chromium.launch();
  const { contexto, page } = await abrir(browser);
  resultado.geometria = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-certificado-card]'));
    const ret = (el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const porLinha = Object.values(
      cards.reduce((acc, card) => {
        const y = Math.round(card.getBoundingClientRect().y);
        (acc[y] ||= []).push(card);
        return acc;
      }, {})
    ).map((linha) => linha.map((card) => Math.round(card.getBoundingClientRect().height)));
    const filtros = Array.from(
      document.querySelectorAll(
        'input[aria-label="Buscar certificados"], [aria-label="Situação"], [aria-label="Categoria"], [aria-label="Período de emissão"], [aria-label="Ordenar por"], [aria-label="Limpar filtros"]'
      )
    );
    const badges = Array.from(document.querySelectorAll('[data-situacao]'));
    return {
      cards: cards.map((card) => ({ ...ret(card), cortado: card.scrollWidth > card.clientWidth + 1 })),
      gridCols: getComputedStyle(document.querySelector('[data-certificados-grid]')).gridTemplateColumns,
      alturasPorLinha: porLinha,
      filtrosMesmaLinha: new Set(filtros.map((f) => Math.round(f.getBoundingClientRect().y))).size === 1,
      overflowMain: document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth,
      badges: badges.map((b) => ({
        situacao: b.getAttribute('data-situacao'),
        ativa: b.getAttribute('aria-pressed'),
        cor: getComputedStyle(b).color,
        fundo: getComputedStyle(b).backgroundColor,
        altura: Math.round(b.getBoundingClientRect().height),
      })),
      paginacao: document.querySelector('nav[aria-label="Paginação"]') !== null,
      label: Array.from(document.querySelectorAll('p')).map((p) => p.textContent).find((t) => t?.includes('Mostrando')),
    };
  });
  await contexto.close();
  await browser.close();

// 2) Filtros, badges e sincronização
{
  const browser = await chromium.launch();
  const { contexto, page } = await abrir(browser);
  const titulos = () => page.locator('[data-certificado-card] h3').allTextContents();

  const clicarBadge = async (valor) => {
    await page.locator(`[data-situacao="${valor}"]`).click();
    await page.waitForTimeout(400);
  };
  const situacaoSelect = () =>
    page.getByRole('combobox', { name: 'Situação' }).evaluate((el) => (el.textContent || '').replace(/\s+/g, ' ').trim());

  await clicarBadge('vencido');
  const vencido = { cards: await titulos(), select: await situacaoSelect() };
  await page.screenshot({ path: path.join(SAIDA, 'badge-vencidos-1440.png') });

  await page.getByRole('combobox', { name: 'Situação' }).click();
  await page.getByRole('option', { name: 'Vitalícios' }).click();
  await page.waitForTimeout(500);
  const vitalicio = {
    cards: await titulos(),
    badgeAtiva: await page.locator('[data-situacao="vitalicio"]').getAttribute('aria-pressed'),
    select: await situacaoSelect(),
  };
  await page.screenshot({ path: path.join(SAIDA, 'badge-vitalicios-1440.png') });

  await clicarBadge('valido');
  await page.screenshot({ path: path.join(SAIDA, 'badge-validos-1440.png') });
  const valido = { cards: await titulos() };

  await clicarBadge('a_vencer');
  await page.screenshot({ path: path.join(SAIDA, 'badge-a-vencer-1440.png') });
  const aVencer = { cards: await titulos() };

  await clicarBadge('todos');
  await page.screenshot({ path: path.join(SAIDA, 'badge-todos-1440.png') });

  await page.getByLabel('Buscar certificados').fill('Fernanda');
  await page.waitForTimeout(500);
  const buscaColaborador = await titulos();
  await page.getByLabel('Buscar certificados').fill('NR-17');
  await page.waitForTimeout(500);
  const buscaCurso = await titulos();
  await page.getByLabel('Buscar certificados').fill('A1B2C3D4');
  await page.waitForTimeout(500);
  const buscaCodigo = await titulos();
  await page.getByRole('button', { name: /Limpar filtros/i }).first().click();
  await page.waitForTimeout(400);

  await page.getByRole('combobox', { name: 'Categoria' }).click();
  await page.getByRole('option', { name: 'Segurança do Trabalho' }).click();
  await page.waitForTimeout(500);
  const categoria = await titulos();

  await clicarBadge('vencido');
  const combinado = await titulos();
  await page.screenshot({ path: path.join(SAIDA, 'filtros-combinados-1440.png') });

  await page.getByRole('button', { name: /Limpar filtros/i }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('combobox', { name: 'Período de emissão' }).click();
  await page.getByRole('option', { name: 'Este ano' }).click();
  await page.waitForTimeout(500);
  const periodo = await titulos();

  await page.getByRole('button', { name: /Limpar filtros/i }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('combobox', { name: 'Ordenar por' }).click();
  await page.getByRole('option', { name: 'Mais antigos' }).click();
  await page.waitForTimeout(500);
  const ordenadoAntigos = await titulos();

  await page.getByRole('combobox', { name: 'Ordenar por' }).click();
  await page.getByRole('option', { name: 'Colaborador (A–Z)' }).click();
  await page.waitForTimeout(500);
  const ordenadoColaborador = await titulos();

  await page.getByRole('button', { name: /Limpar filtros/i }).first().click();
  await page.waitForTimeout(400);
  const limpar = {
    cards: (await titulos()).length,
    badgeTodos: await page.locator('[data-situacao="todos"]').getAttribute('aria-pressed'),
    limparClasse: await page.getByRole('button', { name: /Limpar filtros/i }).first().getAttribute('class'),
  };

  resultado.filtros = {
    vencido,
    vitalicio,
    valido,
    aVencer,
    buscaColaborador,
    buscaCurso,
    buscaCodigo,
    categoria,
    combinado,
    periodo,
    ordenadoAntigos,
    ordenadoColaborador,
    limpar,
  };
  await contexto.close();
  await browser.close();
}


// 3) Copiar, menu, prévia, foco, paginação e estado vazio
{
  const browser = await chromium.launch();
  const { contexto, page } = await abrir(browser);

  const primeiroCodigo = await page.locator('[data-certificado-card]').first().locator('span.font-mono').textContent();
  const card = page.locator('[data-certificado-card]').first();
  await card.hover();
  await page.waitForTimeout(250);
  await card.screenshot({ path: path.join(SAIDA, 'card-hover-1440.png') });

  await page.getByRole('button', { name: /Copiar código de autenticação/i }).first().click();
  await page.waitForTimeout(400);
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  await page.screenshot({ path: path.join(SAIDA, 'codigo-copiado-1440.png') });

  await page.getByRole('button', { name: /Ações do certificado/i }).first().click();
  await page.waitForTimeout(300);
  const menuItens = await page.getByRole('menuitem').allTextContents();
  await page.screenshot({ path: path.join(SAIDA, 'menu-contextual-1440.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const menuFechado = (await page.getByRole('menuitem').count()) === 0;

  const botaoVisualizar = page.getByRole('button', { name: /^Visualizar certificado de/i }).first();
  await page.keyboard.press('Tab');
  await botaoVisualizar.focus();
  const foco = await botaoVisualizar.evaluate((el) => ({
    focusVisible: el.matches(':focus-visible'),
    ring: getComputedStyle(el).boxShadow.includes('inset'),
  }));
  await botaoVisualizar.click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  const dialogo = (await page.getByRole('dialog').textContent())?.replace(/\s+/g, ' ').trim() ?? '';
  const cursoDialogo = await card.locator('h3').textContent();
  await page.screenshot({ path: path.join(SAIDA, 'previa-certificado-1440.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const dialogoFechado = (await page.getByRole('dialog').count()) === 0;

  const label = await page.getByText(/Mostrando .* de 6 certificados/).first().textContent();
  const paginaAnteriorDesabilitada = await page.getByRole('button', { name: 'Página anterior' }).isDisabled();
  const proximaDesabilitada = await page.getByRole('button', { name: 'Próxima página' }).isDisabled();
  await page.getByRole('combobox', { name: 'Itens por página' }).click();
  await page.getByRole('option', { name: '12' }).click();
  await page.waitForTimeout(500);
  const aposTamanho = {
    cards: await page.locator('[data-certificado-card]').count(),
    label: await page.getByText(/Mostrando .* certificados/).first().textContent(),
  };
  await page.screenshot({ path: path.join(SAIDA, 'paginacao-1440.png') });
  await page.getByRole('combobox', { name: 'Itens por página' }).click();
  await page.getByRole('option', { name: '6' }).click();
  await page.waitForTimeout(300);

  await page.getByLabel('Buscar certificados').fill('zzzz-nao-existe');
  await page.waitForTimeout(500);
  const vazio = {
    cards: await page.locator('[data-certificado-card]').count(),
    texto: (await page.getByText(/Nenhum certificado corresponde aos filtros selecionados/i).count()) > 0,
    ajuste: (await page.getByText(/Ajuste os filtros para visualizar outros certificados/i).count()) > 0,
  };
  await page.screenshot({ path: path.join(SAIDA, 'estado-vazio-filtros-1440.png') });
  await page.getByRole('button', { name: /Limpar filtros/i }).first().click();

  resultado.interacoes = {
    codigo: primeiroCodigo,
    clipboard,
    copiaOk: clipboard === primeiroCodigo,
    menuItens,
    menuFechado,
    foco,
    dialogoIncluiCurso: dialogo.includes(cursoDialogo ?? '###'),
    dialogoIncluiCodigo: dialogo.includes(primeiroCodigo ?? '###'),
    dialogoIncluiAviso: dialogo.includes('representação informativa'),
    dialogoFechado,
    label,
    paginaAnteriorDesabilitada,
    proximaDesabilitada,
    aposTamanho,
    vazio,
  };
  await contexto.close();
  await browser.close();
}

// 4) Animação: cascata e não reinício ao filtrar
{
  const browser = await chromium.launch();
  const { contexto, page } = await abrir(browser, {}, 0);
  await page.locator('[data-certificado-card]').first().waitFor({ timeout: 10_000 });
  const amostras = await page.evaluate(async () => {
    const cards = Array.from(document.querySelectorAll('[data-certificado-card]')).map((el) => el.parentElement);
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
  await page.waitForTimeout(800);
  const antes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-certificado-card]')).map((el) => Number(getComputedStyle(el.parentElement).opacity))
  );
  await page.locator('[data-situacao="vencido"]').click();
  const durante = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-certificado-card]')).map((el) => Number(getComputedStyle(el.parentElement).opacity))
  );
  await page.waitForTimeout(500);
  const depois = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-certificado-card]')).map((el) => Number(getComputedStyle(el.parentElement).opacity))
  );

  resultado.animacao = { primeiraVisivel, antes, durante, depois };
  await contexto.close();
  await browser.close();
}

console.log(JSON.stringify({ resultado, erros: [...new Set(erros)] }, null, 2));

}

