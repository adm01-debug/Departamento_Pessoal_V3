/** TEMPORÁRIO — confere o alinhamento nos estados de 2 botões
 *  (aprovada → "Validar Potencial"; devolvida → "Reenviar ao gestor"). */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1568, height: 1000 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor', 'rh']) })
);
await context.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
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
        const botoes = Array.from(card.querySelectorAll('button')).filter((b) => {
          const h = b.getBoundingClientRect().height;
          return h > 20 && h < 40;
        });
        const border = card.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(card).paddingRight || '0');
        const bDir = botoes.length ? Math.max(...botoes.map((b) => b.getBoundingClientRect().right)) : null;
        return {
          nome: (card.querySelector('h3')?.textContent ?? '').trim(),
          estado: (selo?.textContent ?? '').trim(),
          botoes: botoes.map((b) => (b.textContent ?? '').trim()),
          larguraColuna: coluna ? Number(coluna.getBoundingClientRect().width.toFixed(2)) : null,
          sobraSelo: dir(selo) === null ? null : Number((border - dir(selo)).toFixed(2)),
          sobraNotas: dir(notas) === null ? null : Number((border - dir(notas)).toFixed(2)),
          sobraAcoes: bDir === null ? null : Number((border - bDir).toFixed(2)),
        };
      });
  });

try {
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.waitForTimeout(1500);
  await page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Aguardando gestor/ })
    .first()
    .click();
  await page.waitForTimeout(1800);

  out.antes = await medir(page);

  // Aprova a primeira linha (vira "Aprovada pelo gestor" ⇒ 2 botões no RH).
  const aprovar = page.getByRole('button', { name: 'Aprovar' }).first();
  if (await aprovar.isEnabled().catch(() => false)) {
    await aprovar.click();
    await page.waitForTimeout(2800);
  }
  out.depoisDeAprovar = await medir(page);
  await page.screenshot({ path: 'tmp-alinhamento-direita/estado-aprovada.png' });

  // Devolve outra linha (⇒ "Devolvida para correção" com "Reenviar ao gestor").
  const devolver = page.getByRole('button', { name: 'Devolver' }).first();
  if (await devolver.isEnabled().catch(() => false)) {
    await devolver.click();
    const dialogo = page.getByRole('dialog').last();
    await dialogo.waitFor({ timeout: 15000 });
    await page.waitForTimeout(1300);
    await dialogo.locator('textarea').first().fill('Revisar os pontos de melhoria antes da aprovação.');
    await dialogo.getByRole('button', { name: /Confirmar devolução/i }).click();
    await page.waitForTimeout(2800);
  }
  out.depoisDeDevolver = await medir(page);
  await page.screenshot({ path: 'tmp-alinhamento-direita/estado-devolvida.png' });
} catch (erro) {
  out.erro = String(erro?.message ?? erro).slice(0, 400);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync('tmp-alinhamento-direita/estados-2-botoes.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2).slice(0, 5000));
}
