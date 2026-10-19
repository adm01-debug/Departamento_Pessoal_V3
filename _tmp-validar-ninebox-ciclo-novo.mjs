/**
 * T11 — NOVO CICLO EM FIXTURE LOCAL: nenhum código específico de ciclo.
 * Cria no armazenamento da vitrine um ciclo novo + uma avaliação do gestor
 * concluída (4,0/4,0) e percorre aprovar → aguardando RH → validar → quadrante.
 * Uso: node _tmp-validar-ninebox-ciclo-novo.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-ninebox-aprovacao';
mkdirSync(OUT, { recursive: true });
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const SENHA = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';
const CICLO = 'CICLO APENAS DE TESTE';
const COLAB = 'Ana Beatriz Souza';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.route('**/rest/v1/rpc/get_user_roles', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor', 'rh']) })
);

await page.goto('http://localhost:8080/login');
await page.evaluate(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.removeItem('dp-desempenho-aprovacoes-demo');
  const KEY = 'dp-desempenho-demo-registros';
  const now = new Date().toISOString();
  const estado = {
    versao: 1,
    criados: { ciclos: {}, metas: {}, feedbacks: {}, pdis: {} },
    patches: { ciclos: {}, metas: {}, feedbacks: {}, pdis: {} },
    removidos: { ciclos: [], metas: [], feedbacks: [], pdis: [] },
    historico: [],
  };
  estado.criados.ciclos['demo-ciclo-t11'] = {
    id: 'demo-ciclo-t11',
    empresa_id: 'mock-empresa-1',
    nome: 'CICLO APENAS DE TESTE',
    descricao: 'Fixture local do teste de integração',
    data_inicio: '2027-01-01',
    data_fim: '2027-12-31',
    status: 'ativo',
    tipo: 'anual',
    created_at: now,
    updated_at: now,
  };
  estado.criados.feedbacks['demo-fb-t11'] = {
    id: 'demo-fb-t11',
    empresa_id: 'mock-empresa-1',
    ciclo_id: 'demo-ciclo-t11',
    avaliado_id: 'mock-1',
    avaliador_id: 'mock-13',
    tipo: 'gestor',
    nota_geral: 4,
    potencial: 4,
    status: 'concluido',
    pontos_fortes: 'Fixture de ciclo novo.',
    pontos_melhoria: 'Fixture de ciclo novo.',
    comentarios: 'Ciclo criado apenas para provar a integração.',
    created_at: now,
    updated_at: now,
  };
  localStorage.setItem(KEY, JSON.stringify(estado));
});
await page.getByLabel(/e-?mail/i).first().fill(EMAIL);
await page.getByLabel(/senha|password/i).first().fill(SENHA);
await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });

await page.goto('http://localhost:8080/avaliacao');
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);

// Seleciona o ciclo NOVO pelo UUID (sem qualquer regra por nome no app).
const seletor = page.getByRole('combobox').first();
await seletor.click();
await page.getByRole('option', { name: new RegExp(CICLO, 'i') }).first().click();
await page.waitForTimeout(1800);

const grupo = () => page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
const cardDe = (nome) => page.locator('[data-testid="cartao-feedback"]').filter({ hasText: nome }).first();

const rel = { ciclo: CICLO, antes: {}, aprovado: {}, validado: {}, escritos: [] };
await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1200);
rel.antes.cards = await page.locator('[data-testid="cartao-feedback"]').count();
await page.screenshot({ path: `${OUT}/05-ciclo-novo-fila.png`, fullPage: true });

await cardDe(COLAB).getByRole('button', { name: 'Aprovar avaliação' }).click();
await page.waitForTimeout(1400);

await page.getByRole('tab', { name: /Nine-Box/i }).click();
await page.getByText(/Matriz Nine-Box/i).first().waitFor({ timeout: 20000 });
await page.waitForTimeout(2200);
rel.aprovado.banner = (await page.getByText(/aprovada pelo gestor aguardando/i).first().textContent())?.trim();
rel.aprovado.nomeVisivel = await page.getByText(new RegExp(COLAB)).first().isVisible().catch(() => false);
await page.screenshot({ path: `${OUT}/06-ciclo-novo-aguardando-rh.png`, fullPage: true });

await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 20000 });
await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1200);
await cardDe(COLAB).getByRole('button', { name: 'Ver avaliação' }).click();
const dialog = page.getByRole('dialog');
await dialog.waitFor();
await dialog.getByRole('button', { name: /Validar Potencial/i }).click();
await page.waitForTimeout(1600);
rel.validado.toast = await page.locator('[data-sonner-toast]').allTextContents();
await page.keyboard.press('Escape');

await page.getByRole('tab', { name: /Nine-Box/i }).click();
await page.getByText(/Matriz Nine-Box/i).first().waitFor({ timeout: 20000 });
await page.waitForTimeout(2200);
const estrela = page.getByRole('button', { name: /Estrela — \d+ colaborador/i }).first();
rel.validado.estrela = await estrela.getAttribute('aria-label');
await page.screenshot({ path: `${OUT}/07-ciclo-novo-validado.png`, fullPage: true });
await estrela.click();
await page.getByRole('dialog').waitFor();
await page.waitForTimeout(1800);
rel.validado.noQuadrante = await page.getByRole('dialog').getByText(new RegExp(COLAB)).first().isVisible().catch(() => false);

rel.escritos = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('dp-desempenho')));
writeFileSync(`${OUT}/ciclo-novo.json`, `${JSON.stringify(rel, null, 2)}\n`);
console.log(JSON.stringify(rel, null, 1));
await browser.close();
