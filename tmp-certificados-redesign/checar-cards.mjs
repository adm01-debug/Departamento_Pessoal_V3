/** TEMPORÁRIO — checagens finas de alinhamento/clipping dos cards. */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();

for (const [w, h] of [
  [1440, 900],
  [1280, 800],
  [390, 844],
]) {
  const contexto = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await contexto.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor();
  await page.getByRole('tab', { name: /^Certificados$/ }).click();
  await page.waitForTimeout(1600);
  const info = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-certificado-card]'));
    return cards.map((card) => {
      const badge = card.querySelector('[class*="rounded-full"][class*="border"]');
      const emitido = Array.from(card.querySelectorAll('span')).find((s) => s.textContent?.startsWith('Emitido em'));
      const br = badge?.getBoundingClientRect();
      const er = emitido?.getBoundingClientRect();
      const sobrepoe =
        br && er
          ? !(br.right <= er.left || br.left >= er.right || br.bottom <= er.top || br.top >= er.bottom)
          : null;
      const code = card.querySelector('span.font-mono');
      const validade = card.querySelectorAll('dd')[1]?.querySelector('span');
      const acao = card.querySelector('button[aria-label^="Visualizar certificado"]');
      const cr = card.getBoundingClientRect();
      const ar = acao?.getBoundingClientRect();
      return {
        id: card.getAttribute('data-certificado-card'),
        altura: Math.round(cr.height),
        overflowVertical: card.scrollHeight - card.clientHeight,
        badgeSobrepoeEmitido: sobrepoe,
        codigoCortado: code ? code.scrollWidth > code.clientWidth + 1 : null,
        validadeCortada: validade ? validade.scrollWidth > validade.clientWidth + 1 : null,
        acaoDentroDoCard: ar ? ar.right <= cr.right + 0.5 && ar.bottom <= cr.bottom + 0.5 : null,
      };
    });
  });
  console.log(JSON.stringify({ viewport: `${w}x${h}`, info }));
  await contexto.close();
}

await browser.close();
