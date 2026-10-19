/**
 * Prova (vitrine) — APROVAÇÃO EM TODOS OS CICLOS/TIPOS:
 *   • card com PAR concluído e SEM gestor vinculado → Aprovar HABILITADO p/ RH/admin;
 *   • clique grava localmente (sem POST/RPC), badge vira "Aprovada pelo gestor";
 *   • gestor fora de escopo (sem vínculo) → desabilitado com motivo explícito;
 *   • contador da fila atualiza e persiste após F5.
 * Uso: node _tmp-validar-aprovacao-todos.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-aprovacao-todos';
mkdirSync(OUT, { recursive: true });
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const SENHA = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
let papeis = ['admin'];
const responderPapeis = (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(papeis) });
await page.route('**/rest/v1/rpc/get_user_roles', responderPapeis);
const escritas = [];
page.on('request', (r) => {
  const u = r.url();
  const metodo = r.method();
  const rpcEscrita = metodo === 'POST' && /rpc\/(decidir|validar|editar|enviar)/.test(u);
  const tabelaEscrita =
    ['POST', 'PATCH', 'PUT', 'DELETE'].includes(metodo) &&
    /rest\/v1\/(feedbacks_360|feedbacks_360_consolidacoes|feedbacks_360_aprovacoes_gestor|feedbacks_360_validacoes_potencial)/.test(
      u
    );
  if (rpcEscrita || tabelaEscrita) escritas.push(`${metodo} ${u}`);
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
await page.waitForTimeout(2600);

const grupo = () => page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
const contador = async () => {
  const t = (await grupo().getByRole('button', { name: /Aguardando gestor/ }).textContent()) ?? '';
  return Number((t.match(/(\d+)\s*$/)?.[1] ?? '-1').toString());
};
const cards = () =>
  page.evaluate(() => {
    const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const candidatos = Array.from(document.querySelectorAll('div.rounded-xl')).filter((d) =>
      Array.from(d.querySelectorAll('p')).some((p) => texto(p) === 'Avaliado por')
    );
    const raizes = candidatos.filter((d) => !candidatos.some((o) => o !== d && d.contains(o)));
    return raizes.map((card) => {
      const botoes = Array.from(card.querySelectorAll('button')).filter((b) =>
        /^(Aprovar avaliação|Devolver para correção)$/.test(texto(b))
      );
      const aprovar = botoes.find((b) => texto(b) === 'Aprovar avaliação');
      const devolver = botoes.find((b) => texto(b) === 'Devolver para correção');
      return {
        nome: texto(card.querySelector('h3')),
        status: texto(card.querySelector('[role="status"]')),
        aprovar: { disabled: aprovar?.disabled ?? null, title: aprovar?.getAttribute('title') ?? null },
        devolver: { disabled: devolver?.disabled ?? null },
      };
    });
  });

const rel = { quando: new Date().toISOString(), adminGestor: {}, aprovacao: {}, f5: {}, gestorSo: {}, escritas };
await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1500);
rel.adminGestor.contador = await contador();
rel.adminGestor.cards = await cards();
await page.screenshot({ path: `${OUT}/01-fila-admin-gestor.png`, fullPage: true });

const semGestor = rel.adminGestor.cards.find((c) => /não atribuído/i.test(c.status));
const alvo = semGestor ?? rel.adminGestor.cards[0];
rel.aprovacao.alvo = alvo ? { nome: alvo.nome, status: alvo.status, aprovar: alvo.aprovar } : null;

if (alvo && alvo.aprovar.disabled === false) {
  const card = page.locator('div.rounded-xl', { has: page.getByRole('heading', { name: alvo.nome }) }).first();
  await card.getByRole('button', { name: 'Aprovar avaliação' }).click();
  await page.waitForTimeout(1600);
  rel.aprovacao.toasts = await page.locator('[data-sonner-toast]').allTextContents();
  rel.aprovacao.contador = await contador();
  rel.aprovacao.badge = (
    await page
      .locator('div.rounded-xl', { has: page.getByRole('heading', { name: alvo.nome }) })
      .first()
      .locator('[role="status"]')
      .first()
      .textContent()
  )?.trim();
  await page.screenshot({ path: `${OUT}/02-apos-aprovar.png`, fullPage: true });
}
rel.escritas = [...escritas];

// F5 — a decisão local persiste.
await page.reload();
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(2500);
await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1400);
rel.f5.contador = await contador();
rel.f5.badge = alvo
  ? (
      await page
        .locator('div.rounded-xl', { has: page.getByRole('heading', { name: alvo.nome }) })
        .first()
        .locator('[role="status"]')
        .first()
        .textContent()
    )?.trim()
  : null;

// SESSÃO SÓ GESTOR — o card órfão fica bloqueado com motivo (fora de escopo).
papeis = ['gestor'];
await page.evaluate(() => {
  localStorage.removeItem('dp-desempenho-demo-registros');
  localStorage.removeItem('dp-desempenho-aprovacoes-demo');
});
await page.reload();
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(2500);
await grupo().getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1400);
rel.gestorSo.cards = await cards();
await page.screenshot({ path: `${OUT}/03-fila-gestor-sem-vinculo.png`, fullPage: true });

writeFileSync(`${OUT}/resultado.json`, `${JSON.stringify(rel, null, 2)}\n`);
console.log(JSON.stringify(rel, null, 1));
await browser.close();

