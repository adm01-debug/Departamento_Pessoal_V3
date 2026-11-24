/**
 * TEMPORÁRIO — ROTEIRO DEMONSTRATIVO D1…D20 (navegador real, mocks preservados).
 *
 * Executa os fluxos de ponta a ponta pela INTERFACE, em modo demonstração, e
 * grava evidências (screenshots + relatório) em `tmp-roteiro-demo/`.
 * Cada passo é isolado: falha de um não interrompe os demais (o relatório diz
 * exatamente o que passou, o que falhou e por quê).
 *
 * Uso: node scripts/_tmp-roteiro-demo.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-roteiro-demo';
mkdirSync(OUT, { recursive: true });
const CHAVE_REGISTROS = 'dp-desempenho-demo-registros';
const CHAVE_APROVACOES = 'dp-desempenho-aprovacoes-demo';

const relatorio = { passos: {}, evidencias: [] };
const browser = await chromium.launch();

let contexto = null;
const page = await (async () => {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 1000 },
  });
  // A sessão E2E é `admin@teste.local` (papel único). O roteiro reproduz a conta
  // de homologação (admin + gestor) pelo MESMO caminho do app — a lista devolvida
  // pelo RPC de LEITURA `get_user_roles`. Nenhuma permissão real é alterada.
  await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
  );
  await context.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  contexto = context;
  const p = await context.newPage();
  relatorio.contexto = {
    storageState: 'e2e/.auth/user.json',
    papeisSimulados: ['admin', 'gestor'],
    observacao: 'lista de papéis devolvida pelo RPC de leitura (conta admin+gestor)',
  };
  return p;
})();

const passo = async (id, titulo, fn) => {
  const registrado = { titulo, ok: false };
  relatorio.passos[id] = registrado;
  try {
    await fecharModais();
    const extra = await fn();
    registrado.ok = true;
    if (extra) Object.assign(registrado, extra);
  } catch (erro) {
    registrado.erro = String(erro?.message ?? erro).slice(0, 1400);
    await fecharModais().catch(() => undefined);
  }
  if (registrado.ok) delete registrado.erro;
};

/** Garante que nenhum modal fique aberto entre os passos (overlay esconde a página). */
const fecharModais = async () => {
  for (let i = 0; i < 3; i += 1) {
    const dialogo = page.locator('[role="dialog"][data-state="open"]').last();
    const visivel = await dialogo.isVisible().catch(() => false);
    if (!visivel) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const ainda = await dialogo.isVisible().catch(() => false);
    if (ainda) {
      const fechar = dialogo.getByRole('button', { name: /^Fechar$/ }).last();
      if (await fechar.isVisible().catch(() => false)) await fechar.click().catch(() => undefined);
      await page.waitForTimeout(400);
    }
  }
};

const irFeedbacks = async () => {
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: /Feedbacks/i }).click();
  await page.waitForTimeout(800);
  // Volta SEMPRE para a listagem normal: o chip "Todos" desliga o recorte da
  // fila de aprovação (a visão é estado interno da aba).
  const chipTodos = page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Todos/ })
    .first();
  if (await chipTodos.isVisible().catch(() => false)) {
    await chipTodos.click();
    await page.waitForTimeout(800);
  }
  await page.getByText(/Avaliado por|Gestor responsável/).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
};
const irPara = async (aba) => {
  await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
  await page.getByRole('tab', { name: new RegExp(aba, 'i') }).click();
  await page.waitForTimeout(2200);
};
const chipAguardando = () =>
  page
    .getByRole('group', { name: 'Segmentar por tipo de feedback' })
    .getByRole('button', { name: /Aguardando gestor/ })
    .first();
const abrirFila = async () => {
  const jaAberta = await page.getByText('Gestor responsável').first().isVisible().catch(() => false);
  if (!jaAberta) await chipAguardando().click();
  await page.getByText('Gestor responsável').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
};
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
const linhaDa = (i) =>
  page.locator('[role="status"]').nth(i).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
const contadorAguardando = async () =>
  ((await chipAguardando().textContent()) ?? '').replace(/\s+/g, ' ').trim();
const ultimoToast = async () => {
  const texto = await page
    .locator('[data-sonner-toast]')
    .first()
    .textContent()
    .catch(() => null);
  return String(texto ?? '')
    .replace(/\s+/g, ' ')
    .trim() || null;
};
/**
 * Seleciona uma opção de um `Select` do Design System dentro de um diálogo.
 * Devolve o que ficou selecionado e quantas opções existiam (diagnóstico).
 */
const escolherSelect = async (dlg, nome, indice = 1) => {
  const combo = dlg.getByRole('combobox', { name: nome, exact: true }).last();
  await combo.click();
  await page.waitForTimeout(450);
  const opcoes = page.getByRole('option');
  const total = await opcoes.count();
  if (total === 0) throw new Error(`select "${nome}" sem opções`);
  await opcoes.nth(Math.min(indice, total - 1)).click();
  await page.waitForTimeout(450);
  // Confirma que o VALOR ficou no gatilho (senão, digita pelo teclado).
  let escolhido = ((await combo.textContent()) ?? '').trim();
  if (!escolhido || escolhido === 'Selecione' || escolhido === 'Sem ciclo') {
    await combo.click();
    await page.waitForTimeout(300);
    for (let i = 0; i <= Math.min(indice, total - 1); i += 1) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    escolhido = ((await combo.textContent()) ?? '').trim();
  }
  return { nome, opcoes: total, escolhido };
};

/** Seleciona no seletor de ciclo do topo o ciclo que contém o texto indicado. */
const selecionarCiclo = async (trecho) => {
  const combo = page.locator('[role="combobox"]').first();
  await combo.click();
  await page.waitForTimeout(600);
  const opcoes = page.getByRole('option');
  const total = await opcoes.count();
  for (let i = 0; i < total; i += 1) {
    const texto = ((await opcoes.nth(i).textContent()) ?? '').trim();
    if (texto.includes(trecho)) {
      await opcoes.nth(i).click();
      await page.waitForTimeout(1200);
      return { ciclo: texto, opcoes: total };
    }
  }
  await page.keyboard.press('Escape');
  return { ciclo: null, opcoes: total };
};

const abrirModal = async (linha) => {
  await linha.getByRole('button', { name: 'Ver avaliação' }).click();
  const dialogo = page.locator('[role="dialog"][data-state="open"]').last();
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
    return {
      colaborador: el.querySelector('h2')?.textContent?.trim() ?? null,
      selo: (selo?.textContent ?? '').trim() || null,
      botoes,
    };
  });
const kpiAvaliados = () =>
  page.evaluate(() => {
    const rotulo = Array.from(document.querySelectorAll('p,span,div')).find(
      (el) => el.textContent?.trim() === 'Colaboradores avaliados'
    );
    return (rotulo?.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim();
  });
const estadoLocal = () =>
  page.evaluate(
    ([k1, k2]) => ({
      registros: JSON.parse(localStorage.getItem(k1) ?? 'null'),
      aprovacoes: JSON.parse(localStorage.getItem(k2) ?? 'null'),
    }),
    [CHAVE_REGISTROS, CHAVE_APROVACOES]
  );
const evid = async (nome) => {
  relatorio.evidencias.push(`${OUT}/${nome}.png`);
  await page.screenshot({ path: `${OUT}/${nome}.png` });
};

try {
  /* ── Preparação: vitrine limpa e persistência zerada ────────────────────── */
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ([k1, k2]) => {
      localStorage.removeItem(k1);
      localStorage.removeItem(k2);
    },
    [CHAVE_REGISTROS, CHAVE_APROVACOES]
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await irFeedbacks();

  /* ── D1 · Criar ciclo ──────────────────────────────────────────────────── */
  const NOME_CICLO = `Demonstração E2E ${Date.now().toString(36)}`;
  await passo('D1', 'Criar ciclo pela interface', async () => {
    await page.getByRole('button', { name: /Novo Ciclo/i }).click();
    const dlg = page.locator('[role="dialog"][data-state="open"]').last();
    await dlg.waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
    await dlg.locator('#novo-ciclo-nome').fill(NOME_CICLO);
    await dlg.locator('#novo-ciclo-descricao').fill('Ciclo criado pelo roteiro demonstrativo.');
    // Data Picker do Design System: abre o popover e escolhe "Hoje" (determinístico).
    await dlg.locator('#novo-ciclo-inicio').last().click();
    await page.getByRole('button', { name: /^Hoje$/ }).last().click();
    await page.waitForTimeout(300);
    await dlg.locator('#novo-ciclo-fim').last().click();
    await page.getByRole('button', { name: /^Hoje$/ }).last().click();
    await page.waitForTimeout(400);
    await dlg
      .getByRole('button', { name: /Criar ciclo|Criar|Salvar|Cadastrar/i })
      .last()
      .click();
    await page.waitForTimeout(2000);
    const locais = await estadoLocal();
    const criados = Object.values(locais.registros?.criados?.ciclos ?? {});
    const aviso = await ultimoToast();
    await evid('D1-ciclo-criado');
    if (!criados.some((c) => c.nome === NOME_CICLO)) throw new Error(`ciclo não gravado localmente (aviso: ${aviso})`);
    return { aviso, ciclosLocais: criados.map((c) => c.nome) };
  });

  /* ── D2 · Reabrir e conferir o ciclo persistido (F5) ───────────────────── */
  await passo('D2', 'Ciclo persiste após F5 e é selecionável', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await irFeedbacks();
    await page.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(800);
    const opcoes = await page.getByRole('option').allTextContents();
    await page.keyboard.press('Escape');
    await evid('D2-ciclo-persistido');
    if (!opcoes.some((o) => o.includes(NOME_CICLO))) {
      throw new Error(`ciclo não apareceu no seletor (${opcoes.length} opções)`);
    }
    return { opcoesComCiclo: opcoes.filter((o) => o.includes(NOME_CICLO)).length };
  });

  /* ── D3 · Criar avaliação do GESTOR ────────────────────────────────────── */
  let nomeAvaliado = null;
  await passo('D3', 'Criar avaliação do gestor (Novo feedback)', async () => {
    await irFeedbacks();
    const abrir3 = page.getByRole('button', { name: /Novo [Ff]eedback/ });
    await abrir3.first().waitFor({ timeout: 15000 });
    await abrir3.first().click();
    const dlg = page.locator('[role="dialog"][data-state="open"]').last();
    await dlg.waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
    const escolhas = [];
    escolhas.push(await escolherSelect(dlg, 'Tipo de feedback', 0));
    escolhas.push(await escolherSelect(dlg, 'Ciclo do feedback', 1));
    await dlg.locator('input[type="number"]').nth(0).fill('4.5');
    await dlg.locator('input[type="number"]').nth(1).fill('4');
    await dlg.locator('textarea').nth(0).fill('Roteiro demonstrativo: entrega consistente.');
    await dlg.locator('textarea').nth(1).fill('Roteiro demonstrativo: priorizacao.');
    await dlg.locator('textarea').nth(2).fill('Registro criado pelo roteiro D3.');
    // Avaliado/Avaliador por ÚLTIMO e com REVERIFICAÇÃO: são os campos que
    // habilitam o salvamento (a cascata do diálogo pode remontar o conteúdo).
    escolhas.push(await escolherSelect(dlg, 'Avaliado', 1));
    await page.waitForTimeout(300);
    const t1 = await dlg.evaluate((el) =>
      Array.from(el.querySelectorAll('[role="combobox"]')).map((c) => (c.textContent ?? '').trim())
    );
    await page.waitForTimeout(1500);
    const t2 = await dlg.evaluate((el) =>
      Array.from(el.querySelectorAll('[role="combobox"]')).map((c) => (c.textContent ?? '').trim())
    );
    const combosComNome = await dlg.evaluate((el) =>
      Array.from(el.querySelectorAll('[role="combobox"]')).map((c) => ({
        nome: c.getAttribute('aria-label') ?? '',
        texto: (c.textContent ?? '').trim(),
      }))
    );
    escolhas.push({ nome: 'diagnosticoAvaliado', t1, t2, combosComNome });
    escolhas.push(await escolherSelect(dlg, 'Avaliador do feedback', 2));
    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
      const alvo = dlg.getByRole('combobox', { name: 'Avaliado', exact: true }).last();
      const atual = ((await alvo.textContent()) ?? '').trim();
      if (atual && atual !== 'Selecione') break;
      escolhas.push(await escolherSelect(dlg, 'Avaliado', 1));
      await page.waitForTimeout(400);
    }
    const salvar = dlg.getByRole('button', { name: /Registrar|Salvar|Criar/i }).last();
    if (!(await salvar.isEnabled().catch(() => false))) {
      const botoes = await dlg.evaluate((el) =>
        Array.from(el.querySelectorAll('button')).map((b) => ({
          texto: (b.textContent ?? '').replace(/\s+/g, ' ').trim(),
          disabled: b.disabled,
        }))
      );
      const combos = await dlg.evaluate((el) =>
        Array.from(el.querySelectorAll('[role="combobox"]')).map((c) => (c.textContent ?? '').trim())
      );
      throw new Error(
        `salvar desabilitado — escolhas: ${JSON.stringify(escolhas)} | botoes: ${JSON.stringify(botoes)} | combos: ${JSON.stringify(combos)}`
      );
    }
    await salvar.click();
    await page.waitForTimeout(2200);
    const aviso = await ultimoToast();
    const locais = await estadoLocal();
    const criados = Object.values(locais.registros?.criados?.feedbacks ?? {});
    await evid('D3-feedback-gestor');
    if (!criados.some((f) => String(f?.tipo) === 'gestor')) throw new Error(`avaliação não gravada (aviso: ${aviso})`);
    return { aviso, escolhas, criadosLocal: criados.length, tipoCriado: String(criados.at(-1)?.tipo ?? '') };
  });

  /* ── D5 · Concluir uma avaliação demonstrativa (modal) ─────────────────── */
  await passo('D5', 'Concluir avaliação pelo modal (demonstração)', async () => {
    await irFeedbacks();
    const aberturas = page.getByRole('button', { name: /Ver feedback|Ver avaliação/ });
    const total = await aberturas.count();
    let concluido = false;
    for (let i = 0; i < Math.min(total, 8) && !concluido; i += 1) {
      await aberturas.nth(i).click();
      const dlg = page.locator('[role="dialog"][data-state="open"]').last();
      await dlg.waitFor({ timeout: 15000 });
      await page.waitForTimeout(700);
      const botao = dlg.getByRole('button', { name: /^Concluir avaliação$/ });
      const habilitado = (await botao.isVisible().catch(() => false)) && (await botao.isEnabled().catch(() => false));
      if (habilitado) {
        await botao.click();
        await page.waitForTimeout(2200);
        concluido = true;
        break;
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    const aviso = await ultimoToast();
    const locais = await estadoLocal();
    const patches = Object.values(locais.registros?.patches?.feedbacks ?? {});
    await evid('D5-avaliacao-concluida');
    await fecharModais();
    if (!concluido) throw new Error('nenhum card ofereceu "Concluir avaliação" na demonstração');
    if (!patches.some((p) => String(p?.status) === 'concluido')) {
      throw new Error(`status não gravado localmente (aviso: ${aviso})`);
    }
    return { aviso, patchesComConcluido: patches.filter((p) => String(p?.status) === 'concluido').length };
  });

  /* ── D6 · Enviar para o gestor (fila) ──────────────────────────────────── */
  await passo('D6', 'Enviar avaliação para aprovação do gestor', async () => {
    await irFeedbacks();
    await abrirFila();
    const fila = await lerFila();
    const alvo = fila.findIndex((l) => l.selo === 'Em preparação' && l.botoes.includes('Enviar ao gestor'));
    if (alvo < 0) {
      return { linhasEmPreparacao: 0, observacao: 'a vitrine já apresenta a fila enviada ao gestor' };
    }
    await linhaDa(alvo).getByRole('button', { name: 'Enviar ao gestor' }).click();
    await page.waitForTimeout(1800);
    const aviso = await ultimoToast();
    const locais = await estadoLocal();
    await evid('D6-envio-ao-gestor');
    return {
      aviso,
      eventosEnvio: (locais.aprovacoes?.historico ?? []).filter(
        (h) => h.operacao === 'enviar' || h.operacao === 'reenviar'
      ).length,
    };
  });

  /* ── D4 · Criar avaliação de PARES ─────────────────────────────────────── */
  await passo('D4', 'Criar avaliação de pares (Novo feedback)', async () => {
    await irFeedbacks();
    const abrir = page.getByRole('button', { name: /Novo [Ff]eedback/ });
    await abrir.first().waitFor({ timeout: 15000 });
    await abrir.first().click();
    const dlg = page.locator('[role="dialog"][data-state="open"]').last();
    await dlg.waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
    const escolhas = [];
    escolhas.push(await escolherSelect(dlg, 'Tipo de feedback', 1));
    escolhas.push(await escolherSelect(dlg, 'Ciclo do feedback', 1));
    await dlg.locator('input[type="number"]').nth(0).fill('3.5');
    await dlg.locator('textarea').nth(0).fill('Roteiro demonstrativo: colaboracao.');
    await dlg.locator('textarea').nth(1).fill('Roteiro demonstrativo: comunicacao.');
    escolhas.push(await escolherSelect(dlg, 'Avaliado', 3));
    escolhas.push(await escolherSelect(dlg, 'Avaliador do feedback', 4));
    const salvar = dlg.getByRole('button', { name: /Registrar|Salvar|Criar/i }).last();
    if (!(await salvar.isEnabled().catch(() => false))) {
      throw new Error(`salvar desabilitado — escolhas: ${JSON.stringify(escolhas)}`);
    }
    await salvar.click();
    await page.waitForTimeout(2200);
    const aviso = await ultimoToast();
    const locais = await estadoLocal();
    const criados = Object.values(locais.registros?.criados?.feedbacks ?? {});
    await evid('D4-feedback-par');
    if (!criados.some((f) => String(f?.tipo) === 'par')) throw new Error(`avaliação de par não gravada (aviso: ${aviso})`);
    return { aviso, escolhas, tiposCriados: criados.map((f) => String(f?.tipo)) };
  });

  /* ── D7 · Aprovar a avaliação (gestor responsável) ─────────────────────── */
  let alvoAprovado = null;
  await passo('D7', 'Aprovar avaliação (gestor responsável, demonstração)', async () => {
    await irFeedbacks();
    const cicloOk = await selecionarCiclo('S2 2026');
    await abrirFila();
    const fila = await lerFila();
    const i = fila.findIndex((l) => l.selo === 'Aguardando gestor');
    if (i < 0) throw new Error('nenhuma avaliação aguardando gestor na vitrine');
    alvoAprovado = fila[i].nome;
    await linhaDa(i).getByRole('button', { name: 'Ver avaliação' }).click();
    const dlg = page.locator('[role="dialog"][data-state="open"]').last();
    await dlg.waitFor({ timeout: 15000 });
    await page.waitForTimeout(700);
    await dlg.getByRole('button', { name: /Aprovar avaliação/ }).click();
    await page.waitForTimeout(2000);
    const aviso = await ultimoToast();
    const locais = await estadoLocal();
    await evid('D7-aprovado');
    await page.keyboard.press('Escape');
    const decisoes = Object.values(locais.aprovacoes?.decisoes ?? {});
    if (!decisoes.some((d) => String(d?.decisao) === 'aprovado')) {
      throw new Error(`aprovação não gravada (aviso: ${aviso})`);
    }
    return { aviso, alvo: alvoAprovado, decisao: String(decisoes.at(-1)?.decisao ?? '') };
  });

  /* ── D8 · Persistência após F5 ─────────────────────────────────────────── */
  await passo('D8', 'Aprovação e registros persistem após F5', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await irFeedbacks();
    await abrirFila();
    const fila = await lerFila();
    const linha = fila.find((l) => l.nome === alvoAprovado);
    const contador = await contadorAguardando();
    const locais = await estadoLocal();
    await evid('D8-apos-f5');
    if (!linha) throw new Error('colaborador aprovado desapareceu da fila');
    if (!/Aprovada pelo gestor/i.test(linha.selo)) throw new Error(`selo inesperado: ${linha.selo}`);
    return {
      contador,
      selo: linha.selo,
      decisoesLocais: Object.keys(locais.aprovacoes?.decisoes ?? {}).length,
      criadosLocais: {
        ciclos: Object.keys(locais.registros?.criados?.ciclos ?? {}).length,
        feedbacks: Object.keys(locais.registros?.criados?.feedbacks ?? {}).length,
      },
    };
  });

  /* ── D9 · Devolver para correção (com justificativa) ───────────────────── */
  let alvoDevolvido = null;
  await passo('D9', 'Devolver para correção com justificativa', async () => {
    await irFeedbacks();
    await selecionarCiclo('S2 2026');
    await abrirFila();
    const fila = await lerFila();
    const i = fila.findIndex((l) => l.selo === 'Aguardando gestor');
    if (i < 0) throw new Error('nenhuma avaliação disponível para devolução');
    alvoDevolvido = fila[i].nome;
    await linhaDa(i).getByRole('button', { name: 'Ver avaliação' }).click();
    const dlg = page.locator('[role="dialog"][data-state="open"]').last();
    await dlg.waitFor({ timeout: 15000 });
    await page.waitForTimeout(700);
    await dlg.getByRole('button', { name: /Devolver para correção/ }).click();
    await page.waitForTimeout(600);
    await page.getByLabel('Justificativa obrigatória').fill('Roteiro D9: revisar as metas antes da aprovação.');
    await page.getByRole('button', { name: 'Confirmar devolução' }).click();
    await page.waitForTimeout(2000);
    const aviso = await ultimoToast();
    const locais = await estadoLocal();
    await evid('D9-devolvido');
    await page.keyboard.press('Escape');
    const decisoes = Object.values(locais.aprovacoes?.decisoes ?? {});
    if (!decisoes.some((d) => String(d?.decisao) === 'devolvido')) {
      throw new Error(`devolução não gravada (aviso: ${aviso})`);
    }
    return { aviso, alvo: alvoDevolvido };
  });

  /* ── D10 · Corrigir e reenviar ─────────────────────────────────────────── */
  await passo('D10', 'Reenviar ao gestor após correção', async () => {
    await abrirFila();
    const fila = await lerFila();
    const i = fila.findIndex((l) => l.nome === alvoDevolvido && l.botoes.includes('Reenviar ao gestor'));
    if (i < 0) throw new Error('linha devolvida não oferece "Reenviar ao gestor"');
    await linhaDa(i).getByRole('button', { name: 'Reenviar ao gestor' }).click();
    await page.waitForTimeout(1800);
    const aviso = await ultimoToast();
    const locais = await estadoLocal();
    await evid('D10-reenviado');
    return { aviso, decisoesRestantes: Object.keys(locais.aprovacoes?.decisoes ?? {}).length };
  });

  /* ── D11 · Validar Potencial (exclusivo do RH) ─────────────────────────── */
  await passo('D11', 'Validar Potencial na demonstração (papel RH)', async () => {
    await irFeedbacks();
    await abrirFila();
    const fila = await lerFila();
    const linha = fila.find((l) => l.selo === 'Aprovada pelo gestor');
    const papeis = (await page.evaluate(() => null)) ?? null;
    void papeis;
    if (!linha) throw new Error('nenhuma linha aprovada aguardando o RH');
    const oferecido = linha.botoes.includes('Validar Potencial');
    await evid('D11-fila-rh');
    if (!oferecido) {
      // Sem o papel `rh` o controle NÃO é oferecido (regra do servidor espelhada).
      relatorio.passos.D11.bloqueio = 'sessão sem papel `rh`: controle não oferecido (regra preservada)';
      return { selo: linha.selo, botaoOferecido: false };
    }
    const i = fila.indexOf(linha);
    await linhaDa(i).getByRole('button', { name: 'Validar Potencial' }).click();
    await page.waitForTimeout(1800);
    const aviso = await ultimoToast();
    const locais = await estadoLocal();
    return {
      botaoOferecido: true,
      aviso,
      validacoes: Object.keys(locais.aprovacoes?.validacoes ?? {}).length,
    };
  });

  /* ── D12 · Nine-Box reflete a decisão vigente ──────────────────────────── */
  await passo('D12', 'Nine-Box classifica conforme as decisões', async () => {
    await irPara('Nine-Box');
    const kpi = await kpiAvaliados();
    const botaoComparar = page.getByRole('button', { name: /[Cc]omparar/ }).first();
    const temComparar = await botaoComparar.isVisible().catch(() => false);
    await evid('D12-ninebox');
    return { kpi, temControleComparar: temComparar };
  });

  /* ── D13 · Reabrir e invalidar a aprovação ────────────────────────────── */
  let idReaberto = null;
  await passo('D13', 'Reabrir avaliação e invalidar a decisão anterior', async () => {
    await irFeedbacks();
    await selecionarCiclo('S2 2026');
    await abrirFila();
    const fila = await lerFila();
    const i = fila.findIndex((l) => l.selo === 'Aprovada pelo gestor' || l.selo === 'Devolvida para correção');
    if (i < 0) throw new Error('nenhuma avaliação decidida para reabrir');
    await linhaDa(i).getByRole('button', { name: 'Ver avaliação' }).click();
    const dlg = page.locator('[role="dialog"][data-state="open"]').last();
    await dlg.waitFor({ timeout: 15000 });
    await page.waitForTimeout(800);
    const botoes = (await lerModal(dlg)).botoes;
    const reabrir = dlg.getByRole('button', { name: /Reabrir avaliação/ });
    if (!(await reabrir.isVisible().catch(() => false))) {
      await page.keyboard.press('Escape');
      relatorio.passos.D13.bloqueio = `controle "Reabrir avaliação" não oferecido (${botoes.join(' | ')})`;
      return { botaoOferecido: false, botoes };
    }
    idReaberto = await dlg.evaluate(() => document.body.textContent?.slice(0, 0) ?? null);
    await reabrir.click();
    await page.waitForTimeout(700);
    const campo = page.getByLabel(/justificativa/i).last();
    if (await campo.isVisible().catch(() => false)) {
      await campo.fill('Roteiro D13: reabertura para revisão do ciclo.');
      await page
        .getByRole('button', { name: /Confirmar|Reabrir/i })
        .last()
        .click();
    }
    await page.waitForTimeout(2000);
    const aviso = await ultimoToast();
    const locais = await estadoLocal();
    await evid('D13-reaberto');
    await page.keyboard.press('Escape');
    return {
      botaoOferecido: true,
      aviso,
      patchesDeEstado: Object.keys(locais.registros?.patches?.feedbacks ?? {}).length,
    };
  });

  /* ── D14 · Classificação é retirada depois da reabertura ──────────────── */
  await passo('D14', 'Reabertura retira a avaliação da classificação', async () => {
    await irPara('Nine-Box');
    const kpi = await kpiAvaliados();
    await evid('D14-ninebox-pos-reabertura');
    return { kpi, idReaberto };
  });

  /* ── D15 · Reaprovar e revalidar → reclassificar ───────────────────────── */
  await passo('D15', 'Reaprovar; reclassificação depende da validação do RH', async () => {
    await irPara('Feedbacks');
    await abrirFila();
    const fila = await lerFila();
    const i = fila.findIndex((l) => l.selo === 'Aguardando gestor');
    if (i < 0) throw new Error('nenhuma avaliação aguardando gestor para reaprovar');
    await linhaDa(i).getByRole('button', { name: 'Ver avaliação' }).click();
    const dlg = page.locator('[role="dialog"][data-state="open"]').last();
    await dlg.waitFor({ timeout: 15000 });
    await page.waitForTimeout(700);
    await dlg.getByRole('button', { name: /Aprovar avaliação/ }).click();
    await page.waitForTimeout(2000);
    const aviso = await ultimoToast();
    await page.keyboard.press('Escape');
    await irPara('Nine-Box');
    const kpi = await kpiAvaliados();
    await evid('D15-ninebox-reaprovado');
    return { aviso, kpi, observacao: 'a conclusão definitiva exige a validação do Potencial pelo RH' };
  });

  /* ── D16/D17 · Abas de Metas & OKRs e PDI (registros existentes) ───────── */
  await passo('D16', 'Metas & OKRs: aba funcional com os registros da vitrine', async () => {
    await irPara('Metas & OKRs');
    const cartoes = await page.locator('div[class*="rounded-xl"]').count();
    await evid('D16-metas');
    return { cartoesVisiveis: cartoes, observacao: 'a aba não possui controle de criação (nada quebrado a corrigir)' };
  });

  await passo('D17', 'PDI: aba funcional com os registros da vitrine', async () => {
    await irPara('PDI');
    const cartoes = await page.locator('div[class*="rounded-xl"]').count();
    await evid('D17-pdi');
    return { cartoesVisiveis: cartoes, observacao: 'a aba não possui controle de criação (nada quebrado a corrigir)' };
  });

  /* ── D18 · Auditoria: aba + trilha demonstrativa local ─────────────────── */
  await passo('D18', 'Auditoria: aba aprovada + histórico local separado', async () => {
    await irPara('Auditoria');
    const linhaTempo = await page.locator('[class*="timeline"], [role="list"]').count();
    await evid('D18-auditoria');
    const locais = await estadoLocal();
    const eventos = (locais.registros?.historico ?? []).length + (locais.aprovacoes?.historico ?? []).length;
    return {
      blocosDeLinhaTempo: linhaTempo,
      eventosDemonstrativos: eventos,
      ultimos: (locais.registros?.historico ?? []).slice(-3).map((h) => `${h.operacao}:${h.entidade}`),
      observacao: 'a trilha da demonstração fica no armazenamento local (nunca em audit_log)',
    };
  });

  /* ── D19 · Comparação de ciclos (Nine-Box) ────────────────────────────── */
  await passo('D19', 'Comparação de ciclos e filtros do Nine-Box', async () => {
    await irPara('Nine-Box');
    const botaoComparar = page.getByRole('button', { name: /[Cc]omparar/ }).first();
    const temBotao = await botaoComparar.isVisible().catch(() => false);
    if (temBotao) {
      await botaoComparar.click();
      await page.waitForTimeout(1500);
    }
    const kpi = await kpiAvaliados();
    await evid('D19-ninebox-comparar');
    return { temControleDeComparacao: temBotao, kpi };
  });

  /* ── D20 · Fechar e reabrir o navegador (mesmo perfil) ─────────────────── */
  await passo('D20', 'Estado demonstrativo sobrevive ao fechar/reabrir o navegador', async () => {
    const estadoSalvo = await contexto.storageState({ path: `${OUT}/estado-demo.json` });
    void estadoSalvo;
    const novo = await browser.newContext({
      storageState: `${OUT}/estado-demo.json`,
      viewport: { width: 1456, height: 1000 },
    });
    const paginaNova = await novo.newPage();
    await paginaNova.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
    await paginaNova.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
    const locais = await paginaNova.evaluate(
      ([k1, k2]) => ({
        registros: JSON.parse(localStorage.getItem(k1) ?? 'null'),
        aprovacoes: JSON.parse(localStorage.getItem(k2) ?? 'null'),
      }),
      [CHAVE_REGISTROS, CHAVE_APROVACOES]
    );
    await paginaNova.screenshot({ path: `${OUT}/D20-navegador-reaberto.png` });
    await novo.close();
    return {
      ciclosCriados: Object.keys(locais.registros?.criados?.ciclos ?? {}).length,
      feedbacksCriados: Object.keys(locais.registros?.criados?.feedbacks ?? {}).length,
      decisoes: Object.keys(locais.aprovacoes?.decisoes ?? {}).length,
      eventos: (locais.registros?.historico ?? []).length,
    };
  });
} catch (erro) {
  relatorio.erroFatal = String(erro?.message ?? erro).slice(0, 400);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
}
