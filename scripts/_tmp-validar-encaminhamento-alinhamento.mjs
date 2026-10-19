/**
 * TEMPORÁRIO — ENCAMINHAMENTO AO GESTOR + ALINHAMENTO DO CARD DA FILA.
 *
 * Roda no navegador real, em DEMONSTRAÇÃO (nada é gravado no Supabase):
 *   A) CRIA uma Autoavaliação pela tela e confere que os NOMES do avaliado e do
 *      avaliador aparecem no card (regressão do `—`).
 *   B) Mede o card de "Aguardando gestor": badge na EXTREMIDADE DIREITA e os três
 *      controles (Ver avaliação | Devolver | Aprovar) na MESMA linha, com alturas
 *      iguais, sem quebra e sem estouro — em 1440/1280/1024/900 px.
 *   C) Executa APROVAR e DEVOLVER com justificativa, recarrega a página
 *      (persistência local) e confere que a aprovação encaminha ao RH.
 *
 * Uso: node scripts/_tmp-validar-encaminhamento-alinhamento.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-encaminhamento-alinhamento';
const BASE = 'http://localhost:8080';
mkdirSync(OUT, { recursive: true });
const relatorio = { layout: {}, autoavaliacao: {}, decisao: {}, rh: {} };

const browser = await chromium.launch();

async function abrirContexto({ papeis, viewport = { width: 1440, height: 1000 }, storage = 'e2e/.auth/user.json' }) {
  const context = await browser.newContext({ storageState: storage, viewport });
  await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(papeis) })
  );
  await context.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  return { context, page: await context.newPage() };
}

/** Remove o overlay de erro do Vite, se presente (ele intercepta cliques).
 *  Atenção: nesta árvore de trabalho existe um arquivo quebrado FORA do escopo
 *  desta tarefa (`src/components/premiacoes/CampanhaTabela.tsx`), cujo overlay
 *  cobre a tela e impede interação — por isso ele é removido antes de cada passo. */
const removerOverlayVite = async (page) => {
  await page.evaluate(() => {
    const host = document.querySelector('vite-error-overlay');
    if (host) host.remove();
  });
};

const irFeedbacks = async (page) => {
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await removerOverlayVite(page);
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.waitForTimeout(1200);
  await removerOverlayVite(page);
};

const abrirFila = async (page) => {
  const chip = page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Aguardando gestor/ })
    .first();
  await chip.click();
  await page.getByText('Gestor responsável').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1600);
};

/** Geometria do card da fila: badge × controles. */
const medirCard = (page) =>
  page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('div[class*="rounded-xl"]')).find((el) =>
      /gestor responsável/i.test(el.innerText ?? '')
    );
    if (!card) return { erro: 'card não encontrado' };
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return {
        top: Number(b.top.toFixed(2)),
        bottom: Number(b.bottom.toFixed(2)),
        left: Number(b.left.toFixed(2)),
        right: Number(b.right.toFixed(2)),
        height: Number(b.height.toFixed(2)),
        width: Number(b.width.toFixed(2)),
      };
    };
    const caixa = r(card);
    const selo = card.querySelector('[role="status"]');
    const botoes = Array.from(card.querySelectorAll('button'))
      .map((b) => ({ rotulo: (b.textContent ?? '').replace(/\s+/g, ' ').trim(), ...r(b) }))
      .filter((b) => b.width > 0 && b.height > 0);
    const linhaDeAcoes = botoes.filter((b) => b.height > 20 && b.height < 40);
    const tops = linhaDeAcoes.map((b) => b.top);
    const alturas = linhaDeAcoes.map((b) => b.height);
    const seloBox = selo ? r(selo) : null;
    return {
      selo: seloBox ? { ...seloBox, texto: (selo.textContent ?? '').trim() } : null,
      botoes: linhaDeAcoes.map((b) => ({ rotulo: b.rotulo, top: b.top, height: b.height, left: b.left, right: b.right })),
      metricas: {
        folgaDireitaDoSelo: seloBox ? Number((caixa.right - seloBox.right).toFixed(2)) : null,
        seloNaMetadeDireita: seloBox ? seloBox.left > caixa.left + caixa.width / 2 : null,
        linhaUnica: tops.length > 0 ? Math.max(...tops) - Math.min(...tops) <= 1.5 : null,
        deltaTop: tops.length ? Number((Math.max(...tops) - Math.min(...tops)).toFixed(2)) : null,
        alturasIguais: alturas.length ? Math.max(...alturas) - Math.min(...alturas) <= 1 : null,
        ordem: linhaDeAcoes.map((b) => b.rotulo),
        aprovarNaPontaDireita:
          linhaDeAcoes.length > 0 ? linhaDeAcoes.reduce((a, b) => (a.right >= b.right ? a : b)).rotulo === 'Aprovar' : null,
        verAvaliacaoNaPontaEsquerda:
          linhaDeAcoes.length > 0 ? linhaDeAcoes.reduce((a, b) => (a.left <= b.left ? a : b)).rotulo === 'Ver avaliação' : null,
        acoesAbaixoDoSelo: seloBox && linhaDeAcoes.length > 0 ? linhaDeAcoes[0].top >= seloBox.bottom - 1 : null,
        estouroHorizontal: card.scrollWidth - card.clientWidth > 1,
        sobreposicao: linhaDeAcoes.some((a, i) =>
          linhaDeAcoes.some((b, j) => i < j && a.left < b.right - 0.5 && b.left < a.right - 0.5)
        ),
      },
    };
  });

/* ── A + B (1440) + C: Autoavaliação com nomes e decisões ────────────────── */
try {
  const { context: ctx, page } = await abrirContexto({ papeis: ['admin', 'gestor'] });
  await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded' });
  await irFeedbacks(page);

  /* ANTES: quantas linhas a fila já tem (fixtures) — a comparação é o que prova
     que a autoavaliação criada NÃO inventa uma pendência própria. */
  await abrirFila(page);
  relatorio.autoavaliacao.filaAntes = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll('div[class*="rounded-xl"]')).filter((el) =>
        /gestor responsável/i.test(el.innerText ?? '')
      ).length
  );
  await page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Todos/ })
    .first()
    .click();
  await page.waitForTimeout(1400);
  await removerOverlayVite(page);

  /* A) CRIA a Autoavaliação pela própria tela (gravação LOCAL da vitrine). */
  await page.getByRole('button', { name: /Novo feedback/i }).first().click();
  await page.getByRole('dialog').last().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1400);

  const dialogo = page.getByRole('dialog').last();
  const escolher = async (rotulo, indice) => {
    await dialogo.getByRole('combobox', { name: rotulo, exact: true }).click();
    await page.waitForTimeout(500);
    const opcoes = page.getByRole('option');
    const total = await opcoes.count();
    await opcoes.nth(Math.min(indice, total - 1)).click();
    await page.waitForTimeout(400);
  };

  await escolher('Avaliado', 1);
  relatorio.autoavaliacao.nomeAvaliadoEscolhido = (
    (await dialogo.getByRole('combobox', { name: 'Avaliado', exact: true }).textContent()) ?? ''
  ).trim();
  await escolher('Avaliador do feedback', 2);
  relatorio.autoavaliacao.nomeAvaliadorEscolhido = (
    (await dialogo.getByRole('combobox', { name: 'Avaliador do feedback', exact: true }).textContent()) ?? ''
  ).trim();
  await escolher('Tipo de feedback', 2); // autoavaliação
  /* O ciclo em foco no topo é o que a timeline mostra: escolher o MESMO ciclo no
     formulário garante que o card apareça na lista (senão o registro nasce em
     outro ciclo e a listagem filtrada não o exibe). */
  const cicloEmFoco = ((await page.locator('[role="combobox"]').first().innerText()) ?? '')
    .split('\n')[0]
    .trim();
  relatorio.autoavaliacao.cicloEmFoco = cicloEmFoco;
  await dialogo.getByRole('combobox', { name: 'Ciclo do feedback', exact: true }).click();
  await page.waitForTimeout(500);
  const itensCiclo = page.getByRole('option');
  const totalCiclos = await itensCiclo.count();
  let escolhido = false;
  for (let i = 0; i < totalCiclos; i += 1) {
    const texto = ((await itensCiclo.nth(i).textContent()) ?? '').trim();
    if (cicloEmFoco && texto.includes(cicloEmFoco)) {
      await itensCiclo.nth(i).click();
      escolhido = true;
      break;
    }
  }
  if (!escolhido) {
    await itensCiclo.nth(Math.min(1, totalCiclos - 1)).click();
  }
  await page.waitForTimeout(400);
  const textareas = dialogo.locator('textarea');
  await textareas.nth(0).fill('Autonomia e organização.');
  await textareas.nth(1).fill('Delegar mais.');
  await textareas.nth(2).fill('Autoavaliação criada na validação do encaminhamento.');
  await page.screenshot({ path: `${OUT}/A1-formulario-preenchido.png` });
  await dialogo
    .getByRole('button', { name: /Registrar|Salvar|Criar/i })
    .last()
    .click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/A2-apos-criar.png` });

  /* Confere o CARD criado: nomes do avaliado e do avaliador presentes. */
  relatorio.autoavaliacao.card = await page.evaluate((nomes) => {
    const cards = Array.from(document.querySelectorAll('div[class*="rounded-xl"]'));
    const doCriado = cards.find(
      (el) => /AUTOAVALIA/i.test(el.innerText ?? '') && (el.innerText ?? '').includes(nomes.avaliado.split(' ')[0])
    );
    if (!doCriado) return { erro: 'card da autoavaliação criada não encontrado', nomes };
    const texto = (doCriado.innerText ?? '').replace(/\s+/g, ' ').trim();
    const [antes, depois] = texto.split(/AVALIADO POR/i);
    return {
      nomes,
      texto: texto.slice(0, 240),
      avaliadoVisivel: (antes ?? '').trim(),
      avaliadorVisivel: (depois ?? '').trimStart().slice(0, 40),
      avaliadoTemPlaceholder: /(^|\s)—($|\s)/.test((antes ?? '').trim()),
      avaliadorTemPlaceholder: (depois ?? '').trimStart().startsWith('—'),
      contemNomeAvaliado: texto.includes(nomes.avaliado),
      contemNomeAvaliador: texto.includes(nomes.avaliador),
    };
  }, {
    avaliado: relatorio.autoavaliacao.nomeAvaliadoEscolhido,
    avaliador: relatorio.autoavaliacao.nomeAvaliadorEscolhido,
  });

  /* B) LAYOUT do card de "Aguardando gestor" (1440). */
  await abrirFila(page);
  relatorio.layout['1440px'] = await medirCard(page);
  await page.screenshot({ path: `${OUT}/B-card-1440.png` });

  /* A CONSOLIDAÇÃO: a autoavaliação criada NÃO cria pendência própria (só a
     avaliação do GESTOR ancora a linha) e o colaborador não aparece na fila. */
  relatorio.autoavaliacao.fila = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[class*="rounded-xl"]')).filter((el) =>
      /gestor responsável/i.test(el.innerText ?? '')
    );
    return {
      total: cards.length,
      temOColaboradorDaAutoavaliacao: cards.some((el) => (el.innerText ?? '').includes('Carlos Eduardo Lima')),
      textos: cards.map((el) => (el.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 90)),
    };
  });
  await ctx.storageState({ path: `${OUT}/perfil-admin.json` });
  await ctx.close();
} catch (erro) {
  relatorio.erroFatal = String(erro?.stack ?? erro).slice(0, 900);
  process.exitCode = 1;
}


/* ── B) LARGURAS (1280 / 1024 / 900) ─────────────────────────────────────── */
for (const largura of [1280, 1024, 900]) {
  try {
    const { context, page } = await abrirContexto({
      papeis: ['admin', 'gestor'],
      viewport: { width: largura, height: 950 },
    });
    await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded' });
    await irFeedbacks(page);
    await abrirFila(page);
    relatorio.layout[`${largura}px`] = await medirCard(page);
    await page.screenshot({ path: `${OUT}/B-card-${largura}.png` });
    await context.close();
  } catch (erro) {
    relatorio.layout[`${largura}px`] = { erro: String(erro?.message ?? erro).slice(0, 200) };
  }
}

/* ── C) DEVOLVER → APROVAR → PERSISTÊNCIA (F5) ───────────────────────────── */
try {
  const { context, page } = await abrirContexto({ papeis: ['admin', 'gestor'] });
  await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded' });
  await irFeedbacks(page);
  await abrirFila(page);

  const devolver = page.getByRole('button', { name: 'Devolver' }).first();
  if (await devolver.isVisible().catch(() => false)) {
    await devolver.click();
    const dialogo = page.getByRole('dialog').last();
    await dialogo.waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    await dialogo.locator('textarea').first().fill('Revisar os pontos de melhoria antes da aprovação.');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/C1-devolucao-dialogo.png` });
    await dialogo.getByRole('button', { name: /Confirmar devolução/i }).click();
    await page.waitForTimeout(3000);
    relatorio.decisao.avisoDevolucao =
      (await page.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null;
    relatorio.decisao.seloAposDevolver = (
      (await page.locator('[role="status"]').first().textContent().catch(() => null)) ?? null
    )?.trim();
    await page.screenshot({ path: `${OUT}/C2-apos-devolver.png` });
  } else {
    relatorio.decisao.avisoDevolucao = 'botão Devolver indisponível nesta fila';
  }

  const aprovar = page.getByRole('button', { name: 'Aprovar' }).first();
  if (await aprovar.isVisible().catch(() => false)) {
    await aprovar.click();
    await page.waitForTimeout(3000);
    relatorio.decisao.avisoAprovacao =
      (await page.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null;
    await page.screenshot({ path: `${OUT}/C3-apos-aprovar.png` });
  } else {
    relatorio.decisao.avisoAprovacao = 'botão Aprovar indisponível nesta fila';
  }

  /* PERSISTÊNCIA: recarrega (F5) e relê a fila. */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await irFeedbacks(page);
  await abrirFila(page);
  relatorio.decisao.selosAposF5 = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="status"]'))
      .map((el) => (el.textContent ?? '').trim())
      .slice(0, 8)
  );
  await page.screenshot({ path: `${OUT}/C4-apos-f5.png` });
  await context.storageState({ path: `${OUT}/perfil-pos-decisao.json` });
  await context.close();
} catch (erro) {
  relatorio.decisao.erro = String(erro?.message ?? erro).slice(0, 400);
  process.exitCode = 1;
}

/* ── D) ETAPA DO RH: aprovada → Validação de Potencial ───────────────────── */
try {
  const { context, page } = await abrirContexto({ papeis: ['rh'], storage: `${OUT}/perfil-pos-decisao.json` });
  await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded' });
  await irFeedbacks(page);
  await abrirFila(page);
  relatorio.rh = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div[class*="rounded-xl"]')).filter((el) =>
      /gestor responsável/i.test(el.innerText ?? '')
    );
    if (cards.length === 0) return { erro: 'fila vazia para o RH' };
    const aprovada = cards.find((el) => /aprovada pelo gestor/i.test(el.innerText ?? '')) ?? cards[0];
    return {
      total: cards.length,
      selo: (aprovada.querySelector('[role="status"]')?.textContent ?? '').trim(),
      botoes: Array.from(aprovada.querySelectorAll('button')).map((b) => (b.textContent ?? '').trim()),
      selosDaFila: cards.map((el) => (el.querySelector('[role="status"]')?.textContent ?? '').trim()),
    };
  });
  await page.screenshot({ path: `${OUT}/D-rh-validacao.png` });
  await context.close();
} catch (erro) {
  relatorio.rh.erro = String(erro?.message ?? erro).slice(0, 300);
  process.exitCode = 1;
}

await browser.close();
writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));

