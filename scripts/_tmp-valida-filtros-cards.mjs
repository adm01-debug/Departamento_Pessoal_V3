/**
 * TEMPORÁRIO — valida os DOIS defeitos corrigidos, sem gravar nada:
 *  D1: dropdown "Todos os tipos" mostra as 4 categorias oficiais (mesmo com 0 registros).
 *  D2: nome longo de avaliador é truncado (não invade nota/estrelas) em 1440 e 1024.
 *
 * Uso: node scripts/_tmp-valida-filtros-cards.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:8080';
const EMPRESA = '61e7d382-549f-4b17-afa4-4578ebc919f3';
const CICLO = 'mock-ciclo-3';
const COLAB = '06b52e96-9f84-409c-9a79-b147f9809c57';
const AGORA = new Date().toISOString();
const NOME_LONGO = 'Alexandre Maximiliano de Albuquerque Nascimento Filho';
const linha = (tipo, id) => ({
  id,
  empresa_id: EMPRESA,
  ciclo_id: CICLO,
  avaliado_id: COLAB,
  avaliador_id: COLAB,
  tipo,
  nota_geral: 4,
  potencial: 4,
  status: 'pendente',
  comentarios: `teste ${tipo}`,
  pontos_fortes: `teste ${tipo}`,
  created_at: AGORA,
  updated_at: AGORA,
  avaliado: { nome_completo: 'Colaborador Avaliado' },
  avaliador: { nome_completo: NOME_LONGO },
});

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 950 } });
const page = await contexto.newPage();
await page.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));

await page.route('**/rest/v1/feedbacks_360**', async (route) => {
  if (route.request().method() !== 'GET') return route.continue();
  const corpo = [
    linha('gestor', '70000000-0000-4000-8000-000000000001'),
    linha('gestor', '70000000-0000-4000-8000-000000000002'),
    linha('gestor', '70000000-0000-4000-8000-000000000003'),
    linha('par', '70000000-0000-4000-8000-000000000004'),
    linha('par', '70000000-0000-4000-8000-000000000005'),
  ];
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
});

const saida = { opcoesDropdown: [], estadoVazioAuto: null, larguraNomeAvaliador: null };
try {
  await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);
  await page.getByRole('tab', { name: 'Feedbacks' }).first().click({ timeout: 12000 });
  await page.waitForTimeout(2500);

  // D1 — dropdown com as 4 categorias
  await page.locator('[aria-label="Tipo"]').first().click({ timeout: 10000 });
  await page.waitForTimeout(700);
  saida.opcoesDropdown = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="option"]')).map((o) => (o.textContent ?? '').trim())
  );
  await page.screenshot({ path: 'tmp-valid-dropdown-1440.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // D2 — nome longo truncado (não invade a coluna da nota)
  saida.larguraNomeAvaliador = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('span')).find((s) => /Alexandre Maximiliano/.test(s.textContent ?? ''));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { largura: Math.round(r.width), larguraTexto: el.scrollWidth, truncado: el.scrollWidth > r.width + 1 };
  });
  await page.screenshot({ path: 'tmp-valid-card-1440.png' });

  // Mesma tela em 1024
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tmp-valid-card-1024.png' });

  // Categoria vazia → estado vazio existente
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.waitForTimeout(800);
  await page.locator('[aria-label="Tipo"]').first().click({ timeout: 10000 });
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: /Autoavalia/i }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1800);
  saida.estadoVazioAuto = await page.evaluate(() =>
    /Nenhum feedback encontrado/i.test(document.body.innerText ?? '')
  );
  await page.screenshot({ path: 'tmp-valid-vazio-1440.png' });

  console.log(JSON.stringify(saida, null, 2));
} catch (e) {
  console.log(JSON.stringify({ ...saida, fatal: String(e.message).slice(0, 260) }, null, 2));
} finally {
  await browser.close();
  process.exit(0);
}
