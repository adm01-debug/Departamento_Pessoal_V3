/**
 * TEMPORÁRIO — VALIDAÇÃO REAL (Playwright/Chromium) DA CASCATA DA TRILHA.
 *
 * Cobre os critérios de aceite:
 *   1. coreografia Hoje → eventos → Ontem → ... (ordem e tempos reais medidos);
 *   2. capturas em 100/400/750/1200/1800ms e após a conclusão;
 *   3. regressões: 1ª abertura, sair/voltar da aba, reload, filtro aplicado e
 *      removido, recolher/expandir um dia, StrictMode (o app roda com
 *      StrictMode), cancelamento das animações em voo, erro no motor de
 *      animação e movimento reduzido (modo `user`, override de dev desligado).
 *
 * Uso: node scripts/_tmp-cascata-validacao.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const BASE = 'http://localhost:8080/avaliacao';
const resultado = {};

/** Contexto padrão: sessão autenticada, tema escuro, tour pulado. */
async function abrirContexto({ reducedMotion = 'no-preference', forceMotionOff = false } = {}) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1600, height: 1000 },
    reducedMotion,
  });
  await context.addInitScript(
    ({ forceMotionOff }) => {
      localStorage.setItem('ui-theme', 'dark');
      localStorage.setItem('dp-tour-completed', 'true');
      // `dp-force-motion = 'off'` faz o app voltar a respeitar a preferência do
      // SO no dev (ver src/lib/motionMode.ts) — é como se testa a acessibilidade.
      if (forceMotionOff) localStorage.setItem('dp-force-motion', 'off');
    },
    { forceMotionOff }
  );
  const page = await context.newPage();
  const erros = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text().slice(0, 140)));
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message.slice(0, 140)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });
  return { context, page, erros };
}

/** Instala o amostrador de quadros (opacity + translateY de TODOS os itens). */
const instalarAmostrador = (page) =>
  page.evaluate(() => {
    window.__amostra = { frames: [], rotulos: [], parado: false };
    const ler = (el) => {
      const s = getComputedStyle(el);
      const m = s.transform.match(/matrix\(([^)]+)\)/);
      return { o: +(+s.opacity).toFixed(3), ty: m ? +(Number(m[1].split(',')[5]) || 0).toFixed(1) : 0 };
    };
    const tick = () => {
      const alvos = [...document.querySelectorAll('[data-cascata-cabecalho], [data-cascata-evento]')];
      if (alvos.length) {
        if (window.__amostra.rotulos.length === 0) {
          window.__amostra.rotulos = alvos.map((el) =>
            el.hasAttribute('data-cascata-cabecalho')
              ? `cab:${el.getAttribute('data-cascata-cabecalho')}`
              : `evt:${el.getAttribute('data-cascata-evento')}`
          );
        }
        window.__amostra.frames.push({ t: performance.now(), v: alvos.map(ler) });
      }
      if (!window.__amostra.parado) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

/** Índice do 1º quadro com opacity>0.01 / >=0.99 e o maior deslocamento. */
const coletar = (page) =>
  page.evaluate(() => {
    const { frames, rotulos } = window.__amostra;
    const t0 = frames.length ? frames[0].t : 0;
    const inicio = [];
    const fim = [];
    const pico = [];
    const minO = [];
    frames.forEach((f) => {
      f.v.forEach((v, j) => {
        if (v.o > 0.01 && inicio[j] === undefined) inicio[j] = Math.round(f.t - t0);
        if (v.o >= 0.99 && fim[j] === undefined) fim[j] = Math.round(f.t - t0);
        if (pico[j] === undefined || v.ty < pico[j]) pico[j] = v.ty;
        if (minO[j] === undefined || v.o < minO[j]) minO[j] = v.o;
      });
    });
    return { rotulos, inicio, fim, pico, minO, quadros: frames.length };
  });

/** Mede a sequência completa e valida a coreografia pedida. */
async function medirSequencia(page) {
  await instalarAmostrador(page);
  await page.getByRole('tab', { name: /Auditoria/i }).first().click();
  await page.waitForTimeout(7000);
  await page.evaluate(() => (window.__amostra.parado = true));
  const { rotulos, inicio, fim, pico } = await coletar(page);

  // Agrupa por dia (a marca `data-cascata-evento` é autoritativa).
  const grupos = [];
  rotulos.forEach((r, i) => {
    if (!r.startsWith('cab:')) return;
    const g = r.slice(4);
    grupos.push({
      cabecalho: i,
      eventos: rotulos.map((o, j) => (o === `evt:${g}` ? j : -1)).filter((j) => j >= 0),
    });
  });

  const falhas = [];
  const tabela = [];
  grupos.forEach((g, gi) => {
    tabela.push({
      item: `DIA ${gi} · cabeçalho`,
      comecaMs: inicio[g.cabecalho],
      concluiMs: fim[g.cabecalho],
      deslocamentoPx: pico[g.cabecalho],
    });
    g.eventos.forEach((idx, k) => {
      tabela.push({
        item: `DIA ${gi} · evento ${k + 1}`,
        comecaMs: inicio[idx],
        concluiMs: fim[idx],
        deslocamentoPx: pico[idx],
        intervaloMs: k === 0 ? null : (inicio[idx] ?? 0) - (inicio[g.eventos[k - 1]] ?? 0),
      });
    });
    // 1) o cabeçalho precisa CONCLUIR antes de o 1º evento do dia começar.
    if (g.eventos.length && inicio[g.eventos[0]] < fim[g.cabecalho]) {
      falhas.push(`dia ${gi}: 1º evento começou antes de o cabeçalho concluir`);
    }
    // 2) cada evento do dia precisa se DESLOCAR e terminar visível.
    g.eventos.forEach((idx, k) => {
      if (pico[idx] === 0) falhas.push(`dia ${gi}: evento ${k + 1} não se deslocou (parado no estado final)`);
      if (fim[idx] === undefined) falhas.push(`dia ${gi}: evento ${k + 1} nunca ficou visível`);
    });
    // 3) o cabeçalho do dia seguinte só começa depois do último evento do dia.
    const proximo = grupos[gi + 1];
    if (proximo) {
      const fimDoDia = g.eventos.length ? fim[g.eventos[g.eventos.length - 1]] : fim[g.cabecalho];
      if (inicio[proximo.cabecalho] < fimDoDia) {
        falhas.push(`dia ${gi}: cabeçalho do dia seguinte começou antes de o dia concluir`);
      }
    }
  });
  // 4) Hoje vem primeiro: o 1º item amostrado é o cabeçalho do 1º dia.
  if (!rotulos[0]?.startsWith('cab:')) falhas.push('o 1º item animado não é o cabeçalho do primeiro dia');

  return { sequenciaValida: falhas.length === 0, falhas, tabela, grupos };
}

/** Capturas de estágios + prova visual da progressão (itens visíveis por marco). */
async function capturarEstagios(page) {
  await instalarAmostrador(page);
  await page.getByRole('tab', { name: /Auditoria/i }).first().click();
  const marcos = [100, 400, 750, 1200, 1800, 3000, 7000];
  const capturas = [];
  let anterior = 0;
  for (const marco of marcos) {
    await page.waitForTimeout(marco - anterior);
    anterior = marco;
    const arquivo = `tmp-cascata-${marco}.png`;
    await page.screenshot({ path: arquivo, clip: { x: 280, y: 290, width: 1300, height: 700 } });
    const amostra = await page.evaluate(() => {
      const itens = [...document.querySelectorAll('[data-cascata-cabecalho], [data-cascata-evento]')];
      const visiveis = itens.filter((el) => Number(getComputedStyle(el).opacity) > 0.5);
      const movendo = itens.filter((el) => {
        const s = getComputedStyle(el);
        const m = s.transform.match(/matrix\(([^)]+)\)/);
        const ty = m ? Number(m[1].split(',')[5]) || 0 : 0;
        return Math.abs(ty) > 0.5;
      }).length;
      return { total: itens.length, visiveis: visiveis.length, emDeslocamento: movendo };
    });
    capturas.push({ ms: marco, arquivo, ...amostra });
  }
  await page.evaluate(() => (window.__amostra.parado = true));
  return capturas;
}

/** Todos os itens esperados terminaram visíveis e sem deslocamento residual?
 *  A espera cobre o MAIOR prazo da trilha (o último item começa por volta de
 *  5s e o prazo dele + margem da rede de segurança passa de 7s). */
const conferirTudoVisivel = (page) =>
  page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 10000));
    const itens = [...document.querySelectorAll('[data-cascata-cabecalho], [data-cascata-evento]')];
    const problemas = itens
      .map((el, i) => {
        const s = getComputedStyle(el);
        const m = s.transform.match(/matrix\(([^)]+)\)/);
        const ty = m ? Number(m[1].split(',')[5]) || 0 : 0;
        return Number(s.opacity) < 0.99 || Math.abs(ty) > 0.5 ? `item ${i}: opacity=${s.opacity} ty=${ty}` : null;
      })
      .filter(Boolean);
    return { total: itens.length, visiveis: itens.length - problemas.length, problemas };
  });

/* ── 1. Coreografia + capturas (navegador de inspeção: movimento completo) ── */
{
  const { context, page, erros } = await abrirContexto();
  resultado.ambiente = await page.evaluate(() => ({
    reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    classeHtml: document.documentElement.className,
  }));
  resultado.capturas = await capturarEstagios(page);
  resultado.errosNavegador = erros.slice(0, 6);
  await context.close();

  const { context: c2, page: p2, erros: e2 } = await abrirContexto();
  resultado.sequencia = await medirSequencia(p2);

/* ── 2. Regressões ────────────────────────────────────────────────────────── */
{
  const { context, page } = await abrirContexto();
  const cenarios = {};

  // 2a. 1ª abertura + sair e voltar da aba (componente desmontado → reanima).
  await page.getByRole('tab', { name: /Auditoria/i }).first().click();
  cenarios.primeiraAbertura = await conferirTudoVisivel(page);
  await page.getByRole('tab', { name: /Ciclos/i }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('tab', { name: /Auditoria/i }).first().click();
  cenarios.voltouParaAba = await conferirTudoVisivel(page);

  // 2b. Reload da página (remontagem completa dentro do StrictMode do app).
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });
  await page.getByRole('tab', { name: /Auditoria/i }).first().click();
  cenarios.aposReload = await conferirTudoVisivel(page);

  // 2c. Filtro aplicado e removido (busca) — nada pode desaparecer.
  const busca = page.getByPlaceholder(/Buscar evento/i).first();
  await busca.fill('feedback');
  cenarios.filtroAplicado = await conferirTudoVisivel(page);
  await busca.fill('');
  cenarios.filtroRemovido = await conferirTudoVisivel(page);

  // 2d. Recolher e expandir um dia (os eventos daquele grupo devem voltar).
  const cabecalhos = page.locator('[data-cascata-cabecalho]');
  await cabecalhos.first().click();
  await page.waitForTimeout(500);
  cenarios.diaRecolhido = await page.evaluate(() => ({
    eventosDoDia0Visiveis: document.querySelectorAll('[data-cascata-evento="0"]').length,
  }));
  await cabecalhos.first().click();
  cenarios.diaExpandido = await conferirTudoVisivel(page);

  // 2e. Reabrir um dia reanima SÓ os eventos daquele grupo (o resto fica quieto).
  // Amostragem por SELETOR (robusta à remontagem das linhas do grupo).
  await cabecalhos.first().click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__grupo = { frames: [], parado: false };
    const tick = () => {
      const dia0 = [...document.querySelectorAll('[data-cascata-evento="0"]')].map((el) => +getComputedStyle(el).opacity);
      const outros = ['[data-cascata-cabecalho="1"]', '[data-cascata-evento="1"]']
        .map((s) => document.querySelector(s))
        .filter(Boolean)
        .map((el) => +getComputedStyle(el).opacity);
      window.__grupo.frames.push({ t: performance.now(), dia0, outros });
      if (!window.__grupo.parado) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const marca = await page.evaluate(() => performance.now());
  await cabecalhos.first().click();
  await page.waitForTimeout(2500);
  await page.evaluate(() => (window.__grupo.parado = true));
  cenarios.expandirGrupo = await page.evaluate((marca) => {
    const f = window.__grupo.frames.filter((x) => x.t >= marca);
    const planos = (arr) => arr.flatMap((x) => x);
    const dia0 = planos(f.map((x) => x.dia0));
    const outros = planos(f.map((x) => x.outros));
    const visivel = f.find((x) => x.dia0.length && x.dia0.every((o) => o >= 0.99));
    return {
      quadros: f.length,
      opacidadeMinimaEventosDoDiaReaberto: dia0.length ? Math.min(...dia0) : null,
      opacidadeMinimaDosOutrosDias: outros.length ? Math.min(...outros) : null,
      diaReabertoCompletoMs: visivel ? Math.round(visivel.t - marca) : null,
    };
  }, marca);
  await context.close();
  resultado.regressoes = cenarios;
}

/* ── 3. Cancelamento das animações em voo + erro no motor ────────────────── */
{
  const { context, page } = await abrirContexto();
  // Cancela TODAS as animações do documento logo após o clique, várias vezes:
  // é o cenário "execução interrompida" — a rede de segurança precisa revelar.
  await page.getByRole('tab', { name: /Auditoria/i }).first().click();
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => document.getAnimations().forEach((a) => a.cancel()));
    await page.waitForTimeout(120);
  }
  resultado.cancelamento = await conferirTudoVisivel(page);
  await context.close();

  const { context: c4, page: p4 } = await abrirContexto();
  // Erro no motor: qualquer WAAPI nos itens animados estoura. Os itens ficam
  // presos no estado inicial e a recuperação tem de assumir o estado final.
  await p4.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this instanceof Element && this.hasAttribute?.('data-cascata-item')) {
        throw new Error('falha simulada de animação');
      }
      return original.apply(this, args);
    };
  });
  await p4.getByRole('tab', { name: /Auditoria/i }).first().click();
  resultado.erroNoMotor = await conferirTudoVisivel(p4);
  await c4.close();
}

/* ── 4. Movimento reduzido (modo `user`: preferência do SO respeitada) ───── */
{
  const { context, page } = await abrirContexto({ reducedMotion: 'reduce', forceMotionOff: true });
  await instalarAmostrador(page);
  await page.getByRole('tab', { name: /Auditoria/i }).first().click();
  await page.waitForTimeout(7000);
  await page.evaluate(() => (window.__amostra.parado = true));
  const { rotulos, inicio, fim, pico } = await coletar(page);
  resultado.movimentoReduzido = {
    itens: rotulos.length,
    todosVisiveis: fim.filter((f) => f !== undefined).length === rotulos.length,
    primeiroAparecimentoMs: inicio.filter((i) => i !== undefined).sort((a, b) => a - b)[0] ?? null,
    deslocamentoMaximoPx: pico.length ? Math.max(...pico.map((p) => Math.abs(p ?? 0))) : null,
  };
  await context.close();
}

  resultado.errosNavegador = [...resultado.errosNavegador, ...e2.slice(0, 6)];
  await c2.close();
}


writeFileSync('tmp-validacao-cascata.json', JSON.stringify(resultado, null, 2));
console.log(
  JSON.stringify(
    {
      ambiente: resultado.ambiente,
      sequenciaValida: resultado.sequencia?.sequenciaValida,
      falhas: resultado.sequencia?.falhas,
      tabela: resultado.sequencia?.tabela,
      capturas: resultado.capturas,
      regressoes: resultado.regressoes,
      cancelamento: resultado.cancelamento,
      erroNoMotor: resultado.erroNoMotor,
      movimentoReduzido: resultado.movimentoReduzido,
      errosNavegador: resultado.errosNavegador,
    },
    null,
    2
  )
);
await browser.close();

