import { chromium } from '@playwright/test';

/** AUDITORIA E2E — B-01: agenda e calendário acompanham os filtros. */
const resultados = [];
const registrar = (id, esperado, obtido) => {
  const ok =
    esperado && typeof esperado === 'object' && !Array.isArray(esperado)
      ? Object.entries(esperado).every(([chave, valor]) => JSON.stringify(obtido?.[chave]) === JSON.stringify(valor))
      : JSON.stringify(esperado) === JSON.stringify(obtido);
  resultados.push({ id, status: ok ? 'APROVADO' : 'REPROVADO', esperado, obtido });
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

const abrirTurmas = async () => {
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.getByRole('tab', { name: /Turmas/ }).click();
  await page.waitForTimeout(1500);
};

const estado = () =>
  page.evaluate(() => ({
    range: document.querySelector('[data-agenda-range]')?.textContent?.trim() ?? null,
    cards: document.querySelectorAll('[data-turma-card]').length,
    eventos: [...document.querySelectorAll('[data-agenda-evento]')].map((e) => e.getAttribute('data-agenda-evento')),
    vazio: Boolean(document.body.innerText.includes('Nenhuma turma encontrada')),
  }));

const escolherStatus = async (nome) => {
  await page.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: nome }).click();
  await page.waitForTimeout(600);
};

const escolherModalidade = async (nome) => {
  await page.getByRole('combobox', { name: 'Modalidade' }).click();
  await page.getByRole('option', { name: nome }).click();
  await page.waitForTimeout(600);
};

const abrirCalendario = async () => {
  await page.getByRole('button', { name: /Ver calendário completo/i }).click();
  await page.waitForTimeout(1400);
  return page.evaluate(() => {
    const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
    return {
      mes: dialogo?.querySelector('[data-calendario-mes]')?.textContent?.trim() ?? null,
      chips: [...(dialogo?.querySelectorAll('[data-calendario-turma]') ?? [])]
        .filter((chip) => !chip.closest('[data-calendario-lista-mes]'))
        .map((chip) => chip.getAttribute('data-calendario-turma')),
      vazio: Boolean(dialogo?.innerText.includes('Nenhuma turma neste mês.')),
    };
  });
};

const fecharCalendario = async () => {
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.waitForTimeout(1800);
};

await abrirTurmas();
registrar('B01-00', { range: '14 set – 20 set 2026', cards: 5 }, await estado());

await escolherStatus('Concluído');
const concluido = await estado();
registrar('B01-01', { range: '17 ago – 23 ago 2026', cards: 2, eventos: ['mock-inst-5'] }, {
  range: concluido.range,
  cards: concluido.cards,
  eventos: concluido.eventos,
});
await page.screenshot({ path: 'tmp-auditoria/b01-desktop-concluido.png' });

await page.getByRole('button', { name: 'Próxima semana' }).click();
await page.waitForTimeout(300);
registrar('B01-02', '24 ago – 30 ago 2026', (await estado()).range);
await page.getByRole('button', { name: 'Semana anterior' }).click();
await page.waitForTimeout(300);
registrar('B01-03', '17 ago – 23 ago 2026', (await estado()).range);

const calendarioConcluido = await abrirCalendario();
registrar('B01-04', { mes: 'Agosto de 2026', chips: ['mock-inst-5'] }, {
  mes: calendarioConcluido.mes,
  chips: calendarioConcluido.chips,
});
await page.screenshot({ path: 'tmp-auditoria/b01-calendario-agosto.png' });
await fecharCalendario();

await escolherStatus('Em andamento');
const andamento = await estado();
registrar('B01-05', { range: '27 jul – 02 ago 2026', cards: 1, eventos: ['mock-inst-3'] }, {
  range: andamento.range,
  cards: andamento.cards,
  eventos: andamento.eventos,
});
const calendarioAndamento = await abrirCalendario();
registrar('B01-06', { mes: 'Agosto de 2026', chips: ['mock-inst-3'] }, {
  mes: calendarioAndamento.mes,
  chips: calendarioAndamento.chips,
});
await fecharCalendario();

await escolherStatus('Planejado');
registrar('B01-07', { range: '14 set – 20 set 2026', cards: 2 }, await estado());

await page.getByLabel('Buscar turmas').fill('NR-35');
await page.waitForTimeout(600);
registrar('B01-08', { range: '14 set – 20 set 2026', cards: 1, eventos: ['mock-inst-2'] }, await estado());

await page.getByLabel('Buscar turmas').fill('NR-17');
await escolherModalidade('Presencial');
await page.waitForTimeout(600);
registrar('B01-09', { range: '31 ago – 06 set 2026', cards: 1, eventos: ['mock-inst-1'] }, await estado());

await page.getByLabel('Buscar turmas').fill('nao-existe');
await page.waitForTimeout(600);
const semResultado = await estado();
registrar('B01-10', { range: '19 out – 25 out 2026', cards: 0, vazio: true }, {
  range: semResultado.range,
  cards: semResultado.cards,
  vazio: semResultado.vazio,
});
const calendarioVazio = await abrirCalendario();
registrar('B01-11', { mes: 'Outubro de 2026', chips: [], vazio: true }, calendarioVazio);
await fecharCalendario();

await page.getByRole('button', { name: 'Limpar filtros' }).first().click();
await page.waitForTimeout(700);
registrar('B01-12', { range: '14 set – 20 set 2026', cards: 5 }, await estado());
await page.screenshot({ path: 'tmp-auditoria/b01-desktop.png' });

/* Mobile: mesmo recorte filtrado */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
await escolherStatus('Concluído');
await page.waitForTimeout(800);
registrar('B01-13', { range: '17 ago – 23 ago 2026', cards: 2 }, await estado());
await page.screenshot({ path: 'tmp-auditoria/b01-mobile.png', fullPage: true });
const calendarioMobile = await abrirCalendario();
registrar('B01-14', { mes: 'Agosto de 2026', chips: ['mock-inst-5'] }, {
  mes: calendarioMobile.mes,
  chips: calendarioMobile.chips,
});
await page.screenshot({ path: 'tmp-auditoria/b01-mobile-calendario.png', fullPage: false });

console.log(JSON.stringify(resultados, null, 2));
await browser.close();
