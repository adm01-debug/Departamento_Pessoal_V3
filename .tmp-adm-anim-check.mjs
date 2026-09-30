/**
 * TEMP — validação visual da cascata de entrada em /admissoes (Playwright + dev server :8080).
 * Não faz parte do produto: apagar depois. Grava fin-adm-*.png e imprime a ordem/atraso de entrada.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:8080';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

/** Instalado ANTES de qualquer módulo do app: amostra por frame todo nó com opacity/transform inline. */
const INSTALL_SAMPLER = () => {
  window.__startSampler = (ms = 3000, label = 'run') => {
    const t0 = performance.now();
    let counter = 0;
    let tickCount = 0;
    const frames = [];
    window.__frames = frames;
    window.__samplerLabel = label;
    const tick = () => {
      tickCount++;
      if (tickCount % 2 === 0) {
        const rows = [];
        for (const el of document.querySelectorAll('div,section,article,span')) {
          const s = el.style;
          if (s.opacity === '' && s.transform === '') continue;
          let id = el.getAttribute('data-probe');
          let x = 0;
          let y = 0;
          let text = '';
          if (!id) {
            // rect/text SÓ na primeira vez que o nó aparece: recalcular por frame
            // força layout em milhares de nós e degrada o próprio sampler (foi o
            // que embaralhou a medição anterior).
            id = 'p' + ++counter;
            el.setAttribute('data-probe', id);
            const r = el.getBoundingClientRect();
            x = Math.round(r.left);
            y = Math.round(r.top);
            text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34);
          }
          rows.push([id, s.opacity, s.transform, x, y, text]);
        }
        frames.push({ t: Math.round(performance.now() - t0), rows });
      }
      if (performance.now() - t0 < ms) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  // Roda sozinho a cada carregamento (é o que mede a cascata do load inicial).
  // Usa o amostrador estreito + computed style: o sampler por tag varria milhares
  // de nós por frame e degradava a própria medição.
  setTimeout(() => window.__startFastSampler(5000, 'auto'), 0);

  /**
   * Amostrador "por texto": segue o CARD pelo nome do candidato, não pelo nó.
   * Um card que troca de coluna é desmontado/remontado pelo React (nó novo), o
   * que invalida a identidade do `data-probe` — aqui o que importa é o card
   * lógico. Grava opacity/transform/posição por frame.
   */
  window.__startCardSampler = (name, ms, label) => {
    const t0 = performance.now();
    const out = [];
    window.__frames = out;
    window.__samplerLabel = label;
    const achaCard = () => {
      const folha = [...document.querySelectorAll('p,div,span')].find(
        (el) => el.children.length === 0 && (el.textContent || '').trim() === name
      );
      if (!folha) return null;
      let n = folha;
      while (n && !(n.className && String(n.className).includes('cursor-grab'))) n = n.parentElement;
      return n;
    };
    const tick = () => {
      const card = achaCard();
      if (card) {
        const cs = getComputedStyle(card);
        const r = card.getBoundingClientRect();
        out.push({
          t: Math.round(performance.now() - t0),
          o: cs.opacity,
          tr: cs.transform === 'none' ? 'none' : cs.transform.replace('matrix(', '').slice(0, 28),
          y: Math.round(r.top),
          drag: card.closest('[data-dnd-overlay], [role="button"]') ? 'overlay' : 'board',
        });
      } else {
        out.push({ t: Math.round(performance.now() - t0), o: 'ausente', tr: '-', y: 0, drag: '-' });
      }
      if (performance.now() - t0 < ms) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /** Histórico de um probe id (para o card que trocou de nó, o id muda — ver sampler por texto). */
  window.__probeHistory = (id) =>
    (window.__frames || []).flatMap((f) => f.rows.filter((r) => r[0] === id).map((r) => ({ t: f.t, o: r[1], tr: r[2], y: r[4] })));

  /**
   * Sampler "estreito" (setInterval, não rAF): consulta só os nós com
   * opacity/transform inline (`[style*="opacity"]`) — dezenas de nós em vez dos
   * milhares do sampler por tag. É o que mede a montagem do board, quando o
   * render do React domina a main thread e o rAF fica intermitente.
   */
  window.__startFastSampler = (ms, label) => {
    const t0 = performance.now();
    const frames = [];
    window.__frames = frames;
    window.__samplerLabel = label;
    let counter = 0;
    const id = setInterval(() => {
      const rows = [];
      const vistos = new Set();
      for (const sel of ['[style*="opacity"]', '[style*="transform"]']) {
        for (const el of document.querySelectorAll(sel)) {
          if (vistos.has(el)) continue;
          vistos.add(el);
          let pid = el.getAttribute('data-probe');
          let x = 0;
          let y = 0;
          let text = '';
          if (!pid) {
            pid = 'q' + ++counter;
            el.setAttribute('data-probe', pid);
            const r = el.getBoundingClientRect();
            x = Math.round(r.left);
            y = Math.round(r.top);
            text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34);
            // framer-motion 12 anima opacity/transform pela Web Animations API:
            // o `style` inline salta para o valor final e a interpolação vive na
            // animação nativa — por isso a leitura precisa ser do COMPUTED style.
            window.__waapi.push({ id: pid, text, n: el.getAnimations().length });
          }
          // computed: valor interpolado de fato; inline: chaveframe gravado pelo framer
          rows.push([pid, el.style.opacity, el.style.transform, x, y, text, getComputedStyle(el).opacity]);
        }
      }
      frames.push({ t: Math.round(performance.now() - t0), rows });
      if (performance.now() - t0 > ms) clearInterval(id);
    }, 10);
  };
  window.__waapi = [];
};

function summarize(frames) {
  const byId = new Map();
  for (const f of frames) {
    for (const r of f.rows) {
      const [id, o, tr, x, y, text, comp] = r;
      let e = byId.get(id);
      if (!e) {
        e = {
          id,
          text,
          x,
          y,
          seen: f.t,
          below: null,
          above: null,
          settle: null,
          firstInline: `${o}|${tr}`,
          firstComp: comp ?? '',
          ramp: [],
          last: `${o}|${tr}`,
        };
        byId.set(id, e);
      }
      // computed opacity = valor interpolado (framer 12 anima por WAAPI);
      // se o sampler não capturou computed (sampler por tag), cai no inline.
      const val = comp === '' || comp === undefined ? (o === '' ? 1 : Number(o)) : Number(comp);
      if (val < 0.98 && e.below === null) e.below = f.t;
      if (val > 0.02 && e.above === null && e.below !== null) e.above = f.t;
      if (val >= 1 && e.below !== null && e.settle === null) e.settle = f.t;
      if (e.ramp.length < 4) e.ramp.push(`${f.t}:${val}`);
      e.last = `${o}|${tr}`;
    }
  }
  return [...byId.values()].filter((e) => e.below !== null).sort((a, b) => a.below - b.below);
}

function report(label, frames, opts = {}) {
  let list = summarize(frames);
  // Cards de entrada: vistos abaixo de 0.95 (rampa) OU com o keyframe hidden
  // (translateY 20px) gravado no inline — o inline só permanece no nó que ainda
  // não começou a animar via WAAPI.
  if (opts.onlyCardRise) {
    list = list.filter((e) => Number(e.firstComp) < 0.95 || e.firstInline.includes('translateY(20px)'));
  }
  const base = list.length ? Math.min(...list.map((e) => e.above ?? Infinity)) : 0;
  console.log(
    `\n=== ${label} — ${list.length} nós${opts.onlyCardRise ? ' em animação de entrada' : ''} ===`
  );
  let lastStart = null;
  for (const e of list.slice(0, 60)) {
    const start = e.above === null ? null : e.above - base;
    const gap = start !== null && lastStart !== null ? ` (+${start - lastStart}ms)` : '';
    if (start !== null) lastStart = start;
    const dur = e.settle !== null && e.above !== null ? `dur=${e.settle - e.above}ms` : 'dur=—';
    console.log(
      `  start=${String(start ?? '—').padStart(5)}ms${gap.padEnd(12)} ${dur.padEnd(10)}  x=${String(e.x).padStart(4)} y=${String(e.y).padStart(4)}  inline0=${e.firstInline.padEnd(22)} ramp=[${e.ramp.join(' ')}] "${e.text}"`
    );
  }
  if (list.length) {
    const starts = list.map((e) => e.above).filter((v) => v !== null);
    if (starts.length) {
      console.log(
        `  → ${starts.length} cards: 1º start=${Math.min(...starts) - base}ms, último start=${Math.max(...starts) - base}ms, janela=${Math.max(...starts) - Math.min(...starts)}ms`
      );
    }
  }
  return list;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
await page.addInitScript(INSTALL_SAMPLER);
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

try {
  // ── login ──────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  if (page.url().includes('/login')) {
    const emailInput = page.getByLabel(/e-?mail/i).first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(EMAIL);
    await page.getByLabel(/senha|password/i).first().fill(PASSWORD);
    await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 25000 });
    await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  }
  console.log('URL após login:', page.url());

  // ── 1. carga completa de /admissoes (aba Dashboard) ─────────────────────────
  await page.goto(`${BASE}/admissoes`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  await page.screenshot({ path: 'fin-adm-dashboard.png' });
  report('LOAD /admissoes — aba Dashboard (sampler automático)', await page.evaluate(() => window.__frames || []), {
    onlyCardRise: true,
  });
  const waapi = await page.evaluate(() => {
    const l = window.__waapi || [];
    return { total: l.length, comAnimacao: l.filter((x) => x.n > 0).length, exemplos: l.slice(0, 5) };
  });
  console.log('Nós com animação nativa (WAAPI) no 1º avistamento:', JSON.stringify(waapi));

  const estado = await page.evaluate(() => ({
    probes: document.querySelectorAll('[data-probe]').length,
    pendentes: [...document.querySelectorAll('[data-probe]')].filter((el) => Number(el.style.opacity) < 1).length,
    paineis: [...document.querySelectorAll('[role="tabpanel"]')].map((p) => ({
      state: p.getAttribute('data-state'),
      hidden: p.hasAttribute('hidden') || getComputedStyle(p).display === 'none',
      rect: (() => {
        const r = p.getBoundingClientRect();
        return `${Math.round(r.width)}x${Math.round(r.height)}`;
      })(),
      text: (p.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
    })),
  }));
  console.log('\nDOM após o load:', JSON.stringify(estado, null, 2));

  // Diagnóstico: o board do Kanban já está montado (invisível) na carga?
  const preMontado = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[class*="cursor-grab"]')];
    return {
      cardsNoLOAD: cards.length,
      amostra: cards.slice(0, 4).map((c) => ({
        nome: (c.textContent || '').trim().split(' ').slice(0, 2).join(' '),
        inlineO: c.style.opacity,
        computado: getComputedStyle(c).opacity,
        visivel: c.offsetParent !== null,
        dentroDePainelOculto: !!c.closest('[role="tabpanel"][data-state="inactive"], [role="tabpanel"][hidden]'),
      })),
    };
  });
  console.log('Board pré-montado na carga (aba Dashboard ativa):', JSON.stringify(preMontado, null, 2));

  // ── 2. hover no 1º KPI: não pode refazer a entrada ──────────────────────────
  const primeiro = page.locator('[data-probe]').filter({ hasText: 'Total Iniciadas' }).first();
  await page.evaluate(() => window.__startFastSampler(1400, 'hover'));
  await primeiro.hover().catch(() => {});
  await page.waitForTimeout(300);
  await primeiro.hover().catch(() => {});
  await page.waitForTimeout(1200);
  report('HOVER no 1º KPI (esperado: 0 nós em entrada)', await page.evaluate(() => window.__frames || []), {
    onlyCardRise: true,
  });

  // ── 3. troca de aba → Kanban ────────────────────────────────────────────────
  await page.evaluate(() => window.__startFastSampler(3200, 'kanban'));
  await page.getByRole('tab', { name: /^kanban$/i }).click();
  await page.waitForTimeout(3400);
  await page.screenshot({ path: 'fin-adm-kanban.png' });
  report('TAB Kanban (cascade dos cards do board)', await page.evaluate(() => window.__frames || []), {
    onlyCardRise: true,
  });

  const board = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-probe][class*="cursor-grab"]')];
    const porColuna = {};
    for (const c of cards) {
      const col = c.closest('[class*="w-[260px]"]');
      const titulo = col?.querySelector('h4')?.textContent ?? '?';
      (porColuna[titulo] ||= []).push((c.textContent || '').trim().split(' ').slice(0, 2).join(' '));
    }
    return { total: cards.length, porColuna };
  });
  console.log('\nBoard renderizado:', JSON.stringify(board, null, 2));

  // ── 4. troca de aba → Onboarding ────────────────────────────────────────────
  await page.evaluate(() => window.__startFastSampler(3000, 'onboarding'));
  await page.getByRole('tab', { name: /^onboarding$/i }).click();
  await page.waitForTimeout(3200);
  await page.screenshot({ path: 'fin-adm-onboarding.png' });
  report('TAB Onboarding (cards de jornada)', await page.evaluate(() => window.__frames || []), {
    onlyCardRise: true,
  });

  // ── 5. drag de um card: o card movido NÃO pode refazer a entrada ────────────
  await page.getByRole('tab', { name: /^kanban$/i }).click();
  await page.waitForTimeout(1200);
  const MOVER = 'Patrícia Gomes Vieira'; // coluna "Solicitação"
  const DESTINO = 'Helena Cardoso Brito'; // coluna "Documentos"
  const de = await page.getByText(MOVER, { exact: false }).first().boundingBox();
  const para = await page.getByText(DESTINO, { exact: false }).first().boundingBox();
  if (de && para) {
    await page.evaluate((n) => window.__startCardSampler(n, 2200, 'drag'), MOVER);
    await page.mouse.move(de.x + de.width / 2, de.y + 10);
    await page.mouse.down();
    for (let k = 1; k <= 10; k++) {
      await page.mouse.move(
        de.x + de.width / 2 + ((para.x - de.x) * k) / 10,
        de.y + 10 + ((para.y + 120 - de.y - 10) * k) / 10
      );
      await page.waitForTimeout(40);
    }
    await page.mouse.up();
    await page.waitForTimeout(2400);
    const hist = await page.evaluate(() => window.__frames || []);
    const minimo = Math.min(...hist.filter((h) => h.drag === 'board').map((h) => Number(h.o)));
    const colunas = [...new Set(hist.filter((h) => h.drag === 'board').map((h) => h.y))].sort((a, b) => a - b);
    console.log(
      `\n=== DRAG "${MOVER}" → coluna de "${DESTINO}" (esperado: opacity 1 estável, sem subida de 20px) ===` +
        `\n  amostras: ${hist.length} | opacity mínima no board: ${minimo} | y inicial=${colunas[0]} y final=${colunas[colunas.length - 1]}` +
        `\n  frames com opacity < 0.98: ${hist.filter((h) => h.drag === 'board' && Number(h.o) < 0.98).length}`
    );
    const trilha = hist.filter((h) => h.drag === 'board').slice(0, 14);
    console.log('  primeiros frames pós-drop:', JSON.stringify(trilha));
  } else {
    console.log('\n=== DRAG: card de origem/destino não encontrado (board mudou de layout) ===');
  }
  await page.evaluate(() => window.__startFastSampler(1400, 'pos-drag'));
  await page.waitForTimeout(1600);
  report('PÓS-DRAG: nenhum card deve refazer a entrada', await page.evaluate(() => window.__frames || []), {
    onlyCardRise: true,
  });

  // ── 6. volta para a aba Dashboard: nenhuma cascata nova (painel já montado) ──
  await page.evaluate(() => window.__startFastSampler(2000, 'volta-dashboard'));
  await page.getByRole('tab', { name: /^dashboard$/i }).click();
  await page.waitForTimeout(2200);
  report('TAB Dashboard (volta — não deve reanimar)', await page.evaluate(() => window.__frames || []), {
    onlyCardRise: true,
  });

  // ── 7. filtro na aba Gestão: só a troca de lista pode animar ────────────────
  await page.getByRole('tab', { name: /gest/i }).first().click();
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.__startFastSampler(1800, 'filtro'));
  await page.getByText(/em andamento|todos/i).first().click().catch(() => {});
  await page.waitForTimeout(2000);
  report('FILTRO na aba Gestão', await page.evaluate(() => window.__frames || []), { onlyCardRise: true });
} catch (err) {
  console.error('ERROR:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
