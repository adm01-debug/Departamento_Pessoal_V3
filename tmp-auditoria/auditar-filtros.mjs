import { chromium } from '@playwright/test';

/** AUDITORIA — filtros do painel x agenda x calendário. */
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

const estado = () =>
  page.evaluate(() => ({
    cards: document.querySelectorAll('[data-turma-card]').length,
    range: document.querySelector('[data-agenda-range]')?.textContent?.trim() ?? null,
    eventos: document.querySelectorAll('[data-agenda-evento]').length,
  }));

await page.getByRole('combobox', { name: 'Status' }).click();
await page.getByRole('option', { name: 'Concluído' }).click();
await page.waitForTimeout(600);
const concluido = await estado();
registrar(
  'FIL-01',
  'Filtro Concluído reduz os cards',
  { cards: 2, range: '14 set – 20 set 2026', eventos: 0 },
  concluido
);
registrar(
  'FIL-02',
  'Agenda mantém a semana calculada sem filtros (14–20/09)',
  '14 set – 20 set 2026',
  concluido.range
);

await page.getByRole('button', { name: /Ver calendário completo/i }).click();
await page.waitForTimeout(700);
const calConcluido = await page.evaluate(() => {
  const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
  return {
    mes: dialogo?.querySelector('[data-calendario-mes]')?.textContent?.trim() ?? null,
    chips: [...(dialogo?.querySelectorAll('[data-calendario-turma]') ?? [])].filter(
      (chip) => !chip.closest('[data-calendario-lista-mes]')
    ).length,
    vazio: Boolean(dialogo?.innerText.includes('Nenhuma turma neste mês.')),
  };
});
registrar(
  'FIL-03',
  'Calendário abre em setembro e respeita o filtro (vazio)',
  { mes: 'Setembro de 2026', chips: 0, vazio: true },
  { mes: calConcluido.mes, chips: calConcluido.chips, vazio: calConcluido.vazio }
);
await page.keyboard.press('Escape');
await page.waitForTimeout(1800);
await page.getByRole('button', { name: /Limpar filtros/i }).click();
await page.waitForTimeout(500);
registrar('FIL-04', 'Limpar filtros restaura os cinco cards', 5, (await estado()).cards);

await page.getByLabel('Buscar turmas').fill('NR-35');
await page.waitForTimeout(600);
const busca = await estado();
registrar(
  'FIL-05',
  'Busca NR-35 deixa um card e um evento',
  { cards: 1, range: '14 set – 20 set 2026', eventos: 1 },
  busca
);
await page.getByRole('button', { name: /Ver calendário completo/i }).click();
await page.waitForTimeout(700);
const calBusca = await page.evaluate(() => {
  const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
  return [...(dialogo?.querySelectorAll('[data-calendario-turma]') ?? [])]
    .filter((chip) => !chip.closest('[data-calendario-lista-mes]'))
    .map((chip) => chip.getAttribute('data-calendario-turma'));
});
registrar('FIL-06', 'Calendário reflete a busca (apenas NR-35)', ['mock-inst-2'], calBusca);

await page.keyboard.press('Escape');
await page.waitForTimeout(1800);
await page.getByRole('button', { name: /Limpar filtros/i }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'tmp-auditoria/filtros.png' });

console.log(JSON.stringify(resultados, null, 2));
await browser.close();
