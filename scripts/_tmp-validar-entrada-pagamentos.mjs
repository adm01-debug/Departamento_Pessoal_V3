/**
 * TEMPORÁRIO — mede a ENTRADA em cascata da aba PAGAMENTOS do Hub de Premiações.
 *
 * Reaproveita o mecanismo de `_tmp-validar-entrada-premiacoes.mjs` (recorder por
 * rAF instalado antes do app, lendo opacity/translateY de cada alvo), mas a
 * gravação começa no clique da aba Pagamentos — o conteúdo da aba só monta ali.
 *
 * Uso: node scripts/_tmp-validar-entrada-pagamentos.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORTA = 8080;
const URL = `http://localhost:${PORTA}/premiacoes`;
const SAIDA = 'tmp-entrada-pagamentos';

async function portaAtiva() {
  try {
    const r = await fetch(URL, { redirect: 'manual' });
    return r.status < 500;
  } catch {
    return false;
  }
}

mkdirSync(`${SAIDA}/video`, { recursive: true });

const jaServindo = await portaAtiva();
const servidor = jaServindo
  ? null
  : spawn('cmd.exe', ['/c', `npx vite --port ${PORTA} --strictPort`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
if (servidor) {
  servidor.stdout.on('data', () => {});
  servidor.stderr.on('data', () => {});
}

async function servidorPronto() {
  for (let i = 0; i < 90; i++) {
    if (await portaAtiva()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const instalarRecorder = (alvos) => {
  const porTexto = (tag, txt, exato) =>
    [...document.querySelectorAll(tag)].find((e) =>
      exato ? (e.textContent || '').trim() === txt : (e.textContent || '').includes(txt),
    ) ?? null;

  const resolvers = {
    sel: (arg) => document.querySelector(arg),
    texto: (arg) => {
      const [tag, txt] = arg.split('@@');
      return porTexto(tag, txt, false);
    },
    itemPainel: (arg) => {
      const [titulo, indice] = arg.split('@@');
      const h3 = porTexto('h3', titulo, false);
      const secao = h3 ? h3.closest('section') : null;
      return secao ? (secao.querySelectorAll('li')[Number(indice)] ?? null) : null;
    },
  };

  const animado = (el) => {
    let n = el;
    while (n && n !== document.body) {
      const s = n.getAttribute('style') || '';
      if (/(^|;)\s*(opacity|transform)\s*:/.test(s)) return n;
      n = n.parentElement;
    }
    return null;
  };

  const yDe = (transform) => {
    if (!transform || transform === 'none') return 0;
    const m = transform.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const partes = m[1].split(',').map((v) => parseFloat(v.trim()));
    return Number.isFinite(partes[5]) ? partes[5] : 0;
  };

  window.__entrada = { quadros: [], alvos, erro: null };
  window.__entradaLimite = 0;

  const amostrar = () => {
    const t = performance.now();
    const linha = { t };
    for (const alvo of alvos) {
      try {
        const bruto = resolvers[alvo.tipo](alvo.arg);
        const no = bruto ? animado(bruto) : null;
        if (!no) {
          linha[alvo.chave] = null;
          continue;
        }
        const cs = getComputedStyle(no);
        linha[alvo.chave] = { o: Number.parseFloat(cs.opacity), y: Math.round(yDe(cs.transform) * 100) / 100 };
      } catch (e) {
        window.__entrada.erro = String(e && e.message);
      }
    }
    window.__entrada.quadros.push(linha);
    if (window.__entradaLimite && performance.now() < window.__entradaLimite) requestAnimationFrame(loop);
  };

  const loop = () => amostrar();
  window.__entradaIniciar = (duracaoMs) => {
    window.__entrada.quadros = [];
    window.__entradaLimite = performance.now() + duracaoMs;
    requestAnimationFrame(loop);
  };
};

function analisar(quadros, chaves) {
  const t0 = quadros[0]?.t ?? 0;
  const resumo = {};
  for (const chave of chaves) {
    const serie = quadros.filter((q) => q[chave]).map((q) => ({ t: q.t - t0, ...q[chave] }));
    if (serie.length === 0) {
      resumo[chave] = null;
      continue;
    }
    const subidas = [];
    for (let i = 1; i < serie.length; i += 1) {
      if (serie[i - 1].o <= 0.02 && serie[i].o > 0.02) subidas.push(i);
    }
    const iFinal = subidas.length ? subidas[subidas.length - 1] : -1;
    const inicio = iFinal >= 0 ? serie[iFinal].t : null;
    const chegou = iFinal >= 0 ? (serie.slice(iFinal).find((s) => s.o >= 0.99)?.t ?? null) : null;
    resumo[chave] = {
      inicio_ms: inicio === null ? null : Math.round(inicio),
      duracao_ms: inicio !== null && chegou !== null ? Math.round(chegou - inicio) : null,
      y_entrada: Math.round(Math.max(...serie.filter((s) => s.o < 0.9).map((s) => Math.abs(s.y)), 0) * 10) / 10,
      passagens: subidas.length,
    };
  }
  const inicios = Object.values(resumo)
    .map((v) => (v ? v.inicio_ms : null))
    .filter((v) => v !== null);
  const menor = inicios.length ? Math.min(...inicios) : null;
  for (const v of Object.values(resumo)) {
    if (v && menor !== null && v.inicio_ms !== null) v.atraso_rel_ms = v.inicio_ms - menor;
  }
  return { quadros: quadros.length, alvos: resumo };
}

const ALVOS = [
  { chave: '1.kpiAprovado', tipo: 'texto', arg: 'p@@Total Aprovado' },
  { chave: '2.kpiAguardando', tipo: 'texto', arg: 'p@@Aguardando Aprovação' },
  { chave: '3.kpiDivergencias', tipo: 'texto', arg: 'p@@Divergências Identificadas' },
  { chave: '4.kpiPago', tipo: 'texto', arg: 'p@@Total Pago no Período' },
  { chave: '5.fluxo', tipo: 'texto', arg: 'h3@@Fluxo de Pagamento' },
  { chave: '6.busca', tipo: 'sel', arg: 'input[aria-label="Buscar pagamentos"]' },
  { chave: '7.tabela', tipo: 'sel', arg: 'table' },
  { chave: '8.linha1', tipo: 'sel', arg: 'tbody tr:nth-child(1)' },
  { chave: '9.linha2', tipo: 'sel', arg: 'tbody tr:nth-child(2)' },
  { chave: '10.linha3', tipo: 'sel', arg: 'tbody tr:nth-child(3)' },
  { chave: '11.resumo', tipo: 'texto', arg: 'h3@@Resumo Financeiro' },
  { chave: '12.acoes', tipo: 'texto', arg: 'h3@@Próximas ações' },
  { chave: '13.acao1', tipo: 'itemPainel', arg: 'Próximas ações@@0' },
  { chave: '14.acao2', tipo: 'itemPainel', arg: 'Próximas ações@@1' },
  { chave: '15.atividade', tipo: 'texto', arg: 'h3@@Atividade recente' },
  { chave: '16.atividade1', tipo: 'itemPainel', arg: 'Atividade recente@@0' },
  { chave: '17.atividade2', tipo: 'itemPainel', arg: 'Atividade recente@@1' },
];

const LER_OPACIDADE_KPI = () => {
  const p = [...document.querySelectorAll('p')].find((x) => (x.textContent || '').trim() === 'Divergências Identificadas');
  const card = p ? p.closest('.min-w-0.flex-1')?.parentElement : null;
  return card ? getComputedStyle(card).opacity : null;
};

const resultados = {};
let browser;

try {
  if (!(await servidorPronto())) throw new Error('servidor Vite não ficou pronto');
  browser = await chromium.launch({ args: ['--disable-frame-rate-limit', '--disable-gpu-vsync'] });


  async function medir({ nome, largura = 1456, altura = 816, video = false, reduzido = false }) {
    const contexto = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
      viewport: { width: largura, height: altura },
      ...(video ? { recordVideo: { dir: `${SAIDA}/video`, size: { width: largura, height: altura } } } : {}),
      ...(reduzido ? { reducedMotion: 'reduce' } : {}),
    });
    const page = await contexto.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));

    await page.addInitScript(
      ({ reduzido }) => {
        localStorage.setItem('ui-theme', 'dark');
        localStorage.setItem('dp-tour-completed', 'true');
        if (reduzido) localStorage.setItem('dp-force-motion', 'off');
        else localStorage.removeItem('dp-force-motion');
      },
      { reduzido },
    );
    await page.addInitScript(instalarRecorder, ALVOS);

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2200);

    // A gravação começa AGORA: o conteúdo da aba Pagamentos monta no clique.
    await page.evaluate(() => window.__entradaIniciar(6000));
    await page.getByRole('tab', { name: /Pagamentos/ }).click();
    await page.getByRole('heading', { name: /Fluxo de Pagamento|Resumo Financeiro/ }).first().waitFor({ timeout: 15_000 });
    await page.waitForTimeout(2600);

    const amostras = await page.evaluate(() => ({ quadros: window.__entrada.quadros, erro: window.__entrada.erro }));
    const entrada = analisar(amostras.quadros, ALVOS.map((a) => a.chave));
    writeFileSync(`${SAIDA}/quadros-${nome}.json`, JSON.stringify(amostras.quadros));

    // Filtro de etapa + hover NÃO podem reiniciar a cascata do KPI.
    const antes = await page.evaluate(LER_OPACIDADE_KPI);
    await page.getByRole('button', { name: /Aprovado Gestor/ }).first().click().catch(() => {});
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Aprovar|Ver|Conciliar/ }).first().hover().catch(() => {});
    await page.waitForTimeout(300);
    const depois = await page.evaluate(LER_OPACIDADE_KPI);

    const geometria = await page.evaluate(() => {
      const caixa = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      };
      return {
        kpi: caixa(
          [...document.querySelectorAll('p')]
            .find((p) => p.textContent?.includes('Total Aprovado'))
            ?.closest('.min-w-0.flex-1')?.parentElement,
        ),
        filtros: caixa(document.querySelector('input[aria-label="Buscar pagamentos"]')?.closest('div')),
        tabela: caixa(document.querySelector('table')),
        linhas: document.querySelectorAll('tbody tr').length,
        rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
        classeRaiz: document.documentElement.className,
      };
    });

    const caminhoVideo = video ? await page.video().path() : null;
    await contexto.close();
    resultados[nome] = {
      largura,
      reduzido,
      erros,
      antes,
      depois,
      video: caminhoVideo,
      ...geometria,
      entrada,
      erroRecorder: amostras.erro,
    };
    return resultados[nome];
  }

  await medir({ nome: 'pagamentos-desktop-1456', video: true });
  await medir({ nome: 'pagamentos-mobile-390', largura: 390, altura: 900 });
  await medir({ nome: 'pagamentos-movimento-reduzido', reduzido: true });

  writeFileSync(`${SAIDA}/medicoes.json`, JSON.stringify(resultados, null, 2));
  for (const [nome, r] of Object.entries(resultados)) {
    console.log(`\n=== ${nome} (${r.largura}px) erros=${r.erros.length} rolagemH=${r.rolagemHorizontal} linhas=${r.linhas} ===`);
    if (r.video) console.log(`video: ${r.video}`);
    console.log(`opacidade KPI antes/depois de filtro+hover: ${r.antes} / ${r.depois}`);
    if (r.erroRecorder) console.log(`erro recorder: ${r.erroRecorder}`);
    for (const [chave, v] of Object.entries(r.entrada.alvos)) {
      console.log(
        v === null
          ? `  ${chave.padEnd(20)} —`
          : `  ${chave.padEnd(20)} atraso=${String(v.atraso_rel_ms).padStart(4)}ms dur=${String(v.duracao_ms).padStart(4)}ms y=${String(v.y_entrada).padStart(4)} passagens=${v.passagens}`,
      );
    }
  }
  console.log(`\nJSON: ${SAIDA}/medicoes.json`);
} finally {
  if (browser) await browser.close();
  if (servidor) {
    try {
      execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* já encerrado */
    }
  }
}

    const depois = await page.evaluate(LER_OPACIDADE_KPI);
