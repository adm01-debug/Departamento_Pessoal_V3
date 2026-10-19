/**
 * TEMPORÁRIO — ENCAMINHAMENTO AUTOMÁTICO AO GESTOR (T1–T18), no navegador real.
 *
 * Demonstração (nada vai ao Supabase): cada avaliação criada pela TELA gera a
 * pendência do gestor responsável no ciclo correto, sem clique do RH.
 *
 * Uso: node scripts/_tmp-validar-encaminhamento-automatico.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-encaminhamento-automatico';
const BASE = 'http://localhost:8080';
mkdirSync(OUT, { recursive: true });
const R = { t: {} };

const browser = await chromium.launch();

async function abrir({ papeis, storage = 'e2e/.auth/user.json', viewport = { width: 1440, height: 1000 } }) {
  const context = await browser.newContext({ storageState: storage, viewport });
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

const removerOverlay = (page) =>
  page.evaluate(() => document.querySelector('vite-error-overlay')?.remove());

/** Fecha qualquer modal aberto (o overlay bloqueia cliques nos chips). */
const fecharModais = async (page) => {
  for (let i = 0; i < 4; i += 1) {
    if ((await page.locator('[role="dialog"]').count()) === 0) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
  }
  await removerOverlay(page);
};

const irFeedbacks = async (page) => {
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await removerOverlay(page);
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.waitForTimeout(1300);
  await removerOverlay(page);
};

/** Estado da fila: contador do chip + linhas (colaborador, selo, título, ações). */
const lerFila = (page) =>
  page.evaluate(() => {
    const chip = Array.from(document.querySelectorAll('[role="group"]')).find((g) =>
      /Segmentar por tipo de feedback/i.test(g.getAttribute('aria-label') ?? '')
    );
    const botaoAguardando = chip
      ? Array.from(chip.querySelectorAll('button')).find((b) => /Aguardando gestor/i.test(b.textContent ?? ''))
      : null;
    const linhas = Array.from(document.querySelectorAll('div[class*="rounded-xl"]'))
      .filter((el) => /gestor responsável/i.test(el.innerText ?? ''))
      .map((el) => {
        const selo = el.querySelector('[role="status"]');
        const colunaAcoes = selo?.parentElement ?? null;
        return {
          colaborador: (el.querySelector('h3')?.textContent ?? '').trim(),
          texto: (el.innerText ?? '').replace(/\s+/g, ' ').trim(),
          selo: (selo?.textContent ?? '').trim(),
          titulo: colunaAcoes?.getAttribute('title') ?? '',
          acoes: Array.from(el.querySelectorAll('button')).map((b) => ({
            rotulo: (b.textContent ?? '').trim(),
            desabilitado: b.disabled,
            title: b.getAttribute('title'),
          })),
        };
      });
    return {
      contador: (botaoAguardando?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      total: linhas.length,
      linhas,
    };
  });

const abrirFila = async (page) => {
  await fecharModais(page);
  const chip = page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Aguardando gestor/ })
    .first();
  const jaNaFila = await page
    .getByText('Gestor responsável')
    .first()
    .isVisible()
    .catch(() => false);
  if (!jaNaFila) {
    await chip.click();
    await page.waitForTimeout(600);
    if (
      !(await page
        .getByText('Gestor responsável')
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      await chip.click();
    }
  }
  await page.getByText('Gestor responsável').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1600);
  await removerOverlay(page);
};

const voltarLista = async (page) => {
  await fecharModais(page);
  await page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Todos/ })
    .first()
    .click();
  await page.waitForTimeout(1400);
  await removerOverlay(page);
};

/** Cria uma avaliação pela TELA (gravação local da vitrine). */
async function criarAvaliacao(page, { avaliado, avaliador, tipoIndice, texto, ciclo }) {
  await page.getByRole('button', { name: /Novo feedback/i }).first().click();
  const dialogo = page.getByRole('dialog').last();
  await dialogo.waitFor({ timeout: 15000 });
  await page.waitForTimeout(1400);

  const escolherPorTexto = async (rotulo, alvo) => {
    await dialogo.getByRole('combobox', { name: rotulo, exact: true }).click();
    await page.waitForTimeout(500);
    const opcoes = page.getByRole('option');
    const total = await opcoes.count();
    let ok = false;
    for (let i = 0; i < total; i += 1) {
      const t = ((await opcoes.nth(i).textContent()) ?? '').trim();
      if (t.toLowerCase().includes(alvo.toLowerCase())) {
        await opcoes.nth(i).click();
        ok = true;
        break;
      }
    }
    if (!ok) await opcoes.nth(Math.min(1, total - 1)).click();
    await page.waitForTimeout(400);
  };

  await escolherPorTexto('Avaliado', avaliado);
  await escolherPorTexto('Avaliador do feedback', avaliador);
  await dialogo.getByRole('combobox', { name: 'Tipo de feedback', exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByRole('option').nth(tipoIndice).click();
  await page.waitForTimeout(400);
  if (ciclo) {
    await dialogo.getByRole('combobox', { name: 'Ciclo do feedback', exact: true }).click();
    await page.waitForTimeout(500);
    const opcoes = page.getByRole('option');
    const total = await opcoes.count();
    for (let i = 0; i < total; i += 1) {
      const t = ((await opcoes.nth(i).textContent()) ?? '').trim();
      if (t.includes(ciclo)) {
        await opcoes.nth(i).click();
        break;
      }
      if (i === total - 1) await opcoes.nth(Math.min(1, total - 1)).click();
    }
    await page.waitForTimeout(400);
  }
  const areas = dialogo.locator('textarea');
  await areas.nth(0).fill('Ponto forte do ciclo.');
  await areas.nth(1).fill('Ponto de melhoria do ciclo.');
  await areas.nth(2).fill(texto);
  await dialogo.getByRole('button', { name: /Registrar|Salvar|Criar/i }).last().click();
  await page.waitForTimeout(2800);
  await removerOverlay(page);
  return (
    (await page.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null
  );
}

const linhaDe = (fila, nome) => fila.linhas.find((l) => l.colaborador.includes(nome)) ?? null;

/* ══════════════ T1–T7, T10–T18 (contexto admin+gestor) ════════════════════ */
try {
  const { context, page } = await abrir({ papeis: ['admin', 'gestor'] });
  await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded' });
  await irFeedbacks(page);

  const cicloEmFoco = ((await page.locator('[role="combobox"]').first().innerText()) ?? '')
    .split('\n')[0]
    .trim();
  R.cicloEmFoco = cicloEmFoco;

  /* BASELINE (mocks intactos) */
  await abrirFila(page);
  const base = await lerFila(page);
  R.t.T17_mocksIntactos = { linhasBase: base.total, contadorBase: base.contador };
  await page.screenshot({ path: `${OUT}/T00-fila-base.png` });
  await voltarLista(page);

  /* T2/T10 — PAR de um colaborador SEM avaliação do gestor. */
  R.t.T2_parSemGestor = {
    aviso: await criarAvaliacao(page, {
      avaliado: 'Mariana Oliveira Santos',
      avaliador: 'Fernanda Costa Ribeiro',
      tipoIndice: 1,
      ciclo: cicloEmFoco,
      texto: 'PAR sem avaliação do gestor (T2/T10).',
    }),
  };
  await abrirFila(page);
  const filaPar = await lerFila(page);
  const linhaMariana = linhaDe(filaPar, 'Mariana Oliveira Santos');
  R.t.T2_parSemGestor.fila = {
    encontrada: Boolean(linhaMariana),
    selo: linhaMariana?.selo ?? null,
    titulo: linhaMariana?.titulo ?? null,
    acoes: linhaMariana?.acoes ?? [],
    contador: filaPar.contador,
  };
  R.t.T10_aprovacaoBloqueada = {
    selo: linhaMariana?.selo ?? null,
    semBotoesDeDecisao: (linhaMariana?.acoes ?? []).every((a) => !['Aprovar', 'Devolver'].includes(a.rotulo)),
    motivoVisivel: /BLOQUEAD/i.test(linhaMariana?.titulo ?? ''),
  };
  await page.screenshot({ path: `${OUT}/T02-par-sem-gestor.png` });
  await voltarLista(page);


  /* T1 — GESTOR: a avaliação obrigatória entra e a linha fica pronta para aprovar. */
  R.t.T1_gestor = {
    aviso: await criarAvaliacao(page, {
      avaliado: 'Mariana Oliveira Santos',
      avaliador: 'Fernanda Costa Ribeiro',
      tipoIndice: 0,
      ciclo: cicloEmFoco,
      texto: 'Avaliação do GESTOR (T1).',
    }),
  };
  await abrirFila(page);
  const filaGestor = await lerFila(page);
  const linhaMariana2 = linhaDe(filaGestor, 'Mariana Oliveira Santos');
  R.t.T1_gestor.fila = {
    selo: linhaMariana2?.selo ?? null,
    acoes: linhaMariana2?.acoes ?? [],
    contador: filaGestor.contador,
  };
  R.t.T11_aprovacaoPermitida = {
    aprovarHabilitado: Boolean(linhaMariana2?.acoes.find((a) => a.rotulo === 'Aprovar' && a.desabilitado === false)),
    motivoNoControle: linhaMariana2?.acoes.find((a) => a.rotulo === 'Aprovar')?.title ?? null,
  };
  await page.screenshot({ path: `${OUT}/T01-gestor-pronta-para-aprovar.png` });

  /* T11 (continuação) — CONCLUI a avaliação do gestor (obrigatória) pelo card da
     listagem: é o que libera a aprovação final. */
  await voltarLista(page);
  const cardDoGestor = page
    .locator('div[class*="rounded-xl"]')
    .filter({ hasText: 'Avaliação do GESTOR (T1)' })
    .first();
  const abrirCardGestor = cardDoGestor.getByRole('button', { name: /Ver feedback|Ver avaliação/ }).first();
  R.t.T11_aprovacaoPermitida.cardEncontrado = await abrirCardGestor.isVisible().catch(() => false);
  if (R.t.T11_aprovacaoPermitida.cardEncontrado) {
    await abrirCardGestor.click();
    const modal = page.getByRole('dialog').last();
    await modal.waitFor({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const concluir = modal.getByRole('button', { name: /^Concluir avaliação$/ });
    R.t.T11_aprovacaoPermitida.botaoConcluir = {
      visivel: await concluir.isVisible().catch(() => false),
      habilitado: await concluir.isEnabled().catch(() => false),
    };
    if (await concluir.isEnabled().catch(() => false)) {
      await concluir.click();
      await page.waitForTimeout(2800);
      R.t.T11_aprovacaoPermitida.avisoConcluir =
        (await page.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null;
    }
    await fecharModais(page);
    await page.waitForTimeout(1400);
  }
  await abrirFila(page);
  const filaAposConcluir = await lerFila(page);
  const linhaConcluida = linhaDe(filaAposConcluir, 'Mariana Oliveira Santos');
  R.t.T11_aprovacaoPermitida.depoisDeConcluir = {
    selo: linhaConcluida?.selo ?? null,
    aprovarHabilitado: Boolean(
      linhaConcluida?.acoes.find((a) => a.rotulo === 'Aprovar' && a.desabilitado === false)
    ),
    contador: filaAposConcluir.contador,
  };
  await page.screenshot({ path: `${OUT}/T11-apos-concluir-gestor.png` });

  /* T5/T4 — SEGUNDA avaliação do mesmo colaborador/ciclo: MESMA linha, sem duplicar. */
  await voltarLista(page);
  R.t.T5_adicional = {
    aviso: await criarAvaliacao(page, {
      avaliado: 'Mariana Oliveira Santos',
      avaliador: 'Carlos Eduardo Lima',
      tipoIndice: 3,
      ciclo: cicloEmFoco,
      texto: 'Avaliação de SUBORDINADO (T5/T4).',
    }),
  };
  await abrirFila(page);
  const filaDupla = await lerFila(page);
  const marianas = filaDupla.linhas.filter((l) => l.colaborador.includes('Mariana Oliveira Santos'));
  R.t.T5_adicional.fila = {
    linhasDoColaborador: marianas.length,
    selo: marianas[0]?.selo ?? null,
    titulo: marianas[0]?.titulo ?? null,
    semDuplicar: marianas.length === 1,
  };

  /* T3 — AUTOAVALIAÇÃO atualiza a MESMA linha. */
  await voltarLista(page);
  R.t.T3_auto = {
    aviso: await criarAvaliacao(page, {
      avaliado: 'Mariana Oliveira Santos',
      avaliador: 'Mariana Oliveira Santos',
      tipoIndice: 2,
      ciclo: cicloEmFoco,
      texto: 'Autoavaliação (T3).',
    }),
  };
  await abrirFila(page);
  const filaAuto = await lerFila(page);
  const linhaAuto = linhaDe(filaAuto, 'Mariana Oliveira Santos');
  R.t.T3_auto.fila = {
    linhasDoColaborador: filaAuto.linhas.filter((l) => l.colaborador.includes('Mariana Oliveira Santos')).length,
    titulo: linhaAuto?.titulo ?? null,
    contador: filaAuto.contador,
  };
  await page.screenshot({ path: `${OUT}/T03-fontes-consolidadas.png` });


  /* T12 — APROVAR: sai do contador do gestor e encaminha ao RH. */
  const aprovar = page.getByRole('button', { name: 'Aprovar' }).first();
  R.t.T12_aprovar = { clicou: false };
  if (await aprovar.isEnabled().catch(() => false)) {
    await aprovar.click();
    await page.waitForTimeout(2800);
    R.t.T12_aprovar.clicou = true;
    R.t.T12_aprovar.aviso =
      (await page.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null;
    const depois = await lerFila(page);
    R.t.T12_aprovar.fila = {
      contador: depois.contador,
      selo: linhaDe(depois, 'Mariana Oliveira Santos')?.selo ?? null,
    };
  }
  await page.screenshot({ path: `${OUT}/T12-apos-aprovar.png` });

  /* T16 — avaliação NOVA depois da aprovação ⇒ aprovação INVALIDADA (volta a
     aguardar o gestor), sem clique do RH. */
  await voltarLista(page);
  R.t.T16_invalidacao = {
    aviso: await criarAvaliacao(page, {
      avaliado: 'Mariana Oliveira Santos',
      avaliador: 'Carlos Eduardo Lima',
      tipoIndice: 1,
      ciclo: cicloEmFoco,
      texto: 'Avaliação adicionada DEPOIS da aprovação (T16).',
    }),
  };
  await abrirFila(page);
  const filaInvalidada = await lerFila(page);
  R.t.T16_invalidacao.fila = {
    selo: linhaDe(filaInvalidada, 'Mariana Oliveira Santos')?.selo ?? null,
    contador: filaInvalidada.contador,
  };
  await page.screenshot({ path: `${OUT}/T16-aprovacao-invalidada.png` });

  /* T7 — F5: pendência, selo e contador preservados. */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await irFeedbacks(page);
  await abrirFila(page);
  const filaF5 = await lerFila(page);
  R.t.T7_f5 = {
    contador: filaF5.contador,
    total: filaF5.total,
    selo: linhaDe(filaF5, 'Mariana Oliveira Santos')?.selo ?? null,
  };
  await page.screenshot({ path: `${OUT}/T07-apos-f5.png` });

  /* T13 — DEVOLVER com justificativa (o RH recebe a devolução). */
  const devolver = page.getByRole('button', { name: 'Devolver' }).first();
  R.t.T13_devolver = { clicou: false };
  if (await devolver.isEnabled().catch(() => false)) {
    await devolver.click();
    const dialogo = page.getByRole('dialog').last();
    await dialogo.waitFor({ timeout: 15000 });
    await page.waitForTimeout(1400);
    await dialogo.locator('textarea').first().fill('Revisar os pontos de melhoria antes da aprovação.');
    await dialogo.getByRole('button', { name: /Confirmar devolução/i }).click();
    await page.waitForTimeout(2800);
    R.t.T13_devolver.clicou = true;
    R.t.T13_devolver.aviso =
      (await page.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null;
    const filaDev = await lerFila(page);
    R.t.T13_devolver.selo = linhaDe(filaDev, 'Mariana Oliveira Santos')?.selo ?? null;
  }
  await page.screenshot({ path: `${OUT}/T13-apos-devolver.png` });

  /* T6 — troca de ciclo: só as pendências daquele ciclo. */
  const seletorCiclo = page.locator('[role="combobox"]').first();
  await seletorCiclo.click();
  await page.waitForTimeout(700);
  const opcoesCiclo = page.getByRole('option');
  const totalOpcoes = await opcoesCiclo.count();
  let outroCiclo = null;
  for (let i = 0; i < totalOpcoes; i += 1) {
    const t = ((await opcoesCiclo.nth(i).textContent()) ?? '').trim();
    if (t && !t.includes(cicloEmFoco)) {
      outroCiclo = t;
      await opcoesCiclo.nth(i).click();
      break;
    }
  }
  await page.waitForTimeout(2200);
  await irFeedbacks(page);
  // No outro ciclo a fila pode estar VAZIA: não espera linhas, só lê o estado.
  await page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Aguardando gestor/ })
    .first()
    .click();
  await page.waitForTimeout(2000);
  await removerOverlay(page);
  const filaOutro = await lerFila(page);
  R.t.T6_trocaCiclo = {
    outroCiclo,
    linhasNoOutroCiclo: filaOutro.total,
    contemOMesmoColaborador: filaOutro.linhas.some((l) => l.colaborador.includes('Mariana Oliveira Santos')),
    contador: filaOutro.contador,
  };
  await page.screenshot({ path: `${OUT}/T06-outro-ciclo.png` });

  /* Volta ao ciclo em foco: a "correção" do RH depois da devolução reencaminha
     AUTOMATICAMENTE (nova versão invalida a devolução) e libera nova aprovação. */
  await page.locator('[role="combobox"]').first().click();
  await page.waitForTimeout(700);
  const opcoesVolta = page.getByRole('option');
  const totalVolta = await opcoesVolta.count();
  for (let i = 0; i < totalVolta; i += 1) {
    const t = ((await opcoesVolta.nth(i).textContent()) ?? '').trim();
    if (t.includes(cicloEmFoco)) {
      await opcoesVolta.nth(i).click();
      break;
    }
  }
  await page.waitForTimeout(2200);
  await irFeedbacks(page);

  R.t.T13_reencaminhamento = {
    aviso: await criarAvaliacao(page, {
      avaliado: 'Mariana Oliveira Santos',
      avaliador: 'Carlos Eduardo Lima',
      tipoIndice: 1,
      ciclo: cicloEmFoco,
      texto: 'Correção do RH depois da devolução (reencaminhamento automático).',
    }),
  };
  await abrirFila(page);
  const filaReenvio = await lerFila(page);
  R.t.T13_reencaminhamento.fila = {
    selo: linhaDe(filaReenvio, 'Mariana Oliveira Santos')?.selo ?? null,
    aprovarHabilitado: Boolean(
      linhaDe(filaReenvio, 'Mariana Oliveira Santos')?.acoes.find(
        (a) => a.rotulo === 'Aprovar' && a.desabilitado === false
      )
    ),
    contador: filaReenvio.contador,
  };
  await page.screenshot({ path: `${OUT}/T13b-reencaminhado-apos-correcao.png` });

  /* Aprova para a etapa do RH (T14). */
  const aprovar2 = page.getByRole('button', { name: 'Aprovar' }).first();
  if (await aprovar2.isEnabled().catch(() => false)) {
    await aprovar2.click();
    await page.waitForTimeout(2800);
    R.t.T14_etapaRh = {
      aviso: (await page.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null,
      selo: linhaDe(await lerFila(page), 'Mariana Oliveira Santos')?.selo ?? null,
    };
  }

  /* T18 — geometria do card (badge à direita + 3 controles na mesma linha). */
  R.t.T18_layout = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[class*="rounded-xl"]')).filter((el) =>
      /gestor responsável/i.test(el.innerText ?? '')
    );
    // Mede o card que está AGUARDANDO o gestor (é ele que tem os três controles).
    const card =
      cards.find((el) => /Aguardando gestor/i.test(el.querySelector('[role="status"]')?.textContent ?? '')) ??
      cards[0];
    if (!card) return { erro: 'card não encontrado' };
    const selo = card.querySelector('[role="status"]');
    const caixa = card.getBoundingClientRect();
    const botoes = Array.from(card.querySelectorAll('button'))
      .map((b) => ({ rotulo: (b.textContent ?? '').trim(), ...b.getBoundingClientRect().toJSON() }))
      .filter((b) => b.height > 20 && b.height < 40);
    const tops = botoes.map((b) => b.top);
    return {
      folgaDireitaDoSelo: selo ? Number((caixa.right - selo.getBoundingClientRect().right).toFixed(2)) : null,
      ordem: botoes.map((b) => b.rotulo),
      mesmaLinha: tops.length ? Math.max(...tops) - Math.min(...tops) <= 1.5 : null,
      alturasIguais: botoes.length
        ? Math.max(...botoes.map((b) => b.height)) - Math.min(...botoes.map((b) => b.height)) <= 1
        : null,
      estouro: card.scrollWidth - card.clientWidth > 1,
    };
  });
  await page.screenshot({ path: `${OUT}/T18-layout.png` });

  await context.storageState({ path: `${OUT}/perfil-admin.json` });
  await context.close();
} catch (erro) {
  R.erroFatal = String(erro?.stack ?? erro).slice(0, 1200);
  process.exitCode = 1;
}

/* ══════════════ T9/T14/T15 — etapa do RH (mesma sessão, papel `rh`) ════════ */
try {
  const { context, page } = await abrir({ papeis: ['rh'], storage: `${OUT}/perfil-admin.json` });
  await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded' });
  await irFeedbacks(page);
  await abrirFila(page);

  const antes = await lerFila(page);
  const linhaRh = linhaDe(antes, 'Mariana Oliveira Santos');
  R.t.T9_rhNaoAprova = {
    selo: linhaRh?.selo ?? null,
    acoes: linhaRh?.acoes ?? [],
    semAprovarOuDevolver: (linhaRh?.acoes ?? []).every((a) => !['Aprovar', 'Devolver'].includes(a.rotulo)),
  };

  const validar = page.getByRole('button', { name: 'Validar Potencial' }).first();
  R.t.T14_validarPotencial = {
    visivel: await validar.isVisible().catch(() => false),
    habilitado: await validar.isEnabled().catch(() => false),
  };
  if (await validar.isEnabled().catch(() => false)) {
    await validar.click();
    await page.waitForTimeout(3200);
    R.t.T14_validarPotencial.aviso =
      (await page.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null;
    const depois = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('div[class*="rounded-xl"]')).find(
        (el) =>
          /gestor responsável/i.test(el.innerText ?? '') &&
          (el.querySelector('h3')?.textContent ?? '').includes('Mariana Oliveira Santos')
      );
      return card ? (card.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 300) : null;
    });
    R.t.T14_validarPotencial.textoDoCard = depois;
    R.t.T15_nineBox = {
      selo: await page.evaluate(() => {
        const card = Array.from(document.querySelectorAll('div[class*="rounded-xl"]')).find(
          (el) =>
            /gestor responsável/i.test(el.innerText ?? '') &&
            (el.querySelector('h3')?.textContent ?? '').includes('Mariana Oliveira Santos')
        );
        return (card?.querySelector('[role="status"]')?.textContent ?? '').trim();
      }),
      classificou: /Nine-Box/i.test(depois ?? ''),
    };

    /* T15 — a MATRIZ do Nine-Box: o quadrante (ou o motivo de não classificar). */
    await page.getByRole('tab', { name: /Nine-Box/i }).click();
    await page.waitForTimeout(3000);
    R.t.T15_nineBox.painel = await page.evaluate(() => {
      const alvo = Array.from(document.querySelectorAll('div')).find(
        (el) =>
          (el.innerText ?? '').includes('Mariana Oliveira Santos') &&
          /desempenho/i.test(el.innerText ?? '') &&
          (el.innerText ?? '').length < 900
      );
      return alvo ? (alvo.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 400) : null;
    });
    await page.screenshot({ path: `${OUT}/T15-ninebox.png` });
  }
  await page.screenshot({ path: `${OUT}/T14-rh-validacao.png` });
  await context.close();
} catch (erro) {
  R.erroRh = String(erro?.stack ?? erro).slice(0, 900);
  process.exitCode = 1;
}

writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 2));

