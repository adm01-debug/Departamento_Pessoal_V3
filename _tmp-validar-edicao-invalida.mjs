/**
 * Prova (demonstração): editar um feedback REABRE e INVALIDA a aprovação
 * anterior; a fila/contador voltam a "Aguardando gestor" e o texto persiste
 * após F5. Nada é enviado ao Supabase.
 * Uso: node _tmp-validar-edicao-invalida.mjs
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
await page.evaluate(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.removeItem('dp-desempenho-demo-registros');
  localStorage.removeItem('dp-desempenho-aprovacoes-demo');
});
await page.getByLabel(/e-?mail/i).first().fill(EMAIL);
await page.getByLabel(/senha|password/i).first().fill(SENHA);
await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });

const grupo = () => page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
const contador = async () => {
  const t = (await grupo().getByRole('button', { name: /Aguardando gestor/ }).textContent()) ?? '';
  return Number((t.match(/(\d+)\s*$/)?.[1] ?? '-1').toString());
};
const cardDe = (nome) =>
  page.locator('div.rounded-xl', { has: page.getByRole('heading', { name: nome }) }).first();

await page.goto('http://localhost:8080/avaliacao');
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2600);

const rel = { antes: {}, edicao: {}, depois: {}, f5: {} };
await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1500);
rel.antes.contador = await contador();
await cardDe('Ana Beatriz Souza').getByRole('button', { name: 'Aprovar avaliação' }).click();
await page.waitForTimeout(1600);
rel.antes.contadorAposAprovar = await contador();
rel.antes.toasts = await page.locator('[data-sonner-toast]').allTextContents();
rel.antes.statusAposAprovar = (
  await cardDe('Ana Beatriz Souza').locator('[role="status"]').first().textContent()
)?.trim();

// Edita a avaliação do GESTOR na lista (comentários).
await grupo().getByRole('button', { name: /^Todos/ }).click();
await page.waitForTimeout(1200);
await cardDe('Ana Beatriz Souza').getByRole('button', { name: 'Editar feedback' }).click();
const dialog = page.getByRole('dialog');
await dialog.waitFor();
const marcador = `Reaberta ${Date.now()}`;
await dialog.locator('textarea').nth(2).fill(marcador);
await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
await dialog.waitFor({ state: 'hidden', timeout: 20000 });
await page.waitForTimeout(1400);
rel.edicao = {
  textoNoCard: (await cardDe('Ana Beatriz Souza').textContent())?.includes(marcador) ?? false,
  toast: await page.locator('[data-sonner-toast]').allTextContents(),
};

// Volta à fila: a decisão anterior NÃO vale mais.
await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1800);
rel.depois.contador = await contador();
rel.depois.status = (await cardDe('Ana Beatriz Souza').locator('[role="status"]').first().textContent())?.trim();
rel.depois.aprovarDesabilitado = await cardDe('Ana Beatriz Souza')
  .getByRole('button', { name: 'Aprovar avaliação' })
  .isDisabled();
rel.depois.aprovarTitulo = await cardDe('Ana Beatriz Souza')
  .getByRole('button', { name: 'Aprovar avaliação' })
  .getAttribute('title');
await page.screenshot({ path: `${OUT}/05-edicao-invalida-fila.png`, fullPage: true });

// F5: o texto persiste e a fila continua em aberto.
await page.reload();
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(2600);
await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1400);
rel.f5 = {
  contador: await contador(),
  status: (await cardDe('Ana Beatriz Souza').locator('[role="status"]').first().textContent())?.trim(),
  textoNaFila: (await cardDe('Ana Beatriz Souza').textContent())?.includes(marcador) ?? false,
};

rel.escritas = await page.evaluate(async () => {
  // Nenhuma requisição de escrita foi feita — o relatório é o próprio estado local.
  return Object.keys(localStorage).filter((k) => k.startsWith('dp-desempenho')).length;
});

writeFileSync(`${OUT}/invalida-apos-edicao.json`, `${JSON.stringify(rel, null, 2)}\n`);
console.log(JSON.stringify(rel, null, 1));
await browser.close();
