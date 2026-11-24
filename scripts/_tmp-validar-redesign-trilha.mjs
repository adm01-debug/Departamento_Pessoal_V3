/** TEMPORÁRIO — validação visual/temporal do redesign do modal de trilha. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const OUT = 'tmp-redesign-trilha';
mkdirSync(OUT, { recursive: true });

const rel = {};
const browser = await chromium.launch({ args: ['--disable-frame-rate-limit'] });

async function abrirModal(page, indice = 0) {
  await page.getByRole('button', { name: 'Explorar trilha', exact: true }).nth(indice).click();
  await page.waitForTimeout(2200);
}

try {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
  const page = await context.newPage();
  await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);
  await page.getByRole('tab', { name: 'Trilhas' }).click();
  await page.waitForTimeout(1000);

  await abrirModal(page);
  await page.screenshot({ path: `${OUT}/depois-1440.png` });

  rel.conteudo = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    const texto = (sel) => Array.from(d.querySelectorAll(sel)).map((el) => (el.textContent || '').trim());
    return {
      paragrafos: texto('p').slice(0, 12),
      pills: Array.from(d.querySelectorAll('span[title]')).map((el) => (el.textContent || '').trim()).filter(Boolean).slice(0, 6),
      numeros: Array.from(d.querySelectorAll('ol li span[aria-hidden]'))
        .map((el) => (el.textContent || '').trim())
        .filter((t) => /^\d{2}$/.test(t)),
      meta: Array.from(d.querySelectorAll('ol li p')).map((el) => (el.textContent || '').trim()),
      role: d.getAttribute('role'),
      ariaModal: d.getAttribute('aria-modal'),
      labelledby: d.getAttribute('aria-labelledby'),
      overflowX: d.scrollWidth > d.clientWidth + 1,
      overflowY: d.scrollHeight > d.clientHeight + 1,
      largura: Math.round(d.getBoundingClientRect().width),
      altura: Math.round(d.getBoundingClientRect().height),
      pillsAltura: Array.from(d.querySelectorAll('span[title]')).map((el) => Math.round(el.getBoundingClientRect().height)).slice(0, 3),
    };
  });

  const primeiroCard = page.locator('[role="dialog"] ol > li').first();
  await primeiroCard.hover();
  await page.waitForTimeout(300);
  rel.hoverRemover = await page.evaluate(() => {
    const btn = document.querySelector('[role="dialog"] ol > li button');
    return btn ? { opacidade: +getComputedStyle(btn).opacity, titulo: btn.getAttribute('title'), aria: btn.getAttribute('aria-label') } : null;
  });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    window.__rec = { t0: 0, frames: [], raf: 0 };
    const tick = () => {
      const c = document.querySelector('[role="dialog"][data-state]');
      const ov = Array.from(document.querySelectorAll('.backdrop-blur-sm')).find(
        (el) => getComputedStyle(el).position === 'fixed' && String(el.className).includes('inset-0')
      );
      const agora = performance.now();
      if (!window.__rec.t0 && c) window.__rec.t0 = agora;
      if (window.__rec.t0) {
        const itens = c
          ? Array.from(c.querySelectorAll('*'))
              .filter((el) => el.getAttribute('style')?.includes('opacity'))
              .map((el) => ({ texto: (el.textContent || '').trim().slice(0, 34), o: +getComputedStyle(el).opacity }))
          : [];
        const cs = c ? getComputedStyle(c) : null;
        window.__rec.frames.push({
          t: Math.round(agora - window.__rec.t0),
          transform: cs ? cs.transform : null,
          overlay: ov ? +getComputedStyle(ov).opacity : null,
          itens,
        });
      }
      window.__rec.raf = requestAnimationFrame(tick);
    };
    tick();
  });
  await page.getByRole('button', { name: 'Explorar trilha', exact: true }).first().click();
  await page.waitForTimeout(2600);
  const frames = await page.evaluate(() => {
    cancelAnimationFrame(window.__rec.raf);
    return window.__rec.frames;
  });

  const escala = (t) => {
    if (!t || t === 'none') return { x: 1, y: 1 };
    const m = t.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (!m) return { x: 1, y: 1 };
    const v = m[1].split(',').map(Number);
    return v.length === 6
      ? { x: Math.hypot(v[0], v[1]), y: Math.hypot(v[2], v[3]) }
      : { x: Math.hypot(v[0], v[1]), y: Math.hypot(v[4], v[5]) };
  };
  let aberto = null;
  for (let i = 0; i < frames.length; i += 1) {
    if (frames.slice(i).every((f) => { const s = escala(f.transform); return s.x >= 0.985 && s.y >= 0.985; })) {
      aberto = frames[i].t;
      break;
    }
  }
  let overlayEm = null;
  for (let i = 0; i < frames.length; i += 1) {
    if (frames.slice(i).every((f) => (f.overlay ?? 1) >= 0.975)) {
      overlayEm = frames[i].t;
      break;
    }
  }
  const inicios = [];
  const nomes = frames.find((f) => f.itens.length)?.itens.map((i) => i.texto) ?? [];
  nomes.forEach((texto, idx) => {
    const f = frames.find((x) => (x.itens[idx]?.o ?? 0) > 0.03);
    inicios.push({ bloco: texto, inicioMs: f ? f.t : null });
  });
  rel.animacao = { abertoEmMs: aberto, overlayEmMs: overlayEm, escalaInicial: escala(frames[0]?.transform), blocos: inicios };

  await page.evaluate(() => {
    window.__closeRec = { t0: performance.now(), frames: [], raf: 0 };
    const tick = () => {
      const c = document.querySelector('[role="dialog"][data-state]');
      window.__closeRec.frames.push({ t: Math.round(performance.now() - window.__closeRec.t0), presente: !!c });
      window.__closeRec.raf = requestAnimationFrame(tick);
    };
    tick();
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2000);
  const fechamento = await page.evaluate(() => {
    cancelAnimationFrame(window.__closeRec.raf);
    return window.__closeRec.frames;
  });
  const sumiu = fechamento.find((f, i) => !f.presente && i > 0 && fechamento[i - 1].presente);
  rel.fechamento = {
    desmontouEmMs: sumiu ? sumiu.t : null,
    foco: await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40) ?? null),
    abertos: await page.locator('[role="dialog"]').count(),
  };

  await abrirModal(page);
  await page.getByRole('button', { name: 'Adicionar curso', exact: true }).click();
  await page.waitForTimeout(1500);
  rel.adicionar = {
    dialogos: await page.locator('[role="dialog"]').count(),
    titulo: await page.getByRole('dialog').last().innerText().then((t) => t.split('\n')[0]),
  };
  await page.screenshot({ path: `${OUT}/adicionar-curso.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1600);
  rel.adicionar.dialogosAposEscape = await page.locator('[role="dialog"]').count();

  await page.locator('[role="dialog"] ol > li').first().hover();
  await page.waitForTimeout(300);
  await page.locator('[role="dialog"] ol > li button').first().click();
  await page.waitForTimeout(900);
  rel.remover = {
    dialogoAindaAberto: (await page.locator('[role="dialog"]').count()) === 1,
    toast: await page.locator('[data-sonner-toast]').first().innerText().catch(() => null),
    cursosNaTimeline: await page.locator('[role="dialog"] ol > li').count(),
  };

  await page.keyboard.press('Escape');
  await page.waitForTimeout(1600);
  await context.close();
} catch (erro) {
  rel.erro = String(erro?.stack ?? erro).slice(0, 1500);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(rel, null, 2));
  console.log(JSON.stringify(rel, null, 2).slice(0, 18000));
}
