/**
 * TEMPORÁRIO — compara, quadro a quadro, o modal "Ver detalhes" da Auditoria
 * com o popup "Pendências" (referência), além de:
 *   · 10 ciclos abrir/fechar (estabilidade);
 *   · todas as categorias de evento;
 *   · reposição de foco no botão "Ver detalhes";
 *   · 5 viewports;
 *   · prefers-reduced-motion.
 *
 * Uso: node scripts/_tmp-validar-modal-auditoria.mjs
 */
import { chromium } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const SAIDA = 'tmp-modal-auditoria';
mkdirSync(SAIDA, { recursive: true });
const etapa = (m) => appendFileSync(`${SAIDA}/etapas.log`, `${m}\n`);

const browser = await chromium.launch();
const falhas = [];
const relatorio = {};

async function abrir(w = 1440, h = 900, extra = {}) {
  const contexto = await browser.newContext({
    viewport: { width: w, height: h },
    storageState: 'e2e/.auth/user.json',
    ...extra,
  });
  await contexto.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
  );
  await contexto.addInitScript((reduzido) => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
    if (reduzido) localStorage.setItem('dp-force-motion', 'off');
  }, Boolean(extra.reducedMotion));
  const page = await contexto.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', (e) => falhas.push(e.message));
  return { contexto, page };
}

/** Amostra abertura (o clique é disparado DEPOIS de começar a amostragem). */
async function medirAbertura(page, ms = 2200) {
  return page.evaluate(async (duracao) => {
    const inicio = performance.now();
    const amostras = [];
    await new Promise((resolve) => {
      const tick = () => {
        const t = Math.round(performance.now() - inicio);
        const dialogo = document.querySelector('[role="dialog"]');
        const veu = document.querySelector('.backdrop-blur-sm');
        const corpo = dialogo?.querySelector(':scope > div');
        const itens = corpo ? [...corpo.children] : [];
        const tr = dialogo ? getComputedStyle(dialogo).transform : null;
        amostras.push({
          t,
          presente: Boolean(dialogo),
          tr,
          opVeu: veu ? Number(getComputedStyle(veu).opacity) : null,
          opItens: itens.map((el) => Number(getComputedStyle(el).opacity)),
        });
        if (performance.now() - inicio < duracao) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    const escala = (tr) => {
      const m = tr?.match(/matrix\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(',').map(Number);
      return { sx: p[0], sy: p[3] };
    };
    const comEscala = amostras.filter((a) => a.presente && escala(a.tr));
    const t0 = comEscala[0]?.t ?? amostras.find((a) => a.presente)?.t ?? 0;
    const escalaMinima = comEscala.length ? Math.min(...comEscala.map((a) => escala(a.tr).sx)) : null;
    const escalaMaximaX = comEscala.length ? Math.max(...comEscala.map((a) => escala(a.tr).sx)) : null;
    const escalaMaximaY = comEscala.length ? Math.max(...comEscala.map((a) => escala(a.tr).sy)) : null;
    const rel = (t) => (t === null || t === undefined ? null : t - t0);
    const sxe = comEscala.find((a) => escala(a.tr).sx >= 0.98);
    const sye = comEscala.find((a) => escala(a.tr).sy >= 0.98);
    const veuOk = amostras.find((a) => (a.opVeu ?? 0) >= 0.99);
    const quantos = amostras.find((a) => a.presente)?.opItens.length ?? 0;
    const itens = [];
    for (let i = 0; i < quantos; i += 1) {
      const fim = amostras.find((a) => (a.opItens[i] ?? 0) >= 0.99);
      itens.push(rel(fim?.t));
    }
    const primeiroComItens = amostras.find((a) => a.presente && a.opItens.length);
    return {
      apareceuEmMs: rel(amostras.find((a) => a.presente)?.t ?? null),
      inicioCascaMs: t0,
      escalaMinima,
      escalaMaximaX,
      escalaMaximaY,
      msAteScaleX: rel(sxe?.t),
      msAteScaleY: rel(sye?.t),
      msAteVeu: rel(veuOk?.t),
      blocos: quantos,
      blocosAnimados: primeiroComItens ? primeiroComItens.opItens.filter((v) => v < 0.99).length : 0,
      msAteCadaBloco: itens,
      quadros: amostras
        .filter((a) => a.t <= 5 || [45, 120, 250, 450, 700, 950, 1250, 1600].some((x) => Math.abs(a.t - x) < 20))
        .map((a) => ({
          t: a.t,
          sx: escala(a.tr)?.sx ?? null,
          sy: escala(a.tr)?.sy ?? null,
          opVeu: a.opVeu,
          opItens: a.opItens.map((v) => Number(v.toFixed(2))),
        })),
    };
  }, ms);
}

/** Mede a saída: instala a amostragem, executa `fechar()` e espera desmontar. */
async function medirSaida(page, fechar, ms = 2400) {
  const promessa = page.evaluate(async (duracao) => {
    const inicio = performance.now();
    let desmontouEm = null;
    let ultimo = null;
    let veuUltimo = null;
    await new Promise((resolve) => {
      const tick = () => {
        const t = Math.round(performance.now() - inicio);
        const dialogo = document.querySelector('[role="dialog"]');
        const veu = document.querySelector('.backdrop-blur-sm');
        if (dialogo) {
          const tr = getComputedStyle(dialogo).transform;
          const m = tr.match(/matrix\(([^)]+)\)/);
          if (m) {
            const p = m[1].split(',').map(Number);
            ultimo = { t, sx: p[0], sy: p[3] };
          }
          if (veu) veuUltimo = { t, op: Number(getComputedStyle(veu).opacity) };
        } else if (desmontouEm === null) {
          desmontouEm = t;
        }
        if (desmontouEm === null && performance.now() - inicio < duracao) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    return { desmontouEmMs: desmontouEm, ultimaEscala: ultimo, ultimoVeu: veuUltimo };
  }, ms);
  await fechar();
  return promessa;
}

async function irParaAuditoria(page) {
  await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login')) throw new Error('sessão não autenticada');
  await page.getByRole('tab', { name: /^Auditoria$/ }).click();
  await page.locator('[data-testid="auditoria-evento"]').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1800); // entrada da timeline concluída
}

const botaoDetalhes = (page, i = 0) => page.getByRole('button', { name: /Ver detalhes/ }).nth(i);

/* ─── 1 · REFERÊNCIA: modal "Pendências" ─────────────────────────────────── */
{
  etapa('pendencias: inicio');
  const { contexto, page } = await abrir();
  etapa('pendencias: contexto');
  await page.goto(`${BASE}/colaboradores`, { waitUntil: 'domcontentloaded' });
  etapa(`pendencias: url ${page.url()}`);
  await page.getByRole('row').nth(1).click();
  etapa('pendencias: linha clicada');
  await page.waitForURL(/\/colaboradores\/(mock-\d+|[0-9a-f-]{8})/i, { timeout: 30000 });
  await page.waitForTimeout(2000);
  etapa('pendencias: detalhe do colaborador');

  const verTodas = page.getByRole('button', { name: 'Ver todas' }).first();
  await verTodas.waitFor({ timeout: 20000 });
  etapa('pendencias: botao encontrado');
  const abertura = medirAbertura(page, 2200);
  await verTodas.click();
  relatorio.pendencias = { abertura: await abertura };
  etapa('pendencias: abertura medida');
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${SAIDA}/pendencias-aberto.png` });
  relatorio.pendencias.titulo = (await page.locator('[role="dialog"]').innerText()).replace(/\s+/g, ' ').slice(0, 80);
  relatorio.pendencias.saida = await medirSaida(page, () => page.keyboard.press('Escape'));
  etapa('pendencias: saida medida');
  await contexto.close();
}

/* ─── 2 · AUDITORIA: abertura, saída e foco ──────────────────────────────── */
{
  const { contexto, page } = await abrir();
  await irParaAuditoria(page);
  etapa('auditoria: pronta');

  const trigger = botaoDetalhes(page, 0);
  const abertura = medirAbertura(page, 2200);
  await trigger.click();
  relatorio.auditoria = { abertura: await abertura };
  etapa('auditoria: abertura medida');
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${SAIDA}/auditoria-aberto.png` });
  relatorio.auditoria.blocosVisiveis = await page.evaluate(() => {
    const dialogo = document.querySelector('[role="dialog"]');
    const corpo = dialogo?.querySelector(':scope > div');
    const itens = corpo ? [...corpo.children] : [];
    return {
      total: itens.length,
      visiveis: itens.filter((el) => Number(getComputedStyle(el).opacity) >= 0.99).length,
      opacidades: itens.map((el) => Number(getComputedStyle(el).opacity)),
    };
  });

  relatorio.auditoria.saida = await medirSaida(page, async () => {
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).last().click();
  });
  relatorio.auditoria.focoAposFechar = await page.evaluate(() => ({
    texto: (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
    role: document.activeElement?.getAttribute('role'),
  }));

  /* ─── 3 · 10 ciclos abrir/fechar ───────────────────────────────────────── */
  relatorio.ciclos = [];
  for (let i = 0; i < 10; i += 1) {
    etapa(`ciclo ${i + 1}`);
    const inicio = Date.now();
    await botaoDetalhes(page, i % 3).click();
    await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
    await page.waitForTimeout(1400);
    const estado = await page.evaluate(() => {
      const dialogo = document.querySelector('[role="dialog"]');
      const corpo = dialogo?.querySelector(':scope > div');
      const itens = corpo ? [...corpo.children] : [];
      return {
        blocos: itens.length,
        invisiveis: itens.filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
      };
    });
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 6000 });
    relatorio.ciclos.push({ ciclo: i + 1, ms: Date.now() - inicio, ...estado });
    await page.waitForTimeout(120);
  }

  /* ─── 4 · Categorias de evento ─────────────────────────────────────────── */
  relatorio.categorias = [];
  for (const nome of ['Campanhas', 'Pagamentos', 'Regras', 'Conciliação', 'Aprovações']) {
    etapa(`categoria ${nome}`);
    const chip = page.getByRole('button', { name: new RegExp(`^${nome}\\s*\\d+`) }).first();
    if ((await chip.count()) === 0) {
      relatorio.categorias.push({ nome, disponivel: false });
      continue;
    }
    await chip.click();
    await page.waitForTimeout(1500);
    const detalhes = page.getByRole('button', { name: /Ver detalhes/ });
    if ((await detalhes.count()) === 0) {
      relatorio.categorias.push({ nome, disponivel: false });
      continue;
    }
    const medicao = medirAbertura(page, 1600);
    await detalhes.first().click();
    const entrada = await medicao;
    await page.waitForTimeout(1200);
    const titulo = (await page.locator('[role="dialog"]').innerText()).replace(/\s+/g, ' ').slice(0, 70);
    const saida = await medirSaida(page, () => page.keyboard.press('Escape'));
    relatorio.categorias.push({
      nome,
      disponivel: true,
      titulo,
      escalaInicial: entrada.escalaInicial,
      msAteScaleY: entrada.msAteScaleY,
      blocos: entrada.blocos,
      saida,
    });
    await page.waitForTimeout(300);
  }

  await contexto.close();
}


/* ─── 5 · Responsividade ─────────────────────────────────────────────────── */
{
  const { contexto, page } = await abrir();
  await irParaAuditoria(page);
  etapa('viewports: pronta');
  relatorio.viewports = [];
  for (const [w, h] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1024, 768],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    etapa(`viewport ${w}x${h}`);
    await page.waitForTimeout(350);
    await botaoDetalhes(page, 0).click();
    await page.waitForTimeout(1900);
    const medida = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]').getBoundingClientRect();
      return {
        w: Math.round(d.width),
        h: Math.round(d.height),
        top: Math.round(d.top),
        left: Math.round(d.left),
        bottom: Math.round(d.bottom),
        right: Math.round(d.right),
        viewport: { w: innerWidth, h: innerHeight },
        dentro: d.top >= 0 && d.left >= 0 && d.bottom <= innerHeight + 1 && d.right <= innerWidth + 1,
        desvioCentroX: Math.round(Math.abs((d.left + d.right) / 2 - innerWidth / 2)),
        desvioCentroY: Math.round(Math.abs((d.top + d.bottom) / 2 - innerHeight / 2)),
      };
    });
    relatorio.viewports.push({ ...medida });
    if (w === 1440 || w === 390) await page.screenshot({ path: `${SAIDA}/modal-${w}x${h}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
  }
  await contexto.close();
}

/* ─── 6 · Movimento reduzido ─────────────────────────────────────────────── */
{
  const { contexto, page } = await abrir(1440, 900, { reducedMotion: 'reduce' });
  await irParaAuditoria(page);
  etapa('reduzido: pronta');
  const abertura = medirAbertura(page, 1800);
  await botaoDetalhes(page, 0).click();
  relatorio.reduzido = { abertura: await abertura };
  await page.waitForTimeout(2200);
  relatorio.reduzido.estado = await page.evaluate(() => {
    const dialogo = document.querySelector('[role="dialog"]');
    const corpo = dialogo?.querySelector(':scope > div');
    const itens = corpo ? [...corpo.children] : [];
    return {
      classeHtml: document.documentElement.className,
      presente: Boolean(dialogo),
      transform: dialogo ? getComputedStyle(dialogo).transform : null,
      opacidades: itens.map((el) => Number(getComputedStyle(el).opacity)),
    };
  });
  await page.screenshot({ path: `${SAIDA}/reduzido-1440.png` });
  relatorio.reduzido.saida = await medirSaida(page, () => page.keyboard.press('Escape'));
  await page.waitForTimeout(300);
  relatorio.reduzido.dialogoAposFechar = await page.locator('[role="dialog"]').count();
  await contexto.close();
}

await browser.close();
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
console.log('FALHAS', JSON.stringify([...new Set(falhas)]));
