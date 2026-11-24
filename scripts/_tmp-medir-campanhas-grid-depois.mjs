/** TEMPORÁRIO — mede o grid compartilhado (cabeçalho × linhas) após a mudança. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const SAIDA = 'tmp-campanhas-grid';
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
await page.getByRole('table', { name: 'Campanhas' }).waitFor({ timeout: 30000 });
await page.waitForTimeout(2400);

const relatorio = [];
for (const [w, h] of [
  [1920, 1080],
  [1440, 900],
  [1366, 768],
  [1280, 800],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(700);

  const dados = await page.evaluate(() => {
    const grade = document.querySelector('[role="table"][aria-label="Campanhas"]');
    const rolagem = grade?.parentElement;
    const linhas = [...grade.querySelectorAll('[role="rowgroup"] [role="row"]')];
    const linhaCabecalho = grade.querySelector('[role="rowgroup"] [role="row"]');
    const linhaDados = linhas[1];
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width) };
    };
    const colunas = [...linhaCabecalho.children].map((th, i) => {
      const td = linhaDados?.children[i];
      const rotulo = th.querySelector('span') ?? th;
      const conteudo = td?.firstElementChild ?? td;
      return {
        i,
        rotulo: (th.textContent ?? '').trim(),
        th: r(th),
        td: td ? r(td) : null,
        rotuloX: Math.round(rotulo.getBoundingClientRect().left),
        conteudoX: td ? Math.round(conteudo.getBoundingClientRect().left) : null,
        desalinhamento: td ? Math.round(rotulo.getBoundingClientRect().left - conteudo.getBoundingClientRect().left) : null,
        overflowCelula: td ? Math.round(td.scrollWidth - td.clientWidth) : null,
      };
    });
    return {
      grade: r(grade),
      rolagem: rolagem ? { ...r(rolagem), scrollW: rolagem.scrollWidth, clientW: rolagem.clientWidth } : null,
      templates: {
        cabecalho: getComputedStyle(linhaCabecalho).gridTemplateColumns,
        linha: linhaDados ? getComputedStyle(linhaDados).gridTemplateColumns : null,
        iguais: linhaDados
          ? getComputedStyle(linhaCabecalho).gridTemplateColumns === getComputedStyle(linhaDados).gridTemplateColumns
          : false,
      },
      totalColunas: colunas.length,
      colunas,
      pagina: {
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      },
    };
  });
  relatorio.push({ viewport: `${w}x${h}`, ...dados });
  if (w === 1920 || w === 1440 || w === 1366 || w === 1280) {
    await page.screenshot({ path: `${SAIDA}/depois-${w}.png` });
  }
}

writeFileSync(`${SAIDA}/depois.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
console.log('ERROS', JSON.stringify(erros));
await browser.close();
