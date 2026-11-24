/**
 * TEMPORÁRIO — DIAGNÓSTICO DO ENCAMINHAMENTO AO GESTOR.
 *
 * Intercepta (somente leitura) as respostas do REST usadas pela aba Feedbacks e
 * responde às perguntas do pedido:
 *   1. os feedbacks trazem `avaliado_id`/`avaliador_id` e os embeds
 *      (`avaliado.nome_completo`/`avaliador.nome_completo`)?
 *   2. os colaboradores trazem `supervisor_id`/`user_id` (vínculo do gestor)?
 *   3. o que existe no armazenamento local da vitrine (registros criados)?
 *
 * Nada é gravado: apenas GETs observados. Uso:
 *   node scripts/_tmp-diagnostico-encaminhamento.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-diagnostico-encaminhamento';
mkdirSync(OUT, { recursive: true });
const coleta = { colaboradores: null, feedbacks: null, ciclos: null, demoLocal: null, fila: null };
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 950 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);

const resumoFeedback = (f) => ({
  id: String(f?.id ?? '').slice(0, 12),
  tipo: f?.tipo ?? null,
  status: f?.status ?? null,
  avaliado_id: f?.avaliado_id ? String(f.avaliado_id).slice(0, 12) : null,
  avaliador_id: f?.avaliador_id ? String(f.avaliador_id).slice(0, 12) : null,
  ciclo_id: f?.ciclo_id ? String(f.ciclo_id).slice(0, 12) : null,
  temEmbedAvaliado: Boolean(f?.avaliado),
  temEmbedAvaliador: Boolean(f?.avaliador),
  nomeAvaliado: f?.avaliado?.nome_completo ?? null,
  nomeAvaliador: f?.avaliador?.nome_completo ?? null,
});

await context.route('**/rest/v1/**', async (rota) => {
  const url = rota.request().url();
  if (url.includes('/rest/v1/colaboradores')) {
    const resposta = await rota.fetch();
    const corpo = await resposta.json().catch(() => null);
    if (Array.isArray(corpo) && corpo.length) {
      coleta.colaboradores = {
        total: corpo.length,
        campos: Object.keys(corpo[0] ?? {}).sort(),
        comSupervisorId: corpo.filter((c) => c?.supervisor_id).length,
        comUserId: corpo.filter((c) => c?.user_id).length,
        amostra: corpo.slice(0, 6).map((c) => ({
          id: String(c?.id ?? '').slice(0, 12),
          nome: c?.nome_completo ?? null,
          supervisor_id: c?.supervisor_id ? String(c.supervisor_id).slice(0, 12) : null,
          user_id: c?.user_id ? String(c.user_id).slice(0, 12) : null,
        })),
      };
    }
    return rota.continue();
  }
  if (url.includes('/rest/v1/feedbacks_360')) {
    const resposta = await rota.fetch();
    const corpo = await resposta.json().catch(() => null);
    if (Array.isArray(corpo) && corpo.length) {
      coleta.feedbacks = { total: corpo.length, itens: corpo.slice(0, 12).map(resumoFeedback) };
    }
    return rota.continue();
  }
  if (url.includes('/rest/v1/ciclos_avaliacao')) {
    const resposta = await rota.fetch();
    const corpo = await resposta.json().catch(() => null);
    if (Array.isArray(corpo)) coleta.ciclos = corpo.map((c) => ({ id: String(c?.id ?? '').slice(0, 12), nome: c?.nome ?? null }));
    return rota.continue();
  }
  return rota.continue();
});

const page = await context.newPage();
try {
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.waitForTimeout(1500);

  coleta.demoLocal = await page.evaluate(() => {
    const saida = {};
    for (const chave of Object.keys(localStorage)) {
      if (!chave.startsWith('dp-desempenho')) continue;
      try {
        const valor = JSON.parse(localStorage.getItem(chave) ?? 'null');
        const registros = valor?.registros ?? valor?.criados ?? valor;
        saida[chave] = Array.isArray(registros)
          ? registros.slice(0, 6).map((r) => ({
              tipo: r?.registro?.tipo ?? r?.tipo ?? null,
              id: String(r?.registro?.id ?? r?.id ?? '').slice(0, 16),
              avaliado_id: r?.registro?.avaliado_id ?? r?.avaliado_id ?? null,
              avaliador_id: r?.registro?.avaliador_id ?? r?.avaliador_id ?? null,
              temEmbedAvaliado: Boolean(r?.registro?.avaliado ?? r?.avaliado),
              temEmbedAvaliador: Boolean(r?.registro?.avaliador ?? r?.avaliador),
            }))
          : registros;
      } catch {
        saida[chave] = 'ilegível';
      }
    }
    return saida;
  });

  // Fila "Aguardando gestor" — o que a TELA mostra em cada linha.
  const chip = page.getByRole('group', { name: 'Segmentar por tipo de feedback' }).getByRole('button', { name: /Aguardando gestor/ }).first();
  if (await chip.isVisible().catch(() => false)) {
    await chip.click();
    await page.waitForTimeout(1800);
    coleta.fila = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div[class*="rounded-xl"]'))
        .map((el) => (el.innerText ?? '').replace(/\s+/g, ' ').trim())
        .filter((t) => t.includes('Gestor responsável'))
        .slice(0, 6)
    );
  }
  await page.screenshot({ path: `${OUT}/fila.png` });
} catch (erro) {
  coleta.erro = String(erro?.message ?? erro).slice(0, 400);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`${OUT}/diagnostico.json`, JSON.stringify(coleta, null, 2));
  console.log(JSON.stringify(coleta, null, 2).slice(0, 6000));
}
