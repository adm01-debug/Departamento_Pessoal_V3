/**
 * Recorder de entrada: histórico de animações por card.
 *
 * Por que um gravador e não uma leitura pontual: o framer REMOVE a animação do
 * `getAnimations()` assim que ela termina (a leitura anterior, feita 1,5s depois,
 * via cards 4-9 mas já não via os cards 0-3). Um poll de 50ms iniciado no
 * `addInitScript` registra, por elemento, TODA assinatura (delay/duração) que ele
 * teve enquanto viveu — então o histórico fica completo mesmo lendo tarde.
 *
 * Duas famílias por card:
 *  - `Animation`     → framer/`cardVariants` (a animação aplicada em Admissões);
 *  - `CSSAnimation`  → `squashInSafe` do `ui/card.tsx` (global, via useStaggerCards).
 */
import { chromium } from 'playwright';
import { appendFileSync, writeFileSync } from 'node:fs';

const LOG = '.tmp-adm4-recorder.txt';
writeFileSync(LOG, '');
const _log = console.log.bind(console);
console.log = (...a) => {
  const linha = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
  appendFileSync(LOG, linha + '\n');
  _log(linha);
};

const BASE = 'http://localhost:8080';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

const GRAVADOR = () => {
  /** el → { framer:Set, css:Set } */
  const hist = new Map();
  window.__hist = hist;
  window.__resetGrava = () => hist.clear();
  window.__relatorio = (limite = 40) => {
    const painel = [...document.querySelectorAll('[role="tabpanel"]')].find(
      (p) => getComputedStyle(p).display !== 'none'
    );
    const raiz = painel ?? document.body;
    return [...raiz.querySelectorAll('.animate-squash')].slice(0, limite).map((el) => {
      const r = hist.get(el) ?? { framer: new Set(), css: new Set() };
      const vivos = el.getAnimations().filter((a) => a.constructor.name === 'Animation').length;
      return {
        framer: [...r.framer].join(' ') || '-',
        css: [...r.css].join(' ') || '-',
        vivos,
        txt: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 22),
      };
    });
  };
  setInterval(() => {
    document.querySelectorAll('.animate-squash').forEach((el) => {
      let r = hist.get(el);
      if (!r) {
        r = { framer: new Set(), css: new Set() };
        hist.set(el, r);
      }
      el.getAnimations().forEach((a) => {
        const t = a.effect.getTiming();
        const chave = `${Math.round(Number(t.delay) || 0)}/${Math.round(Number(t.duration) || 0)}`;
        if (a.constructor.name === 'Animation') r.framer.add(chave);
        else r.css.add(chave);
      });
    });
  }, 50);
};

async function entrar(page) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  const email = page.getByLabel(/e-?mail/i).first();
  await email.waitFor({ state: 'visible', timeout: 12000 });
  await email.fill(EMAIL);
  await page.getByLabel(/senha|password/i).first().fill(PASSWORD);
  await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('sb-')), undefined, { timeout: 10000 });
}

async function relatar(page, rotulo, limite = 40) {
  const linhas = await page.evaluate((n) => window.__relatorio(n), limite);
  console.log(`\n### ${rotulo} — ${linhas.length} cards (framer | squash | vivas)`);
  linhas.forEach((l, i) => console.log(`  [${String(i).padStart(2)}] ${l.framer.padEnd(12)}| ${l.css.padEnd(12)}| ${l.vivos} | ${l.txt}`));
  return linhas;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
await page.addInitScript(GRAVADOR);
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

try {
  await entrar(page);

  /* ---------- 1. REFERÊNCIA: Dashboard Executivo (MetricCard) ---------- */
  await page.goto(`${BASE}/dashboard-executivo`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.animate-squash', { timeout: 20000 });
  await page.waitForTimeout(1400);
  await relatar(page, 'REFERÊNCIA /dashboard-executivo (MetricCard)', 8);
  console.log('  assentado → animações do framer vivas:', await page.evaluate(() => window.__relatorio(40).map((l) => l.vivos)));

  /* ---------- 2. ADMISSÕES: aba dashboard (OnboardingDashboard) ---------- */
  await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.__resetGrava());
  await page.waitForTimeout(2600);
  await relatar(page, 'ADMISSÕES aba dashboard (OnboardingDashboard)', 12);
  const vivosDash = await page.evaluate(() => window.__relatorio(12).map((l) => l.vivos));
  console.log('  assentado → animações do framer vivas:', vivosDash);

  /* hover no 1º card → não pode registrar entrada nova */
  await page.locator('[role="tabpanel"]:not([hidden]) .animate-squash').first().hover();
  await page.waitForTimeout(800);
  console.log('  após HOVER → histórico do 1º card:', await page.evaluate(() => window.__relatorio(2)));

  /* ---------- 3. ABA ONBOARDING ---------- */
  await page.getByRole('tab', { name: /onboarding/i }).click();
  await page.evaluate(() => window.__resetGrava());
  await page.waitForTimeout(2200);
  await relatar(page, 'ADMISSÕES aba onboarding', 16);

  /* ---------- 4. ABA GESTÃO ---------- */
  await page.getByRole('tab', { name: /gestão de candidatos/i }).click();
  await page.evaluate(() => window.__resetGrava());
  await page.waitForTimeout(2200);
  await relatar(page, 'ADMISSÕES aba gestão', 16);

  /* ---------- 5. ABA KANBAN ---------- */
  await page.getByRole('tab', { name: /^kanban$/i }).click();
  await page.evaluate(() => window.__resetGrava());
  await page.waitForTimeout(2200);
  await relatar(page, 'ADMISSÕES aba kanban (board)', 40);
  console.log(
    '  assentado → animações do framer vivas:',
    await page.evaluate(() => window.__relatorio(40).map((l) => l.vivos))
  );

  /* ---------- 6. ARRASTE: card movido não reentra ---------- */
  const info = await page.evaluate(() => {
    const alvo = document.querySelector('.cursor-grab');
    const colunas = [...document.querySelectorAll('[class*="min-w-"]')].filter((c) => c.className.includes('flex-col'));
    return {
      texto: (alvo.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 22),
      rect: alvo.getBoundingClientRect().toJSON(),
      atual: colunas.indexOf(alvo.closest('div.flex-1')?.parentElement),
      destinos: colunas.map((c) => ({ txt: (c.textContent || '').trim().slice(0, 18), rect: c.getBoundingClientRect().toJSON() })),
    };
  });
  const destino = info.destinos[info.atual + 1] ?? info.destinos[0];
  console.log(`\n### ARRASTE: "${info.texto}" → coluna "${destino.txt}"`);
  await page.mouse.move(info.rect.x + info.rect.width / 2, info.rect.y + 20);
  await page.mouse.down();
  await page.mouse.move(info.rect.x + info.rect.width / 2 + 30, info.rect.y + 40, { steps: 8 });
  await page.mouse.move(destino.rect.x + destino.rect.width / 2, destino.rect.y + 120, { steps: 14 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(900);
  console.log(
    '  depois do drop:',
    await page.evaluate((texto) => {
      const el = [...document.querySelectorAll('.cursor-grab')].find((c) =>
        (c.textContent || '').trim().replace(/\s+/g, ' ').startsWith(texto)
      );
      if (!el) return { achou: false };
      const r = window.__hist.get(el) ?? { framer: new Set(), css: new Set() };
      return {
        achou: true,
        framer: [...r.framer].join(' ') || '(nenhuma)',
        css: [...r.css].join(' ') || '(nenhuma)',
        inline: (el.getAttribute('style') || '').slice(0, 60),
        opacidade: getComputedStyle(el).opacity,
      };
    }, info.texto)
  );
} catch (err) {
  console.log('ERROR:', err && err.message);
  appendFileSync(LOG, String((err && err.stack) || err) + '\n');
  process.exitCode = 1;
} finally {
  await browser.close();
}
