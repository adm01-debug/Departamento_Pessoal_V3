/** TEMPORÁRIO — alinhamento à direita em TODOS os ciclos disponíveis. */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1568, height: 1000 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
const page = await context.newPage();
const out = {};

const medir = () =>
  page.evaluate(() => {
    const dir = (el) => (el ? Number(el.getBoundingClientRect().right.toFixed(2)) : null);
    return Array.from(document.querySelectorAll('div[class*="rounded-xl"]'))
      .filter((el) => /gestor responsável/i.test(el.innerText ?? ''))
      .map((card) => {
        const selo = card.querySelector('[role="status"]');
        const coluna = selo?.parentElement ?? null;
        const notas = coluna?.querySelector(':scope > div') ?? null;
        const potencial = notas?.children[1] ?? null;
        const acoes = Array.from(card.querySelectorAll('button')).filter((b) => {
          const h = b.getBoundingClientRect().height;
          return h > 20 && h < 40;
        });
        const border = card.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(card).paddingRight || '0');
        const aDir = acoes.length ? Math.max(...acoes.map((b) => b.getBoundingClientRect().right)) : null;
        const vals = [dir(potencial), dir(notas), dir(selo), aDir].filter((v) => v !== null);
        return {
          estado: (selo?.textContent ?? '').trim(),
          botoes: acoes.map((b) => (b.textContent ?? '').trim()),
          bordaInterna: Number(border.toFixed(2)),
          potencial: dir(potencial),
          status: dir(selo),
          acoes: aDir,
          mesmaBorda: Math.max(...vals) - Math.min(...vals) <= 1,
        };
      });
  });

try {
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.waitForTimeout(1500);

  await page.locator('[role="combobox"]').first().click();
  await page.waitForTimeout(700);
  const opcoes = page.getByRole('option');
  const total = await opcoes.count();
  const ciclos = [];
  for (let i = 0; i < total; i += 1) {
    ciclos.push(((await opcoes.nth(i).textContent()) ?? '').trim());
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  out.ciclosDisponiveis = ciclos;

  for (const ciclo of ciclos) {
    if (!ciclo) continue;
    await page.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(600);
    const itens = page.getByRole('option');
    const n = await itens.count();
    let achou = false;
    for (let i = 0; i < n; i += 1) {
      if ((((await itens.nth(i).textContent()) ?? '').trim()) === ciclo) {
        await itens.nth(i).click();
        achou = true;
        break;
      }
    }
    if (!achou) {
      await page.keyboard.press('Escape');
      continue;
    }
    await page.waitForTimeout(2000);
    await page
      .getByRole('group', { name: 'Segmentar por tipo de feedback' })
      .getByRole('button', { name: /Aguardando gestor/ })
      .first()
      .click();
    await page.waitForTimeout(1800);
    const linhas = await medir();
    out[ciclo] = { linhas: linhas.length, amostra: linhas.slice(0, 3) };
    if (linhas.length) await page.screenshot({ path: `tmp-alinhamento-direita/ciclo-${ciclo.replace(/[^\w]+/g, '-')}.png` });
    await page
      .getByRole('group', { name: 'Segmentar por tipo de feedback' })
      .getByRole('button', { name: /Todos/ })
      .first()
      .click();
    await page.waitForTimeout(1200);
  }
} catch (erro) {
  out.erro = String(erro?.message ?? erro).slice(0, 400);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync('tmp-alinhamento-direita/ciclos.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2).slice(0, 6000));
}
