/**
 * Verificação final da cascata de entrada da área de Admissões.
 *
 * Distingue as DUAS animações que coexistem em todo `Card` deste app:
 *  1. `cardVariants` (framer) → animação WAAPI de `opacity` 0→1, criada pelo
 *     framer (`a.constructor.name === 'Animation'`), 0.4s, delay i*0.08;
 *  2. `animate-squash` (CSS global do `ui/card.tsx`, escalonado por
 *     `useStaggerCards(60)` no `App.tsx`) → `CSSAnimation/squashInSafe` de 0.7s
 *     com `animation-delay` inline.
 * A referência é `/dashboard-executivo` (MetricCard): ela tem AS DUAS. O que se
 * verifica aqui é a nº 1 (a que foi aplicada em Admissões) e que ela não
 * reanima em hover/aba/arraste.
 */
import { chromium } from 'playwright';
import { appendFileSync, writeFileSync } from 'node:fs';

const LOG = '.tmp-adm3-verify.txt';
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

/** Lê, na ordem do DOM, o delay/duração da animação do framer e do squash. */
const LER = () => {
  window.__ler = (limite) => {
    const painel = [...document.querySelectorAll('[role="tabpanel"]')].find(
      (p) => getComputedStyle(p).display !== 'none'
    );
    const raiz = painel ?? document.body;
    return [...raiz.querySelectorAll('.animate-squash')].slice(0, limite).map((el) => {
      const tempo = (a) => {
        const t = a.effect.getTiming();
        return `${Math.round(Number(t.delay) || 0)}/${Math.round(Number(t.duration) || 0)}`;
      };
      const anims = el.getAnimations();
      const framer = anims.filter((a) => a.constructor.name === 'Animation').map(tempo);
      const squash = anims.filter((a) => a.constructor.name === 'CSSAnimation').map(tempo);
      return { framer: framer.join(' ') || '-', squash: squash.join(' ') || '-' };
    });
  };
};

/** Conta animações do framer (não as CSS) por card — usado nos testes de "não reanima". */
const VIVAS = () => {
  window.__vivas = (seletor) => {
    const painel = [...document.querySelectorAll('[role="tabpanel"]')].find((p) => getComputedStyle(p).display !== 'none');
    const raiz = painel ?? document.body;
    return [...raiz.querySelectorAll(seletor)].map(
      (el) => el.getAnimations().filter((a) => a.constructor.name === 'Animation').length
    );
  };
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

async function capturar(page, rotulo, limite = 14) {
  const linhas = await page.evaluate((n) => window.__ler(n), limite);
  console.log(`\n### ${rotulo} (${linhas.length} cards; framer=delay/dur | squash=delay/dur)`);
  linhas.forEach((l, i) => console.log(`  [${String(i).padStart(2)}] framer=${l.framer}  squash=${l.squash}`));
  return linhas;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
await page.addInitScript(LER);
await page.addInitScript(VIVAS);
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

try {
  await entrar(page);

  /* ---------- 1. REFERÊNCIA: Dashboard Executivo ---------- */
  await page.goto(`${BASE}/dashboard-executivo`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await capturar(page, 'REFERÊNCIA /dashboard-executivo (MetricCard)', 6);
  await page.waitForTimeout(1500);
  console.log('  assentado → animações do framer por card:', await page.evaluate(() => window.__vivas('.animate-squash')));

  /* ---------- 2. ADMISSÕES: aba dashboard ---------- */
  await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await capturar(page, 'ADMISSÕES aba dashboard (OnboardingDashboard)', 12);
  await page.waitForTimeout(1200);
  console.log('  assentado → animações do framer por card:', await page.evaluate(() => window.__vivas('.animate-squash')));

  /* hover no primeiro card: não pode criar entrada nova */
  await page.locator('[role="tabpanel"]:not([hidden]) .animate-squash').first().hover();
  await page.waitForTimeout(700);
  console.log(
    '  após HOVER no 1º card → animações do framer por card:',
    await page.evaluate(() => window.__vivas('.animate-squash'))
  );

  /* ---------- 3. ABA ONBOARDING ---------- */
  await page.getByRole('tab', { name: /onboarding/i }).click();
  await page.waitForTimeout(450);
  await capturar(page, 'ADMISSÕES aba onboarding (0,45s após o clique)', 14);
  await page.waitForTimeout(1600);
  console.log('  assentado → animações do framer por card:', await page.evaluate(() => window.__vivas('.animate-squash')));

  /* ---------- 4. ABA GESTÃO ---------- */
  await page.getByRole('tab', { name: /gestão de candidatos/i }).click();
  await page.waitForTimeout(450);
  await capturar(page, 'ADMISSÕES aba gestão (0,45s após o clique)', 12);

  /* ---------- 5. ABA KANBAN ---------- */
  await page.getByRole('tab', { name: /^kanban$/i }).click();
  await page.waitForTimeout(450);
  await capturar(page, 'ADMISSÕES aba kanban (0,45s após o clique)', 18);
  await page.waitForTimeout(1600);
  console.log(
    '  assentado → animações do framer por card do board:',
    await page.evaluate(() => window.__vivas('.cursor-grab'))
  );

  /* ---------- 6. ARRASTE: card movido não reentra ---------- */
  const info = await page.evaluate(() => {
    const borda = document.querySelector('.cursor-grab');
    const colunas = [...document.querySelectorAll('[class*="min-w-"]')].filter((c) => c.className.includes('flex-col'));
    return {
      texto: (borda.textContent || '').trim().slice(0, 24),
      rect: borda.getBoundingClientRect().toJSON(),
      atual: colunas.indexOf(borda.closest('div.flex-1')?.parentElement),
      destinos: colunas.map((c) => ({ texto: (c.textContent || '').trim().slice(0, 20), rect: c.getBoundingClientRect().toJSON() })),
    };
  });
  const destino = info.destinos[info.atual + 1] ?? info.destinos[0];
  console.log(`\n### ARRASTE: "${info.texto}" → coluna "${destino.texto}"`);
  await page.mouse.move(info.rect.x + info.rect.width / 2, info.rect.y + 20);
  await page.mouse.down();
  await page.mouse.move(info.rect.x + info.rect.width / 2 + 30, info.rect.y + 40, { steps: 8 });
  await page.mouse.move(destino.rect.x + destino.rect.width / 2, destino.rect.y + 120, { steps: 14 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(350);
  console.log(
    '  card movido, 0,35s após o drop:',
    await page.evaluate((texto) => {
      const alvo = [...document.querySelectorAll('.cursor-grab')].find((c) =>
        (c.textContent || '').trim().startsWith(texto)
      );
      if (!alvo) return { achou: false };
      return {
        achou: true,
        framerVivas: alvo.getAnimations().filter((a) => a.constructor.name === 'Animation').length,
        cssVivas: alvo.getAnimations().filter((a) => a.constructor.name === 'CSSAnimation').length,
        inline: (alvo.getAttribute('style') || '').slice(0, 70),
        opacidade: getComputedStyle(alvo).opacity,
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
