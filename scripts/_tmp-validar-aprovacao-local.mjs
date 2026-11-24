/**
 * TEMPORÁRIO — VALIDAÇÃO do FLUXO DE APROVAÇÃO DA DEMONSTRAÇÃO.
 *
 * Prova, no navegador e sobre os MOCKS, que:
 *  1. abrir uma avaliação "Aguardando gestor" e clicar em APROVAR salva a
 *     decisão LOCALMENTE (localStorage) — sem nenhuma escrita no Supabase;
 *  2. a decisão SOBREVIVE ao F5 e o contador de pendências cai;
 *  3. a etapa do RH aparece com o estado novo e o Nine-Box reflete a decisão;
 *  4. DEVOLVER (com justificativa) e REENVIAR também persistem.
 *
 * Uso: node scripts/_tmp-validar-aprovacao-local.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-validacao-aprovacao-local';
mkdirSync(OUT, { recursive: true });
const CHAVE = 'dp-desempenho-aprovacoes-demo';
const relatorio = { escritasNoSupabase: [], errosDePagina: [] };

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Prova de que NADA do fluxo é gravado no banco: qualquer ESCRITA
  // (POST/PATCH/DELETE) nas tabelas do fluxo ou RPC oficial é registrada.
  page.on('request', (r) => {
    const url = r.url();
    const metodo = r.method();
    if (!/supabase\.co/.test(url)) return;
    const alvoFluxo =
      /rpc\/(decidir_aprovacao_gestor|enviar_avaliacao_ao_gestor|validar_potencial_avaliacao|finalizar_feedback|criar_feedback_seguro|pode_aprovar_colaborador)/.test(
        url
      ) || (/rest\/v1\/feedbacks_360/.test(url) && !['GET', 'HEAD'].includes(metodo));
    if (alvoFluxo) relatorio.escritasNoSupabase.push(`${metodo} ${url.split('?')[0]}`);
  });
  // Papéis do usuário da sessão (o POST de `get_user_roles` é LEITURA, via RPC).
  page.on('response', async (r) => {
    if (!/rpc\/get_user_roles/.test(r.url())) return;
    try {
      const corpo = await r.json();
      const lista = Array.isArray(corpo) ? corpo : [corpo];
      relatorio.papeisDoSessao = lista.map((x) => x?.role ?? x?.papel ?? x).filter(Boolean);
    } catch {
      /* resposta em outro formato: irrelevante para o roteiro */
    }
  });
  page.on('pageerror', (e) => relatorio.errosDePagina.push(String(e.message).slice(0, 200)));

  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });

  /* ─── Helpers de navegação ───────────────────────────────────────────── */
  const irParaFeedbacks = async () => {
    await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
    await page.getByRole('tab', { name: /Feedbacks/i }).click();
    // A aba pode estar na timeline (após recarga) ou já na fila de aprovação.
    await page
      .getByText(/Avaliado por|Gestor responsável/)
      .first()
      .waitFor({ timeout: 20000 });
    await page.waitForTimeout(2000);
  };
  const chipAguardando = () =>
    page
      .getByRole('group', { name: 'Segmentar por tipo de feedback' })
      .getByRole('button', { name: /Aguardando gestor/ })
      .first();
  const contadorAguardando = async () =>
    ((await chipAguardando().textContent()) ?? '').replace(/\s+/g, ' ').trim();
  const abrirFila = async () => {
    // O chip ALTERNA a visão: só clica se a fila ainda não estiver aberta.
    const jaAberta = await page
      .getByText('Gestor responsável')
      .first()
      .isVisible()
      .catch(() => false);
    if (!jaAberta) await chipAguardando().click();
    await page.getByText('Gestor responsável').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
  };
  /** Linha da fila (o selo de status sobe até o card da linha). */
  const linhaDa = (i = 0) =>
    page.locator('[role="status"]').nth(i).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  const lerFila = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="status"]')).map((s) => {
        const card = s.closest('div[class*="rounded-xl"]');
        return {
          nome: card?.querySelector('h3')?.textContent?.trim() ?? null,
          selo: (s.textContent ?? '').trim(),
          botoes: Array.from(card?.querySelectorAll('button') ?? []).map((b) =>
            (b.textContent ?? '').replace(/\s+/g, ' ').trim()
          ),
        };
      })
    );
  const lerLocal = async () =>
    JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CHAVE)) ?? '{}');
  /** Índice da linha da fila pelo SELO (ex.: 'Aguardando gestor'). */
  const indicePorSelo = async (selo, aPartirDe = 0) => {
    const fila = await lerFila();
    return fila.findIndex((l, i) => i >= aPartirDe && l.selo === selo);
  };
  const abrirModal = async (linha) => {
    await linha.getByRole('button', { name: 'Ver avaliação' }).click();
    const dialogo = page.getByRole('dialog');
    await dialogo.waitFor({ timeout: 15000 });
    await page.waitForTimeout(900);
    return dialogo;
  };
  const lerModal = (dialogo) =>
    dialogo.evaluate((el) => {
      const botoes = Array.from(el.querySelectorAll('button')).map((b) =>
        (b.textContent ?? '').replace(/\s+/g, ' ').trim()
      );
      const selo = el.querySelector('[role="status"]');
      const aprovar = Array.from(el.querySelectorAll('button')).find((b) =>
        /Aprovar avaliação/.test(b.textContent ?? '')
      );
      return {
        colaborador: el.querySelector('h2')?.textContent?.trim() ?? null,
        selo: (selo?.textContent ?? '').trim() || null,
        botoes,
        temAprovar: botoes.includes('Aprovar avaliação'),
        temDevolver: botoes.includes('Devolver para correção'),
        temValidarPotencial: botoes.some((b) => /Validar Potencial/.test(b)),
        tituloAprovar: aprovar?.getAttribute('title') ?? null,
      };
    });
  const ultimoToast = async () =>
    (
      (await page
        .locator('[data-sonner-toast]')
        .first()
        .textContent()
        .catch(() => null)) ?? ''
    )
      .replace(/\s+/g, ' ')
      .trim() || null;
  const kpiAvaliados = () =>
    page.evaluate(() => {
      const rotulo = Array.from(document.querySelectorAll('p,span,div')).find(
        (el) => el.textContent?.trim() === 'Colaboradores avaliados'
      );
      const bruto = (rotulo?.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const m = bruto.match(/Colaboradores avaliados\s*(\d+)/);
      return { bruto, valor: m ? Number(m[1]) : null };
    });

  /* ─── PASSO 0 · linha de base (armazenamento da vitrine limpo) ────────── */
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await irParaFeedbacks();
  await page.evaluate((k) => localStorage.removeItem(k), CHAVE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await irParaFeedbacks();
  relatorio.passo0_limpo = { contador: await contadorAguardando(), local: await lerLocal() };

  /* ─── PASSO 0b · Nine-Box ANTES (classificação de partida) ───────────── */
  await page.getByRole('tab', { name: /Nine-Box/i }).click();
  await page.waitForTimeout(2600);
  relatorio.passo0_ninebox = { kpi: await kpiAvaliados() };
  await page.screenshot({ path: `${OUT}/00-ninebox-antes.png` });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await irParaFeedbacks();

  /* ─── PASSO 1 · fila "Aguardando gestor" ─────────────────────────────── */
  await abrirFila();
  relatorio.passo1_fila = { linhas: (await lerFila()).slice(0, 5) };
  await page.screenshot({ path: `${OUT}/01-fila-antes.png` });

  /* ─── PASSO 2 · APROVAR no modal (registro fictício) ─────────────────── */
  const i1 = await indicePorSelo('Aguardando gestor');
  const linha1 = linhaDa(i1);
  const nome1 = ((await linha1.getByRole('heading').first().textContent()) ?? '').trim();
  const dialogo = await abrirModal(linha1);
  relatorio.passo2_modalAntes = { nome: nome1, ...(await lerModal(dialogo)) };
  await dialogo.screenshot({ path: `${OUT}/02-modal-antes-aprovar.png` });

  await dialogo.getByRole('button', { name: /Aprovar avaliação/ }).click();
  await page.waitForTimeout(1500);
  relatorio.passo2_aposAprovar = {
    aviso: await ultimoToast(),
    local: await lerLocal(),
    escritasNoSupabase: [...relatorio.escritasNoSupabase],
  };
  await page.screenshot({ path: `${OUT}/03-apos-aprovar.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);

  /* ─── PASSO 3 · F5 e conferência da PERSISTÊNCIA ─────────────────────── */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await irParaFeedbacks();
  const contadorDepois = await contadorAguardando();
  await abrirFila();
  const filaDepois = await lerFila();
  const iAposF5 = filaDepois.findIndex((l) => l.nome === nome1);
  relatorio.passo3_aposF5 = {
    contador: contadorDepois,
    linhaDoColaborador: iAposF5 >= 0 ? filaDepois[iAposF5] : null,
    local: await lerLocal(),
  };
  await page.screenshot({ path: `${OUT}/04-fila-apos-f5.png` });

  /* ─── PASSO 4 · a etapa do RH vê o MESMO estado (modal após F5) ──────── */
  if (iAposF5 >= 0) {
    const dialogoRh = await abrirModal(linhaDa(iAposF5));
    relatorio.passo4_etapaRh = await lerModal(dialogoRh);
    await dialogoRh.screenshot({ path: `${OUT}/05-modal-etapa-rh.png` });

    // O RH valida o Potencial (botão do próprio rodapé, quando o papel permite)
    const validarNoModal = page.getByRole('button', { name: /Validar Potencial/ }).first();
    relatorio.passo4_temValidarNoModal = await validarNoModal.isVisible().catch(() => false);
    if (relatorio.passo4_temValidarNoModal) {
      await validarNoModal.click();
      await page.waitForTimeout(1500);
      relatorio.passo4_aposValidar = { aviso: await ultimoToast(), local: await lerLocal() };
      await dialogoRh.screenshot({ path: `${OUT}/06-modal-validado.png` });
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  /* ─── PASSO 5 · validar o Potencial pela FILA (papel RH) ─────────────── */
  await abrirFila();
  const filaRh = await lerFila();
  const iRh = filaRh.findIndex((l) => l.nome === nome1);
  relatorio.passo5_filaRh = iRh >= 0 ? filaRh[iRh] : null;
  if (iRh >= 0 && (filaRh[iRh].botoes ?? []).includes('Validar Potencial')) {
    await linhaDa(iRh).getByRole('button', { name: 'Validar Potencial' }).click();
    await page.waitForTimeout(1500);
    relatorio.passo5_aposValidar = { aviso: await ultimoToast(), local: await lerLocal() };
    await page.screenshot({ path: `${OUT}/07-fila-apos-validar.png` });
  }

  /* ─── PASSO 6 · Nine-Box reflete a decisão (após F5) ─────────────────── */
  await page.getByRole('tab', { name: /Nine-Box/i }).click();
  await page.waitForTimeout(2600);
  relatorio.passo6_ninebox = {
    antes: relatorio.passo0_ninebox?.kpi ?? null,
    depois: await kpiAvaliados(),
    local: await lerLocal(),
  };
  await page.screenshot({ path: `${OUT}/08-ninebox-apos-decisao.png`, fullPage: false });

  /* ─── PASSO 6b · VALIDAÇÃO DO POTENCIAL (lado RH) ─────────────────────
     O botão "Validar Potencial" é EXCLUSIVO do papel RH (`podeValidarPotencial`
     — regra do servidor espelhada no front). A sessão E2E é `admin`, então o
     controle não é oferecido: aqui o MESMO registro que o clique do RH grava
     (`validarPotencialLocal`) é semeado no armazenamento para provar o
     consumidor — a classificação VOLTA ao Nine-Box na versão aprovada. */
  await page.evaluate((k) => {
    const estado = JSON.parse(localStorage.getItem(k) ?? '{}');
    const chave = Object.keys(estado.decisoes ?? {})[0];
    if (!chave) return;
    const d = estado.decisoes[chave];
    estado.validacoes = {
      ...(estado.validacoes ?? {}),
      [chave]: {
        colaboradorId: d.colaboradorId,
        cicloId: d.cicloId,
        versaoAvaliacao: d.versaoAvaliacao,
        validadoEm: new Date().toISOString(),
        validadoPor: 'rh@teste.local',
        observacao: 'Validação do Potencial semeada (equivalente ao clique do RH na fila).',
      },
    };
    localStorage.setItem(k, JSON.stringify(estado));
  }, CHAVE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await irParaFeedbacks();
  await page.getByRole('tab', { name: /Nine-Box/i }).click();
  await page.waitForTimeout(2600);
  relatorio.passo6b_nineboxValidado = { kpi: await kpiAvaliados() };
  await page.screenshot({ path: `${OUT}/08b-ninebox-apos-validar-potencial.png` });

  // O selo do modal passa a "Concluída e validada" (mesma fonte de estado).
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await irParaFeedbacks();
  await abrirFila();
  const filaValidada = await lerFila();
  const iValidado = filaValidada.findIndex((l) => l.nome === nome1);
  if (iValidado >= 0) {
    const dValidado = await abrirModal(linhaDa(iValidado));
    relatorio.passo6b_modalValidado = await lerModal(dValidado);
    await dValidado.screenshot({ path: `${OUT}/08c-modal-concluida-validada.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  /* ─── PASSO 7 · DEVOLVER (com justificativa) + REENVIAR ──────────────── */
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await irParaFeedbacks();
  await abrirFila();
  const fila2 = await lerFila();
  const iDevolver = await indicePorSelo('Aguardando gestor', 1);
  const linha2 = linhaDa(iDevolver);
  const nome2 = ((await linha2.getByRole('heading').first().textContent()) ?? '').trim();
  const dialogo2 = await abrirModal(linha2);
  relatorio.passo7_modal = { nome: nome2, ...(await lerModal(dialogo2)) };

  const devolver = page.getByRole('button', { name: /Devolver para correção/ }).first();
  if (await devolver.isVisible().catch(() => false)) {
    await devolver.click();
    await page.waitForTimeout(900);
    await page
      .getByLabel('Justificativa obrigatória')
      .fill('Devolvido no teste de demonstração: revisar as metas do ciclo.');
    await page.screenshot({ path: `${OUT}/09-modal-devolucao.png` });
    await page.getByRole('button', { name: 'Confirmar devolução' }).click();
    await page.waitForTimeout(1600);
    relatorio.passo7_aposDevolver = { aviso: await ultimoToast(), local: await lerLocal() };
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // Reenvio pela própria fila (papel de RH/admin)
    await irParaFeedbacks();
    await abrirFila();
    const fila3 = await lerFila();
    const iReenviar = fila3.findIndex((l) => l.nome === nome2 && (l.botoes ?? []).includes('Reenviar ao gestor'));
    relatorio.passo7_filaReenvio = iReenviar >= 0 ? fila3[iReenviar] : null;
    if (iReenviar >= 0) {
      await linhaDa(iReenviar).getByRole('button', { name: 'Reenviar ao gestor' }).click();
      await page.waitForTimeout(1600);
      relatorio.passo7_aposReenviar = { aviso: await ultimoToast(), local: await lerLocal() };
      await page.screenshot({ path: `${OUT}/10-fila-apos-reenviar.png` });
    }
  }

  /* ─── PASSO 8 · F5 final: o que restou continua salvo ────────────────── */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await irParaFeedbacks();
  relatorio.passo8_final = {
    contador: await contadorAguardando(),
    local: await lerLocal(),
    escritasNoSupabase: relatorio.escritasNoSupabase,
  };
} catch (erro) {
  // O relatório é SEMPRE escrito, mesmo com falha no meio do roteiro.
  relatorio.erroFatal = String(erro?.message ?? erro).slice(0, 500);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
}
