/**
 * TEMPORÁRIO — validação da ENTRADA em cascata do Hub de Premiações.
 *
 * Sobe o Vite (ou reaproveita um servidor já ativo na 8080), abre /premiacoes
 * com a sessão E2E e:
 *   1. GRAVA UM VÍDEO (webm) da entrada — a evidência pedida (screenshot
 *      estático não mostra duração/sequência/suavização);
 *   2. amostra, quadro a quadro (rAF), `opacity` + `translateY` de cada grupo
 *      visual e deriva ATRASO e DURAÇÃO reais de cada item;
 *   3. confere que filtro/hover NÃO reiniciam a cascata;
 *   4. confere responsividade (1440/1024/390) e `prefers-reduced-motion`.
 *
 * Uso: node scripts/_tmp-validar-entrada-premiacoes.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORTA = 8080;
const URL = `http://localhost:${PORTA}/premiacoes`;
const SAIDA = 'tmp-entrada-premiacoes';

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

/**
 * Instalado ANTES de qualquer script do app (addInitScript): resolve cada alvo
 * quando ele aparece no DOM e grava `opacity`/`translateY` a cada quadro.
 */
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
    textoIgual: (arg) => {
      const [tag, txt] = arg.split('@@');
      return porTexto(tag, txt, true);
    },
    itemPainel: (arg) => {
      const [titulo, indice] = arg.split('@@');
      const h3 = porTexto('h3', titulo, false);
      const secao = h3 ? h3.closest('section') : null;
      return secao ? (secao.querySelectorAll('li')[Number(indice)] ?? null) : null;
    },
  };

  /** Sobe até o primeiro ancestral com `transform`/`opacity` inline (o nó do Motion). */
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
  window.__entradaLimite = 12_000; // teto de segurança do loop

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
  };

  const loop = () => {
    amostrar();
    if (performance.now() < window.__entradaLimite) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

/** Deriva, das amostras, quando a entrada COMEÇOU e quando TERMINOU por alvo. */
function analisar(quadros, chaves) {
  const t0 = quadros[0]?.t ?? 0;
  const serieT = quadros.map((q) => q.t - t0);
  const intervalos = serieT.slice(1).map((t, i) => t - serieT[i]).sort((a, b) => a - b);
  const intervaloMediano = intervalos.length ? Math.round(intervalos[Math.floor(intervalos.length / 2)]) : null;
  const resumo = {};
  for (const chave of chaves) {
    const serie = quadros.filter((q) => q[chave]).map((q) => ({ t: q.t - t0, ...q[chave] }));
    if (serie.length === 0) {
      resumo[chave] = null;
      continue;
    }
    const subiu = serie.find((s) => s.o > 0.02);
    const chegou = serie.find((s) => s.o >= 0.99);
    const emTransicao = serie.filter((s) => s.o > 0.02 && s.o < 0.98).length;
    const yEntrada = Math.round(Math.max(...serie.filter((s) => s.o < 0.9).map((s) => Math.abs(s.y)), 0) * 10) / 10;
    const yMax = Math.round(Math.max(...serie.map((s) => Math.abs(s.y)), 0) * 10) / 10;
    const framesY20 = serie.filter((s) => Math.abs(s.y) > 10).length;
    // Em DEV o React StrictMode monta o componente DUAS vezes: a cascata roda
    // duas passagens. As medidas "finais" olham a ÚLTIMA (a que o usuário vê).
    const subidas = [];
    for (let i = 1; i < serie.length; i += 1) {
      if (serie[i - 1].o <= 0.02 && serie[i].o > 0.02) subidas.push(i);
    }
    const iFinal = subidas.length ? subidas[subidas.length - 1] : -1;
    const inicioFinal = iFinal >= 0 ? serie[iFinal].t : null;
    const chegouFinal =
      iFinal >= 0 ? (serie.slice(iFinal).find((s) => s.o >= 0.99)?.t ?? null) : null;
    resumo[chave] = {
      inicio_ms: subiu ? Math.round(subiu.t) : null,
      fim_ms: chegou ? Math.round(chegou.t) : null,
      duracao_ms: subiu && chegou ? Math.round(chegou.t - subiu.t) : null,
      passagens: subidas.length,
      inicio_final_ms: inicioFinal === null ? null : Math.round(inicioFinal),
      duracao_final_ms: inicioFinal !== null && chegouFinal !== null ? Math.round(chegouFinal - inicioFinal) : null,
      y_entrada: yEntrada,
      y_max: yMax,
      frames: serie.length,
      frames_transicao: emTransicao,
      frames_com_y_20: framesY20,
    };
  }
  // Atraso RELATIVO entre os inícios da passagem final (réguas do Dashboard = 80ms).
  const inicios = Object.values(resumo)
    .map((v) => (v ? v.inicio_final_ms : null))
    .filter((v) => v !== null);
  const menor = inicios.length ? Math.min(...inicios) : null;
  for (const v of Object.values(resumo)) {
    if (v && menor !== null && v.inicio_final_ms !== null) v.atraso_rel_ms = v.inicio_final_ms - menor;
  }
  return { intervalo_mediano_ms: intervaloMediano, quadros: quadros.length, alvos: resumo };
}

const ALVOS = [
  { chave: '1.icone', tipo: 'sel', arg: 'header > div' },
  { chave: '2.titulo', tipo: 'sel', arg: 'header h1' },
  { chave: '3.subtitulo', tipo: 'sel', arg: 'header p' },
  { chave: '4.nav', tipo: 'sel', arg: '[role="tablist"]' },
  { chave: '5.novaCampanha', tipo: 'texto', arg: 'button@@Nova Campanha' },
  { chave: '6.kpiTotalAprovado', tipo: 'texto', arg: 'p@@Total Aprovado' },
  { chave: '7.kpiPendente', tipo: 'texto', arg: 'p@@Pendente de Aprovação' },
  { chave: '8.kpiAtivas', tipo: 'texto', arg: 'p@@Campanhas Ativas' },
  { chave: '9.kpiConciliacao', tipo: 'texto', arg: 'p@@Conciliação (Divergências)' },
  { chave: '10.kpiVisaoGeral', tipo: 'texto', arg: 'p@@Visão geral' },
  { chave: '11.busca', tipo: 'sel', arg: 'input[aria-label="Buscar campanhas"]' },
  { chave: '12.chipTodos', tipo: 'texto', arg: 'button@@Todos' },
  { chave: '13.chipAtivas', tipo: 'texto', arg: 'button@@Ativas' },
  { chave: '14.chipFinalizadas', tipo: 'texto', arg: 'button@@Finalizadas' },
  { chave: '15.chipRascunhos', tipo: 'texto', arg: 'button@@Rascunhos' },
  { chave: '16.ordenar', tipo: 'sel', arg: 'button[aria-label="Ordenar por"]' },
  { chave: '17.periodo', tipo: 'sel', arg: 'button[aria-label="Período"]' },
  { chave: '18.tabela', tipo: 'sel', arg: 'table' },
  { chave: '19.thead', tipo: 'sel', arg: 'thead tr' },
  { chave: '20.linha1', tipo: 'sel', arg: 'tbody tr:nth-child(1)' },
  { chave: '21.linha2', tipo: 'sel', arg: 'tbody tr:nth-child(2)' },
  { chave: '22.linha3', tipo: 'sel', arg: 'tbody tr:nth-child(3)' },
  { chave: '23.rodape', tipo: 'sel', arg: 'footer' },
  { chave: '24.painelAcoes', tipo: 'texto', arg: 'h3@@Próximas ações' },
  { chave: '25.acao1', tipo: 'itemPainel', arg: 'Próximas ações@@0' },
  { chave: '26.acao2', tipo: 'itemPainel', arg: 'Próximas ações@@1' },
  { chave: '27.acao3', tipo: 'itemPainel', arg: 'Próximas ações@@2' },
  { chave: '28.verTodasAcoes', tipo: 'textoIgual', arg: 'button@@Ver todas as ações' },
  { chave: '29.painelAtividade', tipo: 'texto', arg: 'h3@@Atividade recente' },
  { chave: '30.verTodas', tipo: 'textoIgual', arg: 'button@@Ver todas' },
  { chave: '31.atividade1', tipo: 'itemPainel', arg: 'Atividade recente@@0' },
  { chave: '32.atividade2', tipo: 'itemPainel', arg: 'Atividade recente@@1' },
  { chave: '33.atividade3', tipo: 'itemPainel', arg: 'Atividade recente@@2' },
];

const resultados = {};
let browser;

/** Lê a opacidade do wrapper do primeiro KPI (prova de "não reinicia"). */
const LER_OPACIDADE_KPI = () => {
  const p = [...document.querySelectorAll('p')].find((x) => (x.textContent || '').trim() === 'Total Aprovado');
  const card = p ? p.closest('.grid').firstElementChild : null;
  return card ? getComputedStyle(card).opacity : null;
};

try {
  if (!(await servidorPronto())) throw new Error('servidor Vite não ficou pronto');
  browser = await chromium.launch({ args: ['--disable-frame-rate-limit', '--disable-gpu-vsync'] });

  /** Abre a página com a sessão E2E e devolve a medição da entrada. */
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
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(`console: ${m.text().slice(0, 160)}`);
    });

    await page.addInitScript(
      ({ reduzido }) => {
        localStorage.setItem('ui-theme', 'dark');
        localStorage.setItem('dp-tour-completed', 'true');
        // No DEV o movimento completo é o default; `'off'` volta a honrar a
        // preferência do SO — é assim que o teste de redução é feito aqui.
        if (reduzido) localStorage.setItem('dp-force-motion', 'off');
        else localStorage.removeItem('dp-force-motion');
      },
      { reduzido },
    );
    await page.addInitScript(instalarRecorder, ALVOS);

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
    // A cascata do hub termina ~1.35s depois da montagem (último índice 8 × 0.10s
    // + 0.55s de duração); a janela precisa cobrir tudo.
    await page.waitForTimeout(2600);

    const amostras = await page.evaluate(() => {
      window.__entradaLimite = 0; // encerra o loop de gravação
      return { quadros: window.__entrada.quadros, erro: window.__entrada.erro };
    });
    const entrada = analisar(amostras.quadros, ALVOS.map((a) => a.chave));
    if (nome.startsWith('desktop') || nome.startsWith('movimento')) {
      writeFileSync(`${SAIDA}/quadros-${nome}.json`, JSON.stringify(amostras.quadros));
    }

    // Filtro + hover NÃO podem reiniciar a cascata (KPI continua com opacity 1).
    const antes = await page.evaluate(LER_OPACIDADE_KPI);
    await page.getByRole('button', { name: /Rascunhos/ }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /Todos/ }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /Ver campanha|Ver resultados|Revisar campanha/ }).first().hover();
    await page.waitForTimeout(300);
    const depois = await page.evaluate(LER_OPACIDADE_KPI);

    const geometria = await page.evaluate(() => {
      const caixa = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      };
      const card = [...document.querySelectorAll('p')]
        .find((p) => (p.textContent || '').trim() === 'Total Aprovado')
        ?.closest('.grid')?.firstElementChild;
      const h3 = [...document.querySelectorAll('h3')].find((h) => (h.textContent || '').includes('Atividade recente'));
      return {
        kpiCard: caixa(card),
        kpiIcone: caixa(card?.firstElementChild),
        nav: caixa(document.querySelector('[role="tablist"]')),
        filtros: caixa(document.querySelector('input[aria-label="Buscar campanhas"]')?.closest('div')),
        tabela: caixa(document.querySelector('table')),
        lateral: caixa(h3?.parentElement?.parentElement),
        rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
        prefereMovimentoReduzido: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        classeRaiz: document.documentElement.className,
      };
    });

    const caminhoVideo = video ? await page.video().path() : null;
    await contexto.close();
    resultados[nome] = {
      largura,
      reduzido,
      erros,
      opacidadeKpiAntes: antes,
      opacidadeKpiDepois: depois,
      video: caminhoVideo,
      ...geometria,
      entrada,
      erroRecorder: amostras.erro,
    };
    return resultados[nome];
  }

  await medir({ nome: 'desktop-1456-com-video', video: true });
  await medir({ nome: 'tablet-1024', largura: 1024, altura: 1000 });
  await medir({ nome: 'mobile-390', largura: 390, altura: 900 });
  await medir({ nome: 'movimento-reduzido', reduzido: true });

  writeFileSync(`${SAIDA}/medicoes.json`, JSON.stringify(resultados, null, 2));
  for (const [nome, r] of Object.entries(resultados)) {
    console.log(`\n=== ${nome} (${r.largura}px) erros=${r.erros.length} rolagemH=${r.rolagemHorizontal} ===`);
    if (r.video) console.log(`video: ${r.video}`);
    console.log(`opacidade KPI antes/depois de filtro+hover: ${r.opacidadeKpiAntes} / ${r.opacidadeKpiDepois}`);
    if (r.erroRecorder) console.log(`erro recorder: ${r.erroRecorder}`);
    console.log(`amostras: ${r.entrada.quadros} quadros, intervalo mediano ${r.entrada.intervalo_mediano_ms}ms`);
    console.log(`prefers-reduced-motion=${r.prefereMovimentoReduzido}  classeHtml="${r.classeRaiz}"`);
    for (const [chave, v] of Object.entries(r.entrada.alvos)) {
      console.log(
        v === null
          ? `  ${chave.padEnd(22)} —`
          : `  ${chave.padEnd(22)} atraso=${String(v.atraso_rel_ms).padStart(4)}ms dur_final=${String(v.duracao_final_ms).padStart(4)}ms passagens=${v.passagens} y_entrada=${String(v.y_entrada).padStart(5)} frames_y20=${String(v.frames_com_y_20).padStart(4)} frames_transicao=${v.frames_transicao}`,
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
