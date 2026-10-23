import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('ui-theme', 'dark'));
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Inscrições' }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: 'Inscrições' }).click();
await page.waitForTimeout(2200);

const linhas = () => page.locator('[data-inscricao-row]').count();
const selecionar = async (campo, opcao) => {
  await page.getByRole('combobox', { name: campo, exact: true }).click();
  await page.getByRole('option', { name: opcao, exact: true }).click();
  await page.waitForTimeout(650);
};
const limpar = async () => {
  await page.getByLabel('Limpar filtros').click();
  await page.waitForTimeout(650);
};

const resultados = { inicial: await linhas() };

await selecionar('Status', 'Concluído');
resultados.statusConcluido = await linhas();
resultados.badgeConcluido = await page.locator('[data-segmento="concluido"]').getAttribute('aria-pressed');
resultados.clearAtivo = await page.getByLabel('Limpar filtros').evaluate((el) => {
  const s = getComputedStyle(el);
  return { cor: s.color, fundo: s.backgroundColor, borda: s.borderColor };
});
await page.screenshot({ path: 'tmp-inscricoes-redesign/inscricoes-filtro-status-1440.png' });
await limpar();

await selecionar('Curso', 'Comunicação Assertiva');
resultados.curso = await linhas();
await limpar();

await selecionar('Departamento', 'Tecnologia');
resultados.departamento = await linhas();
await limpar();

await selecionar('Período', 'Este ano');
resultados.periodoAno = await linhas();
await limpar();

await selecionar('Status', 'Inscrito');
resultados.statusInscrito = await linhas();
resultados.badgeInscrito = await page.locator('[data-segmento="inscrito"]').getAttribute('aria-pressed');
await limpar();

resultados.atrasadosDisabled = await page.locator('[data-segmento="atrasado"]').isDisabled();
resultados.textoAtrasados = (await page.locator('[data-segmento="atrasado"]').innerText()).replace(/\s+/g, ' ').trim();
resultados.paginacao = await page.getByText(/Mostrando \d+–\d+ de \d+ inscrições?/).innerText();
resultados.proximaDesabilitada = await page.getByRole('button', { name: 'Próxima página' }).isDisabled();
resultados.linhasComUnderscore = await page.locator('[data-inscricao-row]').filter({ hasText: /em_andamento|concluido|inscrito_/ }).count();
resultados.docOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
resultados.mainOverflow = await page.evaluate(() => document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth);

console.log(JSON.stringify(resultados, null, 2));

await page.evaluate(() => {
  const main = document.querySelector('main');
  if (main) main.scrollTo(0, main.scrollHeight);
  window.scrollTo(0, document.body.scrollHeight);
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'tmp-inscricoes-redesign/inscricoes-rodape-1440.png' });

await context.close();
await browser.close();
