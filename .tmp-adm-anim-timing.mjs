/**
 * Verificação de timing das animações de entrada em /admissoes.
 *
 * Por que existe: o framer-motion 12 anima `opacity`/`transform` pela Web
 * Animations API (`element.animate()`), então o `style` inline salta para o
 * valor final e amostrar inline-style é cego para a rampa. Aqui lemos a própria
 * animação nativa (`getAnimations()` + `effect.getTiming()`): delay, duração e
 * `startTime` (linha do tempo do documento — comparável entre cards) dão a
 * cascata exata, sem depender de amostragem (que sofre com o jank de montagem).
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

const POLL = () => {
  window.__timings = [];
  window.__startTimingPoll = (ms = 3000) => {
    const vistos = new Set();
    const t0 = performance.now();
    const id = setInterval(() => {
      const painel = document.querySelector('[role="tabpanel"]:not([hidden])');
      if (!painel) return;
      for (const el of painel.querySelectorAll('[style*="opacity"]')) {
        const anims = el.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'paused');
        if (!anims.length) continue;
        const r = el.getBoundingClientRect();
        const nome = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26);
        const chave = `${nome}|${Math.round(r.left)}|${Math.round(r.top)}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        const a = anims[0];
        const t = a.effect.getTiming();
        window.__timings.push({
          nome,
          x: Math.round(r.left),
          y: Math.round(r.top),
          delay: Math.round(Number(t.delay) || 0),
          dur: Math.round(Number(t.duration) || 0),
          start: Math.round(Number(a.startTime)),
          playState: a.playState,
        });
      }
      if (performance.now() - t0 > ms) clearInterval(id);
    }, 4);
  };
  /** Animações nativas vivas no painel visível (prova que hover/volta não reanima). */
  window.__vivas = () => {
    const raiz = document.querySelector('[role="tabpanel"]:not([hidden])');
    if (!raiz) return { erro: 'sem painel visível' };
    const els = [...raiz.querySelectorAll('[style*="opacity"]')].filter((el) =>
      el.getAnimations().some((a) => a.playState === 'running')
    );
    return { vivas: els.length, textos: els.slice(0, 4).map((e) => (e.textContent || '').trim().slice(0, 20)) };
  };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
await page.addInitScript(POLL);
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

function relatorio(titulo, timings, esperado) {
  console.log(`\n=== ${titulo} — ${timings.length} cards com animação nativa ===`);
  if (!timings.length) return;
  const inicio = Math.min(...timings.map((t) => t.start));
  const ordenado = [...timings].sort((a, b) => a.start - b.start || a.y - b.y || a.x - b.x);
  let anterior = null;
  for (const t of ordenado.slice(0, 40)) {
    const rel = t.start - inicio;
    const passo = anterior === null ? '' : `(+${t.start - anterior}ms)`;
    anterior = t.start;
    console.log(
      `  start=+${String(rel).padStart(4)}ms ${passo.padEnd(10)} delay=${String(t.delay).padStart(4)}ms dur=${String(t.dur).padStart(3)}ms x=${String(t.x).padStart(4)} y=${String(t.y).padStart(4)}  "${t.nome}"`
    );
  }
  const delays = [...new Set(timings.map((t) => t.delay))].sort((a, b) => a - b);
  const janela = Math.max(...timings.map((t) => t.start)) - inicio;
  console.log(`  → delays distintos: ${delays.join(', ')}ms | duração(ões): ${[...new Set(timings.map((t) => t.dur))].join(', ')}ms`);
  console.log(`  → janela total da cascata: ${janela}ms | esperado: ${esperado}`);
}

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  if (page.url().includes('/login')) {
    const email = page.getByLabel(/e-?mail/i).first();
    await email.waitFor({ state: 'visible', timeout: 15000 });
    await email.fill(EMAIL);
    await page.getByLabel(/senha|password/i).first().fill(PASSWORD);
    await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 25000 });
    await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
    await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(2500);

  // 1. Dashboard já montado: nada deve estar animando (sem re-entrada)
  console.log('Dashboard (após assentar):', JSON.stringify(await page.evaluate(() => window.__vivas())));

  // 2. Kanban
  await page.evaluate(() => window.__startTimingPoll(3000));
  await page.getByRole('tab', { name: /^kanban$/i }).click();
  await page.waitForTimeout(3200);
  relatorio(
    'KANBAN (cards do board)',
    await page.evaluate(() => window.__timings || []),
    'delay = 80ms × min(índice, 5) → máx 400ms; dur 400ms; ordem coluna→coluna, topo→base'
  );
  console.log('Kanban assentado (nada animando):', JSON.stringify(await page.evaluate(() => window.__vivas())));

  // 3. hover num card não pode reanimar
  await page.getByText('Ana Silva Santos', { exact: false }).first().hover().catch(() => {});
  await page.waitForTimeout(400);
  console.log('Kanban após hover (nada animando):', JSON.stringify(await page.evaluate(() => window.__vivas())));
  await page.mouse.move(20, 20);

  // 4. Onboarding
  await page.evaluate(() => window.__startTimingPoll(3000));
  await page.getByRole('tab', { name: /^onboarding$/i }).click();
  await page.waitForTimeout(3200);
  relatorio(
    'ONBOARDING (cards de jornada)',
    await page.evaluate(() => window.__timings || []),
    'delay = 80ms × min(índice, 5); dur 400ms'
  );
  await page.screenshot({ path: 'fin-adm-timing-onboarding.png' });

  // 5. volta ao Dashboard: painel já montado não pode reanimar
  await page.evaluate(() => window.__startTimingPoll(1500));
  await page.getByRole('tab', { name: /^dashboard$/i }).click();
  await page.waitForTimeout(1700);
  const volta = await page.evaluate(() => window.__timings || []);
  console.log(`\n=== VOLTA AO DASHBOARD — ${volta.length} animações novas (esperado: 0) ===`);
  if (volta.length) console.log('  ', JSON.stringify(volta.slice(0, 6)));

  // 6. Gestão: cards de candidato
  await page.evaluate(() => window.__startTimingPoll(3000));
  await page.getByRole('tab', { name: /gest/i }).first().click();
  await page.waitForTimeout(3200);
  relatorio(
    'GESTÃO (cards de candidato)',
    await page.evaluate(() => window.__timings || []),
    'delay = 80ms × min(índice, 5); dur 400ms'
  );
  await page.screenshot({ path: 'fin-adm-timing-gestao.png' });
} catch (err) {
  console.error('ERROR:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
