/**
 * TEMPORÁRIO — prova a SEQUÊNCIA da cascata: mede, quadro a quadro, quando cada
 * cabeçalho/dia e cada evento começa e termina de aparecer.
 * Uso: node scripts/_tmp-cascata-sequencia.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});

const instalarAmostrador = () =>
  page.evaluate(() => {
    window.__seq = { t0: null, frames: [], stop: false };
    const tick = () => {
      const alvos = [
        ...document.querySelectorAll('[data-cascata-cabecalho]'),
        ...document.querySelectorAll('[data-cascata-evento]'),
      ];
      if (alvos.length > 0) {
        if (window.__seq.t0 === null) {
          window.__seq.t0 = performance.now();
          window.__seq.rotulos = alvos.slice(0, 12).map((el) => ({
            tipo: el.hasAttribute('data-cascata-cabecalho')
              ? `cab:${el.getAttribute('data-cascata-cabecalho')}`
              : `evt:${el.getAttribute('data-cascata-evento')}`,
            texto: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28),
          }));
        }
        window.__seq.frames.push({
          t: performance.now() - window.__seq.t0,
          o: alvos.slice(0, 12).map((el) => +(+getComputedStyle(el).opacity).toFixed(3)),
        });
      }
      if (!window.__seq.stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const abrirTrilha = async () => {
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });
  await instalarAmostrador();
  await page.getByRole('tab', { name: /Auditoria/i }).first().click();
};

const lerAmostras = async () => {
  await page.waitForTimeout(7000);
  await page.evaluate(() => {
    window.__seq.stop = true;
  });
  const frames = await page.evaluate(() => window.__seq.frames);
  const rotulos = await page.evaluate(() => window.__seq.rotulos);
  // Primeiro instante com o item visível e primeiro instante em que ele CHEGA.
  const inicio = [];
  const fim = [];
  for (const f of frames) {
    f.o.forEach((o, i) => {
      if (o > 0.01 && inicio[i] === undefined) inicio[i] = Math.round(f.t);
      if (o >= 0.99 && fim[i] === undefined) fim[i] = Math.round(f.t);
    });
  }
  return { inicio, fim, rotulos, ordem: frames.length > 0 ? frames[0].o.length : 0 };
};

/**
 * Agrupa por dia (a marca `data-cascata-evento` é autoritativa) na ordem dos
 * cabeçalhos, monta a tabela e valida a coreografia PEDIDA:
 *   • o cabeçalho do dia conclui antes de o 1º evento do dia começar;
 *   • dentro do dia, os eventos entram em cascata (~180ms entre inícios, 450ms
 *     cada — logo, eventos do MESMO dia se sobrepõem de propósito);
 *   • o cabeçalho do dia seguinte só começa depois de o ÚLTIMO evento do dia
 *     anterior concluir.
 */
function montarGrupos(rotulos) {
  const grupos = [];
  rotulos.forEach((r, i) => {
    if (!r.tipo.startsWith('cab:')) return;
    const g = r.tipo.slice(4);
    const eventos = [];
    rotulos.forEach((o, j) => {
      if (o.tipo === `evt:${g}`) eventos.push(j);
    });
    grupos.push({ cabecalho: i, eventos });
  });
  return grupos;
}

await abrirTrilha();
const { inicio, fim, rotulos } = await lerAmostras();
const grupos = montarGrupos(rotulos);
const TOL = 110;

const tabela = [];
grupos.forEach((g, gi) => {
  tabela.push({ item: `DIA ${gi} · cabeçalho  ${rotulos[g.cabecalho].texto}`, 'começa (ms)': inicio[g.cabecalho], 'conclui (ms)': fim[g.cabecalho] });
  g.eventos.forEach((idx, k) => {
    tabela.push({
      item: `   evento ${k + 1}  ${rotulos[idx].texto.slice(0, 24)}`,
      'começa (ms)': inicio[idx],
      'conclui (ms)': fim[idx],
      'passo (ms)': k === 0 ? null : (inicio[idx] ?? 0) - (inicio[g.eventos[k - 1]] ?? 0),
    });
  });
});

const falhas = [];
grupos.forEach((g, gi) => {
  if (g.eventos.length && (inicio[g.eventos[0]] ?? 0) < (fim[g.cabecalho] ?? 0) - TOL) {
    falhas.push(`dia ${gi}: 1º evento começou antes de o cabeçalho concluir`);
  }
  g.eventos.forEach((idx, k) => {
    if (k === 0) return;
    const passo = (inicio[idx] ?? 0) - (inicio[g.eventos[k - 1]] ?? 0);
    if (passo < 60 || passo > 320) falhas.push(`dia ${gi}: passo ${passo}ms fora da faixa (eventos ${k} → ${k + 1})`);
  });
  const proximo = grupos[gi + 1];
  if (proximo) {
    const fimDoDia = g.eventos.length ? (fim[g.eventos[g.eventos.length - 1]] ?? 0) : (fim[g.cabecalho] ?? 0);
    if ((inicio[proximo.cabecalho] ?? 0) < fimDoDia - TOL) {
      falhas.push(`dia ${gi}: cabeçalho do dia seguinte começou antes de o dia concluir (${fimDoDia}ms)`);
    }
  }
});

console.log(JSON.stringify({ sequenciaValida: falhas.length === 0, falhas, tabela }, null, 2));

// Capturas em momentos diferentes da animação (segunda carga, sem amostrador).
await abrirTrilha();
const marcos = [150, 700, 1300, 2400, 5600];
const capturas = [];
let anterior = 0;
for (const [n, marco] of marcos.entries()) {
  await page.waitForTimeout(marco - anterior);
  anterior = marco;
  await page.screenshot({ path: `tmp-sequencia-${n + 1}.png`, clip: { x: 280, y: 300, width: 1300, height: 700 } });
  capturas.push(`tmp-sequencia-${n + 1}.png @${marco}ms`);
}
console.log(JSON.stringify({ capturas }, null, 2));
await browser.close();
