/**
 * TEMPORÁRIO — captura das quatro áreas do Hub de Treinamentos com a camada
 * de imagens (fallbacks visuais) ligada. Não gera imagens nem chama APIs.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-training-images');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));

const ABAS = [
  { chave: 'catalogo', rotulo: /Catálogo/i },
  { chave: 'trilhas', rotulo: /Trilhas/i },
  { chave: 'turmas', rotulo: /Turmas \/ Instâncias/i },
  { chave: 'certificados', rotulo: /Certificados/i },
];

for (const [w, h] of [
  [1600, 900],
  [768, 1024],
  [390, 844],
]) {
  const browser = await chromium.launch();
  const contexto = await browser.newContext({
    storageState: state,
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
  });
  const page = await contexto.newPage();
  const erros = [];
  page.on('pageerror', (erro) => erros.push(`pageerror: ${erro.message}`));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });

  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });

  for (const aba of ABAS) {
    await page.getByRole('tab', { name: aba.rotulo }).click();
    await page.waitForTimeout(1600);
    const dados = await page.evaluate(() => {
      const capas = Array.from(document.querySelectorAll('[data-training-cover]'));
      const main = document.querySelector('main');
      return {
        capas: capas.length,
        fallbacks: capas.filter((c) => c.getAttribute('data-training-cover-estado') === 'fallback').length,
        comImagem: capas.filter((c) => c.getAttribute('data-training-cover-estado') === 'imagem').length,
        porTipo: capas.reduce((acc, c) => {
          const tipo = c.getAttribute('data-training-cover');
          acc[tipo] = (acc[tipo] ?? 0) + 1;
          return acc;
        }, {}),
        imagensExternas: document.querySelectorAll('img[src^="http"]').length,
        overflow: main ? main.scrollWidth - main.clientWidth : null,
      };
    });
    console.log(JSON.stringify({ viewport: `${w}x${h}`, aba: aba.chave, ...dados }));
    await page.screenshot({ path: path.join(SAIDA, `${aba.chave}-${w}x${h}.png`) });
  }

  if (erros.length > 0) console.log(JSON.stringify({ viewport: `${w}x${h}`, erros: erros.slice(0, 8) }));
  await contexto.close();
  await browser.close();
}
