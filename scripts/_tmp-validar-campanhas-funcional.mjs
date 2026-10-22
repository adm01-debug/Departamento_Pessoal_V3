/** TEMPORÁRIO — funcionalidade/animação da tabela de Campanhas após o grid. */
import { chromium } from '@playwright/test';
import { appendFileSync, existsSync } from 'node:fs';

const log = (m) => appendFileSync('tmp-campanhas-grid/funcional.log', `${m}\n`);
const browser = await chromium.launch();
const contexto = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: existsSync('e2e/.auth/user.json') ? 'e2e/.auth/user.json' : undefined,
});
await contexto.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await contexto.newPage();
page.setDefaultTimeout(20000);
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));

await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
const grade = page.getByRole('table', { name: 'Campanhas' });
await grade.waitFor({ timeout: 30000 });

// Animação: mede opacidade da 1ª linha durante a entrada.
const amostra = await page.evaluate(async () => {
  const inicio = performance.now();
  const amostras = [];
  await new Promise((resolve) => {
    const tick = () => {
      const linha = document.querySelector('[role="rowgroup"] [role="row"]:nth-child(2)');
      if (linha) {
        const cs = getComputedStyle(linha);
        amostras.push({
          t: Math.round(performance.now() - inicio),
          op: Number(cs.opacity),
          tr: cs.transform,
        });
      }
      if (performance.now() - inicio < 1800) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  const comecou = amostras.find((a) => a.op > 0.02);
  const terminou = amostras.find((a) => a.op >= 0.99 && (a.tr === 'none' || a.tr === ''));
  return {
    opInicial: amostras[0]?.op ?? null,
    trInicial: amostras[0]?.tr ?? null,
    inicioMs: comecou?.t ?? null,
    fimMs: terminou?.t ?? null,
    duracaoMs: comecou && terminou ? terminou.t - comecou.t : null,
  };
});
log(JSON.stringify({ etapa: 'animacao', ...amostra }));

await page.waitForTimeout(2200);

// Funcionalidade: detalhes da campanha.
await page.getByRole('button', { name: /Ver campanha|Revisar campanha|Ver resultados/ }).first().click();
await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
const tituloDialogo = (await page.locator('[role="dialog"]').innerText()).replace(/\s+/g, ' ').slice(0, 60);
await page.keyboard.press('Escape');
await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 8000 });
log(JSON.stringify({ etapa: 'detalhes', tituloDialogo }));

// Menu de três pontos.
await page.getByRole('button', { name: /Mais ações de/ }).first().click();
const menu = await page.getByRole('menu').innerText();
await page.keyboard.press('Escape');
log(JSON.stringify({ etapa: 'menu', itens: menu.replace(/\s+/g, ' ').slice(0, 90) }));

// Ordenação.
const primeiraAntes = (await page.locator('[role="rowgroup"] [role="row"]:nth-child(2)').innerText()).slice(0, 40);
await page.getByLabel('Ordenar por').click();
await page.getByRole('option', { name: 'Mais antigas' }).click();
await page.waitForTimeout(1600);
const primeiraDepois = (await page.locator('[role="rowgroup"] [role="row"]:nth-child(2)').innerText()).slice(0, 40);
log(JSON.stringify({ etapa: 'ordenacao', mudou: primeiraAntes !== primeiraDepois }));

// Busca sem resultado → estado vazio dentro do grid.
await page.getByLabel(/Buscar campanhas/i).fill('zzzz-sem-campanha');
await page.waitForTimeout(1200);
log(
  JSON.stringify({
    etapa: 'vazio',
    textoVazio: await page.getByText(/Nenhuma campanha|corresponde/i).first().innerText().catch(() => null),
    linhasDeDados: await page.locator('[role="rowgroup"] [role="row"][role="row"]').count(),
  })
);

log(JSON.stringify({ erros }));
await browser.close();
