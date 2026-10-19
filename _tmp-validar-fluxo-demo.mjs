/**
 * VALIDAÇÃO NO NAVEGADOR — fluxo DEMONSTRATIVO (sem tocar no Supabase).
 *
 * Comprova, com a UI real e a sessão de teste:
 *   • pendência visível na fila "Aguardando gestor";
 *   • botões desabilitados com explicação quando não há gestor;
 *   • Aprovar/Devolver habilitados quando há gestor responsável (vitrine);
 *   • decisão salva LOCALMENTE, toast de demonstração e NENHUM POST ao banco;
 *   • persistência após F5;
 *   • devolução exige justificativa ≥ 10;
 *   • altura do card medida em 1440 e 1024.
 *
 * Uso: node _tmp-validar-fluxo-demo.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-aprovacao-real';
mkdirSync(OUT, { recursive: true });
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const SENHA = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const posts = [];
page.on('request', (r) => {
  if (r.method() !== 'GET' && !r.url().includes('/auth/v1/')) posts.push(`${r.method()} ${r.url()}`);
});

const rel = { quando: new Date().toISOString(), conta: EMAIL, t: {} };

/**
 * A conta E2E (`admin@teste.local`) tem SOMENTE o papel `admin` no banco — e o
 * admin não aprova. Para provar o fluxo com a conta de homologação (admin+gestor)
 * SEM mexer em permissão remota, a resposta de `get_user_roles` é interceptada
 * NESTA sessão do navegador. Nada é gravado no banco e o modo é demonstração.
 */
await page.route('**/rest/v1/rpc/get_user_roles', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) });
});
rel.papeisSimuladosNoFront = ['admin', 'gestor'];

/** Login pela UI (sessão nova a cada execução). */
await page.goto('http://localhost:8080/login');
await page.evaluate(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  // Baseline limpo: as decisões desta execução começam do zero (armazenamento local).
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

/** Cards da visualização atual (fila ou lista), com estado de cada botão. */
async function lerCards() {
  return page.evaluate(() => {
    const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const candidatos = Array.from(document.querySelectorAll('div.rounded-xl')).filter((d) =>
      Array.from(d.querySelectorAll('button')).some((b) => /^(Ver avaliação|Editar feedback)$/.test(texto(b)))
    );
    const raizes = candidatos.filter((d) => !candidatos.some((o) => o !== d && d.contains(o)));
    return raizes.map((card) => {
      const caixa = card.getBoundingClientRect();
      const corpo = card.children[0];
      const botoes = Array.from(card.querySelectorAll('button')).map((b) => ({
        rotulo: texto(b),
        desabilitado: b.disabled,
        title: b.getAttribute('title') ?? '',
        aria: b.getAttribute('aria-label') ?? '',
      }));
      return {
        colaborador: texto(card.querySelector('h3')),
        altura: Math.round(caixa.height),
        corpo: corpo ? Math.round(corpo.getBoundingClientRect().height) : 0,
        rodape: card.children[1] ? Math.round(card.children[1].getBoundingClientRect().height) : 0,
        badges: Array.from(card.querySelectorAll('[role="status"]')).map(texto),
        paragrafos: Array.from(card.querySelectorAll('p')).map(texto),
        botoes,
      };
    });
  });
}

const habilitado = (c, rotulo) => c.botoes.find((b) => b.rotulo === rotulo && !b.desabilitado) ?? null;
const bloqueado = (c, rotulo) => c.botoes.find((b) => b.rotulo === rotulo && b.desabilitado) ?? null;

/** Contador do chip "Aguardando gestor" (número dentro do texto). */
async function contadorAguardando() {
  const chip = page.getByRole('group', { name: 'Segmentar por tipo de feedback' }).getByRole('button', {
    name: /Aguardando gestor/,
  });
  const texto = (await chip.first().textContent()) ?? '';
  const n = Number((texto.match(/(\d+)/) ?? [])[1] ?? NaN);
  return Number.isFinite(n) ? n : null;
}

/** Escritas realmente ligadas à aprovação (o resto é leitura/login do app). */
const escritasDeAprovacao = () =>
  posts.filter(
    (p) =>
      !p.includes('get_user_roles') &&
      !p.startsWith('HEAD') &&
      (/\/rpc\/(decidir_aprovacao_gestor|enviar_avaliacao_ao_gestor|validar_potencial_avaliacao)/.test(p) ||
        /\/rest\/v1\/feedbacks_360_(consolidacoes|aprovacoes_gestor)/.test(p))
  );

/* ── Fila "Aguardando gestor" ─────────────────────────────────────────────── */
const grupo = page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
await grupo.getByRole('button', { name: /Aguardando gestor/ }).click();
await page.getByText('Gestor responsável').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(1800);

const fila1440 = await lerCards();
rel.t.fila1440 = { cards: fila1440.length, alturas: fila1440.map((c) => c.altura) };
rel.t.exemploCard = fila1440[0] ?? null;
await page.screenshot({ path: `${OUT}/01-fila-1440.png`, fullPage: true });

await page.setViewportSize({ width: 1024, height: 1000 });
await page.waitForTimeout(1200);
const fila1024 = await lerCards();
rel.t.fila1024 = { cards: fila1024.length, alturas: fila1024.map((c) => c.altura) };
await page.screenshot({ path: `${OUT}/02-fila-1024.png`, fullPage: true });
await page.setViewportSize({ width: 1440, height: 1000 });
await page.waitForTimeout(900);

rel.t.permissoes = {
  algumSemGestorComAprovarBloqueado: fila1440.some(
    (c) => c.badges.includes('Gestor não atribuído') && bloqueado(c, 'Aprovar avaliação')
  ),
  motivoDoBloqueio: fila1440
    .find((c) => bloqueado(c, 'Aprovar avaliação'))
    ?.botoes.find((b) => b.rotulo === 'Aprovar avaliação')?.title,
};

/* ── APROVAR (vitrine) ────────────────────────────────────────────────────── */
const cardAprovar = fila1440.find((c) => habilitado(c, 'Aprovar avaliação'));
rel.t.aprovar = { encontrado: Boolean(cardAprovar), colaborador: cardAprovar?.colaborador ?? null };

if (cardAprovar) {
  const contadorAntes = await contadorAguardando();
  const card = page
    .locator('div.rounded-xl', { has: page.getByRole('heading', { name: cardAprovar.colaborador }) })
    .first();
  await card.getByRole('button', { name: 'Aprovar avaliação' }).click();
  await page.waitForTimeout(1200);
  rel.t.aprovar.toasts = await page.locator('[data-sonner-toast]').allTextContents();
  rel.t.aprovar.escritasDeAprovacao = escritasDeAprovacao();
  await page.screenshot({ path: `${OUT}/03-apos-aprovar.png`, fullPage: true });

  const salvo = await page.evaluate(() => localStorage.getItem('dp-desempenho-aprovacoes-demo'));
  rel.t.aprovar.localStorage = salvo ? (JSON.parse(salvo).decisoes ?? null) : null;

  // F5 → a decisão continua (armazenamento local) e o contador cai.
  await page.reload();
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.getByText('Avaliado por').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(2600);
  await grupo.getByRole('button', { name: /Aguardando gestor/ }).click();
  await page.waitForTimeout(1500);
  const aposF5 = await lerCards();
  const cardAposF5 = aposF5.find((c) => c.colaborador === cardAprovar.colaborador) ?? null;
  rel.t.aprovar.aposF5 = {
    contadorAntes,
    contadorDepois: await contadorAguardando(),
    aindaNaFila: Boolean(cardAposF5),
    badgeNaFila: cardAposF5?.badges ?? [],
    decisaoNoStorage: await page.evaluate(() => Boolean(localStorage.getItem('dp-desempenho-aprovacoes-demo'))),
  };
  await page.screenshot({ path: `${OUT}/04-apos-F5-fila.png`, fullPage: true });

  // Lista: o card do colaborador deve exibir "Aprovada pelo gestor"
  await grupo.getByRole('button', { name: /^Todos/ }).click();
  await page.waitForTimeout(1500);
  const lista = await lerCards();
  rel.t.aprovar.badgeNaLista = lista
    .filter((c) => c.colaborador === cardAprovar.colaborador)
    .map((c) => c.badges)
    .flat();
  await page.screenshot({ path: `${OUT}/05-lista-aprovada.png`, fullPage: true });
}

/* ── DEVOLVER (vitrine) ───────────────────────────────────────────────────── */
const grupo2 = page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
await grupo2.getByRole('button', { name: /Aguardando gestor/ }).click();
await page.waitForTimeout(1400);
const fila2 = await lerCards();
const cardDevolver = fila2.find((c) => habilitado(c, 'Devolver para correção'));
rel.t.devolver = { encontrado: Boolean(cardDevolver), colaborador: cardDevolver?.colaborador ?? null };

if (cardDevolver) {
  const card = page
    .locator('div.rounded-xl', { has: page.getByRole('heading', { name: cardDevolver.colaborador }) })
    .first();
  await card.getByRole('button', { name: 'Devolver para correção' }).click();
  const confirmar = page.getByRole('button', { name: /Confirmar devolução/ });
  await confirmar.waitFor();
  rel.t.devolver.curtaDesabilita = await confirmar.isDisabled();
  await page.getByLabel(/Justificativa obrigatória/i).fill('curta');
  rel.t.devolver.curtaAindaDesabilita = await confirmar.isDisabled();
  await page.getByLabel(/Justificativa obrigatória/i).fill('Ajustar os pontos de melhoria antes da aprovação');
  rel.t.devolver.longaHabilita = await confirmar.isEnabled();
  await page.screenshot({ path: `${OUT}/06-devolucao-justificativa.png`, fullPage: true });
  await confirmar.click();
  await page.waitForTimeout(1200);
  rel.t.devolver.toasts = await page.locator('[data-sonner-toast]').allTextContents();
  rel.t.devolver.escritasDeAprovacao = escritasDeAprovacao();

  await page.reload();
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.getByText('Avaliado por').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(2600);
  const lista2 = await lerCards();
  rel.t.devolver.badgeNaLista = lista2
    .filter((c) => c.colaborador === cardDevolver.colaborador)
    .map((c) => c.badges)
    .flat();
  await page.screenshot({ path: `${OUT}/07-apos-F5-devolvida.png`, fullPage: true });
}

rel.t.escritasDeAprovacaoNaSessao = escritasDeAprovacao();
writeFileSync(`${OUT}/validacao-demo.json`, `${JSON.stringify(rel, null, 2)}\n`);
console.log(JSON.stringify(rel, null, 2));

await browser.close();

