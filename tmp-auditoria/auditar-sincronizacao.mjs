import { chromium } from '@playwright/test';

/** AUDITORIA — sincronização semana → mês e fechamento do modal. */
const resultados = [];
const registrar = (id, descricao, esperado, obtido) => {
  const ok = JSON.stringify(esperado) === JSON.stringify(obtido);
  resultados.push({ id, descricao, status: ok ? 'APROVADO' : 'REPROVADO', esperado, obtido });
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
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
await page.getByRole('tab', { name: /Turmas/ }).click();
await page.waitForTimeout(1500);

for (let passo = 0; passo < 3; passo += 1) {
  await page.getByRole('button', { name: 'Próxima semana' }).click();
  await page.waitForTimeout(200);
}
const range = await page.locator('[data-agenda-range]').innerText();
registrar('SYNC-01', 'Agenda navega para outubro', '05 out – 11 out 2026', range.trim());

await page.getByRole('button', { name: /Ver calendário completo/i }).click();
await page.waitForTimeout(1400);
const mes = await page.locator('[data-calendario-mes]').innerText();
registrar('SYNC-02', 'Calendário abre no mês da semana exibida', 'Outubro de 2026', mes.trim());

await page.getByRole('button', { name: 'Fechar' }).click();
await page.waitForTimeout(1800);
registrar('SYNC-03', 'Botão Fechar encerra o modal', 0, await page.locator('[role="dialog"]').count());

await page.getByRole('button', { name: 'Semana anterior' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Semana anterior' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Semana anterior' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Ver calendário completo/i }).click();
await page.waitForTimeout(1400);
const mesReaberto = await page.locator('[data-calendario-mes]').innerText();
registrar('SYNC-04', 'Reabrir volta ao mês da semana atual (não lembra o mês anterior)', 'Setembro de 2026', mesReaberto.trim());

await page.getByRole('button', { name: 'Próximo mês' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Fechar' }).click();
await page.waitForTimeout(1800);
await page.getByRole('button', { name: /Ver calendário completo/i }).click();
await page.waitForTimeout(1400);
registrar('SYNC-05', 'Reabrir reinicia no mês da agenda (não em novembro)', 'Setembro de 2026', (await page.locator('[data-calendario-mes]').innerText()).trim());

console.log(JSON.stringify(resultados, null, 2));
await browser.close();
