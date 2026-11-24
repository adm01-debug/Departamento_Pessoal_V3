/** TEMPORÁRIO — mede o grid de Pagamentos DEPOIS da mudança. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const SAIDA = 'tmp-pagamentos-grid';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const contexto = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: 'e2e/.auth/user.json',
});
await contexto.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await contexto.newPage();
page.setDefaultTimeout(20000);
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));

await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: /^Pagamentos$/ }).click();
await page.getByRole('table', { name: 'Pagamentos' }).waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);

const relatorio = [];
for (const [w, h] of [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(700);

  const dados = await page.evaluate(() => {
    const grade = document.querySelector('[role="table"][aria-label="Pagamentos"]');
    const rolagem = grade?.parentElement;
    const linhas = [...grade.querySelectorAll('[role="rowgroup"] [role="row"]')];
    const cabecalho = linhas[0];
    const dadosLinha = linhas[1];
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width) };
    };
    const inicioTexto = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const b = range.getBoundingClientRect();
      return Math.round(b.left);
    };
    return {
      grade: r(grade),
      rolagem: { scrollW: rolagem.scrollWidth, clientW: rolagem.clientWidth },
      pagina: { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth },
      templates: {
        cabecalho: getComputedStyle(cabecalho).gridTemplateColumns,
        linha: dadosLinha ? getComputedStyle(dadosLinha).gridTemplateColumns : null,
        iguais:
          dadosLinha && getComputedStyle(cabecalho).gridTemplateColumns === getComputedStyle(dadosLinha).gridTemplateColumns,
      },
      colunas: [...cabecalho.children].map((th, i) => {
        const td = dadosLinha?.children[i];
        const rotulo = th.querySelector('span') ?? th;
        return {
          i,
          rotulo: (th.textContent ?? '').trim(),
          th: r(th),
          td: td ? r(td) : null,
          rotuloX: Math.round(rotulo.getBoundingClientRect().left),
          conteudoX: td ? inicioTexto(td) : null,
          desalinhamento: td ? Math.round(rotulo.getBoundingClientRect().left - inicioTexto(td)) : null,
          overflowCelula: td ? Math.round(td.scrollWidth - td.clientWidth) : null,
        };
      }),
    };
  });
  relatorio.push({ viewport: `${w}x${h}`, ...dados });
  if ([1920, 1600, 1440, 1280].includes(w)) {
    await page.screenshot({ path: `${SAIDA}/depois-${w}.png` });
  }
}

writeFileSync(`${SAIDA}/depois.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
console.log('ERROS', JSON.stringify(erros));
await browser.close();
