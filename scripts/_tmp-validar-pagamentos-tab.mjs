/**
 * TEMPORÁRIO — validação da aba PAGAMENTOS redesenhada (IMAGEM 4).
 *
 * Sobe o Vite (ou reaproveita a porta 8080), abre /premiacoes na aba Pagamentos e
 * confere, no DOM real:
 *   1. composição (cabeçalho, 4 indicadores, fluxo, filtros, tabela, laterais);
 *   2. contagens do fluxo x contagens reais por status;
 *   3. filtros (busca, etapa pelo fluxo, campanha, status, período, ordenação);
 *   4. ações reais (Revisar/Aprovar/Rejeitar/Conciliar/Auto-conciliar/Reiniciar);
 *   5. diálogos (confirmação, conciliação e detalhes) e o guard do mock;
 *   6. seleção em lote e navegação lateral (Próximas ações e "Ver todas");
 *   7. responsividade (1456 / 1024 / 390) e ausência de erros de console.
 *
 * Uso: node scripts/_tmp-validar-pagamentos-tab.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORTA = 8080;
const URL = `http://localhost:${PORTA}/premiacoes`;
const SAIDA = 'tmp-pagamentos-tab';
mkdirSync(SAIDA, { recursive: true });

async function portaAtiva() {
  try {
    const r = await fetch(URL, { redirect: 'manual' });
    return r.status < 500;
  } catch {
    return false;
  }
}

const jaServindo = await portaAtiva();
const servidor = jaServindo
  ? null
  : spawn('cmd.exe', ['/c', `npx vite --port ${PORTA} --strictPort`], { stdio: 'ignore', windowsHide: true });

async function servidorPronto() {
  for (let i = 0; i < 90; i++) {
    if (await portaAtiva()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/** Tudo o que o DOM expõe da aba (para comparar com as derivações puras). */
const LER_ABA = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const ind = (titulo) => {
    const p = Array.from(document.querySelectorAll('p')).find((x) => texto(x) === titulo);
    const card = p?.closest('div.flex.items-center');
    return card ? texto(card) : null;
  };
  const tabela = document.querySelector('table');
  const linhas = Array.from(tabela?.querySelectorAll('tbody tr') ?? []);
  return {
    titulo: texto(Array.from(document.querySelectorAll('h2')).find((h) => /Pagamentos & Premiações/.test(texto(h)))),
    subtituloPresente: !!Array.from(document.querySelectorAll('p')).find((p) =>
      /Controle de valores, aprovações, repasses/.test(texto(p)),
    ),
    periodoChip: texto(Array.from(document.querySelectorAll('span')).find((s) => texto(s) === 'Período')),
    cicloChip: texto(Array.from(document.querySelectorAll('span')).find((s) => /Ciclo de Pagamento/.test(texto(s)))),
    kpis: {
      totalAprovado: ind('Total Aprovado'),
      aguardando: ind('Aguardando Aprovação'),
      divergencias: ind('Divergências Identificadas'),
      pago: ind('Total Pago no Período'),
    },
    fluxo: Array.from(document.querySelectorAll('ol > li button')).map(texto),
    foraDoFluxo: texto(Array.from(document.querySelectorAll('p')).find((p) => /fora do fluxo/.test(texto(p)))),
    filtros: Array.from(document.querySelectorAll('input, [role="combobox"]')).map(
      (el) => el.getAttribute('aria-label') ?? el.getAttribute('placeholder'),
    ),
    colunas: Array.from(tabela?.querySelectorAll('thead th') ?? []).map(texto),
    linhas: linhas.map((tr) =>
      Array.from(tr.querySelectorAll('td')).map(texto).filter(Boolean).join(' | '),
    ),
    acoesNasLinhas: linhas.map((tr) => texto(tr.querySelector('td:last-child button'))),
    rodape: texto(Array.from(document.querySelectorAll('p')).find((p) => /Mostrando/.test(texto(p)))),
    laterais: Array.from(document.querySelectorAll('h2, h3'))
      .map(texto)
      .filter((t) => /Resumo Financeiro|Próximas ações|Atividade recente/.test(t)),
    legendaResumo: Array.from(document.querySelectorAll('div.mt-3.space-y-1\\.5 > div')).map(texto),
    proximasAcoes: Array.from(document.querySelectorAll('section li button')).map(texto).filter(Boolean),
    rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
};

let browser;
const resultados = {};

try {
  if (!(await servidorPronto())) throw new Error('servidor Vite não ficou pronto');
  browser = await chromium.launch();

  async function abrir(largura = 1456, altura = 900) {
    const contexto = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
      viewport: { width: largura, height: altura },
    });
    const page = await contexto.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(`console: ${m.text().slice(0, 160)}`);
    });
    await page.addInitScript(() => {
      localStorage.setItem('ui-theme', 'dark');
      localStorage.setItem('dp-tour-completed', 'true');
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
    await page.getByRole('tab', { name: /Pagamentos/ }).click();
    await page.getByRole('heading', { name: /Pagamentos & Premiações/ }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(2200); // cascata do hub (0.55s + 0,10s por índice)
    return { contexto, page, erros };
  }

  /* ── 1 · Composição + fluxo + busca + ações + diálogos (desktop) ────────── */
  {
    const { contexto, page, erros } = await abrir(1456, 1000);
    const falhas = [];
    const tentar = async (nome, fn) => {
      try {
        await fn();
      } catch (e) {
        falhas.push(`${nome}: ${String(e.message).split('\n')[0].slice(0, 160)}`);
      }
    };
    let depoisFluxo = null;
    let depoisBusca = null;
    let dialogoAprovacao = '';
    let dialogoRejeicao = '';
    let toastMock = '';
    let dialogoConciliacao = '';
    let dialogoDetalhes = '';
    let barraLote = false;
    let depoisOrdem = null;
    let periodoSelecionado = [];
    let acaoTexto = '';
    let depoisAcaoLateral = null;
    let abaAuditoriaAtiva = null;
    const antes = await page.evaluate(LER_ABA);
    await page.screenshot({ path: `${SAIDA}/desktop-1456.png` });
    await page.screenshot({ path: `${SAIDA}/desktop-1456-full.png`, fullPage: true });

    // 2 · O fluxo filtra a tabela
    await tentar('fluxo-filtra', async () => {
      await page.getByRole('button', { name: /Em aprovação/ }).first().click();
      await page.waitForTimeout(500);
      depoisFluxo = await page.evaluate(LER_ABA);
      await page.getByRole('button', { name: /Limpar etapa/ }).click();
      await page.waitForTimeout(400);
    });

    // 3 · Busca
    await tentar('busca', async () => {
      await page.getByLabel('Buscar pagamentos').fill('juliana');
      await page.waitForTimeout(500);
      depoisBusca = await page.evaluate(LER_ABA);
      await page.getByLabel('Buscar pagamentos').fill('');
      await page.waitForTimeout(400);
    });

    // 4 · Ação principal (Revisar) → diálogo de confirmação
    const linhaCalculado = page.locator('tbody tr').filter({ hasText: 'Aguardando gestor' }).first();
    await tentar('aprovar', async () => {
      await linhaCalculado.getByRole('button', { name: 'Revisar' }).click();
      await page.waitForTimeout(500);
      dialogoAprovacao = await page.getByRole('dialog').innerText();
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await page.waitForTimeout(400);
    });

    // 5 · Rejeitar pelo menu de contexto
    await tentar('rejeitar', async () => {
      await linhaCalculado.getByRole('button', { name: /Mais ações/ }).click();
      await page.getByRole('menuitem', { name: /Rejeitar pagamento/ }).click();
      await page.waitForTimeout(500);
      dialogoRejeicao = await page.getByRole('dialog').innerText();
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await page.waitForTimeout(400);
    });

    // 6 · Auto-conciliação (o modo demonstração bloqueia a escrita)
    const linhaDivergente = page.locator('tbody tr').filter({ hasText: 'Divergência' }).first();
    await tentar('auto-conciliar', async () => {
      await linhaDivergente.getByRole('button', { name: /Mais ações/ }).click();
      await page.getByRole('menuitem', { name: /Conciliação automática/ }).click();
      await page.waitForTimeout(900);
      toastMock = await page.locator('[data-sonner-toast]').first().innerText();
    });

    // 7 · Conciliação manual (a ação do estágio do financeiro é "Conciliar";
    //     numa divergência já em revisão o rótulo é "Resolver" — aceita os dois)
    await tentar('conciliar', async () => {
      await linhaDivergente.getByRole('button', { name: /Conciliar|Resolver/ }).click();
      await page.waitForTimeout(500);
      dialogoConciliacao = await page.getByRole('dialog').innerText();
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await page.waitForTimeout(400);
    });

    // 8 · Detalhes (leitura) numa linha conciliada
    await tentar('detalhes', async () => {
      const linhaPaga = page.locator('tbody tr').filter({ hasText: 'Pago' }).first();
      await linhaPaga.getByRole('button', { name: /Ver detalhes/ }).click();
      await page.waitForTimeout(500);
      dialogoDetalhes = await page.getByRole('dialog').innerText();
      await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();
      await page.waitForTimeout(600);
    });

    // 9 · Seleção em lote
    await tentar('selecao-lote', async () => {
      await page.getByRole('checkbox', { name: 'Selecionar todos os pagamentos da página' }).click();
      await page.waitForTimeout(400);
      barraLote = (await page.getByText(/pagamentos selecionados/).count()) > 0;
      await page.getByRole('button', { name: 'Limpar' }).click();
      await page.waitForTimeout(300);
    });

    // 10 · Ordenação
    await tentar('ordenacao', async () => {
      await page.getByLabel('Ordenar por').click();
      await page.getByRole('option', { name: 'Maior valor' }).click();
      await page.waitForTimeout(500);
      depoisOrdem = await page.evaluate(LER_ABA);
    });

    // 11 · Opções REAIS de período
    await tentar('periodo', async () => {
      await page.getByLabel('Período').click();
      await page.waitForTimeout(500);
      periodoSelecionado = await page
        .locator('[role="option"]')
        .allInnerTexts();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    });

    // 12 · Lateral: "Próximas ações" filtra e "Ver todas" vai para a Auditoria
    await tentar('acao-lateral', async () => {
      const acaoLateral = page.locator('section').filter({ hasText: 'Próximas ações' }).locator('li button').first();
      acaoTexto = (await acaoLateral.innerText()).replace(/\s+/g, ' ').trim();
      await acaoLateral.click();
      await page.waitForTimeout(500);
      depoisAcaoLateral = await page.evaluate(LER_ABA);
    });

    await tentar('ver-todas', async () => {
      await page.getByRole('button', { name: 'Ver todas' }).click();
      await page.waitForTimeout(600);
      abaAuditoriaAtiva = await page.getByRole('tab', { name: /Auditoria/ }).getAttribute('aria-selected');
    });

    resultados.desktop = {
      erros,
      falhas,
      antes,
      depoisFluxo,
      depoisBusca,
      depoisOrdem,
      periodoSelecionado,
      dialogoAprovacao,
      dialogoRejeicao,
      dialogoConciliacao,
      dialogoDetalhes,
      toastMock,
      barraLote,
      acaoTexto,
      depoisAcaoLateral,
      abaAuditoriaAtiva,
    };
    await contexto.close();
  }

  /* ── 13 · Responsividade ────────────────────────────────────────────────── */
  for (const [nome, largura, altura] of [
    ['tablet-1024', 1024, 1000],
    ['mobile-390', 390, 900],
  ]) {
    const { contexto, page, erros } = await abrir(largura, altura);
    await page.screenshot({ path: `${SAIDA}/${nome}.png` });
    resultados[nome] = { erros, aba: await page.evaluate(LER_ABA) };
    await contexto.close();
  }

  writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
  console.log(JSON.stringify(resultados, null, 2));
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
