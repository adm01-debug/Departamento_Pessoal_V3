import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const monitor = () => {
  const s = { min: 1, t0: performance.now(), reset: null };
  window.__m = s;
  const loop = (t) => {
    const l = document.querySelector('table tbody tr');
    if (l) {
      const o = Number(getComputedStyle(l).opacity);
      s.min = Math.min(s.min, o);
      if (o < 0.99 && s.reset == null) s.reset = Math.round(t - s.t0);
    }
    if (t - s.t0 < 1900) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Candidatos', exact: true }).click();
await page.locator('table tbody tr').first().waitFor({ state: 'attached' });
await page.waitForTimeout(1800);

// Perfil: abre, fecha pelo botão real e a lista não reanima.
await page.locator('table tbody tr').first().getByRole('button', { name: /Ver perfil de/ }).click();
const abriu = await page.getByRole('dialog').isVisible();
await page.evaluate(monitor);
await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).last().click();
await page.waitForTimeout(1900);
const aposFechar = await page.evaluate(() => window.__m);
const dialogosRestantes = await page.getByRole('dialog').count();

// Ordenação: troca e mede reanimação.
await page.evaluate(monitor);
await page.getByRole('combobox').filter({ hasText: 'Mais recentes' }).click();
await page.getByRole('option', { name: 'Nome (A–Z)' }).click();
await page.waitForTimeout(1900);
const medOrdenacao = await page.evaluate(() => window.__m).catch(() => null);
const ordemNomes = await page.locator('table tbody tr td:nth-child(2)').allInnerTexts();

// Tamanho da página: 8 → 4.
await page.evaluate(monitor);
const comboItens = page.locator('[aria-label="Itens por página"]');
await comboItens.click();
await page.getByRole('option', { name: '16', exact: true }).click();
await page.waitForTimeout(1900);
const medTamanho = await page.evaluate(() => window.__m);
const linhas4 = await page.locator('table tbody tr').count();
const rodape4 = (await page.locator('body').innerText()).match(/Mostrando[^\n]*/)?.[0] ?? null;

// F5: recarrega e confirma novamente a cascata (primeira opacidade 0).
await page.reload({ waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Candidatos', exact: true }).click();
await page.locator('table tbody tr').first().waitFor({ state: 'attached' });
await page.waitForTimeout(100);
const opacidadeLogoAposMontar = await page.evaluate(() =>
  Number(getComputedStyle(document.querySelector('table tbody tr')).opacity)
);
await page.waitForTimeout(1600);
const opacidadeFinal = await page.evaluate(() =>
  Number(getComputedStyle(document.querySelector('table tbody tr')).opacity)
);
const semInstabilidade = await page.evaluate(
  () => !document.body.innerText.includes('Instabilidade Detectada')
);

const saida = {
  perfil: {
    abriu,
    fechou: dialogosRestantes === 0,
    reanimouAoFechar: aposFechar.min < 0.9,
    minOpacidade: aposFechar.min,
  },
  ordenacao: { reanimou: (medOrdenacao?.min ?? 1) < 0.9, ordemNomes: ordemNomes.slice(0, 4) },
  tamanhoPagina: { reanimou: medTamanho.min < 0.9, linhas: linhas4, rodape: rodape4 },
  f5: { opacidadeLogoAposMontar, opacidadeFinal, semInstabilidade },
};
writeFileSync('tmp-anim-candidatos/fechar-ordem.json', JSON.stringify(saida, null, 2), 'utf8');
console.log(JSON.stringify(saida, null, 2));
await browser.close();
