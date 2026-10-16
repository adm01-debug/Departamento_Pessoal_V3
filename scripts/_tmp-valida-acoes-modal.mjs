/**
 * TEMPORÁRIO — prova, NO NAVEGADOR, de que o rodapé operacional (Concluir /
 * Cancelar / Reabrir) aparece para um feedback REAL pendente. NÃO PERSISTE NADA:
 * a lista e o ciclo vêm de interceptação; nenhum INSERT é feito.
 *
 * Uso: node scripts/_tmp-valida-acoes-modal.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:8080';
const EMPRESA = '61e7d382-549f-4b17-afa4-4578ebc919f3';
const CICLO = '11111111-1111-1111-1111-111111111111';
const COLAB = '06b52e96-9f84-409c-9a79-b147f9809c57';
const AGORA = new Date().toISOString();
const FEEDBACK_REAL = {
  id: '66666666-6666-4666-8666-666666666666',
  empresa_id: EMPRESA,
  ciclo_id: CICLO,
  avaliado_id: COLAB,
  avaliador_id: COLAB,
  tipo: 'par',
  nota_geral: 4,
  potencial: null,
  status: 'pendente',
  pontos_fortes: 'FB REAL (teste)',
  pontos_melhoria: null,
  comentarios: 'FB REAL (teste)',
  created_at: AGORA,
  updated_at: AGORA,
  avaliado: { nome_completo: 'FB REAL (teste)' },
  avaliador: { nome_completo: 'FB REAL (teste)' },
};

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1500, height: 950 },
});
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));

const saida = { botoes: [], erro: null };
page.on('pageerror', (e) => (saida.erro = String(e.message).slice(0, 160)));

await page.route('**/rest/v1/ciclos_avaliacao**', (r) =>
  r.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: CICLO, empresa_id: EMPRESA, nome: 'CICLO TESTE', status: 'ativo', tipo: '360' }]),
  })
);
await page.route('**/rest/v1/feedbacks_360**', async (route) => {
  if (route.request().method() !== 'GET') return route.continue();
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([FEEDBACK_REAL]) });
});

try {
  await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);
  await page.getByRole('tab', { name: 'Feedbacks' }).first().click({ timeout: 12000 });
  await page.waitForTimeout(3000);

  // Clica no "Ver feedback" DO CARD REAL (o primeiro da lista é fictício e,
  // corretamente, não oferece ações). Clique por JS para achar o card pelo texto.
  await page.evaluate(() => {
    const alvo = Array.from(document.querySelectorAll('*')).find(
      (e) => (e.textContent ?? '').trim() === 'FB REAL (teste)'
    );
    let card = alvo as HTMLElement | null;
    while (card && !card.querySelector('button')) card = card.parentElement;
    const btn = Array.from(card?.querySelectorAll('button') ?? []).find((b) =>
      /ver feedback/i.test(b.textContent ?? '')
    );
    btn?.click();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'tmp-modal-acoes.png' });

  saida.botoes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="dialog"] button'))
      .map((b) => (b.textContent ?? '').trim())
      .filter(Boolean)
  );
  console.log(JSON.stringify(saida, null, 2));
} catch (e) {
  console.log(JSON.stringify({ ...saida, fatal: String(e.message).slice(0, 250) }, null, 2));
} finally {
  await browser.close();
  process.exit(0);
}
