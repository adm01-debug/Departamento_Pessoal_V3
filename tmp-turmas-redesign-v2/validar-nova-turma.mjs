/** TEMPORÁRIO — CTA Nova Turma + formulário real no navegador. */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-turmas-redesign-v2');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const page = await contexto.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor();
await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
await page.waitForTimeout(2200);

const resultado = {};
const botao = page.getByRole('button', { name: /Nova Turma/i });
resultado.botaoVisivel = await botao.isVisible();
resultado.botao = await botao.evaluate((el) => {
  const r = el.getBoundingClientRect();
  const icon = el.querySelector('svg');
  return {
    w: Math.round(r.width),
    h: Math.round(r.height),
    texto: (el.textContent ?? '').trim(),
    icone: icon ? `${Math.round(icon.getBoundingClientRect().width)}x${Math.round(icon.getBoundingClientRect().height)}` : null,
    classes: el.className,
  };
});
await page.locator('[data-mais-turmas-em-breve]').scrollIntoViewIfNeeded();
await page.waitForTimeout(250);
await page.locator('[data-mais-turmas-em-breve]').screenshot({ path: path.join(SAIDA, 'card-mais-turmas-com-cta-1440.png') });

const cardsAntes = await page.locator('[data-turma-card]').count();
await botao.click();
await page.getByRole('dialog').waitFor({ state: 'visible' });
resultado.dialogo = await page.getByRole('dialog').evaluate((el) => ({
  texto: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
  campos: Array.from(el.querySelectorAll('input, button[role="combobox"]')).length,
}));
await page.screenshot({ path: path.join(SAIDA, 'dialogo-nova-turma-1440.png') });

await page.getByRole('button', { name: 'Cancelar' }).click();
await page.waitForTimeout(350);
resultado.cancelou = (await page.getByRole('dialog').count()) === 0;
resultado.cardsSemCriar = await page.locator('[data-turma-card]').count();

await botao.click();
await page.getByRole('dialog').waitFor({ state: 'visible' });
await page.getByLabel('Curso da nova turma').click();
await page.getByRole('option').first().click();
await page.getByLabel(/Data de início/i).click();
await page.getByRole('button', { name: 'Hoje' }).click();
await page.getByLabel(/Horário/i).fill('09:00');
await page.getByLabel(/Capacidade/i).fill('20');
await page.getByRole('button', { name: 'Salvar' }).click();
await page.waitForTimeout(700);
resultado.avisoMock = await page.getByText(/Modo demonstração: "Criar turma"/i).count();
resultado.cardsAposSalvarMock = await page.locator('[data-turma-card]').count();
resultado.cardsAntes = cardsAntes;
await page.screenshot({ path: path.join(SAIDA, 'dialogo-nova-turma-salvar-mock-1440.png') });

console.log(JSON.stringify({ resultado, erros: [...new Set(erros)] }, null, 2));
await contexto.close();
await browser.close();
