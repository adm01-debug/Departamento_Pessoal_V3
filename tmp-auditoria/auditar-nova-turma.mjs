import { chromium } from '@playwright/test';

/** AUDITORIA — formulário Nova Turma no modo mock (somente leitura). */
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

const estadoPainel = () =>
  page.evaluate(() => ({
    cards: document.querySelectorAll('[data-turma-card]').length,
    range: document.querySelector('[data-agenda-range]')?.textContent?.trim() ?? null,
    eventos: document.querySelectorAll('[data-agenda-evento]').length,
  }));

const antes = await estadoPainel();
const botaoNovaTurma = page.getByRole('button', { name: /Nova Turma/i });
registrar('NT-00', 'CTA “Nova Turma” disponível para o perfil admin', true, (await botaoNovaTurma.count()) > 0);
await botaoNovaTurma.first().click();
await page.waitForTimeout(700);

const formulario = await page.evaluate(() => {
  const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
  const campos = [
    ...(dialogo?.querySelectorAll('input, [role="combobox"], #nova-turma-data') ?? []),
  ].map((campo) => campo.getAttribute('id'));
  return {
    texto: dialogo?.innerText.replace(/\n+/g, ' · ').trim() ?? null,
    campos: [...new Set(campos)].filter(Boolean).sort(),
  };
});
registrar(
  'NT-01',
  'Campos existentes no formulário',
  ['nova-turma-capacidade', 'nova-turma-curso', 'nova-turma-data', 'nova-turma-hora', 'nova-turma-instrutor', 'nova-turma-local'],
  formulario.campos
);
registrar(
  'NT-02',
  'Sem campos de data de término, modalidade e status',
  { termino: false, modalidade: false, status: false },
  {
    termino: Boolean(formulario.texto?.includes('Data de término')),
    modalidade: Boolean(formulario.texto?.includes('Modalidade')),
    status: Boolean(formulario.texto?.includes('Status')),
  }
);

const salvar = page.getByRole('button', { name: 'Salvar', exact: true });
registrar('NT-03', 'Salvar desabilitado sem curso/data/horário', true, await salvar.isDisabled());

await page.getByRole('combobox', { name: 'Curso da nova turma' }).click();
await page.getByRole('option').first().click();
await page.locator('#nova-turma-data').click();
await page.getByRole('button', { name: 'Hoje', exact: true }).click();
await page.waitForTimeout(300);
await page.locator('#nova-turma-hora').fill('09:00');
await page.locator('#nova-turma-local').fill('Sala 99');
await page.locator('#nova-turma-capacidade').fill('20');
await page.waitForTimeout(300);
registrar('NT-04', 'Salvar habilitado com dados válidos', true, await salvar.isEnabled());

await salvar.click();
await page.waitForTimeout(900);
const textoPagina = await page.evaluate(() => document.body.innerText);
const depois = await estadoPainel();
registrar(
  'NT-05',
  'Modo mock bloqueia a escrita com aviso explícito',
  true,
  textoPagina.includes('Modo demonstração') && textoPagina.includes('não é gravado')
);
registrar('NT-06', 'Nenhum card é criado no modo mock', antes.cards, depois.cards);
registrar(
  'NT-07',
  'Agenda permanece inalterada no modo mock',
  { range: antes.range, eventos: antes.eventos },
  { range: depois.range, eventos: depois.eventos }
);
registrar('NT-08', 'Modal permanece aberto após o bloqueio (nada foi salvo)', true, (await page.locator('[role="dialog"]').count()) > 0);

await page.keyboard.press('Escape');
await page.waitForTimeout(1600);
await botaoNovaTurma.first().click();
await page.waitForTimeout(700);
const reaberto = await page.evaluate(() => {
  const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
  return {
    data: dialogo?.querySelector('#nova-turma-data')?.textContent?.trim() ?? null,
    hora: dialogo?.querySelector('#nova-turma-hora')?.value ?? null,
    local: dialogo?.querySelector('#nova-turma-local')?.value ?? null,
    capacidade: dialogo?.querySelector('#nova-turma-capacidade')?.value ?? null,
  };
});
registrar(
  'NT-09',
  'Reabrir o formulário começa limpo',
  { data: 'Selecionar data', hora: '', local: '', capacidade: '' },
  reaberto
);

await page.screenshot({ path: 'tmp-auditoria/nova-turma.png' });
console.log(JSON.stringify(resultados, null, 2));
await browser.close();
