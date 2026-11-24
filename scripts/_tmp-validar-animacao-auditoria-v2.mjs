/**
 * TEMPORÁRIO — validação TEMPORAL (não só screenshots) da padronização:
 *   · filtros: 10 unidades em cascata com o movimento dos KPI Cards;
 *   · timeline: cabeçalhos + eventos, 0,55s · passo 0,11s · easeOutCubic;
 *   · contêiner estático (sem animação duplicada);
 *   · filtro/scroll não reiniciam; F5/volta à aba reiniciam;
 *   · prefers-reduced-motion mantém tudo visível;
 *   · 6 viewports sem desalinhamento.
 *
 * Uso: node scripts/_tmp-validar-animacao-auditoria-v2.mjs
 */
import { chromium } from '@playwright/test';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';

const etapa = (m) => appendFileSync('tmp-auditoria-animacao-v2/etapas.log', `${m}\n`);

const BASE = 'http://localhost:8080';
const SAIDA = 'tmp-auditoria-animacao-v2';
mkdirSync(SAIDA, { recursive: true });

etapa('launch: inicio');
const browser = await chromium.launch();
etapa('launch: ok');
const falhas = [];
const relatorio = {};
const storage = existsSync('e2e/.auth/user.json') ? 'e2e/.auth/user.json' : undefined;

async function abrir(w = 1440, h = 900, extra = {}) {
  etapa('abrir: newContext');
  const contexto = await browser.newContext({ viewport: { width: w, height: h }, storageState: storage, ...extra });
  etapa('abrir: addInitScript');
  await contexto.addInitScript((reduzido) => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
    if (reduzido) localStorage.setItem('dp-force-motion', 'off');
  }, Boolean(extra.reducedMotion));
  const page = await contexto.newPage();
  etapa('abrir: page pronta');
  page.setDefaultTimeout(20000);
  page.on('pageerror', (e) => falhas.push(e.message));
  return { contexto, page };
}

async function garantirLogin(page) {
  etapa('garantirLogin: goto');
  await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
  etapa(`garantirLogin: url ${page.url()}`);
  if (page.url().includes('/login')) {
    await page.getByLabel(/e-?mail/i).first().fill('admin@teste.local');
    await page.getByLabel(/senha|password/i).first().fill('Admin@2026!');
    await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
    etapa('garantirLogin: login feito');
  }
  await page.locator('tbody tr').first().waitFor({ timeout: 30000 });
  etapa('garantirLogin: campanhas ok');
}

/** Mede `opacity`/`transform` de cada alvo a cada frame e deriva início/fim. */
async function amostrar(page, ms) {
  return page.evaluate(async (duracao) => {
    const texto = (b) => (b?.textContent ?? '').trim();
    const alvo = (seletor) => document.querySelector(seletor);
    const alvos = [
      ['busca', alvo('section[aria-label="Filtros da auditoria"] input[aria-label^="Buscar"]')?.parentElement],
      ['tipo', alvo('button[aria-label="Tipo de evento"]')],
      ['entidade', alvo('button[aria-label="Entidade"]')],
      ['usuario', alvo('button[aria-label="Usuário"]')],
      ['periodo', alvo('button[aria-label="Período"]')],
      ['badges', alvo('button[data-category="todas"]')?.parentElement],
      ['ordenacao', alvo('button[aria-label="Ordenar por"]')?.parentElement],
      ['limpar', alvo('button[aria-label="Limpar filtros"]')],
      ['csv', [...document.querySelectorAll('button')].find((b) => texto(b) === 'CSV')],
      ['pdf', [...document.querySelectorAll('button')].find((b) => texto(b) === 'PDF')],
      ['timeline', alvo('[data-testid="auditoria-timeline"]')],
      ['cabecalho-0', document.querySelectorAll('[data-testid="auditoria-grupo-cabecalho"]')[0]],
      ['evento-0', document.querySelectorAll('[data-testid="auditoria-evento"]')[0]],
      ['evento-1', document.querySelectorAll('[data-testid="auditoria-evento"]')[1]],
      ['cabecalho-1', document.querySelectorAll('[data-testid="auditoria-grupo-cabecalho"]')[1]],
      ['evento-2', document.querySelectorAll('[data-testid="auditoria-evento"]')[2]],
    ].filter(([, el]) => el);

    const inicio = performance.now();
    const amostras = [];
    await new Promise((resolve) => {
      const tick = () => {
        const agora = performance.now();
        alvos.forEach(([nome, el]) => {
          const cs = getComputedStyle(el);
          amostras.push({
            nome,
            t: Math.round(agora - inicio),
            op: Number(cs.opacity),
            tr: cs.transform,
          });
        });
        if (agora - inicio < duracao) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    const resumo = {};
    for (const [nome] of alvos) {
      const doAlvo = amostras.filter((a) => a.nome === nome);
      const comecou = doAlvo.find((a) => a.op > 0.02);
      const terminou = doAlvo.find((a) => a.op >= 0.995 && (a.tr === 'none' || a.tr === ''));
      resumo[nome] = {
        inicioMs: comecou?.t ?? null,
        fimMs: terminou?.t ?? null,
        duracaoMs: comecou && terminou ? terminou.t - comecou.t : null,
        opLeituraInicial: doAlvo[0]?.op ?? null,
        trLeituraInicial: doAlvo[0]?.tr ?? null,
        opFinal: doAlvo[doAlvo.length - 1]?.op ?? null,
        trFinal: doAlvo[doAlvo.length - 1]?.tr ?? null,
      };
    }
    return resumo;
  }, ms);
}

/* ─── 1 · Entrada inicial: filtros + timeline ─────────────────────────────── */
{
  const { contexto, page } = await abrir();
  await garantirLogin(page);
  await page.locator('tbody tr').first().waitFor({ timeout: 30000 });

  await page.getByRole('tab', { name: /^Auditoria$/ }).click();
  console.log('etapa: aba auditoria aberta');
  const medicao = amostrar(page, 2400);
  const containerAntes = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="auditoria-timeline"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { op: Number(cs.opacity), tr: cs.transform, inline: el.getAttribute('style') };
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${SAIDA}/filtros-120ms.png` });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SAIDA}/filtros-320ms.png` });
  relatorio.entrada = await medicao;
  console.log('etapa: medicao da entrada concluida');
  relatorio.containerTimeline = containerAntes;
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SAIDA}/final-1440.png` });

  /* ─── 2 · Filtrar não reinicia controles/cabeçalhos ─────────────────────── */
  await page.evaluate(() => {
    document.querySelector('section[aria-label="Filtros da auditoria"]')?.setAttribute('data-marca-painel', '1');
    document.querySelector('[data-testid="auditoria-timeline"]')?.setAttribute('data-marca-lista', '1');
    document.querySelector('[data-testid="auditoria-grupo-cabecalho"]')?.setAttribute('data-marca-cabecalho', '1');
  });
  await page.getByLabel(/Buscar evento, campanha, colaborador ou valor/i).fill('IRRF');
  console.log('etapa: busca preenchida');
  await page.waitForTimeout(1200);
  relatorio.filtro = await page.evaluate(() => {
    const painel = document.querySelector('section[aria-label="Filtros da auditoria"]');
    const lista = document.querySelector('[data-testid="auditoria-timeline"]');
    const controle = painel.querySelector('button[aria-label="Tipo de evento"]');
    return {
      painelMesmo: Boolean(document.querySelector('[data-marca-painel]')),
      listaMesma: Boolean(document.querySelector('[data-marca-lista]')),
      cabecalhoMesmo: Boolean(document.querySelector('[data-marca-cabecalho]')),
      opPainel: Number(getComputedStyle(painel).opacity),
      opLista: Number(getComputedStyle(lista).opacity),
      opControle: Number(getComputedStyle(controle).opacity),
      trControle: getComputedStyle(controle).transform,
    };
  });

  /* ─── 3 · Scroll ×5 não reinicia ────────────────────────────────────────── */
  const antesScroll = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="auditoria-evento"]');
    const cs = getComputedStyle(el);
    return { op: Number(cs.opacity), tr: cs.transform };
  });
  for (let i = 0; i < 5; i += 1) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(100);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
  }
  relatorio.scroll = await page.evaluate((antes) => {
    const el = document.querySelector('[data-testid="auditoria-evento"]');
    const cs = getComputedStyle(el);
    return { antes, depois: { op: Number(cs.opacity), tr: cs.transform } };
  }, antesScroll);

  /* ─── 4 · Sair e voltar à aba = nova entrada ────────────────────────────── */
  await page.getByRole('tab', { name: /^Pagamentos$/ }).click();
  await page.waitForTimeout(350);
  await page.getByRole('tab', { name: /^Auditoria$/ }).click();
  relatorio.voltaAba = await amostrar(page, 900);
  console.log('etapa: volta a aba medida');

  /* ─── 5 · F5 = nova entrada ─────────────────────────────────────────────── */
  await page.waitForTimeout(1200);
  await page.reload({ waitUntil: 'domcontentloaded' });
  if (!page.url().includes('auditoria')) await page.getByRole('tab', { name: /^Auditoria$/ }).click();
  await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
  relatorio.f5 = await amostrar(page, 900);
  console.log('etapa: f5 medido');

  await contexto.close();
}


/* ─── 6 · Movimento reduzido ──────────────────────────────────────────────── */
{
  const { contexto, page } = await abrir(1440, 900, { reducedMotion: 'reduce' });
  await garantirLogin(page);
  await page.getByRole('tab', { name: /^Auditoria$/ }).click();
  await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(900);
  relatorio.reduzido = await page.evaluate(() => {
    const painel = document.querySelector('section[aria-label="Filtros da auditoria"]');
    const controles = [painel, ...painel.querySelectorAll('button[aria-label], input, [class*="relative"]')];
    const linhas = [
      ...document.querySelectorAll('[data-testid="auditoria-grupo-cabecalho"], [data-testid="auditoria-evento"]'),
    ];
    return {
      classeHtml: document.documentElement.className,
      controlesVisiveis: controles.every((el) => Number(getComputedStyle(el).opacity) >= 0.99),
      linhasVisiveis: linhas.every((el) => Number(getComputedStyle(el).opacity) >= 0.99),
      totalLinhas: linhas.length,
      transforms: [...new Set(linhas.map((el) => getComputedStyle(el).transform))],
    };
  });
  await page.screenshot({ path: `${SAIDA}/reduzido-1440.png` });
  await contexto.close();
}

/* ─── 7 · Viewports ───────────────────────────────────────────────────────── */
{
  const { contexto, page } = await abrir(1440, 900);
  await garantirLogin(page);
  relatorio.viewports = [];
  for (const [w, h] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1280, 800],
    [1024, 768],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    console.log(`etapa: viewport ${w}x${h}`);
    await page.getByRole('tab', { name: /^Auditoria$/ }).click();
    await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(2200);
    relatorio.viewports.push(
      await page.evaluate(
        ({ w, h }) => {
          const doc = document.documentElement;
          const painel = document.querySelector('section[aria-label="Filtros da auditoria"]').getBoundingClientRect();
          const linhas = [...document.querySelectorAll('[data-testid="auditoria-evento"]')];
          const cabecalhos = [...document.querySelectorAll('[data-testid="auditoria-grupo-cabecalho"]')];
          const grupos = [...document.querySelectorAll('section[aria-label]')].filter((s) =>
            s.querySelector('[data-testid="auditoria-evento"]')
          );
          const pontos = grupos.map((g) =>
            [...g.querySelectorAll('div[aria-hidden="true"] > span:last-child')].map((d) => {
              const b = d.getBoundingClientRect();
              return Math.round((b.left + b.right) / 2);
            })
          );
          return {
            w,
            h,
            overflowX: doc.scrollWidth > doc.clientWidth + 1,
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            painel: { w: Math.round(painel.width), right: Math.round(painel.right) },
            linhas: linhas.length,
            cabecalhos: cabecalhos.length,
            invisiveis: [...linhas, ...cabecalhos].filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
            pontos,
          };
        },
        { w, h }
      )
    );
    if (w === 1440 || w === 390) {
      await page.screenshot({ path: `${SAIDA}/view-${w}x${h}.png` });
    }
  }
  await contexto.close();
}

await browser.close();
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
console.log('FALHAS', JSON.stringify([...new Set(falhas)]));
