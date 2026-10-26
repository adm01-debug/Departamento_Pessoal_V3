import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const SAIDA = 'tmp-anim-candidatos';
mkdirSync(SAIDA, { recursive: true });
const log = (...args) => console.error('[anim]', ...args);

const SAMPLER = () => {
  const state = { startedAt: performance.now(), mountAt: null, frames: [] };
  window.__anim = state;
  const marcarMontagem = () => {
    if (state.mountAt != null) return;
    const corpo = document.querySelector('table tbody');
    if (corpo && corpo.querySelectorAll('tr').length > 0) state.mountAt = performance.now();
  };
  new MutationObserver(marcarMontagem).observe(document, {
    childList: true,
    subtree: true,
  });
  const amostrar = (agora) => {
    const linhas = [...document.querySelectorAll('table tbody tr')];
    if (linhas.length > 0) {
      marcarMontagem();
      const tabela = document.querySelector('table');
      const rTabela = tabela?.getBoundingClientRect();
      state.frames.push({
        t: agora,
        linhas: linhas.slice(0, 10).map((linha) => {
          const cs = getComputedStyle(linha);
          let escalaX = 1;
          let y = 0;
          try {
            const matriz = new DOMMatrixReadOnly(
              cs.transform === 'none' ? 'matrix(1,0,0,1,0,0)' : cs.transform
            );
            escalaX = Number(matriz.a.toFixed(4));
            y = Number(matriz.f.toFixed(2));
          } catch {
            /* transform inválido: mantém neutro */
          }
          const r = linha.getBoundingClientRect();
          return {
            opacidade: Number(cs.opacity),
            escalaX,
            y,
            altura: Math.round(r.height),
            largura: Math.round(r.width),
          };
        }),
        tabela: rTabela
          ? {
              largura: Math.round(rTabela.width),
              altura: Math.round(rTabela.height),
              colunas: [...(tabela?.querySelectorAll('thead th') ?? [])].map((th) =>
                Math.round(th.getBoundingClientRect().width)
              ),
            }
          : null,
      });
    }
    const dentroDaJanela =
      state.mountAt == null
        ? agora - state.startedAt < 30000
        : agora - state.mountAt < 6000;
    if (dentroDaJanela) requestAnimationFrame(amostrar);
  };
  requestAnimationFrame(amostrar);
};

function analisar(anim) {
  if (!anim?.mountAt || !anim.frames?.length) return { erro: 'sem quadros' };
  const frames = anim.frames.filter((f) => f.t >= anim.mountAt);
  const porLinha = [];
  for (let i = 0; i < 8; i += 1) {
    const pontos = frames
      .filter((f) => f.linhas[i])
      .map((f) => ({ t: f.t - anim.mountAt, ...f.linhas[i] }));
    if (pontos.length === 0) break;
    const inicio = pontos.find((p) => p.opacidade > 0.01)?.t ?? null;
    const primeiroOculto = pontos.find((p) => p.opacidade <= 0.01);
    const fim = pontos.find((p) => p.t > (inicio ?? 0) && p.opacidade >= 0.999)?.t ?? null;
    porLinha.push({
      indice: i,
      inicioMs: inicio == null ? null : Math.round(inicio),
      fimMs: fim == null ? null : Math.round(fim),
      duracaoMs: inicio != null && fim != null ? Math.round(fim - inicio) : null,
      opacidadeInicial: primeiroOculto?.opacidade ?? null,
      yInicial: primeiroOculto?.y ?? null,
      escalaXInicial: primeiroOculto?.escalaX ?? null,
      opacidadeFinal: pontos.at(-1)?.opacidade ?? null,
      yFinal: pontos.at(-1)?.y ?? null,
      escalaXFinal: pontos.at(-1)?.escalaX ?? null,
      alturaFinal: pontos.at(-1)?.altura ?? null,
    });
  }
  const colunas = new Set(frames.map((f) => (f.tabela?.colunas ?? []).join(',')));
  const alturas = new Set(frames.map((f) => f.linhas.map((l) => l.altura).join(',')));
  return {
    mountAt: Math.round(anim.mountAt),
    totalQuadros: frames.length,
    porLinha,
    staggerMs:
      porLinha.length > 1 && porLinha[0].inicioMs != null && porLinha[1].inicioMs != null
        ? porLinha[1].inicioMs - porLinha[0].inicioMs
        : null,
    colunasConstantes: colunas.size === 1,
    alturasConstantes: alturas.size === 1,
    tabelaFinal: frames.at(-1)?.tabela ?? null,
    primeiraColuna: [...colunas][0] ?? null,
  };
}
const browser = await chromium.launch();

async function criarPagina() {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  await context.addInitScript(SAMPLER);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  return { context, page };
}

// 1 · Referência: Desligamentos → Processos
const ref = await criarPagina();
log('abrir /desligamentos');
await ref.page.goto('http://localhost:8080/desligamentos', { waitUntil: 'domcontentloaded' });
await ref.page.locator('table tbody tr').first().waitFor({ state: 'attached', timeout: 60000 });
await ref.page.screenshot({ path: `${SAIDA}/desligamentos-t0.png` });
await ref.page.waitForTimeout(300);
await ref.page.screenshot({ path: `${SAIDA}/desligamentos-t300.png` });
await ref.page.waitForTimeout(300);
await ref.page.screenshot({ path: `${SAIDA}/desligamentos-t600.png` });
await ref.page.waitForTimeout(300);
await ref.page.screenshot({ path: `${SAIDA}/desligamentos-t900.png` });
await ref.page.waitForTimeout(1200);
const animRef = analisar(await ref.page.evaluate(() => window.__anim));
await ref.page.screenshot({ path: `${SAIDA}/desligamentos-final.png` });
await ref.context.close();

// 2 · Destino: Recrutamento → Candidatos
const dst = await criarPagina();
log('abrir /recrutamento');
await dst.page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await dst.page.getByRole('tab', { name: 'Candidatos', exact: true }).click();
await dst.page.locator('table tbody tr').first().waitFor({ state: 'attached', timeout: 60000 });
await dst.page.screenshot({ path: `${SAIDA}/candidatos-t0.png` });
await dst.page.waitForTimeout(300);
await dst.page.screenshot({ path: `${SAIDA}/candidatos-t300.png` });
await dst.page.waitForTimeout(300);
await dst.page.screenshot({ path: `${SAIDA}/candidatos-t600.png` });
await dst.page.waitForTimeout(300);
await dst.page.screenshot({ path: `${SAIDA}/candidatos-t900.png` });
await dst.page.waitForTimeout(1200);
const animDst = analisar(await dst.page.evaluate(() => window.__anim));
await dst.page.screenshot({ path: `${SAIDA}/candidatos-final.png` });
const erro = await dst.page.evaluate(() =>
  document.body.innerText.includes('Instabilidade Detectada') ? 'Instabilidade Detectada' : null
);
await dst.context.close();

const resultado = {
  referencia: { rota: '/desligamentos', animacao: animRef },
  destino: { rota: '/recrutamento?tab=candidatos', animacao: animDst, erro },
  comparacao: {
    mesmoYInicial: animRef.porLinha?.[0]?.yInicial === animDst.porLinha?.[0]?.yInicial,
    mesmaEscalaInicial:
      animRef.porLinha?.[0]?.escalaXInicial === animDst.porLinha?.[0]?.escalaXInicial,
    mesmaOpacidadeInicial:
      animRef.porLinha?.[0]?.opacidadeInicial === animDst.porLinha?.[0]?.opacidadeInicial,
    mesmoStagger: Math.abs((animRef.staggerMs ?? 0) - (animDst.staggerMs ?? 0)) <= 20,
    duracaoRef: animRef.porLinha?.[0]?.duracaoMs ?? null,
    duracaoDst: animDst.porLinha?.[0]?.duracaoMs ?? null,
  },
};

writeFileSync(`${SAIDA}/medicao.json`, JSON.stringify(resultado, null, 2), 'utf8');
log(JSON.stringify(resultado, null, 2));
await browser.close();

