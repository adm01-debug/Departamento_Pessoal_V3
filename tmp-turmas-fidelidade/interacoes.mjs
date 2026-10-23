import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1600, height: 1000 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
const erros = [];
p.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text().slice(0, 200));
});
await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
const relatorio = { errosCarga: [...erros] };
await p.getByRole('tab', { name: 'Turmas' }).click();
await p.waitForTimeout(2200);

relatorio.cards = await p.locator('[data-turma-card]').count();
relatorio.colunas = await p.locator('[data-turmas-coluna]').evaluateAll((els) =>
  els.map((e) => ({ chave: e.getAttribute('data-turmas-coluna'), cards: e.querySelectorAll('[data-turma-card]').length }))
);

// Abrir detalhes e fechar
await p.locator('[data-turma-card] button[aria-label^="Ver turma"]').first().click();
await p.waitForTimeout(700);
relatorio.dialogAberto = await p.getByRole('dialog').isVisible();
relatorio.dialogoTitulo = (await p.getByRole('dialog').innerText()).split('\n').slice(0, 4);
await p.keyboard.press('Escape');
await p.waitForTimeout(1500);
relatorio.dialogFechado = (await p.getByRole('dialog').count()) === 0;

// Menu contextual
await p.locator('[data-turma-card] button[aria-label^="Ações da turma"]').first().click();
await p.waitForTimeout(400);
relatorio.menu = await p.getByRole('menu').innerText();
await p.keyboard.press('Escape');

// Filtro por modalidade
const rangeAntes = await p.locator('[data-agenda-range]').innerText();
await p.getByLabel('Semana anterior').click();
await p.waitForTimeout(400);
const rangeDepois = await p.locator('[data-agenda-range]').innerText();
relatorio.agendaNavega = rangeAntes !== rangeDepois;

await p.locator('[data-turmas-coluna="proximas"] [data-turma-card]').first().waitFor();
relatorio.cardsAntesFiltro = await p.locator('[data-turma-card]').count();

// Busca por texto
await p.getByLabel('Buscar turmas').fill('NR-17');
await p.waitForTimeout(600);
relatorio.cardsBusca = await p.locator('[data-turma-card]').count();
relatorio.buscaTextos = await p.locator('[data-turma-card]').evaluateAll((els) =>
  els.map((e) => e.getAttribute('data-turma-card'))
);
await p.getByLabel('Limpar busca').click();
await p.waitForTimeout(500);
relatorio.cardsDepoisLimpar = await p.locator('[data-turma-card]').count();

relatorio.errosConsole = erros;
console.log(JSON.stringify(relatorio, null, 2));
await p.screenshot({ path: 'tmp-turmas-fidelidade/final-1600.png', fullPage: true });
await b.close();
