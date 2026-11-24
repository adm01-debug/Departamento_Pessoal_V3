/** TEMPORÁRIO — probe de ABRIR / FECHAR / REABRIR do modal de feedback. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-probe-reabrir';
mkdirSync(OUT, { recursive: true });
const relat = [];
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 950 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
const page = await context.newPage();

const estado = () =>
  page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[role="dialog"]'));
    return {
      t: Math.round(performance.now()),
      quantos: els.length,
      transform: els.map((e) => getComputedStyle(e).transform),
      opacidade: els.map((e) => getComputedStyle(e).opacity),
    };
  });

try {
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.waitForTimeout(1200);

  const primeiro = page.getByRole('button', { name: /Ver feedback|Ver avaliação/ }).first();
  await primeiro.click();
  await page.waitForTimeout(2600);
  relat.push({ passo: '1-aberto', estado: await estado(), texto: await page.getByRole('dialog').last().innerText().then((t) => t.slice(0, 60)) });
  await page.screenshot({ path: `${OUT}/1-aberto.png` });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(2600);
  relat.push({ passo: '2-fechado', estado: await estado() });
  await page.screenshot({ path: `${OUT}/2-fechado.png` });

  await primeiro.click();
  await page.waitForTimeout(300);
  relat.push({ passo: '3-reaberto-300ms', estado: await estado() });
  await page.waitForTimeout(2400);
  relat.push({
    passo: '4-reaberto-estavel',
    estado: await estado(),
    texto: await page.getByRole('dialog').last().innerText().then((t) => t.slice(0, 60)).catch((e) => String(e).slice(0, 80)),
  });
  await page.screenshot({ path: `${OUT}/4-reaberto.png` });

  // Repetição rápida fechar/abrir 3× (o usuário citou "piscadas" e modal invisível).
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1800);
    await primeiro.click();
    await page.waitForTimeout(2000);
    relat.push({ passo: `5-ciclo-${i + 1}`, estado: await estado() });
  }
  await page.screenshot({ path: `${OUT}/5-ciclos.png` });
} catch (erro) {
  relat.push({ passo: 'erro', detalhe: String(erro?.message ?? erro).slice(0, 500) });
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relat, null, 2));
  console.log(JSON.stringify(relat, null, 2));
}
