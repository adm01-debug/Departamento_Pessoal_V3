/** TEMPORÁRIO — validação visual/funcional da TabList de Treinamentos. */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-tabs-treinamentos');
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
    return {
      x: +r.x.toFixed(2),
      y: +r.y.toFixed(2),
      w: +r.width.toFixed(2),
      h: +r.height.toFixed(2),
      bottom: +r.bottom.toFixed(2),
    };
  };
  const lista = document.querySelector('[data-treinamentos-tablist]');
  const abas = Array.from(document.querySelectorAll('[data-treinamentos-tablist] [role="tab"]'));
  const ativa = abas.find((a) => a.getAttribute('aria-selected') === 'true');
  const inativa = abas.find((a) => a !== ativa);
  const indicador = document.querySelector('[data-aba-indicador]');
  const csLista = lista ? getComputedStyle(lista) : null;
  const csAtiva = ativa ? getComputedStyle(ativa) : null;
  const csInativa = inativa ? getComputedStyle(inativa) : null;
  const csIndicador = indicador ? getComputedStyle(indicador) : null;
  const painel = document.querySelector('[role="tabpanel"]:not([hidden])');
  return {
    lista: ret(lista),
    listaEstilo: csLista
      ? {
          display: csLista.display,
          background: csLista.backgroundColor,
          borderRadius: csLista.borderRadius,
          padding: csLista.padding,
          borderBottom: `${csLista.borderBottomWidth} ${csLista.borderBottomColor}`,
          borderTop: csLista.borderTopWidth,
          borderLeft: csLista.borderLeftWidth,
          borderRight: csLista.borderRightWidth,
          overflowX: csLista.overflowX,
        }
      : null,
    abas: abas.map((a) => ({
      texto: (a.textContent ?? '').trim(),
      x: ret(a).x,
      y: ret(a).y,
      w: ret(a).w,
      h: ret(a).h,
      ativa: a === ativa,
      cor: getComputedStyle(a).color,
      fundo: getComputedStyle(a).backgroundColor,
      peso: getComputedStyle(a).fontWeight,
      raio: getComputedStyle(a).borderRadius,
      overflowTexto: a.scrollWidth - a.clientWidth,
      ariaControls: a.getAttribute('aria-controls'),
    })),
    linhas: [...new Set(abas.map((a) => Math.round(a.getBoundingClientRect().y)))].length,
    ativa: ativa
      ? { texto: (ativa.textContent ?? '').trim(), cor: csAtiva.color, peso: csAtiva.fontWeight, fundo: csAtiva.backgroundColor }
      : null,
    inativa: csInativa ? { cor: csInativa.color, peso: csInativa.fontWeight, fundo: csInativa.backgroundColor } : null,
    indicador: ret(indicador),
    indicadorEstilo: csIndicador
      ? {
          background: csIndicador.backgroundColor,
          height: csIndicador.height,
          radius: csIndicador.borderRadius,
          opacity: csIndicador.opacity,
        }
      : null,
    alinhamento:
      ativa && indicador
        ? {
            deltaX: +(ret(indicador).x - ret(ativa).x).toFixed(2),
            deltaW: +(ret(indicador).w - ret(ativa).w).toFixed(2),
            deltaBase: +(ret(indicador).bottom - ret(ativa).bottom).toFixed(2),
          }
        : null,
    painel: painel ? { visivel: !painel.hasAttribute('hidden'), texto: (painel.textContent ?? '').trim().slice(0, 80) } : null,
    pagina: {
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mainOverflow: document.querySelector('main')
        ? document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth
        : null,
      scrollY: window.scrollY,
    },
  };
};

const abrir = async (browser, w, h) => {
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
  await page.getByRole('tab', { name: 'Treinamentos' }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2200);
  return { contexto, page, erros };
};

// ---------- 1. Responsividade + contrato visual ----------
for (const [w, h] of larguras) {
  const browser = await chromium.launch();
  const { contexto, page, erros } = await abrir(browser, w, h);
  const dados = await page.evaluate(medir);
  console.log(JSON.stringify({ tipo: 'viewport', viewport: `${w}x${h}`, ...dados, erros: [...new Set(erros)] }));
  await page.screenshot({ path: path.join(SAIDA, `treinamentos-tabs-${w}x${h}.png`) });
  await contexto.close();
  await browser.close();
}


// ---------- 2. Transições, teclado, cliques rápidos e animação ----------
const browser = await chromium.launch();
const { contexto, page, erros } = await abrir(browser, 1440, 900);

const nomes = ['Treinamentos', 'Catálogo', 'Trilhas', 'Inscrições', 'Turmas / Instâncias', 'Certificados'];
const transicoes = [];
const medirEstado = () =>
  page.evaluate(() => {
    const abas = Array.from(document.querySelectorAll('[data-treinamentos-tablist] [role="tab"]'));
    const ativa = abas.find((a) => a.getAttribute('aria-selected') === 'true');
    const ind = document.querySelector('[data-aba-indicador]');
    const painel = document.querySelector('[role="tabpanel"]:not([hidden])');
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(2), w: +b.width.toFixed(2), bottom: +b.bottom.toFixed(2) };
    };
    return {
      ativa: (ativa?.textContent ?? '').trim(),
      indicador: ind
        ? { ...r(ind), opacity: getComputedStyle(ind).opacity, bg: getComputedStyle(ind).backgroundColor }
        : null,
      aba: ativa ? r(ativa) : null,
      deltaX: ind && ativa ? +(r(ind).x - r(ativa).x).toFixed(2) : null,
      deltaW: ind && ativa ? +(r(ind).w - r(ativa).w).toFixed(2) : null,
      painel: (painel?.textContent ?? '').trim().slice(0, 60),
    };
  });

async function clicar(nome, espera = 650) {
  await page.getByRole('tab', { name: nome }).click();
  await page.waitForTimeout(espera);
  const estado = await medirEstado();
  transicoes.push({ ordem: `${transicoes.length + 1}`, alvo: nome, ...estado });
  return estado;
}

for (const nome of nomes.slice(1)) await clicar(nome);
for (const nome of [...nomes].reverse()) await clicar(nome);

await page.getByRole('tab', { name: 'Treinamentos' }).focus();
const teclado = [];
for (const tecla of ['ArrowRight', 'ArrowRight', 'End', 'Home']) {
  await page.keyboard.press(tecla);
  await page.waitForTimeout(500);
  teclado.push({ tecla, ...(await medirEstado()) });
}
console.log(JSON.stringify({ tipo: 'transicoes', transicoes, teclado }, null, 0));

await page.getByRole('tab', { name: 'Treinamentos' }).click();
await page.waitForTimeout(600);
await page.getByRole('tab', { name: 'Certificados' }).click();
await page.waitForTimeout(70);
await page.screenshot({ path: path.join(SAIDA, 'animacao-meio-1440.png') });
await page.waitForTimeout(600);
await page.getByRole('tab', { name: 'Treinamentos' }).click();
await page.waitForTimeout(700);

await page.getByRole('tab', { name: 'Certificados' }).click();
const trajetoriaTreinamentos = await page.evaluate(async () => {
  const ind = () => document.querySelector('[data-aba-indicador]');
  const amostras = [];
  const inicio = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const el = ind();
      if (el) {
        const r = el.getBoundingClientRect();
        amostras.push({
          t: Math.round(performance.now() - inicio),
          x: +r.x.toFixed(2),
          w: +r.width.toFixed(2),
          o: +getComputedStyle(el).opacity,
        });
      }
      if (performance.now() - inicio < 750) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  return amostras;
});
writeFileSync(path.join(SAIDA, 'trajetoria-treinamentos.json'), JSON.stringify(trajetoriaTreinamentos, null, 2));

await page.waitForTimeout(500);
const rapidos = [];
for (const nome of ['Catálogo', 'Trilhas', 'Inscrições', 'Turmas / Instâncias', 'Certificados', 'Treinamentos']) {
  await page.getByRole('tab', { name: nome }).click();
  await page.waitForTimeout(35);
  rapidos.push({ nome, ...(await medirEstado()) });
}
await page.waitForTimeout(900);
const rapidoFinal = await medirEstado();
console.log(JSON.stringify({ tipo: 'cliques-rapidos', rapidos, final: rapidoFinal }, null, 0));

await page.getByRole('tab', { name: 'Treinamentos' }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(SAIDA, 'treinamentos-1440-final.png') });

// ---------- 3. Dashboard: mesma trajetória/mola ----------
await page.goto('http://localhost:8080/dashboard-executivo', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab').first().waitFor({ timeout: 30_000 });
await page.waitForTimeout(1200);
await page.getByRole('tab').first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(SAIDA, 'dashboard-tabs-1440.png') });
await page.getByRole('tab').last().click();
const trajetoriaDashboard = await page.evaluate(async () => {
  const ind = () => document.querySelector('[role="tablist"] .absolute.bg-primary');
  const amostras = [];
  const inicio = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const el = ind();
      if (el) {
        const r = el.getBoundingClientRect();
        amostras.push({
          t: Math.round(performance.now() - inicio),
          x: +r.x.toFixed(2),
          w: +r.width.toFixed(2),
          o: +getComputedStyle(el).opacity,
        });
      }
      if (performance.now() - inicio < 750) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  return amostras;
});
writeFileSync(path.join(SAIDA, 'trajetoria-dashboard.json'), JSON.stringify(trajetoriaDashboard, null, 2));

function resumo(nome, arr) {
  const inicio = arr[0];
  const fim = arr[arr.length - 1];
  const deslocamento = Math.abs(fim.x - inicio.x);
  const primeiroMovimento = arr.find((a) => Math.abs(a.x - inicio.x) > 0.5);
  const assentou = arr.find((a) => Math.abs(a.x - fim.x) <= 1 && a.t > (primeiroMovimento?.t ?? 0));
  return {
    nome,
    quadros: arr.length,
    inicioX: inicio.x,
    fimX: fim.x,
    deslocamento: +deslocamento.toFixed(2),
    primeiroMovimentoMs: primeiroMovimento?.t ?? null,
    assentouMs: assentou?.t ?? null,
    opacidadeMin: Math.min(...arr.map((a) => a.o)),
    opacidadeMax: Math.max(...arr.map((a) => a.o)),
    larguraMin: Math.min(...arr.map((a) => a.w)),
    larguraMax: Math.max(...arr.map((a) => a.w)),
  };
}
console.log(
  JSON.stringify({
    tipo: 'comparacao-animacao',
    treinamentos: resumo('Treinamentos', trajetoriaTreinamentos),
    dashboard: resumo('Dashboard', trajetoriaDashboard),
    erros: [...new Set(erros)],
  }),
);

await contexto.close();
await browser.close();
