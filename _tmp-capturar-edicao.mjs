/**
 * Captura + medição (read-only) do novo contrato:
 *   lista → só Editar feedback; fila → Ver/Devolver/Aprovar + textos.
 * Uso: node _tmp-capturar-edicao.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-feedbacks-edicao';
mkdirSync(OUT, { recursive: true });
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const SENHA = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

await page.route('**/rest/v1/rpc/get_user_roles', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);

await page.goto('http://localhost:8080/login');
await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
await page
  .getByLabel(/e-?mail/i)
  .first()
  .fill(EMAIL);
await page
  .getByLabel(/senha|password/i)
  .first()
  .fill(SENHA);
await page
  .getByRole('button', { name: /entrar|login|acessar/i })
  .first()
  .click();
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });

await page.goto('http://localhost:8080/avaliacao');
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2600);

const ler = () =>
  page.evaluate(() => {
    const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const candidatos = Array.from(document.querySelectorAll('div.rounded-xl')).filter((d) =>
      Array.from(d.querySelectorAll('p')).some((p) => texto(p) === 'Avaliado por')
    );
    const raizes = candidatos.filter((d) => !candidatos.some((o) => o !== d && d.contains(o)));
    return raizes.map((card) => ({
      colaborador: texto(card.querySelector('h3')),
      altura: Math.round(card.getBoundingClientRect().height),
      corpo: card.children[0] ? Math.round(card.children[0].getBoundingClientRect().height) : 0,
      rodape: card.children[1] ? Math.round(card.children[1].getBoundingClientRect().height) : 0,
      acoes: Array.from(card.querySelectorAll('button')).map(texto).filter(Boolean),
      previa: Array.from(card.querySelectorAll('p'))
        .map(texto)
        .filter((t) => /^(Fortes|Melhoria|Comentários):/.test(t)),
    }));
  });

const rel = { quando: new Date().toISOString(), lista: {}, fila: {} };
rel.lista = await ler();
await page.screenshot({ path: `${OUT}/01-lista-somente-editar.png`, fullPage: true });

// Abre o formulário de edição (primeiro card) preenchido.
await page.getByRole('button', { name: 'Editar feedback' }).first().click();
await page.getByRole('dialog').waitFor();
await page.waitForTimeout(1400);
rel.formEdicao = {
  titulo: (await page.getByRole('dialog').getByText('Editar feedback').first().textContent())?.trim(),
  textareas: await page
    .getByRole('dialog')
    .locator('textarea')
    .evaluateAll((els) => els.map((e) => e.value)),
  botao: await page.getByRole('dialog').getByRole('button', { name: 'Salvar alterações' }).isVisible(),
};
await page.screenshot({ path: `${OUT}/02-form-edicao-preenchido.png`, fullPage: true });
await page.keyboard.press('Escape');
await page.waitForTimeout(800);

// Fila do gestor
const grupo = page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
await grupo.getByRole('button', { name: /Aguardando gestor/ }).click();
await page.getByText('Gestor responsável').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(1600);
rel.fila = await ler();
await page.screenshot({ path: `${OUT}/03-fila-textos.png`, fullPage: true });

await page.setViewportSize({ width: 1024, height: 1000 });
await page.waitForTimeout(1200);
rel.fila1024 = await ler();
await page.screenshot({ path: `${OUT}/04-fila-1024.png`, fullPage: true });

writeFileSync(`${OUT}/medicoes.json`, `${JSON.stringify(rel, null, 2)}\n`);
console.log(JSON.stringify(rel, null, 1));
await browser.close();
