import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const resultados = {};

async function novaPagina(options = {}) {
  const context = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  await page.addInitScript((reduzido) => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
    if (reduzido) localStorage.setItem('dp-force-motion', 'off');
  }, !!options.reducedMotion);
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Treinamentos' }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  return { context, page };
}

// A. foco entra no diálogo e volta ao gatilho; 5 ciclos sem flicker
{
  const { context, page } = await novaPagina();
  await page.getByRole('tab', { name: 'Inscrições' }).click();
  await page.waitForTimeout(600);
  const ciclos = [];
  for (let i = 0; i < 5; i++) {
    const gatilho = page.getByRole('button', { name: 'Nova Inscrição' });
    await gatilho.click();
    await page.waitForTimeout(120);
    const focoDentro = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    await page.waitForTimeout(1000);
    const antes = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d ? { transform: getComputedStyle(d).transform, opacity: getComputedStyle(d).opacity } : null;
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    const depois = await page.locator('[role="dialog"]').count();
    const focoTexto = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
    ciclos.push({ focoDentro, antes, depois, focoTexto, ok: focoDentro && antes?.transform === 'none' && antes?.opacity === '1' && depois === 0 && focoTexto.includes('Nova Inscrição') });
  }
  resultados.focoERepeticao = ciclos;
  await context.close();
}

// B. digitação não reinicia o shell
{
  const { context, page } = await novaPagina();
  await page.getByRole('tab', { name: 'Turmas / Instâncias' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Nova Turma' }).first().click();
  await page.waitForTimeout(1100);
  const antes = await page.evaluate(() => getComputedStyle(document.querySelector('[role="dialog"]')).transform);
  await page.getByLabel('Local / link').fill('Sala 12');
  await page.waitForTimeout(450);
  const depois = await page.evaluate(() => ({
    transform: getComputedStyle(document.querySelector('[role="dialog"]')).transform,
    valor: document.querySelector('#nova-turma-local')?.value,
  }));
  resultados.digitacao = { antes, depois, ok: antes === 'none' && depois.transform === 'none' && depois.valor === 'Sala 12' };
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  await context.close();
}

// C. prefers-reduced-motion: modal funcional e visível, sem depender de deslocamento
{
  const { context, page } = await novaPagina({ reducedMotion: 'reduce' });
  await page.getByRole('tab', { name: 'Inscrições' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Nova Inscrição' }).click();
  await page.waitForTimeout(120);
  const estado = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const s = getComputedStyle(d);
    const overlay = [...document.querySelectorAll('div')].find((x) => String(x.className).includes('backdrop-blur-sm'));
    return {
      transform: s.transform,
      opacity: s.opacity,
      overlay: overlay ? getComputedStyle(overlay).opacity : null,
      visivel: !!(d.getBoundingClientRect().width && d.getBoundingClientRect().height),
    };
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1100);
  const fechou = (await page.locator('[role="dialog"]').count()) === 0;
  resultados.movimentoReduzido = { estado, fechou, ok: !!estado?.visivel && estado.opacity === '1' && fechou };
  await context.close();
}

console.log(JSON.stringify(resultados, null, 2));
await browser.close();
