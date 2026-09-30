/**
 * Diagnóstico: o que EXATAMENTE anima cada card de /admissoes.
 *
 * Despeja, por nó, TODAS as animações (`getAnimations()` — inclui transições CSS
 * e animações nativas criadas pelo framer), com tipo, keyframes, easing, delay e
 * duração, além do CSS relevante. A sonda anterior lia só `anims[0]` e por isso
 * confundia a animação de entrada com outra qualquer do mesmo nó.
 */
import { chromium } from 'playwright';
import { appendFileSync, writeFileSync } from 'node:fs';

const LOG = '.tmp-adm2-diag.txt';
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

const DUMP = () => {
  window.__dump = (quantos = 3) => {
    const raiz = [...document.querySelectorAll('[role="tabpanel"]')].find(
      (p) => getComputedStyle(p).display !== 'none'
    );
    if (!raiz) return { erro: 'sem painel visível' };
    return [...raiz.querySelectorAll('[style*="opacity"]')].slice(0, quantos).map((el) => {
      const cs = getComputedStyle(el);
      return {
        classe: String(el.className).slice(0, 54),
        inline: (el.getAttribute('style') || '').slice(0, 120),
        opacidade: cs.opacity,
        transform: cs.transform,
        transicaoCSS: cs.transitionProperty + ' ' + cs.transitionDuration,
        animacoes: el.getAnimations().map((a) => {
          const t = a.effect.getTiming();
          let kf = [];
          try {
            kf = a.effect.getKeyframes().map((k) => JSON.stringify(k));
          } catch {
            kf = ['(sem keyframes)'];
          }
          return {
            tipo: a.constructor.name + (a.animationName ? '/' + a.animationName : ''),
            delay: Math.round(Number(t.delay) || 0),
            dur: Math.round(Number(t.duration) || 0),
            easing: String(t.easing).slice(0, 40),
            inicio: Math.round(Number(a.startTime)),
            estado: a.playState,
            kf,
          };
        }),
      };
    });
  };
};

async function entrar(page) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  const email = page.getByLabel(/e-?mail/i).first();
  if (await email.waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false)) {
    await email.fill(EMAIL);
    await page.getByLabel(/senha|password/i).first().fill(PASSWORD);
    await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
    await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('sb-')), undefined, {
      timeout: 10000,
    });
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
await page.addInitScript(DUMP);
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

try {
  await entrar(page);
  await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  console.log('\n########## ABA DASHBOARD — 1,0s após a carga ##########');
  console.log(await page.evaluate(() => window.__dump(3)));
  await page.waitForTimeout(2000);
  console.log('\n########## ABA DASHBOARD — 3,0s após a carga (assentado) ##########');
  console.log(await page.evaluate(() => window.__dump(2)));

  await page.getByRole('tab', { name: /^kanban$/i }).click();
  await page.waitForTimeout(900);
  console.log('\n########## KANBAN — 0,9s após o clique ##########');
  console.log(await page.evaluate(() => window.__dump(3)));
  await page.waitForTimeout(2200);
  console.log('\n########## KANBAN — 3,1s após o clique (assentado) ##########');
  console.log(await page.evaluate(() => window.__dump(2)));
} catch (err) {
  console.log('ERROR:', err && err.message);
  appendFileSync(LOG, String((err && err.stack) || err) + '\n');
  process.exitCode = 1;
} finally {
  await browser.close();
}
