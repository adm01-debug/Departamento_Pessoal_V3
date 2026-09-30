/**
 * Verificação das animações de entrada em /admissoes (2ª geração da sonda).
 *
 * O que muda em relação à anterior: identifica cada nó animado por IDENTIDADE
 * (WeakSet) em vez de por texto+posição, grava a ANIMAÇÃO NATIVA (o framer 12
 * anima via Web Animations API, então `style` inline salta para o valor final),
 * e reporta em qual painel/posição o nó está. Sem isso, o relatório misturava
 * painéis desmontados e duplicava nós (513 "cards").
 */
import { chromium } from 'playwright';
import { appendFileSync, writeFileSync } from 'node:fs';

/** Log direto em arquivo (sem `| Out-File`: pipe bufferiza e o arquivo fica vazio). */
const LOG = '.tmp-adm2-out.txt';
writeFileSync(LOG, '');
const _log = console.log.bind(console);
console.log = (...a) => {
  const linha = a.map((x) => (typeof x === 'string' ? x : String(x))).join(' ');
  appendFileSync(LOG, linha + '\n');
  _log(linha);
};

const BASE = 'http://localhost:8080';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

const INIT = () => {
  /** Estrutura de painéis: qual está visível e o que tem dentro. */
  window.__paineis = () =>
    [...document.querySelectorAll('[role="tabpanel"]')].map((p) => ({
      id: p.id || null,
      state: p.getAttribute('data-state'),
      hiddenAttr: p.hasAttribute('hidden'),
      display: getComputedStyle(p).display,
      cards: p.querySelectorAll('[style*="opacity"]').length,
      inicio: (p.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48),
    }));

  /**
   * Grava, UMA vez por nó, a animação nativa viva no momento em que ele aparece.
   * `props` = propriedades animadas (opacity/transform); `delay`/`dur` = timing
   * declarado; `start` = `startTime` na linha do tempo do documento, que é o que
   * permite comparar a cascata entre cards; `visto` = quando a sonda o pegou.
   */
  window.__out = [];
  window.__sondaOn = false;
  window.__sonda = (ms = 3000) => {
    window.__out = [];
    window.__sondaOn = true;
    const vistos = new WeakSet();
    const t0 = performance.now();
    const id = setInterval(() => {
      const paineis = [...document.querySelectorAll('[role="tabpanel"]')].filter(
        (p) => getComputedStyle(p).display !== 'none'
      );
      for (const p of paineis) {
        const cards = [...p.querySelectorAll('[style*="opacity"]')];
        cards.forEach((el, idx) => {
          if (vistos.has(el)) return;
          const anims = el.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'pending');
          if (!anims.length) return;
          vistos.add(el);
          const a = anims[0];
          const t = a.effect.getTiming();
          let props = '?';
          try {
            const kf = a.effect.getKeyframes();
            props = Object.keys(kf[0] || {}).filter((k) => !['offset', 'easing', 'composite'].includes(k)).join('+');
          } catch {
            /* keyframes indisponíveis */
          }
          window.__out.push({
            idx,
            painel: p.getAttribute('data-state'),
            node: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
            props,
            delay: Math.round(Number(t.delay) || 0),
            dur: Math.round(Number(t.duration) || 0),
            start: Math.round(Number(a.startTime)),
            visto: Math.round(performance.now() - t0),
            nome: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 22),
          });
        });
      }
      if (performance.now() - t0 > ms) {
        clearInterval(id);
        window.__sondaOn = false;
      }
    }, 4);
  };

  /** Animações de ENTRADA (opacity com durações longas) vivas agora. */
  window.__entradasVivas = () => {
    const saida = [];
    for (const p of document.querySelectorAll('[role="tabpanel"]')) {
      if (getComputedStyle(p).display === 'none') continue;
      for (const el of p.querySelectorAll('[style*="opacity"]')) {
        for (const a of el.getAnimations()) {
          if (a.playState !== 'running' && a.playState !== 'pending') continue;
          const t = a.effect.getTiming();
          const dur = Math.round(Number(t.duration) || 0);
          if (dur < 250) continue;
          saida.push({ nome: (el.textContent || '').trim().slice(0, 18), dur, delay: Math.round(Number(t.delay) || 0) });
        }
      }
    }
    return saida;
  };

  // Carga inicial: a sonda já dispara sozinha, sem esperar o Playwright.
  window.addEventListener('DOMContentLoaded', () => setTimeout(() => window.__sonda(2500), 300));
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
await page.addInitScript(INIT);
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

function tabela(titulo, out, esperado) {
  const entradas = out.filter((o) => o.props.includes('opacity'));
  console.log(`\n=== ${titulo} — ${out.length} animações, ${entradas.length} com opacity ===`);
  if (!out.length) return;
  const base = Math.min(...out.map((o) => o.start));
  const vistoBase = Math.min(...out.map((o) => o.visto));
  for (const o of [...out].sort((a, b) => a.start - b.start || a.idx - b.idx).slice(0, 45)) {
    console.log(
      `  start=+${String(o.start - base).padStart(5)}ms visto=+${String(o.visto - vistoBase).padStart(5)}ms idx=${String(o.idx).padStart(3)} delay=${String(o.delay).padStart(4)}ms dur=${String(o.dur).padStart(3)}ms ${o.props.padEnd(18)} ${o.node.padEnd(24)} "${o.nome}"`
    );
  }
  const delays = [...new Set(entradas.map((o) => o.delay))].sort((a, b) => a - b);
  const durs = [...new Set(entradas.map((o) => o.dur))].sort((a, b) => a - b);
  console.log(`  → delays: ${delays.join(', ')} | durações: ${durs.join(', ')} | ${esperado}`);
  const inicios = [...new Set(entradas.map((o) => o.start))].sort((a, b) => a - b);
  const passos = inicios.slice(1).map((v, i) => v - inicios[i]);
  console.log(`  → ${inicios.length} inícios distintos, passos: ${passos.slice(0, 12).join(', ')}ms`);
}

const paineisTxt = async () => JSON.stringify(await page.evaluate(() => window.__paineis()));

/**
 * Login pelo MESMO caminho de `e2e/auth.setup.ts` (campo → clique → espera a
 * sessão do Supabase cair no localStorage). A decisão é pelo CAMPO e não pela
 * URL — a versão anterior olhava a URL cedo demais e seguia sem sessão, deixando
 * a página em branco (0 painéis, 0 animações) sem erro nenhum.
 */
async function entrar() {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  const email = page.getByLabel(/e-?mail/i).first();
  const visivel = await email
    .waitFor({ state: 'visible', timeout: 12000 })
    .then(() => true)
    .catch(() => false);
  console.log(`Campo de login visível: ${visivel} (url=${page.url()})`);
  if (visivel) {
    await email.fill(EMAIL);
    await page.getByLabel(/senha|password/i).first().fill(PASSWORD);
    await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
    await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('sb-')), undefined, {
      timeout: 10000,
    });
  }
}

try {
  await entrar();
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  console.log('PAINÉIS após carga:', await paineisTxt());
  if ((await page.evaluate(() => document.querySelectorAll('[role="tabpanel"]').length)) === 0) {
    console.log(
      'DIAGNÓSTICO url=',
      page.url(),
      'corpo=',
      (await page.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\s+/g, ' ')
    );
  }
  tabela('CARGA (aba Dashboard)', await page.evaluate(() => window.__out || []), 'delay 0/80/160.../720ms · dur 400ms');
  await page.screenshot({ path: 'fin-adm2-carga.png' });

  // ── Kanban ──────────────────────────────────────────────────────────────
  await page.evaluate(() => window.__sonda(3200));
  await page.getByRole('tab', { name: /^kanban$/i }).click();
  await page.waitForTimeout(3400);
  console.log('\nPAINÉIS na aba Kanban:', await paineisTxt());
  tabela('KANBAN (board)', await page.evaluate(() => window.__out || []), 'delay 80ms×min(i,5) → 0/80/160/240/320/400ms · dur 400ms');
  console.log('Entradas vivas após assentar:', JSON.stringify(await page.evaluate(() => window.__entradasVivas())));
  await page.screenshot({ path: 'fin-adm2-kanban.png' });

  // ── Hover não reanima ───────────────────────────────────────────────────
  await page.getByText('Ana Silva Santos', { exact: false }).first().hover();
  await page.waitForTimeout(600);
  console.log('Entradas vivas durante hover:', JSON.stringify(await page.evaluate(() => window.__entradasVivas())));
  await page.mouse.move(10, 10);
  await page.waitForTimeout(300);

  // ── Arraste: o card movido NÃO pode refazer a entrada ───────────────────
  const ana = page.getByText('Ana Silva Santos', { exact: false }).first();
  const caixa = await ana.boundingBox();
  const destino = await page.evaluate(() => {
    const xs = [...document.querySelectorAll('[role="tabpanel"] [style*="opacity"]')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 100);
    return Math.round(Math.min(...xs.map((r) => r.left)) + 128);
  });
  console.log(`\nArraste: "Ana Silva Santos" de x=${Math.round(caixa.x)} → coluna 1 (x=${destino})`);
  await page.evaluate(() => window.__sonda(2500));
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) {
    await page.mouse.move(
      caixa.x + caixa.width / 2 + ((destino - caixa.x - caixa.width / 2) * i) / 14,
      caixa.y + caixa.height / 2 + ((420 - caixa.y - caixa.height / 2) * i) / 14
    );
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(2600);
  const arraste = await page.evaluate(() => window.__out || []);
  const entradasArraste = arraste.filter((o) => o.props.includes('opacity') && o.dur >= 250);
  console.log(` === ARRASTE — ${arraste.length} animações capturadas, ${entradasArraste.length} de ENTRADA (esperado 0) ===`);
  for (const o of arraste.slice(0, 14)) {
    console.log(`   delay=${String(o.delay).padStart(4)}ms dur=${String(o.dur).padStart(3)}ms ${o.props.padEnd(18)} "${o.nome}"`);
  }
  const posAna = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[role="tabpanel"] [style*="opacity"]')].find((e) =>
      (e.textContent || '').includes('Ana Silva Santos')
    );
    return el ? Math.round(el.getBoundingClientRect().left) : -1;
  });
  console.log(`   Posição da Ana após o arraste: x=${posAna} (antes: ${Math.round(caixa.x)})`);
  await page.screenshot({ path: 'fin-adm2-apos-arraste.png' });

  // ── Onboarding ──────────────────────────────────────────────────────────
  await page.evaluate(() => window.__sonda(3200));
  await page.getByRole('tab', { name: /^onboarding$/i }).click();
  await page.waitForTimeout(3400);
  console.log('\nPAINÉIS na aba Onboarding:', await paineisTxt());
  tabela('ONBOARDING', await page.evaluate(() => window.__out || []), 'delay 80ms×min(i,5) → 0/80/160/240/320/400ms · dur 400ms');
  await page.screenshot({ path: 'fin-adm2-onboarding.png' });

  // ── Gestão ──────────────────────────────────────────────────────────────
  await page.evaluate(() => window.__sonda(3200));
  await page.getByRole('tab', { name: /gest/i }).first().click();
  await page.waitForTimeout(3400);
  console.log('\nPAINÉIS na aba Gestão:', await paineisTxt());
  tabela('GESTÃO', await page.evaluate(() => window.__out || []), 'delay 80ms×min(i,5) · dur 400ms');
  await page.screenshot({ path: 'fin-adm2-gestao.png' });

  // ── Volta ao Dashboard: remonta a aba → cascata de novo (por design) ────
  await page.evaluate(() => window.__sonda(3000));
  await page.getByRole('tab', { name: /^dashboard$/i }).click();
  await page.waitForTimeout(3200);
  tabela('VOLTA AO DASHBOARD', await page.evaluate(() => window.__out || []), 'mesma cascata da carga');
} catch (err) {
  console.log('ERROR:', err && err.message ? err.message : String(err));
  appendFileSync(LOG, String(err && err.stack ? err.stack : err) + '\n');
  process.exitCode = 1;
} finally {
  await browser.close();
}

