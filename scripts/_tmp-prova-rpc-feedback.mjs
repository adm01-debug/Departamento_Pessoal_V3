/**
 * TEMPORÁRIO — prova, NO NAVEGADOR, de que o formulário "Novo Feedback" entra no
 * caminho de GRAVAÇÃO REAL (RPC `criar_feedback_seguro`) quando o modo real está
 * ligado. NÃO PERSISTE NADA:
 *   • intercepta a RPC e responde em memória (nenhuma chamada chega ao Supabase);
 *   • falha se houver QUALQUER POST direto em `feedbacks_360` (INSERT legado).
 *
 * Uso: node scripts/_tmp-prova-rpc-feedback.mjs
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:8080';
const EMPRESA_FALSA = '00000000-0000-0000-0000-000000000000';
const CICLO_FALSO = { id: '11111111-1111-1111-1111-111111111111', empresa_id: EMPRESA_FALSA, nome: 'CICLO TESTE (interceptado)' };

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1500, height: 950 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  // Captura QUALQUER toast (o sonner os remove em ~4s) para leitura confiável.
  window.__toasts = [];
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        const el = n;
        if (el && el.matches && el.matches('[data-sonner-toast]')) {
          window.__toasts.push((el.innerText || '').replace(/\s+/g, ' ').slice(0, 220));
        }
      }
    }
  }).observe(document, { childList: true, subtree: true });
});
const consoles = [];
const posts = [];
page.on('console', (m) => consoles.push(`${m.type()}: ${m.text().slice(0, 180)}`));
page.on('request', (r) => {
  if (r.method() !== 'GET' && r.url().includes('supabase')) posts.push(`${r.method()} ${r.url().split('/rest/v1/')[1] ?? r.url()}`);
});

const saida = { rpcChamada: false, rpcUrl: null, rpcPayload: null, insertDireto: 0, toast: null, erroPagina: [], diag: {} };
page.on('pageerror', (e) => saida.erroPagina.push(String(e.message).slice(0, 160)));

// 1) Ciclo: interceptado (o seed não tem ciclo cadastrado) — só para permitir o submit.
await page.route('**/rest/v1/ciclos_avaliacao**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([CICLO_FALSO]) })
);

// 2b) GET da lista: após o salvamento, injeta UM item (simula a inserção real)
//     sem gravar nada no banco.
let injetado = false;
await page.route('**/rest/v1/feedbacks_360**', async (route) => {
  const req = route.request();
  if (req.method() !== 'GET') return route.continue();
  const resp = await route.fetch();
  let body = await resp.json().catch(() => []);
  if (saida.rpcChamada && !injetado && Array.isArray(body)) {
    injetado = true;
    const agora = new Date().toISOString();
    body = [
      {
        id: '44444444-4444-4444-4444-444444444444',
        empresa_id: '61e7d382-549f-4b17-afa4-4578ebc919f3',
        ciclo_id: '11111111-1111-1111-1111-111111111111',
        avaliado_id: '06b52e96-9f84-409c-9a79-b147f9809c57',
        avaliador_id: '06b52e96-9f84-409c-9a79-b147f9809c57',
        tipo: 'gestor',
        nota_geral: 4,
        potencial: 4,
        status: 'pendente',
        pontos_fortes: 'ITEM INJETADO (teste de inserção)',
        created_at: agora,
        updated_at: agora,
        avaliado: { nome_completo: 'ITEM INJETADO (teste)' },
        avaliador: { nome_completo: 'ITEM INJETADO (teste)' },
      },
      ...body,
    ];
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

// 3) A RPC real: capturada e respondida EM MEMÓRIA (nada é gravado).
await page.route('**/rest/v1/rpc/criar_feedback_seguro**', async (route) => {
  saida.rpcChamada = true;
  saida.rpcUrl = route.request().url();
  saida.rpcPayload = route.request().postData();
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      feedback_id: '22222222-2222-2222-2222-222222222222',
      status: 'pendente',
      auditoria_id: '33333333-3333-3333-3333-333333333333',
      idempotente: false,
    }),
  });
});

async function escolherSelect(ariaLabel, indice) {
  const trigger = page.locator(`[aria-label="${ariaLabel}"]`).first();
  await trigger.click({ timeout: 8000 });
  await page.waitForTimeout(600);
  const opcoes = page.getByRole('option');
  const n = await opcoes.count();
  await opcoes.nth(Math.min(indice, Math.max(0, n - 1))).click({ timeout: 8000 });
  await page.waitForTimeout(300);
  saida.diag[ariaLabel] = { opcoes: n, valor: (await trigger.textContent())?.trim().slice(0, 40) ?? null };
}

/** Escolhe a opção cujo texto casa com o regex (ex.: colaborador/ciclo REAIS). */
async function escolherSelectPorTexto(ariaLabel, rx) {
  const trigger = page.locator(`[aria-label="${ariaLabel}"]`).first();
  await trigger.click({ timeout: 8000 });
  await page.waitForTimeout(600);
  const opcoes = page.getByRole('option');
  const n = await opcoes.count();
  let alvo = -1;
  for (let i = 0; i < n; i++) {
    const t = (await opcoes.nth(i).textContent()) ?? '';
    if (rx.test(t)) { alvo = i; break; }
  }
  if (alvo < 0) {
    saida.diag[ariaLabel] = { opcoes: n, erro: 'opcao real nao encontrada', amostra: [] };
    await page.keyboard.press('Escape');
    return;
  }
  await opcoes.nth(alvo).click({ timeout: 8000 });
  await page.waitForTimeout(300);
  saida.diag[ariaLabel] = { opcoes: n, valor: (await trigger.textContent())?.trim().slice(0, 60) ?? null };
}

try {
  await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);
  await page.getByRole('tab', { name: 'Feedbacks' }).first().click({ timeout: 12000 });
  await page.waitForTimeout(2500);

  await page.getByRole('button', { name: /novo feedback/i }).first().click({ timeout: 12000 });
  await page.waitForTimeout(1500);
  saida.diag.dialogoAberto = await page.getByText('Novo feedback', { exact: false }).count();

  await escolherSelectPorTexto('Avaliado', /E2E-SEED/i);
  await escolherSelectPorTexto('Avaliador do feedback', /E2E-SEED/i);
  await escolherSelectPorTexto('Ciclo do feedback', /CICLO TESTE/i);

  const botaoSalvar = page.getByRole('button', { name: /salvar feedback/i }).first();
  saida.diag.salvarDesabilitado = await botaoSalvar.isDisabled();
  await botaoSalvar.click({ timeout: 12000 });

  // Polling: captura QUALQUER mensagem de retorno antes de o toast expirar.
  const vistos = [];
  for (let i = 0; i < 32; i++) {
    await page.waitForTimeout(250);
    const alvo = await page.evaluate(() =>
      (document.body.innerText ?? '').replace(/\s+/g, ' ')
    );
    for (const rx of [
      /Feedback registrado[^.]*/i,
      /Feedback N[ÃA]O registrado[^.]*/i,
      /Modo demonstra[^.]*/i,
      /Dados incompletos[^.]*/i,
      /Empresa ativa[^.]*/i,
      /perfil_nao_autorizado|nao_autorizado|idempotencia[^ ]*/i,
    ]) {
      const m = alvo.match(rx);
      if (m && !vistos.includes(m[0].trim())) vistos.push(m[0].trim());
    }
  }
  saida.mensagens = vistos;

  // Geometria da lista APÓS a inserção simulada: nenhum card colapsado e
  // nenhum vão vertical anormal entre cards do mesmo mês.
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'tmp-lista-apos-insert.png' });
  saida.listaAposInjecao = await page.evaluate(() => {
    const wrappers = Array.from(document.querySelectorAll('section > div.relative > div.relative'));
    const rects = wrappers.map((w) => w.getBoundingClientRect());
    const alturas = rects.map((r) => Math.round(r.height));
    let maiorVao = 0;
    for (let i = 1; i < rects.length; i++) {
      const vao = Math.round(rects[i].top - rects[i - 1].bottom);
      if (vao > maiorVao) maiorVao = vao;
    }
    return {
      cards: alturas.length,
      menorAltura: alturas.length ? Math.min(...alturas) : null,
      maiorAltura: alturas.length ? Math.max(...alturas) : null,
      maiorVaoEntreCards: maiorVao,
    };
  });
  saida.insertDireto = posts.filter((p) => p.includes('feedbacks_360')).length;

  const texto = await page.evaluate(() => (document.body.innerText ?? '').replace(/\s+/g, ' '));
  saida.toasts = await page.evaluate(() => window.__toasts ?? []);
  saida.modoDemonstrativoNaTela = /Todos 11|Mariana Oliveira/.test(texto);
  saida.toast = saida.mensagens.length ? saida.mensagens.join(' || ') : 'nenhuma mensagem capturada';

  await page.screenshot({ path: 'tmp-prova-rpc-feedback.png' });
  saida.posts = posts;
  saida.consoles = consoles.slice(-12);
  console.log(JSON.stringify(saida, null, 2));
} catch (e) {
  console.log(JSON.stringify({ ...saida, fatal: String(e.message).slice(0, 300) }, null, 2));
} finally {
  await browser.close();
  process.exit(0);
}
