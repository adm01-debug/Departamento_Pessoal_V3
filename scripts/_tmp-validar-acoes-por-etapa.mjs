/**
 * TEMPORÁRIO — AÇÕES DO RODAPÉ POR ETAPA (regra única), no navegador real.
 *
 * Comprova que cada etapa mostra SOMENTE os botões que lhe pertencem:
 *   A) Avaliações · pendente   → Concluir + Cancelar;
 *   B) Avaliações · concluído  → NENHUM botão operacional;
 *   C) Aguardando gestor       → Aprovar + Devolver (gestor responsável);
 *   D) Após aprovar            → os botões de aprovação DESAPARECEM;
 *   E) Etapa do RH             → SOMENTE Validar Potencial.
 *
 * Uso: node scripts/_tmp-validar-acoes-por-etapa.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-acoes-por-etapa';
mkdirSync(OUT, { recursive: true });
const relatorio = { etapas: {} };
const browser = await chromium.launch();

async function abrirContexto({ papeis, storage }) {
  const context = await browser.newContext({
    storageState: storage ?? 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 1000 },
  });
  await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(papeis) })
  );
  await context.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  const page = await context.newPage();
  return { context, page };
}

const irFeedbacks = async (page) => {
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.waitForTimeout(900);
  const todos = page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Todos/ })
    .first();
  if (await todos.isVisible().catch(() => false)) {
    await todos.click();
    await page.waitForTimeout(900);
  }
};

const abrirFila = async (page) => {
  const jaAberta = await page.getByText('Gestor responsável').first().isVisible().catch(() => false);
  if (!jaAberta) {
    await page
      .getByRole('group', { name: 'Segmentar por tipo de feedback' })
      .getByRole('button', { name: /Aguardando gestor/ })
      .first()
      .click();
  }
  await page.getByText('Gestor responsável').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1000);
};

/** Botões OPERACIONAIS visíveis no rodapé do modal aberto. */
const acoesDoModal = (page) =>
  page.getByRole('dialog').last().evaluate((el) => {
    const acoes = Array.from(el.querySelectorAll('button'))
      .map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter((t) =>
        /^(Concluir avaliação|Cancelar avaliação|Reabrir avaliação|Aprovar avaliação|Devolver para correção|Validar Potencial)$/.test(
          t
        )
      );
    const status = el.querySelector('[role="status"]');
    return { acoes, selo: (status?.textContent ?? '').trim() || null };
  });

/** Abre o modal de um card da listagem cujo selo contenha o texto indicado. */
async function abrirCardCom(page, texto) {
  const cards = page.locator('div[class*="rounded-xl"]').filter({ hasText: texto });
  const total = await cards.count();
  for (let i = 0; i < total; i += 1) {
    const abrir = cards.nth(i).getByRole('button', { name: /Ver feedback|Ver avaliação/ }).first();
    if (!(await abrir.isVisible().catch(() => false))) continue;
    await abrir.click();
    await page.getByRole('dialog').last().waitFor({ timeout: 15000 });
    await page.waitForTimeout(700);
    return true;
  }
  return false;
}

/** Abre o modal da linha da fila com o selo indicado. */
async function abrirLinhaComSelo(page, seloRegex) {
  const selo = page.locator('[role="status"]').filter({ hasText: seloRegex }).first();
  const linha = selo.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  const abrir = linha.getByRole('button', { name: 'Ver avaliação' });
  if (!(await abrir.isVisible().catch(() => false))) return false;
  await abrir.click();
  await page.getByRole('dialog').last().waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  return true;
}

try {
  /* ── Contexto (admin+gestor) — etapas A, B, C e D ──────────────────────── */
  const { context: ctx1, page: p1 } = await abrirContexto({ papeis: ['admin', 'gestor'] });
  await p1.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await irFeedbacks(p1);

  if (await abrirCardCom(p1, 'Pendente')) {
    relatorio.etapas.A_pendente = await acoesDoModal(p1);
    await p1.screenshot({ path: `${OUT}/A-avaliacao-pendente.png` });

    // Conclui ESTA avaliação e reabre o MESMO registro: agora é "Concluído".
    const concluir = p1.getByRole('dialog').last().getByRole('button', { name: /^Concluir avaliação$/ });
    if (await concluir.isEnabled().catch(() => false)) {
      await concluir.click();
      await p1.waitForTimeout(2200);
      relatorio.etapas.A_aposConcluir = {
        aviso: (await p1.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null,
      };
      await p1.keyboard.press('Escape');
      await p1.waitForTimeout(700);

      if (await abrirCardCom(p1, 'Concluído')) {
        relatorio.etapas.B_concluido = await acoesDoModal(p1);
        await p1.screenshot({ path: `${OUT}/B-avaliacao-concluida.png` });
        await p1.keyboard.press('Escape');
        await p1.waitForTimeout(600);
      } else {
        // Fallback determinístico: o registro recém-concluído é o PRIMEIRO da
        // listagem — abre o card e registra o selo do próprio modal.
        const primeiro = p1.getByRole('button', { name: /Ver feedback|Ver avaliação/ }).first();
        if (await primeiro.isVisible().catch(() => false)) {
          await primeiro.click();
          await p1.getByRole('dialog').last().waitFor({ timeout: 15000 });
          await p1.waitForTimeout(800);
          relatorio.etapas.B_concluido = await acoesDoModal(p1);
          await p1.screenshot({ path: `${OUT}/B-avaliacao-concluida.png` });
          await p1.keyboard.press('Escape');
          await p1.waitForTimeout(600);
        }
      }
    }
  }

  await abrirFila(p1);
  if (await abrirLinhaComSelo(p1, /Aguardando gestor/)) {
    relatorio.etapas.C_aguardandoGestor = await acoesDoModal(p1);
    await p1.screenshot({ path: `${OUT}/C-aguardando-gestor.png` });

    const aprovar = p1.getByRole('dialog').last().getByRole('button', { name: /^Aprovar avaliação$/ });
    if (await aprovar.isVisible().catch(() => false)) {
      await aprovar.click();
      await p1.waitForTimeout(2200);
      relatorio.etapas.D_aposAprovar = {
        aviso: (await p1.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null,
      };
      await p1.screenshot({ path: `${OUT}/D-apos-aprovar.png` });
      await p1.keyboard.press('Escape');
      await p1.waitForTimeout(700);
      await abrirFila(p1);
      if (await abrirLinhaComSelo(p1, /Aprovada pelo gestor/)) {
        relatorio.etapas.D_reabertoAprovada = await acoesDoModal(p1);
        await p1.screenshot({ path: `${OUT}/D-reaberto-aprovada.png` });
        await p1.keyboard.press('Escape');
        await p1.waitForTimeout(500);
      }
    }
  }

  await ctx1.storageState({ path: `${OUT}/perfil-demo.json` });
  await ctx1.close();

  /* ── Contexto RH — etapa E ─────────────────────────────────────────────── */
  const { context: ctx2, page: p2 } = await abrirContexto({ papeis: ['rh'], storage: `${OUT}/perfil-demo.json` });
  await p2.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await irFeedbacks(p2);
  await abrirFila(p2);
  if (await abrirLinhaComSelo(p2, /Aprovada pelo gestor/)) {
    relatorio.etapas.E_validacaoRh = await acoesDoModal(p2);
    await p2.screenshot({ path: `${OUT}/E-aguardando-validacao-rh.png` });
  } else {
    relatorio.etapas.E_validacaoRh = { erro: 'nenhuma avaliação aprovada na fila para o RH' };
  }
  await ctx2.close();
} catch (erro) {
  relatorio.erroFatal = String(erro?.message ?? erro).slice(0, 400);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
}

