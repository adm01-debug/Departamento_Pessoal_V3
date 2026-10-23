/**
 * TEMPORÁRIO — mede o bloco Emissão / Validade / Código dos certificados.
 */
import { chromium } from '@playwright/test';

const larguras = process.argv.slice(2).map(Number);
const alvos = larguras.length ? larguras : [1920, 1600, 1440, 1366, 1280, 1024, 390];
const b = await chromium.launch();
const saida = [];

for (const width of alvos) {
  const c = await b.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.getByRole('tab', { name: 'Certificados' }).click();
  await p.waitForTimeout(2200);
  await p.locator('[data-certificado-card]').first().waitFor();

  const dados = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    return [...document.querySelectorAll('[data-certificado-card]')].map((card) => {
      const dl = card.querySelector('[data-certificado-metadados]');
      const cols = [...dl.querySelectorAll('[data-meta]')];
      const labels = cols.map((col) => r(col.querySelector('dt')));
      const values = cols.map((col) => r(col.querySelector('dd')));
      const code = dl.querySelector('[data-meta="codigo"] dd span');
      const copy = dl.querySelector('[data-meta="codigo"] button');
      const detail = dl.querySelector('[data-validade-detalhe]');
      const footer = card.querySelector('button[aria-label^="Visualizar certificado"]');
      const cRect = r(card);
      const dRect = r(dl);
      const fRect = r(footer);
      return {
        id: card.getAttribute('data-certificado-card'),
        status: card.querySelector('[class*="badge"], span')?.textContent?.trim(),
        cardH: cRect ? Math.round(cRect.height) : null,
        metaH: dRect ? Math.round(dRect.height) : null,
        metaTop: dRect ? Math.round(dRect.top) : null,
        metaOverflow: dl.scrollWidth - dl.clientWidth,
        labelsTop: labels.map((x) => (x ? Math.round(x.top) : null)),
        valuesTop: values.map((x) => (x ? Math.round(x.top) : null)),
        code: {
          texto: code?.textContent?.trim(),
          truncado: code ? code.scrollWidth > code.clientWidth : null,
          gapCopiar: code && copy ? Math.round(r(copy).left - r(code).right) : null,
          copiarVisivel: !!copy,
        },
        validade: {
          texto: dl.querySelector('[data-meta="validade"] dd span')?.textContent?.trim(),
          detalhe: detail?.textContent?.trim() || null,
          detalheH: detail ? Math.round(r(detail).height) : null,
        },
        rodape: fRect && cRect ? { top: Math.round(fRect.top), bottomInset: Math.round(cRect.bottom - fRect.bottom) } : null,
        colunas: getComputedStyle(dl).gridTemplateColumns,
      };
    });
  });

  let copia = null;
  if (width === 1600) {
    const botao = p.locator('[data-certificado-card] [data-meta="codigo"] button').first();
    if (await botao.count()) {
      await botao.click();
      await p.waitForTimeout(500);
      copia = {
        clipboard: await p.evaluate(() => navigator.clipboard.readText()),
        tooltip: await botao.getAttribute('title'),
        toast: (await p.locator('text=Código copiado').count()) > 0,
      };
    }
  }

  saida.push({ width, dados, copia });
  await p.locator('[data-certificados-grid]').screenshot({ path: `tmp-turmas-fidelidade/certificados-${width}.png` });
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
