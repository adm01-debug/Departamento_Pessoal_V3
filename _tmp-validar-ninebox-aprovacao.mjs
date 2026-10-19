/**
 * PROVA NO NAVEGADOR — aprovação do gestor → Nine-Box:
 *   T1/T2 aprovado aparece na aba (pendente do RH, com nome);
 *   T3 sem classificação oficial antes da validação;
 *   T4/T5 validação do RH libera o quadrante;
 *   T6 F5; T7 alternância de abas; T8 troca de ciclo; T9 invalidação por edição.
 * Uso: node _tmp-validar-ninebox-aprovacao.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-ninebox-aprovacao';
mkdirSync(OUT, { recursive: true });
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const SENHA = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';
const COLAB = 'Ana Beatriz Souza';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.route('**/rest/v1/rpc/get_user_roles', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor', 'rh']) })
);

const req = [];
page.on('request', (r) => {
  const u = r.url();
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(r.method()) && /feedbacks_360|rpc\/(decidir|validar|editar)/.test(u)) {
    req.push(`${r.method()} ${u}`);
  }
});

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

await page.goto('http://localhost:8080/avaliacao');
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);

const grupo = () => page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
const cardDe = (nome) => page.locator('[data-testid="cartao-feedback"]').filter({ hasText: nome }).first();
const irNineBox = async () => {
  await page.getByRole('tab', { name: /Nine-Box/i }).click();
  await page.getByText(/Matriz Nine-Box/i).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(2200);
};
const irFeedbacks = async () => {
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.getByText('Avaliado por').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
};

const rel = {
  quando: new Date().toISOString(),
  antes: {},
  aprovado: {},
  validado: {},
  f5: {},
  ciclos: {},
  invalidado: {},
  escritas: req,
};

// Estado inicial: S2 selecionado; fila do gestor.
await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1200);
rel.antes.contador = (await grupo().getByRole('button', { name: /Aguardando gestor/ }).textContent())?.trim();

// T1 — aprova no card da fila.
await cardDe(COLAB).getByRole('button', { name: 'Aprovar avaliação' }).click();
await page.waitForTimeout(1500);
rel.aprovado.toast = await page.locator('[data-sonner-toast]').allTextContents();
rel.aprovado.statusFeedbacks = (await cardDe(COLAB).locator('[role="status"]').first().textContent())?.trim();
await page.screenshot({ path: `${OUT}/01-feedbacks-aprovado.png`, fullPage: true });

// T2/T3 — Nine-Box: aparece como pendente do RH, sem quadrante oficial.
await irNineBox();
rel.aprovado.banner = (await page.getByText(/aprovada pelo gestor aguardando/i).first().textContent())?.trim();
rel.aprovado.nomeNoBanner = await page.getByText(new RegExp(COLAB)).first().isVisible();
rel.aprovado.quadranteEstrela = await page
  .getByRole('button', { name: /Estrela — \d+ colaborador/i })
  .first()
  .getAttribute('aria-label');
await page.screenshot({ path: `${OUT}/02-ninebox-aguardando-rh.png`, fullPage: true });
// T3 — antes da validação, NÃO está no quadrante oficial.
await page.getByRole('button', { name: /Estrela — \d+ colaborador/i }).first().click();
await page.getByRole('dialog').waitFor();
rel.aprovado.noQuadranteAntesDoRh = await page
  .getByRole('dialog')
  .getByText(new RegExp(COLAB))
  .first()
  .isVisible()
  .catch(() => false);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// T4/T5 — valida o Potencial no modal da fila (RH).
await irFeedbacks();
await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1200);
await cardDe(COLAB).getByRole('button', { name: 'Ver avaliação' }).click();
const dialog = page.getByRole('dialog');
await dialog.waitFor();
const validar = dialog.getByRole('button', { name: /Validar Potencial/i });
rel.validado.botaoVisivel = await validar.isVisible().catch(() => false);
if (rel.validado.botaoVisivel) {
  await validar.click();
  await page.waitForTimeout(1800);
  rel.validado.toast = await page.locator('[data-sonner-toast]').allTextContents();
}
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

await irNineBox();
rel.validado.aindaNoBanner = await page
  .getByText(/aprovada pelo gestor aguardando/i)
  .first()
  .isVisible()
  .catch(() => false);
// Evidência visual sem overlay: Ana passa a aparecer no ranking/Estrela.
await page.screenshot({ path: `${OUT}/03-ninebox-validado.png`, fullPage: true });
await page.getByRole('button', { name: /Estrela — \d+ colaborador/i }).first().click();
const quadrante = page.getByRole('dialog');
await quadrante.waitFor();
await page.waitForTimeout(1800);
rel.validado.noQuadrante = await quadrante.getByText(new RegExp(COLAB)).first().isVisible().catch(() => false);
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

// T6 — F5 mantém o estado.
await page.reload();
await irNineBox();
rel.f5.aindaNoBanner = await page
  .getByText(/aprovada pelo gestor aguardando/i)
  .first()
  .isVisible()
  .catch(() => false);
await page.getByRole('button', { name: /Estrela — \d+ colaborador/i }).first().click();
await page.getByRole('dialog').waitFor();
rel.f5.noQuadrante = await page
  .getByRole('dialog')
  .getByText(new RegExp(COLAB))
  .first()
  .isVisible()
  .catch(() => false);
await page.keyboard.press('Escape');

// T8 — troca de ciclo (S1) não mistura; volta a S2.
const seletorCiclo = page.getByRole('combobox', { name: 'Ciclo em visão' });
await seletorCiclo.click();
await page.getByRole('option', { name: /Ciclo S1 2026/i }).click();
await page.waitForTimeout(1800);
rel.ciclos.s1NomeVisivel = await page.getByText(new RegExp(COLAB)).first().isVisible().catch(() => false);
await seletorCiclo.click();
await page.getByRole('option', { name: /Ciclo S2 2026/i }).click();
await page.waitForTimeout(1800);
await page.getByRole('button', { name: /Estrela — \d+ colaborador/i }).first().click();
await page.getByRole('dialog').waitFor();
rel.ciclos.voltouS2ComColaborador = await page
  .getByRole('dialog')
  .getByText(new RegExp(COLAB))
  .first()
  .isVisible()
  .catch(() => false);
await page.keyboard.press('Escape');

// T9 — editar a avaliação invalida aprovação/validação e tira do quadrante.
await irFeedbacks();
await grupo().getByRole('button', { name: /^Todos/ }).click();
await page.waitForTimeout(1000);
await cardDe(COLAB).getByRole('button', { name: 'Editar feedback' }).click();
const edicao = page.getByRole('dialog');
await edicao.waitFor();
await edicao.locator('textarea').nth(2).fill(`Revisão ${Date.now()}`);
await edicao.getByRole('button', { name: 'Salvar alterações' }).click();
await edicao.waitFor({ state: 'hidden', timeout: 15000 });
await page.waitForTimeout(1500);

await irNineBox();
rel.invalidado.bannerPendente = (
  await page.getByText(/aprovação do gestor pendente|invalidada/i).first().textContent()
)?.trim();
rel.invalidado.nomeNoBanner = await page.getByText(new RegExp(COLAB)).first().isVisible().catch(() => false);
await page.getByRole('button', { name: /Estrela — \d+ colaborador/i }).first().click();
await page.getByRole('dialog').waitFor();
rel.invalidado.noQuadrante = await page
  .getByRole('dialog')
  .getByText(new RegExp(COLAB))
  .first()
  .isVisible()
  .catch(() => false);
await page.screenshot({ path: `${OUT}/04-ninebox-invalidado.png`, fullPage: true });

rel.escritas = [...req];
writeFileSync(`${OUT}/resultado.json`, `${JSON.stringify(rel, null, 2)}\n`);
console.log(JSON.stringify(rel, null, 1));
await browser.close();

