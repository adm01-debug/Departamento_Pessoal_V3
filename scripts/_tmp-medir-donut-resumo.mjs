/**
 * TEMPORÁRIO — mede o TRAÇADO do donut do card "Resumo Financeiro" (aba
 * Pagamentos): início e duração de cada segmento, lidos do próprio
 * `stroke-dasharray` que o Framer Motion escreve a cada quadro.
 *
 * Uso: node scripts/_tmp-medir-donut-resumo.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORTA = 8080;
const URL = `http://localhost:${PORTA}/premiacoes`;
const SAIDA = 'tmp-donut-resumo';
mkdirSync(SAIDA, { recursive: true });

const portaAtiva = async () => {
  try {
    const r = await fetch(URL, { redirect: 'manual' });
    return r.status < 500;
  } catch {
    return false;
  }
};
const jaServindo = await portaAtiva();
const servidor = jaServindo
  ? null
  : spawn('cmd.exe', ['/c', `npx vite --port ${PORTA} --strictPort`], { stdio: 'ignore', windowsHide: true });
const pronto = async () => {
  for (let i = 0; i < 90; i++) {
    if (await portaAtiva()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

const instalarRecorder = () => {
  const circulos = () => {
    const h3 = [...document.querySelectorAll('h3')].find((h) => (h.textContent || '').includes('Resumo Financeiro'));
    const svg = h3 ? h3.closest('section')?.querySelector('svg') : null;
    // O 1º círculo é o trilho de fundo (sem cor de segmento).
    return svg ? [...svg.querySelectorAll('circle')].slice(1) : [];
  };
  const extensao = (el) => {
    const valor = getComputedStyle(el).strokeDasharray;
    const primeiro = valor.split(/[\s,]+/).map((v) => Number.parseFloat(v))[0];
    return Number.isFinite(primeiro) ? primeiro : 0;
  };
  window.__donut = { quadros: [] };
  window.__donutIniciar = (ms) => {
    window.__donut.quadros = [];
    const limite = performance.now() + ms;
    const loop = () => {
      const t = performance.now();
      const cs = circulos();
      window.__donut.quadros.push({
        t,
        arcos: cs.map((el) => ({ cor: el.getAttribute('stroke') || getComputedStyle(el).stroke, dash: extensao(el) })),
      });
      if (t < limite) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
};

let browser;
try {
  if (!(await pronto())) throw new Error('servidor Vite não ficou pronto');
  browser = await chromium.launch();

  for (const cenario of [
    { nome: 'normal', reduzido: false },
    { nome: 'reduzido', reduzido: true },
  ]) {
    const contexto = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
      viewport: { width: 1456, height: 900 },
      ...(cenario.reduzido ? { reducedMotion: 'reduce' } : {}),
      ...(cenario.reduzido ? {} : { recordVideo: { dir: `${SAIDA}/video`, size: { width: 1456, height: 900 } } }),
    });
    const page = await contexto.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('ui-theme', 'dark');
      localStorage.setItem('dp-tour-completed', 'true');
      if (localStorage.getItem('dp-force-motion') === null && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        localStorage.setItem('dp-force-motion', 'off');
      }
    });
    await page.addInitScript(instalarRecorder);
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__donutIniciar(5000));
    await page.getByRole('tab', { name: /Pagamentos/ }).click();
    await page.getByRole('heading', { name: 'Resumo Financeiro' }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(2500);

    const medido = await page.evaluate(() => {
      const quadros = window.__donut.quadros;
      const t0 = quadros[0]?.t ?? 0;
      const n = Math.max(...quadros.map((q) => q.arcos.length));
      const segmentos = [];
      for (let i = 0; i < n; i += 1) {
        const serie = quadros.map((q) => ({ t: q.t - t0, ...(q.arcos[i] ?? { cor: '', dash: 0 }) }));
        if (!serie.length) continue;
        const final = Math.max(...serie.map((s) => s.dash));
        const inicio = serie.find((s) => s.dash > 1);
        const fim = serie.find((s) => s.dash >= final - 0.5);
        segmentos.push({
          cor: serie[0].cor,
          dash_final: Math.round(final * 10) / 10,
          inicio_ms: inicio ? Math.round(inicio.t) : null,
          duracao_ms: inicio && fim ? Math.round(fim.t - inicio.t) : null,
        });
      }
      const bases = segmentos.map((s) => s.inicio_ms).filter((v) => v !== null);
      const menor = bases.length ? Math.min(...bases) : null;
      for (const s of segmentos) if (s.inicio_ms !== null && menor !== null) s.atraso_rel_ms = s.inicio_ms - menor;
      return segmentos;
    });
    console.log(`\n=== ${cenario.nome} ===`);
    for (const s of medido) console.log(JSON.stringify(s));
    await page.screenshot({ path: `${SAIDA}/resumo-financeiro-${cenario.nome}.png`, clip: undefined });
    if (!cenario.reduzido) console.log(`video: ${await page.video().path()}`);
    await contexto.close();
  }
} finally {
  if (browser) await browser.close();
  if (servidor) {
    try {
      execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* já encerrado */
    }
  }
}
