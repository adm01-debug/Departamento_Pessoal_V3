/** TEMPORÁRIO — validação do redesign compacto do detalhe do curso. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const OUT = 'tmp-redesign-curso';
mkdirSync(OUT, { recursive: true });
const rel = { dimensoes: [], conteudo: null, animacao: null, fechamento: null, scroll: null };

const browser = await chromium.launch({ args: ['--disable-frame-rate-limit'] });

async function abrir(page) {
  await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2700);
  await page.getByRole('tab', { name: 'Catálogo' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Ver curso/ }).first().click();
  await page.waitForTimeout(2100);
}

try {
  // dimensões + conteúdo + screenshots
  for (const [w, h] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1024, 768],
    [768, 1024],
    [390, 844],
  ]) {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: w, height: h } });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await abrir(page);
    const med = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      const r = d.getBoundingClientRect();
      const dt = Array.from(d.querySelectorAll('dt')).map((el) => el.textContent?.trim());
      const dd = Array.from(d.querySelectorAll('dd')).map((el) => el.textContent?.trim());
      const avatares = d.querySelectorAll('.rounded-full img, .rounded-full[title]').length;
      const badgeContagem = Array.from(d.querySelectorAll('span[title]')).map((s) => s.textContent?.trim());
      const cols = getComputedStyle(d.querySelector('dl')).gridTemplateColumns;
      return {
        largura: +r.width.toFixed(1),
        altura: +r.height.toFixed(1),
        left: +r.left.toFixed(1),
        right: +r.right.toFixed(1),
        top: +r.top.toFixed(1),
        bottom: +r.bottom.toFixed(1),
        centralizado: Math.abs(r.left - (innerWidth - r.right)) <= 1,
        dentroViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        maxHeightRespeitado: r.height <= innerHeight * 0.9 + 1,
        overflowInternoX: d.scrollWidth > d.clientWidth + 1,
        scrollInternoY: d.scrollHeight > d.clientHeight + 1,
        titulo: d.querySelector('h2')?.textContent?.trim(),
        descricao: d.querySelector('p')?.textContent?.trim(),
        badges: Array.from(d.querySelectorAll('span')).map((s) => s.textContent?.trim()).filter((t) => t === 'Obrigatório' || t === 'Opcional' || t === 'Desenvolvimento Pessoal'),
        labels: dt,
        valores: dd,
        colunasMetadados: cols,
        avatares,
        badgeContagem,
        textoParticipantes: Array.from(d.querySelectorAll('p')).map((p) => p.textContent?.trim()).find((t) => t?.includes('participante')),
      };
    });
    rel.dimensoes.push({ viewport: `${w}x${h}`, ...med });
    await page.screenshot({ path: `${OUT}/curso-${w}x${h}.png` });
    await context.close();
  }

  // dark
  {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => {
      localStorage.setItem('dp-tour-completed', 'true');
      localStorage.setItem('ui-theme', 'dark');
    });
    const page = await context.newPage();
    await abrir(page);
    await page.screenshot({ path: `${OUT}/curso-dark-1440x900.png` });
    await context.close();
  }

  // animação + fechamento + scroll
  {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2700);
    await page.getByRole('tab', { name: 'Catálogo' }).click();
    await page.waitForTimeout(900);
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
                .map((el) => ({ texto: (el.textContent || '').trim().slice(0, 26), o: +getComputedStyle(el).opacity }))
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
    await page.getByRole('button', { name: /^Ver curso/ }).first().click();
    await page.waitForTimeout(2600);
    const frames = await page.evaluate(() => {
      cancelAnimationFrame(window.__rec.raf);
      return window.__rec.frames;
    });
    const esc = (t) => {
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
      if (frames.slice(i).every((f) => { const s = esc(f.transform); return s.x >= 0.985 && s.y >= 0.985; })) {
        aberto = frames[i].t;
        break;
      }
    }
    let overlay = null;
    for (let i = 0; i < frames.length; i += 1) {
      if (frames.slice(i).every((f) => (f.overlay ?? 1) >= 0.975)) {
        overlay = frames[i].t;
        break;
      }
    }
    const nomes = frames.find((f) => f.itens.length)?.itens.map((i) => i.texto) ?? [];
    const inicios = nomes.map((texto, idx) => {
      const f = frames.find((x) => (x.itens[idx]?.o ?? 0) > 0.03);
      return { bloco: texto, inicioMs: f ? f.t : null };
    });
    rel.animacao = { abertoEmMs: aberto, overlayEmMs: overlay, escalaInicial: esc(frames[0]?.transform), blocos: inicios };

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
    await page.waitForTimeout(1500);
    const fc = await page.evaluate(() => {
      cancelAnimationFrame(window.__closeRec.raf);
      return window.__closeRec.frames;
    });
    const sumiu = fc.find((f, i) => !f.presente && i > 0 && fc[i - 1].presente);
    rel.fechamento = {
      desmontouEmMs: sumiu ? sumiu.t : null,
      foco: await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 30)),
      abertos: await page.locator('[role="dialog"]').count(),
    };

    // reabrir e fechar pelo X, garantindo as duas formas
    await page.getByRole('button', { name: /^Ver curso/ }).first().click();
    await page.waitForTimeout(1600);
    await page.locator('[role="dialog"] button:has(svg.lucide-x)').last().click();
    await page.waitForTimeout(1500);
    rel.fechamento.xFecha = (await page.locator('[role="dialog"]').count()) === 0;
    await context.close();
  }

  // scroll interno (altura curta)
  {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 390, height: 560 } });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await abrir(page);
    rel.scroll = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      const antes = d.scrollTop;
      d.scrollTop = d.scrollHeight;
      return {
        temScroll: d.scrollHeight > d.clientHeight + 1,
        scrollHeight: d.scrollHeight,
        clientHeight: d.clientHeight,
        antes,
        depois: d.scrollTop,
        overflowX: d.scrollWidth > d.clientWidth + 1,
      };
    });
    await page.screenshot({ path: `${OUT}/curso-scroll-390x560.png` });
    await context.close();
  }
} catch (erro) {
  rel.erro = String(erro?.stack ?? erro).slice(0, 1500);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(rel, null, 2));
  console.log(JSON.stringify(rel, null, 2).slice(0, 18000));
}
