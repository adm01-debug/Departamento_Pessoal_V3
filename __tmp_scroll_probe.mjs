/**
 * PROBE TEMPORÁRIO (não versionar) — mede no navegador REAL o scroll interno dos
 * três widgets do Dashboard de Admissões:
 *   "Ações Prioritárias", "Próximas Admissões" e "SLA & Alertas".
 *
 * Prova, com números medidos (não com classe no DOM):
 *   • scrollbar VISÍVEL  → offsetWidth - clientWidth > 0 (barra clássica ocupa layout)
 *   • conteúdo oculto    → scrollHeight > clientHeight
 *   • roda do mouse      → scrollTop muda depois de page.mouse.wheel
 *   • tamanho do card    → boundingBox dos 4 widgets antes/depois (não pode mudar)
 *
 * Uso: node __tmp_scroll_probe.mjs <label>
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';
const LABEL = process.argv[2] ?? 'probe';
// `headed` → sem o arg `--hide-scrollbars` que o Playwright injeta em headless:
// é a única forma de a barra de rolagem REAL aparecer no screenshot e de
// `offsetWidth - clientWidth` medir a largura que ela ocupa no layout.
const HEADED = process.argv[3] === 'headed';
const VW = Number(process.env.PROBE_W ?? 1600);
const VH = Number(process.env.PROBE_H ?? 1000);
const OUT_DIR = 'C:/Users/artes03/AppData/Local/Temp/dp-scroll';
const AUTH_FILE = path.resolve('e2e/.auth/user.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: !HEADED });

const state = fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined;
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, storageState: state });
const page = await ctx.newPage();

const result = { label: LABEL, auth: state ? 'storageState' : 'form', cards: {}, lists: {} };

try {
  await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Fallback: se a sessão persistida expirou, faz login pelo formulário.
  if (page.url().includes('/login')) {
    result.auth = 'form-fallback';
    const email = page.getByLabel(/e-?mail/i).first();
    await email.waitFor({ timeout: 15000 });
    await email.fill(EMAIL);
    await page.getByLabel(/senha|password/i).first().fill(PASSWORD);
    await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
    await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
    await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  }

  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));

  // Aba Dashboard já é a default; garante que o dashboard está montado.
  await page.getByText('Ações Prioritárias').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
} catch (err) {
  result.error = String(err);
  await page.screenshot({ path: `${OUT_DIR}/${LABEL}-boot-error.png` }).catch(() => {});
}

try {
  const probe = await page.evaluate(() => {
    const TITULOS = ['Ações Prioritárias', 'Próximas Admissões', 'Distribuição por Área', 'SLA & Alertas'];

    /** Sobe do título até o casco do card (rounded-2xl + overflow-hidden). */
    const cascoDoCard = (titulo) => {
      const nodes = [...document.querySelectorAll('h3')];
      const alvo = nodes.find((n) => n.textContent.trim() === titulo);
      if (!alvo) return null;
      let node = alvo;
      while (node && node !== document.body) {
        const c = typeof node.className === 'string' ? node.className : '';
        if (c.includes('overflow-hidden') && c.includes('rounded-2xl')) return node;
        node = node.parentElement;
      }
      return null;
    };

    const geometria = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
        offsetHeight: el.offsetHeight,
        class: typeof el.className === 'string' ? el.className : '',
      };
    };

    const cards = {};
    for (const titulo of TITULOS) {
      const casco = cascoDoCard(titulo);
      const header = casco?.querySelector(':scope > div');
      const content = casco?.querySelector(':scope > div:last-child');
      cards[titulo] = {
        casco: geometria(casco),
        headerHeight: header?.offsetHeight ?? null,
        contentHeight: content?.offsetHeight ?? null,
      };
    }

    const lists = {};
    for (const titulo of ['Ações Prioritárias', 'Próximas Admissões', 'SLA & Alertas']) {
      const lista = cascoDoCard(titulo)?.querySelector('.scroll-interno');
      if (!lista) {
        lists[titulo] = { found: false };
        continue;
      }
      const r = lista.getBoundingClientRect();
      const pai = lista.parentElement;
      const pr = pai?.getBoundingClientRect();
      const linha = lista.querySelector(':scope > div, :scope > *');
      const lr = linha?.getBoundingClientRect();
      const rodape = [...lista.querySelectorAll('div')].find((d) => d.textContent.includes('Taxa de conclusão'));
      const rr = rodape?.getBoundingClientRect();
      lists[titulo] = {
        found: true,
        class: lista.className,
        clientHeight: lista.clientHeight,
        scrollHeight: lista.scrollHeight,
        hiddenPx: lista.scrollHeight - lista.clientHeight,
        scrollbarWidthPx: lista.offsetWidth - lista.clientWidth,
        offsetWidth: lista.offsetWidth,
        clientWidth: lista.clientWidth,
        overflowY: getComputedStyle(lista).overflowY,
        rect: { top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) },
        pai: pai ? { offsetWidth: pai.offsetWidth, clientWidth: pai.clientWidth, right: Math.round(pr.right), left: Math.round(pr.left) } : null,
        primeiraLinha: lr ? { left: Math.round(lr.left), right: Math.round(lr.right) } : null,
        rodapeRect: rr ? { left: Math.round(rr.left), right: Math.round(rr.right), height: Math.round(rr.height) } : null,
        itens: [...lista.children].map((f) => Math.round(f.getBoundingClientRect().height)),
        temRodape: lista.textContent.includes('Taxa de conclusão'),
        scrollbarWidthCss: getComputedStyle(lista).getPropertyValue('scrollbar-width'),
        scrollbarColorCss: getComputedStyle(lista).getPropertyValue('scrollbar-color'),
      };
    }

    const grid = cascoDoCard('Ações Prioritárias')?.parentElement;
    const gr = grid?.getBoundingClientRect();
    const clip = gr
      ? {
          x: Math.max(0, Math.round(gr.left)),
          y: Math.max(0, Math.round(gr.top)),
          width: Math.round(gr.width),
          height: Math.round(gr.height),
        }
      : null;

    return { cards, lists, clip };
  });

  result.cards = probe.cards;
  result.lists = probe.lists;
  result.clip = probe.clip;

  if (probe.clip && probe.clip.height > 0) {
    // Em telas estreitas a faixa dos widgets fica abaixo da viewport: o clip
    // falha e não deve derrubar a coleta de medidas.
    await page.screenshot({ path: `${OUT_DIR}/${LABEL}-widgets.png`, clip: probe.clip }).catch(() => {});
  }
  // Um PNG por card (312×256) e um recorte ampliado da faixa da barra: é neles
  // que a barra de rolagem tem de aparecer antes de qualquer hover/roda.
  for (const titulo of ['Ações Prioritárias', 'Próximas Admissões', 'SLA & Alertas']) {
    const cards = await page.evaluate((t) => {
      const nodes = [...document.querySelectorAll('h3')];
      const alvo = nodes.find((n) => n.textContent.trim() === t);
      let node = alvo;
      while (node && node !== document.body) {
        const c = typeof node.className === 'string' ? node.className : '';
        if (c.includes('overflow-hidden') && c.includes('rounded-2xl')) break;
        node = node.parentElement;
      }
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
    }, titulo);
    if (!cards) continue;
    const slug = titulo.replace(/[^A-Za-z]+/g, '-').toLowerCase();
    // Em telas estreitas o card está fora da viewport e o clip de um
    // screenshot não-fullPage falha: o log fica só com as medidas.
    try {
      await page.screenshot({ path: `${OUT_DIR}/${LABEL}-${slug}.png`, clip: cards });
      // Recorte ampliado de 90×160 no canto inferior direito do miolo: a barra.
      await page.screenshot({
        path: `${OUT_DIR}/${LABEL}-${slug}-barra.png`,
        clip: { x: cards.x + cards.width - 100, y: cards.y + 80, width: 90, height: 160 },
      });
    } catch {
      /* card fora da viewport: ignora o PNG, as medidas já estão no JSON */
    }
  }
  await page.screenshot({ path: `${OUT_DIR}/${LABEL}-full.png`, fullPage: false });
} catch (err) {
  result.error = String(err);
  await page.screenshot({ path: `${OUT_DIR}/${LABEL}-error.png` }).catch(() => {});
}

// Prova de scroll REAL: roda do mouse dentro de cada viewport interna.
const mapa = { 'Ações Prioritárias': 0, 'Próximas Admissões': 1, 'SLA & Alertas': 2 };
result.wheel = {};
const listas = page.locator('.scroll-interno');
result.listCount = await listas.count();
for (const [titulo, idx] of Object.entries(mapa)) {
  const el = listas.nth(idx);
  const box = await el.boundingBox().catch(() => null);
  if (!box) {
    result.wheel[titulo] = { erro: 'sem bounding box' };
    continue;
  }
  const antes = await el.evaluate((n) => n.scrollTop);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 150);
  await page.waitForTimeout(400);
  const depois = await el.evaluate((n) => n.scrollTop);
  const maxScroll = await el.evaluate((n) => n.scrollHeight - n.clientHeight);
  result.wheel[titulo] = { antes, depois, maxScroll, rolouComRoda: depois > antes };
  await el.evaluate((n) => {
    n.scrollTop = 0;
  });
}
if (result.clip && result.clip.height > 0) {
  await page
    .screenshot({ path: `${OUT_DIR}/${LABEL}-widgets-pos-roda.png`, clip: result.clip })
    .catch(() => {});
}

await browser.close();
fs.writeFileSync(`__tmp_scroll_${LABEL}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

