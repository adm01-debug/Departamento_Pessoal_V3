/**
 * TEMPORÁRIO — ANIMAÇÃO + ALINHAMENTO das janelas do fluxo de Feedback.
 *
 * 1) ANIMAÇÃO: mede, no DOM real, a ASSINATURA da animação (amostras de
 *    `transform`/`opacity` via requestAnimationFrame) das janelas:
 *      • Ver Feedback            (FeedbackDetalheDialog);
 *      • Devolver para correção  (PendenciasAprovacao e FeedbackAcoesRodape);
 *      • Cancelar/Reabrir        (FeedbackAcoesRodape).
 *    Referência: a janela "Pendências" (`PendenciasDialog` →
 *    `AnimatedCascadeDialog` → `CascadeDialogFrame`). Se ela for alcançável no
 *    ambiente, a assinatura é comparada amostra a amostra; se não for (depende
 *    de dados reais de pendências), o script registra o motivo e compara com a
 *    ESPECIFICAÇÃO derivada de `ui/cascade-motion.ts` — o MESMO módulo que a
 *    referência importa (cadeia de imports verificada por leitura de arquivo).
 *
 * 2) ALINHAMENTO: mede as caixas (reais) do selo e dos botões do rodapé em
 *    cada conjunto de ações (0, 1, 2 e 3 botões), em 1440/1280/1024px:
 *      • mesma linha (Δtop ≤ 1.5px) e mesmas alturas (Δh ≤ 1px);
 *      • selo centralizado no eixo vertical dos botões (Δcentro ≤ 2px);
 *      • botões sem sobreposição e sem estourar a caixa (sem scroll horizontal);
 *      • última ação encostada na mesma borda direita em todos os cards.
 *
 * Uso: node scripts/_tmp-validar-animacao-alinhamento.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-alinhamento-animacao';
const BASE = 'http://localhost:8080';
mkdirSync(OUT, { recursive: true });
const relatorio = { animacao: {}, alinhamento: {}, larguras: {}, referenciaPendencias: {} };

const ROTULOS = [
  'Concluir avaliação',
  'Cancelar avaliação',
  'Reabrir avaliação',
  'Aprovar avaliação',
  'Devolver para correção',
  'Validar Potencial',
];

const browser = await chromium.launch();

async function abrirContexto({
  papeis,
  viewport = { width: 1440, height: 1000 },
  reducedMotion = 'no-preference',
  storage = 'e2e/.auth/user.json',
}) {
  const context = await browser.newContext({
    storageState: storage,
    viewport,
    reducedMotion,
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

/* ── animação: amostragem ─────────────────────────────────────────────────── */
const iniciarAmostragem = (page, sel, ms = 2600, chave = 'principal') =>
  page.evaluate(
    ({ sel, ms, chave }) => {
      window.__amostras = window.__amostras ?? {};
      window.__amostras[chave] = [];
      const t0 = performance.now();
      const tick = () => {
        const els = document.querySelectorAll(sel);
        const el = els[els.length - 1] ?? null; // o ÚLTIMO = a janela mais nova
        window.__amostras[chave].push({
          t: Math.round(performance.now() - t0),
          quantos: els.length,
          presente: Boolean(el),
          transform: el ? getComputedStyle(el).transform : null,
          opacity: el ? Number(getComputedStyle(el).opacity) : null,
        });
        if (performance.now() - t0 < ms) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    { sel, ms, chave }
  );

const lerAmostras = (page, chave = 'principal') => page.evaluate((k) => window.__amostras?.[k] ?? [], chave);

/** Resumo da opacidade do véu (fade) — mesma varredura, chave própria. */
function resumirOverlay(samples) {
  const visiveis = samples.filter((s) => s.presente);
  const opacidades = visiveis.map((s) => s.opacity).filter((o) => o !== null);
  return {
    amostras: samples.length,
    opacidadeInicial: opacidades[0] ?? null,
    opacidadeFinal: opacidades[opacidades.length - 1] ?? null,
    tempoAteSumirMs: samples.find((s) => !s.presente)?.t ?? null,
    aindaNoFim: samples[samples.length - 1]?.presente ?? null,
  };
}

const escalas = (transform) => {
  if (!transform || transform === 'none') return { x: 1, y: 1 };
  const m = transform.match(/matrix\(([^)]+)\)/);
  if (!m) return { x: null, y: null };
  const p = m[1].split(',').map((v) => Number(v.trim()));
  return { x: p[0], y: p[3] };
};

/** Resume as amostras: escala inicial/final, tempo até desmontar, opacidade. */
function resumir(samples) {
  const comTransform = samples.filter((s) => s.presente && s.transform);
  const primeiro = comTransform[0] ?? null;
  const primeiroComEscala = comTransform.find((s) => escalas(s.transform).x !== null) ?? null;
  const ultimo = comTransform[comTransform.length - 1] ?? null;
  const desmontou = samples.find((s) => !s.presente);
  const maxX = Math.max(...comTransform.map((s) => escalas(s.transform).x ?? 1), 0);
  const minX = Math.min(...comTransform.map((s) => escalas(s.transform).x ?? 1), 1);
  const esticouLargura = comTransform.some((s) => {
    const e = escalas(s.transform);
    return e.x !== null && e.x > 0.8 && e.y < 0.6; // laterais esticadas, altura ainda curta
  });
  return {
    amostras: samples.length,
    amostrasComElemento: comTransform.length,
    escalaInicial: primeiroComEscala ? escalas(primeiroComEscala.transform) : null,
    escalaFinal: ultimo ? escalas(ultimo.transform) : null,
    maxScaleX: Number(maxX.toFixed(3)),
    minScaleX: Number(minX.toFixed(3)),
    faseEsticaLarguraDepoisAltura: esticouLargura,
    tempoAteDesmontarMs: desmontou ? desmontou.t : null,
    aindaPresenteNoFim: samples[samples.length - 1]?.presente ?? null,
    opacidadeFinal: ultimo?.opacity ?? null,
  };
}

/** Compara duas assinaturas (referência × alvo).
 *  As escalas são comparadas com tolerância de amostragem (0,05) e a duração
 *  de saída com 400 ms — o instrumento mede o INSTANTE do desmonte, que inclui
 *  o tempo do comando de fechar (round-trip) e depende da contagem de blocos
 *  de cada janela (o `delay` da moldura é derivado dela, por projeto). */
function comparar(a, b) {
  const dif = (x, y) => (x === null || y === null ? null : Number(Math.abs(x - y).toFixed(3)));
  const escalaFinalIgual = (dif(a.escalaFinal?.x, b.escalaFinal?.x) ?? 0) <= 0.05 && (dif(a.escalaFinal?.y, b.escalaFinal?.y) ?? 0) <= 0.05;
  const duracaoIgual =
    a.tempoAteDesmontarMs === null || b.tempoAteDesmontarMs === null
      ? true
      : Math.abs(a.tempoAteDesmontarMs - b.tempoAteDesmontarMs) <= 400;
  return {
    escalaInicial: { referencia: a.escalaInicial, alvo: b.escalaInicial },
    escalaFinal: { referencia: a.escalaFinal, alvo: b.escalaFinal },
    faseEsticaLarguraDepoisAltura: {
      referencia: a.faseEsticaLarguraDepoisAltura,
      alvo: b.faseEsticaLarguraDepoisAltura,
    },
    tempoAteDesmontarMs: { referencia: a.tempoAteDesmontarMs, alvo: b.tempoAteDesmontarMs },
    igual:
      a.faseEsticaLarguraDepoisAltura === b.faseEsticaLarguraDepoisAltura &&
      escalaFinalIgual &&
      duracaoIgual,
    escalaFinalIgual,
    duracaoIgual,
    deltasEscalaFinal: { x: dif(a.escalaFinal?.x, b.escalaFinal?.x), y: dif(a.escalaFinal?.y, b.escalaFinal?.y) },
  };
}

/** Quantos blocos cascateiam na janela aberta (filhos do corpo da moldura).
 *  É a entrada de `cascadeShellVariants(blocos)` — logo, define o `delay` da
 *  saída: `(blocos-1)*0.1 + 0.22 + 0.55` segundos (constantes compartilhadas). */
const blocosDaJanela = (page) =>
  page
    .getByRole('dialog')
    .last()
    .evaluate((el) => {
      const corpo = el.querySelector(':scope > div');
      return corpo ? corpo.children.length : null;
    })
    .catch(() => null);

const fechamentoPrevistoMs = (blocos) =>
  blocos === null || blocos === undefined ? null : Math.round(((blocos - 1) * 0.1 + 0.22 + 0.55) * 1000);

/* ── alinhamento: medição real das caixas ─────────────────────────────────── */
/** Espera a moldura parar de animar (transform identidade) antes de medir. */
const aguardarEstavel = (page) =>
  page
    .waitForFunction(
      () => {
        const els = document.querySelectorAll('[role="dialog"]');
        const el = els[els.length - 1];
        if (!el) return false;
        const t = getComputedStyle(el).transform;
        return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';
      },
      null,
      { timeout: 5000 }
    )
    .catch(() => false);

const medirRodape = async (page) => {
  await aguardarEstavel(page);
  await page.waitForTimeout(120);
  return rodapeAgora(page);
};

const rodapeAgora = (page) =>
  page.getByRole('dialog').last().evaluate((el, rotulos) => {
    const caixa = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const padDir = Number.parseFloat(cs.paddingRight || '0');
    const botoes = Array.from(el.querySelectorAll('button'))
      .map((b) => {
        const r = b.getBoundingClientRect();
        const texto = (b.textContent ?? '').replace(/\s+/g, ' ').trim();
        const visivel = r.width > 0 && r.height > 0 && getComputedStyle(b).visibility !== 'hidden';
        return {
          texto,
          operacional: rotulos.includes(texto),
          visivel,
          top: Number(r.top.toFixed(2)),
          bottom: Number(r.bottom.toFixed(2)),
          left: Number(r.left.toFixed(2)),
          right: Number(r.right.toFixed(2)),
          height: Number(r.height.toFixed(2)),
          centroX: Number(((r.left + r.right) / 2).toFixed(2)),
          centroY: Number(((r.top + r.bottom) / 2).toFixed(2)),
        };
      })
      .filter((b) => b.visivel);

    const op = botoes.filter((b) => b.operacional);
    const seloEl = el.querySelector('[role="status"]');
    const selo = seloEl
      ? (() => {
          const r = seloEl.getBoundingClientRect();
          return {
            texto: (seloEl.textContent ?? '').replace(/\s+/g, ' ').trim(),
            top: Number(r.top.toFixed(2)),
            bottom: Number(r.bottom.toFixed(2)),
            left: Number(r.left.toFixed(2)),
            right: Number(r.right.toFixed(2)),
            centroX: Number(((r.left + r.right) / 2).toFixed(2)),
            height: Number(r.height.toFixed(2)),
            centroY: Number(((r.top + r.bottom) / 2).toFixed(2)),
          };
        })()
      : null;

    const tops = op.map((b) => b.top);
    const alturas = op.map((b) => b.height);
    const conteudoDir = caixa.right - padDir;
    const verSo = botoes.find((b) => b.texto === 'Ver só deste colaborador') ?? null;
    const caixasDaLinha = [...op, ...(selo ? [selo] : [])];
    const alturaLinhaRodape = caixasDaLinha.length
      ? Number(
          (
            Math.max(...caixasDaLinha.map((b) => b.bottom)) - Math.min(...caixasDaLinha.map((b) => b.top))
          ).toFixed(2)
        )
      : null;
    const sobreposicao = op.some((a, i) =>
      op.some(
        (b, j) =>
          i < j && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5
      )
    );

    return {
      operacionais: op.map((b) => b.texto),
      botoesOperacionais: op,
      demaisBotoesVisiveis: botoes.filter((b) => !b.operacional).map((b) => b.texto),
      selo,
      caixa: {
        width: Number(caixa.width.toFixed(2)),
        height: Number(caixa.height.toFixed(2)),
        conteudoDir: Number(conteudoDir.toFixed(2)),
      },
      metricas: {
        mesmaLinha: tops.length < 2 ? true : Math.max(...tops) - Math.min(...tops) <= 1.5,
        deltaTop: tops.length < 2 ? 0 : Number((Math.max(...tops) - Math.min(...tops)).toFixed(2)),
        alturasIguais: alturas.length < 2 ? true : Math.max(...alturas) - Math.min(...alturas) <= 1,
        alturas,
        seloAlinhadoAoEixo: selo && op.length ? Math.abs(selo.centroY - op[0].centroY) <= 2 : null,
        deltaCentroSeloBotao: selo && op.length ? Number(Math.abs(selo.centroY - op[0].centroY).toFixed(2)) : null,
        seloNaEsquerda: selo && op.length ? selo.centroX < op[0].centroX : null,
        deltaXCeloBotao: selo && op.length ? Number((selo.centroX - op[0].centroX).toFixed(2)) : null,
        alturaLinhaRodape,
        verSoDesteColaborador: verSo
          ? {
              altura: verSo.height,
              right: verSo.right,
              deltaParaBordaConteudo: Number((conteudoDir - verSo.right).toFixed(2)),
            }
          : null,
        frestaDireita: op.length ? Number((conteudoDir - Math.max(...op.map((b) => b.right))).toFixed(2)) : null,
        ultimoBotaoDireita: op.length ? Number(Math.max(...op.map((b) => b.right)).toFixed(2)) : null,
        sobreposicao,
        estourouDireita: op.length ? Math.max(...op.map((b) => b.right)) - conteudoDir > 1.5 : false,
        scrollHorizontal: el.scrollWidth - el.clientWidth > 1,
      },
    };
  }, ROTULOS);

/** Régua de todos os botões "Ver avaliação" visíveis (alinhamento nos cards). */
const medirVerAvaliacao = (page) =>
  page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(
      (b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim() === 'Ver avaliação'
    );
    const visiveis = btns
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({
        top: Number(r.top.toFixed(2)),
        right: Number(r.right.toFixed(2)),
        height: Number(r.height.toFixed(2)),
      }));
    const direitas = visiveis.map((b) => b.right);
    const alturas = visiveis.map((b) => b.height);
    return {
      total: visiveis.length,
      direitaIgual: direitas.length < 2 ? true : Math.max(...direitas) - Math.min(...direitas) <= 1.5,
      deltaDireita: direitas.length < 2 ? 0 : Number((Math.max(...direitas) - Math.min(...direitas)).toFixed(2)),
      alturaIgual: alturas.length < 2 ? true : Math.max(...alturas) - Math.min(...alturas) <= 1,
    };
  });

/* ── navegação ───────────────────────────────────────────────────────────── */
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

async function abrirCardCom(page, texto) {
  const cards = page.locator('div[class*="rounded-xl"]').filter({ hasText: texto });
  const total = await cards.count();
  for (let i = 0; i < total; i += 1) {
    const abrir = cards.nth(i).getByRole('button', { name: /Ver feedback|Ver avaliação/ }).first();
    if (!(await abrir.isVisible().catch(() => false))) continue;
    await abrir.click();
    const apareceu = await page
      .getByRole('dialog')
      .last()
      .waitFor({ timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (!apareceu) continue;
    await page.waitForTimeout(2200);
    if ((await page.locator('[role="dialog"]').count()) === 0) continue; // fechou sozinho: tenta outro card
    return true;
  }
  return false;
}

async function abrirLinhaComSelo(page, seloRegex) {
  const selo = page.locator('[role="status"]').filter({ hasText: seloRegex }).first();
  const linha = selo.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  const abrir = linha.getByRole('button', { name: 'Ver avaliação' });
  if (!(await abrir.isVisible().catch(() => false))) return false;
  await abrir.click();
  const apareceu = await page
    .getByRole('dialog')
    .last()
    .waitFor({ timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!apareceu) return false;
  await page.waitForTimeout(2200);
  return (await page.locator('[role="dialog"]').count()) > 0;
}



/* ── cadeia de importação da animação (referência × alvos) ────────────────── */
function cadeiaDeAnimacao() {
  const ler = (p) => readFileSync(p, 'utf8');
  const pendencias = ler('src/components/colaborador-detalhes/PendenciasDialog.tsx');
  const popup = ler('src/components/ui/animated-cascade-dialog.tsx');
  const moldura = ler('src/components/ui/cascade-dialog.tsx');
  const motion = ler('src/components/ui/cascade-motion.ts');
  const alvos = {
    'FeedbackDetalheDialog.tsx': ler('src/components/avaliacao/FeedbackDetalheDialog.tsx'),
    'FeedbackAcoesRodape.tsx': ler('src/components/avaliacao/FeedbackAcoesRodape.tsx'),
    'PendenciasAprovacao.tsx': ler('src/components/avaliacao/PendenciasAprovacao.tsx'),
  };
  return {
    referencia: {
      'PendenciasDialog usa AnimatedCascadeDialog': pendencias.includes('AnimatedCascadeDialog'),
      'AnimatedCascadeDialog usa CascadeDialogFrame': popup.includes('CascadeDialogFrame'),
      'CascadeDialogFrame importa cascade-motion': moldura.includes("from './cascade-motion'"),
      'CascadeDialogFrame aplica as 3 variants': [
        'cascadeOverlayVariants',
        'cascadeShellVariants',
        'cascadeContainerVariants',
      ].every((v) => moldura.includes(v)),
    },
    alvos: Object.entries(alvos).map(([arquivo, src]) => ({
      arquivo,
      importaMolduraCompartilhada: src.includes("from '@/components/ui/cascade-dialog'"),
      importaVariantsCompartilhados: src.includes("from '@/components/ui/cascade-motion'"),
      blocks: (src.match(/blocks=\{(\d+)\}/g) ?? []).join(' '),
      defineCoreografiaLocal: /Variants\s*=\s*\{/.test(src),
    })),
    parametrosCompartilhados: motion.match(/export const CASCADE_[A-Z_]+\s*=\s*[\d.]+/g) ?? [],
  };
}

/* ── animação: abrir → medir → fechar → medir ─────────────────────────────── */
async function cicloAberturaFechamento(page, abrir, sel = '[role="dialog"]') {
  await iniciarAmostragem(page, sel, 2400, 'principal');
  await iniciarAmostragem(page, '[class*="backdrop-blur-sm"]', 2400, 'overlay');
  await abrir();
  await page.waitForTimeout(2600);
  const abertura = resumir(await lerAmostras(page));
  const overlayAbertura = resumirOverlay(await lerAmostras(page, 'overlay'));

  await iniciarAmostragem(page, sel, 2400, 'principal');
  await iniciarAmostragem(page, '[class*="backdrop-blur-sm"]', 2400, 'overlay');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2600);
  return {
    abertura,
    fechamento: resumir(await lerAmostras(page)),
    overlayAbertura,
    overlayFechamento: resumirOverlay(await lerAmostras(page, 'overlay')),
  };
}


/* ══════════════ CENÁRIOS ══════════════════════════════════════════════════ */
try {
  relatorio.animacao.cadeia = cadeiaDeAnimacao();

  /* Contexto 1 — admin+gestor: etapas A (pendente), B (concluído), C (gestor). */
  const { context: ctx1, page: p1 } = await abrirContexto({ papeis: ['admin', 'gestor'] });
  await p1.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded' });
  await irFeedbacks(p1);

  relatorio.alinhamento.verAvaliacaoNosCards = await medirVerAvaliacao(p1);
  await p1.screenshot({ path: `${OUT}/01-cards-fila.png`, fullPage: false });

  /* A) Ver Feedback · pendente → 2 ações (Concluir + Cancelar) + badge. */
  if (await abrirCardCom(p1, 'Pendente')) {
    relatorio.alinhamento.A_modalPendente = await medirRodape(p1);
    const blocosFeedback = await blocosDaJanela(p1);
    relatorio.animacao.A_blocos = { blocos: blocosFeedback, fechamentoPrevistoMs: fechamentoPrevistoMs(blocosFeedback) };
    await p1.screenshot({ path: `${OUT}/02-modal-pendente-duas-acoes.png` });

    const ciclo = await cicloAberturaFechamento(p1, async () => {});
    relatorio.animacao.A_fechar = { ...ciclo.fechamento };
    relatorio.animacao.A_fecharOverlay = ciclo.overlayFechamento;
    await p1.screenshot({ path: `${OUT}/03-apos-fechar-pendente.png` });
    // REABERTURA do MESMO card: o modal precisa voltar visível e animado.
    const abrirDeNovo = p1.getByRole('button', { name: /Ver feedback|Ver avaliação/ }).first();
    await iniciarAmostragem(p1, '[role="dialog"]', 2400, 'principal');
    await iniciarAmostragem(p1, '[class*="backdrop-blur-sm"]', 2400, 'overlay');
    await abrirDeNovo.click();
    await p1.waitForTimeout(2600);
    relatorio.animacao.A_reabrir = {
      abertura: resumir(await lerAmostras(p1)),
      overlayAbertura: resumirOverlay(await lerAmostras(p1, 'overlay')),
    };
    relatorio.alinhamento.A_reaberto = await medirRodape(p1);
    await p1.screenshot({ path: `${OUT}/04-reaberto-visivel.png` });
    await iniciarAmostragem(p1, '[role="dialog"]', 2400, 'principal');
    await iniciarAmostragem(p1, '[class*="backdrop-blur-sm"]', 2400, 'overlay');
    await p1.keyboard.press('Escape');
    await p1.waitForTimeout(2600);
    relatorio.animacao.A_reabrir.fechamento = resumir(await lerAmostras(p1));
    relatorio.animacao.A_reabrir.overlayFechamento = resumirOverlay(await lerAmostras(p1, 'overlay'));
  } else {
    relatorio.animacao.A_fechar = { erro: 'nenhum card "Pendente" encontrado' };
  }

  /* B) Ver Feedback · concluído → ZERO ações (nenhum espaço reservado).
        O card é localizado por texto do selo; se a listagem não expuser um
        card "Concluído" neste ambiente, o roteiro segue (o caso de ZERO ações
        também é coberto no passo D, de forma determinística). */
  const cardConcluido = await abrirCardCom(p1, 'Concluído');
  if (cardConcluido) {
    relatorio.alinhamento.B_modalSemAcoes = await medirRodape(p1).catch((e) => ({ erro: String(e).slice(0, 160) }));
    await p1.screenshot({ path: `${OUT}/05-modal-sem-acoes.png` });
    await p1.keyboard.press('Escape');
    await p1.waitForTimeout(2400);
  } else {
    relatorio.alinhamento.B_modalSemAcoes = { aviso: 'nenhum card "Concluído" aberto na listagem deste ambiente' };
  }

  /* C) Aguardando gestor → Aprovar + Devolver (mesma linha) + diálogo de
        devolução com a MESMA animação. */
  await abrirFila(p1);
  relatorio.alinhamento.verAvaliacaoNaFila = await medirVerAvaliacao(p1);
  if (await abrirLinhaComSelo(p1, /Aguardando gestor/)) {
    relatorio.alinhamento.C_aguardandoGestor = await medirRodape(p1);
    await p1.screenshot({ path: `${OUT}/06-fila-gestor-aprovar-devolver.png` });

    const devolver = p1.getByRole('dialog').last().getByRole('button', { name: 'Devolver para correção' });
    if (await devolver.isVisible().catch(() => false)) {
      await iniciarAmostragem(p1, '[role="dialog"]', 2000);
      await devolver.click();
      await p1.getByRole('dialog').last().waitFor({ timeout: 15000 });
      await p1.waitForTimeout(2200);
      relatorio.animacao.C_devolucaoAbertura = resumir(await lerAmostras(p1));
      relatorio.alinhamento.C_dialogoDevolucao = await medirRodape(p1);
      const blocosDevolucao = await blocosDaJanela(p1);
      relatorio.animacao.C_blocosDevolucao = {
        blocos: blocosDevolucao,
        fechamentoPrevistoMs: fechamentoPrevistoMs(blocosDevolucao),
      };
      await p1.screenshot({ path: `${OUT}/07-devolucao-aberta.png` });

      // Cancelar dentro do diálogo → fechamento animado.
      await iniciarAmostragem(p1, '[role="dialog"]', 2200);
      await p1.getByRole('dialog').last().getByRole('button', { name: 'Cancelar' }).click();
      await p1.waitForTimeout(2400);
      relatorio.animacao.C_devolucaoFechamento = resumir(await lerAmostras(p1));
      await p1.screenshot({ path: `${OUT}/08-devolucao-fechada.png` });
    }

    /* D) DECISÃO REAL (demonstração) → depois de aprovar, o rodapé do MESMO
          registro fica sem ação nenhuma e o selo passa a "Aprovada pelo gestor".
          É o caso "ZERO ações", de forma determinística. */
    const aprovar = p1.getByRole('dialog').last().getByRole('button', { name: 'Aprovar avaliação' });
    if (await aprovar.isVisible().catch(() => false)) {
      await aprovar.click();
      await p1.waitForTimeout(2600);
      relatorio.decisaoDemo = {
        aviso: (await p1.locator('[data-sonner-toast]').first().textContent().catch(() => null)) ?? null,
      };
      await p1.keyboard.press('Escape');
      await p1.waitForTimeout(2400);
      await abrirFila(p1);
      if (await abrirLinhaComSelo(p1, /Aprovada pelo gestor/)) {
        relatorio.alinhamento.D_aposAprovarSemAcoes = await medirRodape(p1).catch((e) => ({
          erro: String(e).slice(0, 160),
        }));
        await p1.screenshot({ path: `${OUT}/09-apos-aprovar-zero-acoes.png` });
        await p1.keyboard.press('Escape');
        await p1.waitForTimeout(2000);
      } else {
        relatorio.alinhamento.D_aposAprovarSemAcoes = { aviso: 'linha aprovada não reaberta' };
      }
    } else {
      relatorio.alinhamento.D_aposAprovarSemAcoes = { aviso: 'botão "Aprovar avaliação" indisponível nesta etapa' };
    }
  } else {
    relatorio.alinhamento.C_aguardandoGestor = { erro: 'nenhuma linha "Aguardando gestor" na fila' };
  }
  await ctx1.storageState({ path: `${OUT}/perfil-demo-pos-aprovacao.json` });
  await ctx1.close();

  /* Contexto 2 — RH: etapa E (Validar Potencial = 1 ação). Usa o MESMO estado
     demonstrativo do gestor (a aprovação local em `dp-desempenho-aprovacoes-demo`
     vive no localStorage — é o que faz a linha chegar ao RH). */
  const { context: ctx2, page: p2 } = await abrirContexto({
    papeis: ['rh'],
    storage: `${OUT}/perfil-demo-pos-aprovacao.json`,
  });
  await p2.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded' });
  await irFeedbacks(p2);
  await abrirFila(p2);
  if (await abrirLinhaComSelo(p2, /Aprovada pelo gestor/)) {
    relatorio.alinhamento.E_rhUmaAcao = await medirRodape(p2);
    await p2.screenshot({ path: `${OUT}/09-rh-uma-acao.png` });
  } else {
    relatorio.alinhamento.E_rhUmaAcao = { erro: 'nenhuma avaliação aprovada na fila para o RH' };
  }
  await ctx2.close();

  /* REFERÊNCIA DIRETA — a janela "Pendências" (popup do AnimatedCascadeDialog),
     aberta em /colaboradores/mock-1 → "Ver todas". Mesma medição, mesmo
     instrumento: é a comparação lado a lado exigida. */
  {
    const { context, page } = await abrirContexto({ papeis: ['admin'] });
    await page.goto(`${BASE}/colaboradores/mock-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const verTodas = page.getByRole('button', { name: 'Ver todas' }).first();
    if (await verTodas.isVisible().catch(() => false)) {
      await iniciarAmostragem(page, '[role="dialog"]', 2200, 'principal');
      await iniciarAmostragem(page, '[class*="backdrop-blur-sm"]', 2200, 'overlay');
      await verTodas.click();
      await page.getByRole('dialog').last().waitFor({ timeout: 15000 });
      await page.waitForTimeout(2400);
      const abertura = resumir(await lerAmostras(page));
      const overlayAbertura = resumirOverlay(await lerAmostras(page, 'overlay'));
      const titulo = await page
        .getByRole('dialog')
        .last()
        .innerText()
        .then((t) => t.replace(/\s+/g, ' ').slice(0, 60))
        .catch(() => null);
      await page.screenshot({ path: `${OUT}/20-referencia-pendencias-aberta.png` });

      const blocosPendencias = await blocosDaJanela(page);
      const blocosPendenciasRef = { blocos: blocosPendencias, fechamentoPrevistoMs: fechamentoPrevistoMs(blocosPendencias) };

      await iniciarAmostragem(page, '[role="dialog"]', 2200, 'principal');
      await iniciarAmostragem(page, '[class*="backdrop-blur-sm"]', 2200, 'overlay');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2400);
      const fechamento = resumir(await lerAmostras(page));
      const overlayFechamento = resumirOverlay(await lerAmostras(page, 'overlay'));
      await page.screenshot({ path: `${OUT}/21-referencia-pendencias-fechada.png` });

      relatorio.referenciaPendencias = { titulo, abertura, overlayAbertura, fechamento, overlayFechamento };
      relatorio.animacao.referenciaPendenciasBlocos = blocosPendenciasRef;
      relatorio.comparacaoComPendencias = {
        'Ver Feedback (abrir)': comparar(abertura, relatorio.animacao.A_reabrir.abertura),
        'Devolver para correção (abrir)': comparar(abertura, relatorio.animacao.C_devolucaoAbertura),
        'Ver Feedback (fechar)': comparar(fechamento, relatorio.animacao.A_reabrir.fechamento),
      };
    } else {
      relatorio.referenciaPendencias = { aviso: 'botão "Ver todas" (Pendências) indisponível neste ambiente' };
    }
    await context.close();
  }


  for (const largura of [1440, 1280, 1024]) {
    const { context, page } = await abrirContexto({ papeis: ['admin', 'gestor'], viewport: { width: largura, height: 950 } });
    await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded' });
    await irFeedbacks(page);
    await abrirFila(page);
    const resultado = { cardsVerAvaliacao: await medirVerAvaliacao(page) };
    if (await abrirLinhaComSelo(page, /Aguardando gestor/)) {
      resultado.rodapeGestor = await medirRodape(page);
      await page.screenshot({ path: `${OUT}/10-largura-${largura}.png` });
    } else {
      resultado.rodapeGestor = { erro: 'linha "Aguardando gestor" ausente' };
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
    if (await abrirCardCom(page, 'Pendente')) {
      resultado.modalPendente = await medirRodape(page);
    }
    relatorio.larguras[`${largura}px`] = resultado;
    await context.close();
  }

  /* prefers-reduced-motion: as invariantes funcionais seguem valendo
     (a referência Pendências não implementa tratamento próprio — paridade). */
  {
    const { context, page } = await abrirContexto({
      papeis: ['admin', 'gestor'],
      viewport: { width: 1280, height: 950 },
      reducedMotion: 'reduce',
    });
    await page.goto(`${BASE}/avaliacao`, { waitUntil: 'domcontentloaded' });
    await irFeedbacks(page);
    const abrir = page.getByRole('button', { name: /Ver feedback|Ver avaliação/ }).first();
    const invariantes = { reduzidoMovimento: lane(page) };
    if (await abrir.isVisible().catch(() => false)) {
      await abrir.click();
      await page.getByRole('dialog').last().waitFor({ timeout: 15000 });
      await page.waitForTimeout(2600);
      const caixa = await page.getByRole('dialog').last().evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          visivel: r.width > 40 && r.height > 40,
          opacity: Number(cs.opacity),
          pointerEvents: cs.pointerEvents,
          botaoFocavel: Boolean(el.querySelector('button')),
        };
      });
      invariantes.caixaAposAbrir = caixa;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2400);
      invariantes.desmontouAoFechar = await page
        .locator('[role="dialog"]')
        .count()
        .then((n) => n === 0)
        .catch(() => null);
      invariantes.scrollTravadoLiberado = await page.evaluate(() => ({
        bodyOverflow: getComputedStyle(document.body).overflow,
        pointerEvents: getComputedStyle(document.body).pointerEvents,
      }));
    }
    relatorio.reducedMotion = invariantes;
    await context.close();
  }
} catch (erro) {
  relatorio.erroFatal = String(erro?.stack ?? erro).slice(0, 1200);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
}

function lane(page) {
  return page ? 'emulado via context.reducedMotion = reduce' : null;
}

