/**
 * TEMPORÁRIO — prova de PERSISTÊNCIA do "Novo Ciclo" pela INTERFACE, na sessão
 * autenticada salva (e2e/.auth/user.json). Cria UM ciclo identificável
 * (`HOMOLOG-NB UI <ts>`), captura a resposta do Supabase, recarrega (F5) e
 * confirma se o registro continua na lista.
 *
 * Uso: node scripts/_tmp-write-ciclo-ui.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:8080';
const NOME = `HOMOLOG-NB UI ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
const HOJE = new Date().toISOString().slice(0, 10);
const FIM = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1500, height: 950 },
});
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));

const erros = [];
const chamadas = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 180)));
page.on('response', async (r) => {
  const u = r.url();
  if (u.includes('/rest/v1/ciclos_avaliacao')) {
    let corpo = '';
    try {
      corpo = (await r.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    chamadas.push({ metodo: r.request().method(), status: r.status(), corpo });
  }
});

const saida = { nome: NOME, chamadas, erros, inserido: null, sobreviveuAposF5: null };

try {
  await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);
  await page.getByRole('tab', { name: 'Ciclos' }).first().click({ timeout: 12000 });
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: /novo ciclo/i }).first().click({ timeout: 12000 });
  await page.waitForTimeout(1500);

  // Campos reais do diálogo: nome por placeholder e as DUAS datas por tipo.
  await page.locator('input[placeholder*="Ciclo S1"]').first().fill(NOME);
  const datas = page.locator('input[type="date"]');
  const qtdDatas = await datas.count();
  if (qtdDatas < 2) throw new Error(`esperava 2 inputs de data no diálogo, achei ${qtdDatas}`);
  await datas.nth(0).fill(HOJE);
  await datas.nth(1).fill(FIM);
  await page.waitForTimeout(300);

  await page.getByRole('button', { name: /criar ciclo/i }).first().click({ timeout: 12000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'tmp-write-1-envio.png' });

  // Aguarda a resposta do POST e extrai o UUID devolvido.
  const post = chamadas.find((c) => c.metodo === 'POST');
  if (post?.corpo) {
    try {
      const json = JSON.parse(post.corpo);
      saida.inserido = Array.isArray(json) ? (json[0]?.id ?? null) : (json?.id ?? null);
    } catch {
      /* corpo pode estar truncado */
    }
  }

  // F5 e confirmação na lista.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);
  await page.getByRole('tab', { name: 'Ciclos' }).first().click({ timeout: 12000 });
  await page.waitForTimeout(2500);
  const texto = await page.evaluate(() => (document.body.innerText ?? '').replace(/\s+/g, ' '));
  saida.sobreviveuAposF5 = texto.includes(NOME);
  await page.screenshot({ path: 'tmp-write-2-apos-f5.png' });

  console.log(JSON.stringify(saida, null, 2));
} catch (e) {
  console.log(JSON.stringify({ ...saida, fatal: String(e.message).slice(0, 300) }, null, 2));
} finally {
  await browser.close();
  process.exit(0);
}
