/**
 * VALIDAÇÃO TEMPORAL (temporária) — compara, no navegador, a animação de
 * abertura/fechamento do modal "Pendências" (referência) com TODAS as janelas
 * reais do módulo Treinamentos.
 *
 * Não é um teste do produto: é um instrumento de medição para a entrega.
 * Uso: node scripts/_tmp-validar-animacao-treinamentos.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const OUT = 'tmp-validacao-treinamentos';
mkdirSync(`${OUT}/videos`, { recursive: true });

const relatorio = { referencia: null, janelas: [], interacoes: {}, responsividade: [], reducedMotion: null };

const browser = await chromium.launch({ args: ['--disable-frame-rate-limit'] });

const INSTALAR_GRAVADOR = (iniciarAgora) => {
  window.__rec = { t0: iniciarAgora ? performance.now() : 0, frames: [], raf: 0 };
  const tick = () => {
    const c = document.querySelector('[role="dialog"][data-state], [role="alertdialog"][data-state]');
    const o = Array.from(document.querySelectorAll('.backdrop-blur-sm')).find(
      (el) => getComputedStyle(el).position === 'fixed' && String(el.className).includes('inset-0')
    );
    const agora = performance.now();
    if (!window.__rec.t0 && c) window.__rec.t0 = agora;
    if (window.__rec.t0) {
      const cs = c ? getComputedStyle(c) : null;
      const container = c ? c.querySelector(':scope > div') : null;
      const itens = container
        ? Array.from(container.children)
            .slice(0, 8)
            .map((el) => +getComputedStyle(el).opacity)
        : [];
      window.__rec.frames.push({
        t: Math.round(agora - window.__rec.t0),
        presente: !!c,
        transform: cs ? cs.transform : null,
        opacity: cs ? +cs.opacity : null,
        overlay: o ? +getComputedStyle(o).opacity : null,
        itens,
        animacaoCss: cs ? cs.animationName : null,
      });
    }
    window.__rec.raf = requestAnimationFrame(tick);
  };
  tick();
};

const LER_GRAVADOR = () => {
  if (!window.__rec) return [];
  cancelAnimationFrame(window.__rec.raf);
  return window.__rec.frames;
};

function escala(transform) {
  if (!transform || transform === 'none') return { x: 1, y: 1 };
  const m = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
  if (!m) return { x: 1, y: 1 };
  const v = m[1].split(',').map(Number);
  if (v.length === 6) return { x: Math.hypot(v[0], v[1]), y: Math.hypot(v[2], v[3]) };
  return { x: Math.hypot(v[0], v[1]), y: Math.hypot(v[4], v[5]) };
}

function resumoAbertura(frames) {
  const presentes = frames.filter((f) => f.presente);
  if (!presentes.length) return { erro: 'diálogo não apareceu' };
  const primeiro = presentes[0];
  const e0 = escala(primeiro.transform);
  let abertoEm = null;
  let overlayEm = null;
  for (let i = 0; i < presentes.length; i += 1) {
    const f = presentes[i];
    const resto = presentes.slice(i);
    if (abertoEm === null && resto.every((x) => { const s = escala(x.transform); return s.x >= 0.985 && s.y >= 0.985; }))
      abertoEm = f.t;
    if (overlayEm === null && resto.every((x) => (x.overlay ?? 1) >= 0.975)) overlayEm = f.t;
    if (abertoEm !== null && overlayEm !== null) break;
  }
  const itemStart = [];
  for (let idx = 0; idx < (primeiro.itens?.length ?? 0); idx += 1) {
    const f = presentes.find((x) => (x.itens[idx] ?? 0) > 0.03);
    itemStart.push(f ? f.t : null);
  }
  return {
    escalaInicial: { x: +e0.x.toFixed(3), y: +e0.y.toFixed(3) },
    abertoEmMs: abertoEm,
    overlayEmMs: overlayEm,
    animacaoCss: primeiro.animacaoCss,
    itens: itemStart,
    amostras: presentes.length,
    frames: presentes.filter((_, i) => i % 4 === 0).map((f) => ({ t: f.t, x: +escala(f.transform).x.toFixed(3), y: +escala(f.transform).y.toFixed(3), o: f.opacity, ov: f.overlay, it: f.itens })),
  };
}

function resumoFechamento(frames) {
  const presentes = frames.filter((f) => f.presente);
  const ultimoPresente = [...frames].reverse().find((f) => f.presente);
  const sumiu = frames.find((f, i) => !f.presente && i > 0 && frames[i - 1].presente);
  const encolheu = presentes.find((f) => { const e = escala(f.transform); return e.x < 0.97 || e.y < 0.97; });
  const overlaySumiu = [...frames].reverse().find((f) => f.overlay !== null && (f.overlay ?? 1) > 0.02);
  return {
    desmontouEmMs: sumiu ? sumiu.t : null,
    ultimoFrameVisivelMs: ultimoPresente ? ultimoPresente.t : null,
    comecouEncolherMs: encolheu ? encolheu.t : null,
    overlayAteMs: overlaySumiu ? overlaySumiu.t : null,
    frames: frames.filter((_, i) => i % 4 === 0).map((f) => ({ t: f.t, presente: f.presente, x: +escala(f.transform).x.toFixed(3), y: +escala(f.transform).y.toFixed(3), ov: f.overlay })),
  };
}

async function novaPagina({ reduced = false, video = false } = {}) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1440, height: 900 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    ...(video ? { recordVideo: { dir: `${OUT}/videos`, size: { width: 1440, height: 900 } } } : {}),
  });
  await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
  if (reduced) await context.addInitScript(() => localStorage.setItem('dp-force-motion', 'off'));
  const page = await context.newPage();
  return { context, page };
}

async function irParaTreinamentos(page, aba) {
  await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  if (aba) {
    await page.getByRole('tab', { name: aba }).click();
    await page.waitForTimeout(900);
  }
}

async function medirAbertura(page, abrir, { fechar = 'x', espera = 1600 } = {}) {
  await page.evaluate(INSTALAR_GRAVADOR, false);
  await abrir();
  await page.waitForTimeout(espera);
  const frames = await page.evaluate(LER_GRAVADOR);
  const resumo = resumoAbertura(frames);
  if (fechar) {
    await page.evaluate(INSTALAR_GRAVADOR, true);
    if (fechar === 'x') await page.locator('[role="dialog"] button:has(svg.lucide-x), [role="alertdialog"] button:has(svg.lucide-x)').last().click();
    else if (fechar === 'esc') await page.keyboard.press('Escape');
    else if (fechar === 'backdrop') await page.mouse.click(8, 8);
    await page.waitForTimeout(1500);
    resumo.fechamento = resumoFechamento(await page.evaluate(LER_GRAVADOR));
  }
  return resumo;
}

async function abrirPendencias(page) {
  await page.goto(`${BASE}/colaboradores`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2400);
  const linhas = await page.getByRole('row').count();
  for (let i = 1; i < Math.min(linhas, 6); i += 1) {
    await page.getByRole('row').nth(i).click().catch(() => {});
    await page.waitForTimeout(1800);
    if (/\/colaboradores\/[0-9a-z-]{6,}/i.test(page.url())) break;
  }
  await page.waitForTimeout(1200);
}

async function fecharTudo(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(1300);
}

const tela = async (page, nome) => page.screenshot({ path: `${OUT}/${nome}.png` });

try {
  const secoes = [];
  relatorio.secoes = secoes;
  const secao = async (nome, fn) => {
    try {
      await fn();
      secoes.push({ nome, ok: true });
    } catch (e) {
      secoes.push({ nome, ok: false, erro: String(e?.message ?? e).slice(0, 400) });
    }
  };

  // ---------- REFERÊNCIA: Pendências ----------
  await secao('Pendências (referência)', async () => {
    const { context, page } = await novaPagina({ video: true });
    await abrirPendencias(page);
    relatorio.referencia = await medirAbertura(page, () => page.getByRole('button', { name: 'Ver todas' }).first().click(), { fechar: 'esc', espera: 1800 });
    await tela(page, 'ref-pendencias-aberto');
    relatorio.referencia.titulo = await page.getByRole('dialog').last().innerText().then((t) => t.split('\n')[0]).catch(() => null);
    await context.close();
  });

  // ---------- 1. TREINAMENTOS ----------
  await secao('Treinamentos', async () => {
    const { context, page } = await novaPagina();
    await irParaTreinamentos(page, 'Treinamentos');
    relatorio.janelas.push({
      aba: 'Treinamentos',
      janela: 'Novo Treinamento',
      ...(await medirAbertura(page, () => page.getByRole('button', { name: 'Novo Treinamento', exact: true }).click(), { fechar: 'x' })),
    });
    await tela(page, 'treinamentos-novo');
    await fecharTudo(page);

    const resultados = [];
    for (let i = 0; i < 5; i += 1) {
      await page.getByRole('button', { name: 'Novo Treinamento', exact: true }).click();
      await page.waitForTimeout(1400);
      const aberto = await page.locator('[role="dialog"]').count();
      await page.locator('[role="dialog"] button:has(svg.lucide-x)').last().click();
      await page.waitForTimeout(1400);
      const restante = await page.locator('[role="dialog"]').count();
      resultados.push({ aberto, restante });
    }
    await page.getByRole('button', { name: 'Novo Treinamento', exact: true }).click();
    await page.waitForTimeout(1500);
    await page.locator('[role="dialog"] input').first().fill('Teste de digitacao sem reiniciar');
    await page.evaluate(INSTALAR_GRAVADOR, true);
    await page.waitForTimeout(700);
    const digitando = await page.evaluate(LER_GRAVADOR);
    const escalasDigitando = digitando.map((f) => escala(f.transform));
    const valor = await page.locator('[role="dialog"] input').first().inputValue();
    relatorio.interacoes.repeticaoNovoTreinamento = resultados;
    relatorio.interacoes.digitacao = {
      valorPreservado: valor,
      escalaEstavel: escalasDigitando.every((e) => e.x > 0.99 && e.y > 0.99),
      opacidadeEstavel: digitando.every((f) => f.opacity === null || f.opacity > 0.99),
      frames: digitando.length,
    };
    await page.locator('[role="dialog"] button:has(svg.lucide-x)').last().click();
    await page.waitForTimeout(1400);
    relatorio.interacoes.focoAposFechar = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40) ?? null);
    await context.close();
  });

  // ---------- 2. CATÁLOGO ----------
  await secao('Catálogo', async () => {
    const { context, page } = await novaPagina();
    await irParaTreinamentos(page, 'Catálogo');
    relatorio.janelas.push({
      aba: 'Catálogo',
      janela: 'Ver curso',
      ...(await medirAbertura(page, () => page.getByRole('button', { name: /^Ver curso/ }).first().click(), { fechar: 'x' })),
    });
    await tela(page, 'catalogo-ver-curso');
    await fecharTudo(page);
    relatorio.janelas.push({
      aba: 'Catálogo',
      janela: 'Novo Curso',
      ...(await medirAbertura(page, () => page.getByRole('button', { name: 'Novo Curso', exact: true }).click(), { fechar: 'esc' })),
    });
    await fecharTudo(page);
    await page.getByRole('button', { name: /^Ações do curso / }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('menuitem', { name: /Excluir curso/ }).click();
    await page.waitForTimeout(1400);
    const alerta = await page.locator('[role="alertdialog"]').count();
    await tela(page, 'catalogo-excluir-curso');
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.waitForTimeout(1400);
    relatorio.janelas.push({ aba: 'Catálogo', janela: 'Confirmação Excluir Curso', alertDialog: alerta, fechou: (await page.locator('[role="alertdialog"]').count()) === 0 });
    await context.close();
  });

  // ---------- 3. TRILHAS ----------
  await secao('Trilhas', async () => {
    const { context, page } = await novaPagina();
    await irParaTreinamentos(page, 'Trilhas');
    relatorio.janelas.push({
      aba: 'Trilhas',
      janela: 'Nova Trilha',
      ...(await medirAbertura(page, () => page.getByRole('button', { name: 'Nova Trilha', exact: true }).first().click(), { fechar: 'x' })),
    });
    await fecharTudo(page);
    relatorio.janelas.push({
      aba: 'Trilhas',
      janela: 'Visualização/Edição da Trilha',
      ...(await medirAbertura(page, () => page.getByRole('button', { name: 'Explorar trilha', exact: true }).first().click(), { fechar: 'esc' })),
    });
    await tela(page, 'trilhas-explorar');
    await fecharTudo(page);
    await context.close();
  });

  // ---------- 4. INSCRIÇÕES ----------
  await secao('Inscrições', async () => {
    const { context, page } = await novaPagina();
    await irParaTreinamentos(page, 'Inscrições');
    relatorio.janelas.push({
      aba: 'Inscrições',
      janela: 'Nova Inscrição',
      ...(await medirAbertura(page, () => page.getByRole('button', { name: 'Nova Inscrição', exact: true }).first().click(), { fechar: 'esc' })),
    });
    await tela(page, 'inscricoes-nova');
    await fecharTudo(page);
    const verCert = page.getByRole('button', { name: 'Certificado', exact: true }).first();
    if (await verCert.isVisible().catch(() => false)) {
      relatorio.janelas.push({
        aba: 'Inscrições',
        janela: 'Prévia de certificado (a partir da inscrição)',
        ...(await medirAbertura(page, () => verCert.click(), { fechar: 'x' })),
      });
      await fecharTudo(page);
    }
    await context.close();
  });

  // ---------- 5. TURMAS ----------
  await secao('Turmas / Instâncias', async () => {
    const { context, page } = await novaPagina();
    await irParaTreinamentos(page, 'Turmas / Instâncias');
    relatorio.janelas.push({
      aba: 'Turmas / Instâncias',
      janela: 'Ver Turma',
      ...(await medirAbertura(page, () => page.getByRole('button', { name: /^Ver turma/ }).first().click(), { fechar: 'x' })),
    });
    await tela(page, 'turmas-ver');
    await fecharTudo(page);
    const novaTurma = page.getByRole('button', { name: 'Nova Turma', exact: true }).first();
    if (await novaTurma.isVisible().catch(() => false)) {
      relatorio.janelas.push({
        aba: 'Turmas / Instâncias',
        janela: 'Nova Turma',
        ...(await medirAbertura(page, () => novaTurma.click(), { fechar: 'esc' })),
      });
      await tela(page, 'turmas-nova');
      await fecharTudo(page);
    }
    await context.close();
  });

  // ---------- 6. CERTIFICADOS ----------
  await secao('Certificados', async () => {
    const { context, page } = await novaPagina();
    await irParaTreinamentos(page, 'Certificados');
    relatorio.janelas.push({
      aba: 'Certificados',
      janela: 'Prévia do Certificado',
      ...(await medirAbertura(page, () => page.getByRole('button', { name: /^Visualizar certificado/ }).first().click(), { fechar: 'x' })),
    });
    await tela(page, 'certificados-previa');
    await fecharTudo(page);
    const rep = [];
    for (let i = 0; i < 5; i += 1) {
      await page.getByRole('button', { name: /^Visualizar certificado/ }).first().click();
      await page.waitForTimeout(1300);
      rep.push(await page.locator('[role="dialog"]').count());
      await page.locator('[role="dialog"] button:has(svg.lucide-x)').last().click();
      await page.waitForTimeout(1200);
      rep.push(await page.locator('[role="dialog"]').count());
    }
    relatorio.interacoes.repeticaoCertificado = rep;
    await context.close();
  });

  // ---------- RESPONSIVIDADE ----------
  await secao('Responsividade', async () => {
  const tamanhos = [
    [1920, 1080], [1600, 900], [1440, 900], [1366, 768], [1280, 800], [1024, 768], [768, 1024], [390, 844],
  ];
  for (const [w, h] of tamanhos) {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
      viewport: { width: w, height: h },
      reducedMotion: 'no-preference',
    });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2400);
    const btn = page.getByRole('button', { name: 'Novo Treinamento', exact: true });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1500);
      const med = await page.evaluate(() => {
        const c = document.querySelector('[role="dialog"]');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return {
          dentro: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
          overflowX: document.documentElement.scrollWidth > innerWidth,
          largura: Math.round(r.width),
          altura: Math.round(r.height),
          scrollInterno: c.scrollHeight > c.clientHeight,
        };
      });
      relatorio.responsividade.push({ viewport: `${w}x${h}`, ...med });
      await page.screenshot({ path: `${OUT}/responsivo-${w}x${h}.png` });
      await page.keyboard.press('Escape');
    }
    await context.close();
  }
  });

  // ---------- MOVIMENTO REDUZIDO ----------
  await secao('Movimento reduzido', async () => {
    const { context, page } = await novaPagina({ reduced: true });
    await irParaTreinamentos(page, 'Treinamentos');
    const resumo = await medirAbertura(page, () => page.getByRole('button', { name: 'Novo Treinamento', exact: true }).click(), { fechar: null });
    const visivel = await page.evaluate(() => {
      const c = document.querySelector('[role="dialog"]');
      if (!c) return null;
      const conteudo = c.querySelector(':scope > div');
      return {
        opacidadeConteudo: conteudo ? +getComputedStyle(conteudo).opacity : null,
        opacidadeShell: +getComputedStyle(c).opacity,
        itens: conteudo ? Array.from(conteudo.children).map((el) => +getComputedStyle(el).opacity) : [],
      };
    });
    relatorio.reducedMotion = { ...resumo, ...visivel };
    await tela(page, 'reduced-motion');
    await context.close();
  });
} catch (erro) {
  relatorio.erro = String(erro?.stack ?? erro).slice(0, 2000);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio-animacao.json`, JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2).slice(0, 20000));
}
