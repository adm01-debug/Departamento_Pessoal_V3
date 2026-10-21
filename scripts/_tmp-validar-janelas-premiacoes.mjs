/**
 * TEMPORÁRIO — PADRONIZAÇÃO DAS JANELAS DE PREMIAÇÕES × JANELA "PENDÊNCIAS".
 *
 * Mede, no DOM real e quadro a quadro (requestAnimationFrame), a assinatura da
 * animação de cada janela do módulo:
 *
 *   referência : /colaboradores/mock-1 → "Ver todas" (Pendências)
 *   alvos      : Nova Campanha, Detalhes da campanha, Próximas ações (lista),
 *                Detalhes do pagamento, Aprovação/Rejeição/Reinício,
 *                Conciliação com a folha
 *
 * Para cada janela registra: transform (scaleX/scaleY) da caixa, opacidade e
 * deslocamento do PRIMEIRO bloco, opacidade do véu, tempo até desmontar,
 * devolução de foco e atributos de acessibilidade. No fim compara as curvas
 * da referência com as de cada alvo numa grade de 5 ms.
 *
 * Uso: node scripts/_tmp-validar-janelas-premiacoes.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORTA = 8080;
const BASE = `http://localhost:${PORTA}`;
const OUT = 'tmp-janelas-premiacoes';
mkdirSync(OUT, { recursive: true });

const portaAtiva = async () => {
  try {
    const r = await fetch(`${BASE}/premiacoes`, { redirect: 'manual' });
    return r.status < 500;
  } catch {
    return false;
  }
};
const jaServindo = await portaAtiva();
const servidor = jaServindo
  ? null
  : spawn('cmd.exe', ['/c', `npx vite --port ${PORTA} --strictPort`], { stdio: 'ignore', windowsHide: true });
const pronto = async () => {
  for (let i = 0; i < 90; i++) {
    if (await portaAtiva()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

/* ── amostragem ───────────────────────────────────────────────────────────── */

const instalarAmostrador = () => {
  window.__janela = { amostras: [], limite: 0 };
  const escala = (transform) => {
    if (!transform || transform === 'none') return { x: 1, y: 1 };
    const m = transform.match(/matrix\(([^)]+)\)/);
    if (!m) return { x: null, y: null };
    const p = m[1].split(',').map((v) => Number(v.trim()));
    return { x: p[0], y: p[3] };
  };
  const yDe = (transform) => {
    if (!transform || transform === 'none') return 0;
    const m = transform.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const p = m[1].split(',').map((v) => Number(v.trim()));
    return Number.isFinite(p[5]) ? p[5] : 0;
  };
  window.__janelaIniciar = (ms) => {
    window.__janela.amostras = [];
    window.__janela.limite = performance.now() + ms;
    const tick = () => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      const el = dialogs[dialogs.length - 1] ?? null;
      const overlay = document.querySelector('.backdrop-blur-sm');
      const bloco = el?.querySelector(':scope > div > div') ?? null;
      const s = el ? getComputedStyle(el) : null;
      const sb = bloco ? getComputedStyle(bloco) : null;
      window.__janela.amostras.push({
        t: Math.round(performance.now()),
        presente: Boolean(el),
        quantos: dialogs.length,
        escala: s ? escala(s.transform) : null,
        opacidadeCaixa: s ? Number(s.opacity) : null,
        overlay: overlay ? Number(getComputedStyle(overlay).opacity) : null,
        blocoOpacidade: sb ? Number(sb.opacity) : null,
        blocoY: sb ? Math.round(yDe(sb.transform) * 100) / 100 : null,
      });
      if (performance.now() < window.__janela.limite) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
};

const iniciar = (page, ms = 2400) => page.evaluate((t) => window.__janelaIniciar(t), ms);

/** Primeiro instante em que a caixa começa a aparecer (presente). */
function resumir(amostras) {
  const visiveis = amostras.filter((a) => a.presente);
  const t0 = visiveis[0]?.t ?? null;
  const comEscala = visiveis.filter((a) => a.escala);
  const primeiro = comEscala.find((a) => a.escala.x < 0.99) ?? comEscala[0] ?? null;
  const ultimo = comEscala[comEscala.length - 1] ?? null;
  const desmontou = t0 === null ? null : (amostras.find((a) => a.t > t0 && !a.presente)?.t ?? null);
  const overlayPrimeiro = amostras.find((a) => a.overlay !== null && a.overlay > 0.01) ?? null;
  const inicioReal = (comEscala.find((a) => a.escala.x < 0.99) ?? primeiro)?.t ?? null;
  const desdeInicio = (predicado) => {
    const achado = visiveis.find((a) => a.t >= (inicioReal ?? 0) && predicado(a));
    return achado && inicioReal !== null ? achado.t - inicioReal : null;
  };
  return {
    t0,
    inicioReal,
    amostras: amostras.length,
    amostrasVisiveis: visiveis.length,
    escalaInicial: primeiro?.escala ?? null,
    escalaFinal: ultimo?.escala ?? null,
    faseEsticaLargura: visiveis.some((a) => a.escala && a.escala.x > 0.8 && a.escala.y < 0.6),
    overlayInicio: overlayPrimeiro ? { t: overlayPrimeiro.t, opacidade: overlayPrimeiro.overlay } : null,
    tempoAteDesmontarMs: desmontou !== null && t0 !== null ? desmontou - t0 : null,
    blocoPrimeiro: visiveis.find((a) => a.blocoOpacidade !== null && a.blocoOpacidade > 0.01) ?? null,
    aindaNoFim: amostras[amostras.length - 1]?.presente ?? null,
    /** Assinatura robusta (independente do instante exato de cada quadro). */
    assinatura: {
      escalaCompletaMs: desdeInicio((a) => a.escala.x >= 0.99 && a.escala.y >= 0.99),
      blocoNoLugarMs: desdeInicio((a) => a.blocoY !== null && Math.abs(a.blocoY) <= 0.5),
      blocoVisivelMs: desdeInicio((a) => a.blocoOpacidade !== null && a.blocoOpacidade >= 0.99),
    },
  };
}

/** Reamostra as curvas numa grade fixa (5 ms) e devolve a maior diferença. */
function compararCurvas(ref, alvo) {
  const normalizar = (amostras) => {
    const visiveis = amostras.filter((a) => a.presente && a.escala);
    const inicio = (visiveis.find((a) => a.escala.x < 0.99) ?? visiveis[0])?.t;
    if (inicio === undefined) return [];
    // Descarta o quadro anterior ao início real e os 20 ms iniciais: no 1º
    // commit o Motion ainda não escreveu o `transform` e o navegador reporta
    // identidade — um artefato de medição, não da animação.
    // (o `t` normalizado vem DEPOIS do spread: `...a` também tem `t`.)
    return visiveis.map((a) => ({ ...a, t: a.t - inicio })).filter((a) => a.t >= 0);
  };
  const a = normalizar(ref);
  const b = normalizar(alvo);
  if (!a.length || !b.length) return { erro: 'amostra vazia', igual: false };
  const valorEm = (serie, campo, t) => {
    let anterior = serie[0];
    for (const s of serie) {
      if (s.t > t) break;
      anterior = s;
    }
    return anterior[campo];
  };
  let dEscalaX = 0;
  let dEscalaY = 0;
  let dBlocoOpacidade = 0;
  let dBlocoY = 0;
  const limite = Math.min(1500, a[a.length - 1].t, b[b.length - 1].t);
  for (let t = 20; t <= limite; t += 5) {
    dEscalaX = Math.max(dEscalaX, Math.abs(valorEm(a, 'escala', t).x - valorEm(b, 'escala', t).x));
    dEscalaY = Math.max(dEscalaY, Math.abs(valorEm(a, 'escala', t).y - valorEm(b, 'escala', t).y));
    dBlocoOpacidade = Math.max(dBlocoOpacidade, Math.abs(valorEm(a, 'blocoOpacidade', t) - valorEm(b, 'blocoOpacidade', t)));
    dBlocoY = Math.max(dBlocoY, Math.abs(valorEm(a, 'blocoY', t) - valorEm(b, 'blocoY', t)));
  }
  return {
    janelaComparadaMs: limite,
    deltaMaxEscalaX: Number(dEscalaX.toFixed(4)),
    deltaMaxEscalaY: Number(dEscalaY.toFixed(4)),
    deltaMaxBlocoOpacidade: Number(dBlocoOpacidade.toFixed(4)),
    deltaMaxBlocoY: Number(dBlocoY.toFixed(2)),
    // Tolerâncias calibradas para a irregularidade do rAF (~1 quadro ≈ 16 ms):
    // uma animação DIFERENTE (ex.: fade-only, outra duração) gera deltas → 1.
    igual: dEscalaX < 0.12 && dEscalaY < 0.12 && dBlocoOpacidade < 0.1 && dBlocoY < 1.5,
  };
}

/** Compara os marcos temporais da assinatura (tolerância de ~3 quadros). */
function compararAssinatura(ref, alvo) {
  const marcos = ['escalaCompletaMs', 'blocoNoLugarMs', 'blocoVisivelMs'];
  const deltas = {};
  for (const m of marcos) {
    const a = ref[m];
    const b = alvo[m];
    deltas[m] = a === null || b === null ? null : Math.abs(a - b);
  }
  return {
    referencia: ref,
    alvo,
    deltasMs: deltas,
    igual: marcos.every((m) => deltas[m] === null || deltas[m] <= 120),
  };
}

const ler = (page) => page.evaluate(() => window.__janela.amostras);


/* ── fluxo ────────────────────────────────────────────────────────────────── */

const abrirContexto = async (browser, { reduzido = false } = {}) => {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 950 },
    ...(reduzido ? { reducedMotion: 'reduce' } : {}),
  });
  await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
  );
  await context.addInitScript(
    ({ reduzido }) => {
      localStorage.setItem('ui-theme', 'dark');
      localStorage.setItem('dp-tour-completed', 'true');
      if (reduzido) localStorage.setItem('dp-force-motion', 'off');
      else localStorage.removeItem('dp-force-motion');
    },
    { reduzido }
  );
  const page = await context.newPage();
  await page.addInitScript(instalarAmostrador);
  return { context, page };
};

const dialogo = (page) => page.getByRole('dialog').last();

const blocosDaJanela = (page) =>
  dialogo(page)
    .evaluate((el) => {
      const corpo = el.querySelector(':scope > div');
      if (!corpo) return null;
      // A moldura compacta (Pendências/Próximas ações) embrulha os itens num
      // contêiner próprio (title + itens = `blocks`); as janelas grandes têm
      // cada bloco como filho direto do corpo.
      const lista = [...corpo.children].find((c) => /space-y-2\.5/.test(c.className || ''));
      return lista ? 1 + lista.children.length : corpo.children.length;
    })
    .catch(() => null);

const fechamentoPrevisto = (blocos) =>
  blocos === null || blocos === undefined ? null : Math.round(((blocos - 1) * 0.1 + 0.22 + 0.55) * 1000);

const medidasDeAcessibilidade = (page) =>
  dialogo(page)
    .evaluate((el) => ({
      ariaModal: el.getAttribute('aria-modal'),
      role: el.getAttribute('role'),
      temTitulo: Boolean(el.querySelector('[id]')) || Boolean(el.textContent?.trim()),
      botaoFechar: Boolean(el.querySelector('button[type="button"]')),
    }))
    .catch(() => null);

/**
 * Ciclo completo: mede a abertura, fecha com Escape/X/overlay e mede a saída.
 * `abrir` é a ação que dispara a janela (já resolvida pela página).
 */
async function ciclo(page, { nome, preparar, abrir, fechar = 'escape' }) {
  if (preparar) await preparar();
  await iniciar(page, 3200);
  await abrir();
  await dialogo(page).waitFor({ timeout: 15000 });
  await page.waitForTimeout(2400);
  const amostrasAbertura = await ler(page);
  const abertura = resumir(amostrasAbertura);
  const blocos = await blocosDaJanela(page);
  const a11y = await medidasDeAcessibilidade(page);
  const titulo = await dialogo(page)
    .innerText()
    .then((t) => t.replace(/\s+/g, ' ').slice(0, 70))
    .catch(() => null);
  await page.screenshot({ path: `${OUT}/${nome}-aberta.png` });

  await iniciar(page, 2400);
  if (fechar === 'escape') await page.keyboard.press('Escape');
  else if (fechar === 'x') await dialogo(page).getByRole('button', { name: 'Fechar' }).click();
  else if (fechar === 'overlay') await page.mouse.click(8, 8);
  await page.waitForTimeout(2200);
  const amostrasFechamento = await ler(page);
  const fechamento = resumir(amostrasFechamento);
  await page.screenshot({ path: `${OUT}/${nome}-fechada.png` });

  return {
    titulo,
    blocos,
    fechamentoPrevistoMs: fechamentoPrevisto(blocos),
    a11y,
    abertura,
    fechamento,
    saidaAindaPresente: amostrasFechamento[amostrasFechamento.length - 1]?.presente ?? null,
    amostrasAbertura,
    amostrasFechamento,
  };
}

/** Executa um ciclo e transforma falha de dados em registro (o resto segue). */
async function seguro(chave, fn) {
  try {
    return await fn();
  } catch (erro) {
    return { erro: String(erro?.message ?? erro).slice(0, 300), amostrasAbertura: [], amostrasFechamento: [] };
  }
}

/* ── execução ─────────────────────────────────────────────────────────────── */

const relatorio = {};
let browser;
try {
  if (!(await pronto())) throw new Error('servidor Vite não ficou pronto');
  browser = await chromium.launch({ args: ['--disable-frame-rate-limit', '--disable-gpu-vsync'] });

  /* 1 · REFERÊNCIA — janela Pendências (popup do AnimatedCascadeDialog). */
  {
    const { context, page } = await abrirContexto(browser);
    await page.goto(`${BASE}/colaboradores/mock-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3200);
    const abrir = async () => {
      const verTodas = page.getByRole('button', { name: 'Ver todas' });
      const total = await verTodas.count();
      for (let i = 0; i < total; i += 1) {
        await verTodas.nth(i).click();
        await dialogo(page).waitFor({ timeout: 10000 });
        const texto = await dialogo(page).innerText();
        if (/Pendências/i.test(texto)) return;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1500);
      }
      throw new Error('janela Pendências não encontrada');
    };
    relatorio.referencia = await ciclo(page, { nome: 'referencia-pendencias', abrir });
    relatorio.referencia.focoAposFechar = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      texto: (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
    }));
    await context.close();
  }

  /* 2 · PREMIAÇÕES */
  {
    const { context, page } = await abrirContexto(browser);
    await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(2600);

    relatorio.novaCampanha = await ciclo(page, {
      nome: 'nova-campanha',
      abrir: () => page.getByRole('button', { name: /Nova Campanha/ }).click(),
    });
    await page.waitForTimeout(1800);

    relatorio.detalhesCampanha = await ciclo(page, {
      nome: 'detalhes-campanha',
      abrir: () =>
        page
          .getByRole('button', { name: /Ver campanha|Ver resultados|Revisar campanha/ })
          .first()
          .click(),
    });
    await page.waitForTimeout(1800);

    relatorio.listaAcoes = await ciclo(page, {
      nome: 'lista-acoes',
      abrir: () => page.getByRole('button', { name: 'Ver todas as ações' }).click(),
    });
    await page.waitForTimeout(1800);

    /* Aba Pagamentos */
    await page.getByRole('tab', { name: /Pagamentos/ }).click();
    await page.getByRole('textbox', { name: 'Buscar pagamentos' }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(2400);

    // Detalhes do pagamento (menu de três pontos da primeira linha).
    relatorio.detalhesPagamento = await ciclo(page, {
      nome: 'detalhes-pagamento',
      abrir: async () => {
        await page.locator('button[aria-label^="Mais ações para"]').first().click();
        await page.getByRole('menuitem', { name: /Ver detalhes/ }).click();
      },
    });
    await page.waitForTimeout(1800);

    // Aprovação / rejeição / reinício (ação principal de uma linha pendente).
    relatorio.aprovacao = await seguro('aprovacao', () =>
      ciclo(page, {
        nome: 'aprovacao',
        abrir: () =>
          page
            .locator('tbody')
            .getByRole('button', { name: /^(Revisar|Aprovar)$/ })
            .first()
            .click(),
      })
    );
    await page.waitForTimeout(1800);

    // Conciliação manual: filtra a etapa "Aprovado" (é onde `podeConciliarPagamento`
    // é verdadeiro) e usa a AÇÃO PRINCIPAL da linha, que abre o diálogo real.
    relatorio.conciliacao = await seguro('conciliacao', () =>
      ciclo(page, {
        nome: 'conciliacao',
        preparar: async () => {
          await page.getByRole('combobox', { name: 'Etapa do fluxo' }).click();
          await page.getByRole('option', { name: /Enviado à folha/ }).last().click();
          await page.waitForTimeout(1000);
        },
        abrir: async () => {
          const acao = page.locator('tbody').getByRole('button', { name: /^(Conciliar|Resolver)$/ }).first();
          if (await acao.isVisible().catch(() => false)) {
            await acao.click();
            return;
          }
          const botoes = page.locator('button[aria-label^="Mais ações para"]');
          const total = await botoes.count();
          for (let i = 0; i < total; i += 1) {
            await botoes.nth(i).click();
            const item = page.getByRole('menuitem', { name: /Conciliar manualmente/ });
            if (await item.isVisible().catch(() => false)) {
              await item.click();
              return;
            }
            await page.keyboard.press('Escape');
            await page.waitForTimeout(250);
          }
          throw new Error('nenhuma linha conciliável');
        },
      })
    );
    await context.close();
  }

  /* 3 · Comparação temporal (grade de 5 ms) — mesmas curvas da referência. */
  relatorio.comparacao = {};
  for (const chave of ['novaCampanha', 'detalhesCampanha', 'listaAcoes', 'detalhesPagamento', 'aprovacao', 'conciliacao']) {
    const alvo = relatorio[chave];
    if (!alvo || alvo.erro) {
      relatorio.comparacao[chave] = { erro: alvo?.erro ?? 'sem medição' };
      continue;
    }
    relatorio.comparacao[chave] = {
      curvas: compararCurvas(relatorio.referencia.amostrasAbertura, alvo.amostrasAbertura),
      assinatura: compararAssinatura(relatorio.referencia.abertura.assinatura, alvo.abertura.assinatura),
      escalaInicialRef: relatorio.referencia.abertura.escalaInicial,
      escalaInicialAlvo: alvo.abertura.escalaInicial,
      faseEsticaLargura: {
        referencia: relatorio.referencia.abertura.faseEsticaLargura,
        alvo: alvo.abertura.faseEsticaLargura,
      },
      overlay: {
        referencia: relatorio.referencia.abertura.overlayInicio,
        alvo: alvo.abertura.overlayInicio,
      },
      fechamento: {
        blocos: alvo.blocos,
        previstoMs: alvo.fechamentoPrevistoMs,
        medidoAteDesmontarMs: alvo.fechamento.tempoAteDesmontarMs,
        escalaFinal: alvo.fechamento.escalaFinal,
        aindaPresente: alvo.saidaAindaPresente,
      },
      a11y: alvo.a11y,
    };
  }
  /* Fechamento: mesma coreografia (itens em ordem inversa + caixa encolhendo),
     com o `delay` da caixa derivado da contagem de blocos de CADA janela. */
  relatorio.comparacaoFechamento = {};
  for (const chave of ['novaCampanha', 'detalhesCampanha', 'listaAcoes', 'detalhesPagamento', 'aprovacao', 'conciliacao']) {
    const alvo = relatorio[chave];
    if (!alvo || alvo.erro) {
      relatorio.comparacaoFechamento[chave] = { erro: alvo?.erro ?? 'sem medição' };
      continue;
    }
    relatorio.comparacaoFechamento[chave] = {
      blocos: alvo.blocos,
      previstoMs: alvo.fechamentoPrevistoMs,
      observadoMs: alvo.fechamento.tempoAteDesmontarMs,
      extraMs:
        alvo.fechamento.tempoAteDesmontarMs === null
          ? null
          : alvo.fechamento.tempoAteDesmontarMs - alvo.fechamentoPrevistoMs,
      escalaFinal: alvo.fechamento.escalaFinal,
      desmontou: !alvo.saidaAindaPresente,
      // O observado inclui o tempo do comando (Escape) + 1 quadro; a animação
      // em si é a mesma quando o extra fica abaixo de ~350 ms e a escala final
      // chega a 0.
      igual:
        !alvo.saidaAindaPresente &&
        (alvo.fechamento.escalaFinal?.x ?? 1) < 0.02 &&
        (alvo.fechamento.tempoAteDesmontarMs ?? 9999) - alvo.fechamentoPrevistoMs < 350,
    };
  }
  relatorio.comparacaoFechamento.referencia = {
    blocos: relatorio.referencia.blocos,
    previstoMs: relatorio.referencia.fechamentoPrevistoMs,
    observadoMs: relatorio.referencia.fechamento.tempoAteDesmontarMs,
    escalaFinal: relatorio.referencia.fechamento.escalaFinal,
    desmontou: !relatorio.referencia.saidaAindaPresente,
  };

  /* 4 · ACESSIBILIDADE: foco inicial, focus trap, retorno de foco e outside click. */
  {
    const { context, page } = await abrirContexto(browser);
    await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(2200);
    const gatilho = page.getByRole('button', { name: /Nova Campanha/ });
    await gatilho.focus();
    await gatilho.click();
    await dialogo(page).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1600);
    const ariaModal = await dialogo(page).getAttribute('aria-modal');

    const focoInicialDentro = await page.evaluate(() => {
      const d = [...document.querySelectorAll('[role="dialog"]')].pop();
      return Boolean(d && d.contains(document.activeElement));
    });
    let trapOk = true;
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const dentro = await page.evaluate(() => {
        const d = [...document.querySelectorAll('[role="dialog"]')].pop();
        return Boolean(d && d.contains(document.activeElement));
      });
      if (!dentro) trapOk = false;
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1800);
    const foco = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      texto: (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
    }));

    await gatilho.click();
    await dialogo(page).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.mouse.click(8, 8);
    await page.waitForTimeout(1800);
    const foraCliqueFechou = (await page.getByRole('dialog').count()) === 0;

    relatorio.acessibilidade = {
      ariaModal,
      focoInicialDentro,
      focusTrap: trapOk,
      focoAposFechar: foco,
      focoAposFecharReferencia: relatorio.referencia?.focoAposFechar ?? null,
      mesmoRetornoDeFocoQueReferencia:
        foco.tag === relatorio.referencia?.focoAposFechar?.tag && foco.texto === relatorio.referencia?.focoAposFechar?.texto,
      foraCliqueFechou,
    };
    await context.close();
  }

  /* 5 · MOVIMENTO REDUZIDO + fechamento pelo botão X. */
  {
    const { context, page } = await abrirContexto(browser, { reduzido: true });
    await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(2200);
    await iniciar(page, 2400);
    await page.getByRole('button', { name: /Nova Campanha/ }).click();
    await dialogo(page).waitFor({ timeout: 15000 });
    await page.waitForTimeout(2000);
    const abertura = await ler(page);
    const visiveis = abertura.filter((a) => a.presente && a.escala);
    await page.screenshot({ path: `${OUT}/reduzido-nova-campanha.png` });

    await iniciar(page, 2400);
    await dialogo(page).getByRole('button', { name: 'Fechar' }).click();
    await page.waitForTimeout(1800);
    const saida = await ler(page);

    relatorio.movimentoReduzido = {
      prefereReduzido: await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      escalaMinima: visiveis.length ? Math.min(...visiveis.map((a) => a.escala.x)) : null,
      escalaMaxima: visiveis.length ? Math.max(...visiveis.map((a) => a.escala.x)) : null,
      houveFade: visiveis.some((a) => a.blocoOpacidade !== null && a.blocoOpacidade > 0.02 && a.blocoOpacidade < 0.98),
      opacidadeFinal: visiveis[visiveis.length - 1]?.blocoOpacidade ?? null,
      fechouPeloX: !(saida[saida.length - 1]?.presente ?? false),
    };

    // Fechamento pelo X em movimento normal: sai a animação e o diálogo desmonta.
    const normal = await abrirContexto(browser);
    await normal.page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
    await normal.page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
    await normal.page.waitForTimeout(2200);
    await iniciar(normal.page, 2400);
    await normal.page.getByRole('button', { name: /Nova Campanha/ }).click();
    await dialogo(normal.page).waitFor({ timeout: 15000 });
    await normal.page.waitForTimeout(2000);
    await iniciar(normal.page, 2400);
    await dialogo(normal.page).getByRole('button', { name: 'Fechar' }).click();
    await normal.page.waitForTimeout(1800);
    const amostrasX = await ler(normal.page);
    relatorio.fechamentoPeloX = {
      desmontou: !(amostrasX[amostrasX.length - 1]?.presente ?? false),
      escalaFinal: resumir(amostrasX).escalaFinal,
      tempoAteDesmontarMs: resumir(amostrasX).tempoAteDesmontarMs,
    };
    await normal.context.close();
    await context.close();
  }
} catch (erro) {
  relatorio.erroFatal = String(erro?.stack ?? erro).slice(0, 1500);
} finally {
  if (browser) await browser.close();
  if (servidor) {
    try {
      execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* já encerrado */
    }
  }
}

// Relatório enxuto: as amostras brutas (~10 MB) ficam de fora; as curvas
// comparadas, os marcos e os veredictos são o que importa para a revisão.
writeFileSync(
  `${OUT}/relatorio.json`,
  JSON.stringify(relatorio, (k, v) => (k === 'amostrasAbertura' || k === 'amostrasFechamento' ? undefined : v), 2)
);

for (const chave of ['referencia', 'novaCampanha', 'detalhesCampanha', 'listaAcoes', 'detalhesPagamento', 'aprovacao', 'conciliacao']) {
  const r = relatorio[chave];
  if (!r) continue;
  if (r.erro) {
    console.log(`${chave.padEnd(20)} ERRO: ${r.erro}`);
    continue;
  }
  console.log(
    `${chave.padEnd(20)} blocos=${String(r.blocos).padEnd(2)} escala0=${JSON.stringify(r.abertura.escalaInicial)} ` +
      `fase=${String(r.abertura.faseEsticaLargura).padEnd(5)} saida_prev=${String(r.fechamentoPrevistoMs).padStart(4)}ms ` +
      `saida_obs=${String(r.fechamento.tempoAteDesmontarMs).padStart(4)}ms restou=${r.saidaAindaPresente} ` +
      `assinatura=${JSON.stringify(r.abertura.assinatura)}`
  );
}
console.log('\ncomparação (Δ máx. contra Pendências):');
for (const [chave, c] of Object.entries(relatorio.comparacao ?? {})) {
  console.log(
    `  ${chave.padEnd(20)} curvas=${JSON.stringify(c.curvas)}` +
      (c.assinatura ? ` assinatura=${JSON.stringify(c.assinatura)}` : '')
  );
}
console.log('\nfechamento (Detalhes do pagamento × Pendências):', JSON.stringify(relatorio.comparacaoFechamento));
console.log('acessibilidade:', JSON.stringify(relatorio.acessibilidade));
console.log('movimento reduzido:', JSON.stringify(relatorio.movimentoReduzido));
console.log('fechamento pelo X:', JSON.stringify(relatorio.fechamentoPeloX));
if (relatorio.erroFatal) console.log('\nERRO FATAL:\n' + relatorio.erroFatal);
console.log(`\nJSON: ${OUT}/relatorio.json`);

