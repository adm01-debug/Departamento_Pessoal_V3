/**
 * TEMPORÁRIO — interações reais da área Candidatos (sem alterar dados).
 */
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1600, height: 1000 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
await p.waitForTimeout(1500);
const rows = p.locator('tbody tr');

const out = {};
out.inicial = await rows.count();
out.pagina1 = (await p.locator('body').innerText()).match(/Mostrando[^\n]*/)?.[0];

await p.getByRole('button', { name: /CONTRATADOS/i }).click();
await p.waitForTimeout(250);
out.contratados = { rows: await rows.count(), texto: (await rows.first().innerText()).replace(/\n/g, ' | ') };
out.contratadosPressed = await p.getByRole('button', { name: /CONTRATADOS/i }).getAttribute('aria-pressed');
await p.getByRole('button', { name: /^TODOS/i }).click();
await p.waitForTimeout(250);

// Menu de ações (somente abrir).
await p.locator('tbody tr').first().getByRole('button', { name: /Ações de/i }).click();
await p.waitForTimeout(250);
out.menu = await p.getByRole('menuitem').allInnerTexts();
await p.keyboard.press('Escape');
await p.waitForTimeout(200);

// Ver perfil.
const primeiroNome = (await rows.first().locator('td').nth(1).innerText()).split('\n')[0];
await rows.first().getByRole('button', { name: /Ver perfil de/i }).click();
await p.waitForTimeout(500);
out.dialogo = { aberto: await p.getByRole('dialog').isVisible(), titulo: await p.getByRole('dialog').innerText().then((t) => t.slice(0, 120)) };
await p.getByRole('button', { name: /Fechar Janela/i }).click();
await p.waitForTimeout(300);

// Seleção + agregados.
await rows.first().getByRole('checkbox').click();
await p.waitForTimeout(250);
out.selecao = (await p.locator('body').innerText()).match(/\d+ selecionado[^\n]*/)?.[0];
out.barra = (await p.locator('body').innerText()).match(/Avaliação média[^\n]*/)?.[0];
await p.getByRole('checkbox', { name: /Selecionar todos os candidatos da página/i }).click();
await p.waitForTimeout(250);
out.selecaoPagina = (await p.locator('body').innerText()).match(/\d+ selecionados/)?.[0];
await p.getByRole('button', { name: /Limpar seleção/i }).click();
await p.waitForTimeout(200);

// Paginação.
await p.getByRole('button', { name: 'Próxima página' }).click();
await p.waitForTimeout(350);
out.pagina2 = { rows: await rows.count(), texto: (await p.locator('body').innerText()).match(/Mostrando[^\n]*/)?.[0] };
await p.getByRole('button', { name: 'Página 1' }).click();
await p.waitForTimeout(300);

// Filtro por vaga.
await p.getByLabel('Vaga', { exact: true }).click();
await p.getByRole('option', { name: 'Analista de Dados' }).click();
await p.waitForTimeout(350);
out.vagaDados = { rows: await rows.count() };
await p.getByLabel('Vaga', { exact: true }).click();
await p.getByRole('option', { name: 'Todas as vagas' }).click();
await p.waitForTimeout(250);

// Filtro por origem.
await p.getByLabel('Origem', { exact: true }).click();
await p.getByRole('option', { name: 'LinkedIn' }).click();
await p.waitForTimeout(350);
out.origemLinkedin = { rows: await rows.count() };
await p.getByLabel('Origem', { exact: true }).click();
await p.getByRole('option', { name: 'Todas as origens' }).click();
await p.waitForTimeout(250);

// Mais filtros — busca.
await p.getByRole('button', { name: /Mais filtros/i }).click();
await p.waitForTimeout(250);
await p.getByLabel('Buscar candidatos').fill('Juliana');
await p.waitForTimeout(350);
out.busca = { rows: await rows.count() };
await p.getByLabel('Somente com avaliação').click();
await p.waitForTimeout(250);
out.buscaAvaliados = { rows: await rows.count() };
await p.getByRole('button', { name: /Limpar$/i }).click();
await p.waitForTimeout(250);

// Alinhamento célula × cabeçalho.
out.colunas = await p.evaluate(() => {
  const r = (el) => el.getBoundingClientRect();
  const ths = [...document.querySelectorAll('thead th')];
  const tds = [...document.querySelectorAll('tbody tr:first-child td')];
  const acoes = document.querySelector('tbody tr:first-child td:last-child');
  const botao = acoes?.querySelector('button');
  return ths.map((th, i) => ({
    th: Math.round(r(th).x),
    td: tds[i] ? Math.round(r(tds[i]).x) : null,
    wTh: Math.round(r(th).width),
    wTd: tds[i] ? Math.round(r(tds[i]).width) : null,
  })).concat([{ botaoDentro: botao && acoes ? r(botao).right <= r(acoes).right + 1 : null }]);
});

console.log(JSON.stringify(out, null, 2));
await b.close();
