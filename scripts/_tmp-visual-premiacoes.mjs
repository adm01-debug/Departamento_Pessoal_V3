/**
 * TEMPORÁRIO — validação visual do Hub de Premiações.
 * Sobe o Vite, captura desktop/estreito e testa busca, filtros, paginação e abas.
 * Uso: node scripts/_tmp-visual-premiacoes.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';

const PORTA = 8080;
const URL = `http://localhost:${PORTA}/premiacoes`;

/** Reaproveita um servidor já ativo na porta (não duplica nem encerra o do usuário). */
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
  : spawn('cmd.exe', ['/c', `npx vite --port ${PORTA} --strictPort`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
if (servidor) {
  servidor.stdout.on('data', () => {});
  servidor.stderr.on('data', () => {});
}

async function servidorPronto() {
  for (let i = 0; i < 90; i++) {
    if (await portaAtiva()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const resultados = [];
let browser;

try {
  if (!(await servidorPronto())) throw new Error('servidor Vite não ficou pronto');

  browser = await chromium.launch();

  async function capturar({ nome, largura, altura, interacoes, telaCheia = true }) {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
      viewport: { width: largura, height: altura },
    });
    const page = await context.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 300)));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(`console: ${m.text().slice(0, 200)}`);
    });
    await page.addInitScript(() => {
      localStorage.setItem('ui-theme', 'dark');
      localStorage.setItem('dp-tour-completed', 'true');
    });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    if (interacoes) await interacoes(page).catch((e) => erros.push(`interacao: ${e.message}`));

    await page.screenshot({ path: `tmp-premiacoes-${nome}.png`, fullPage: telaCheia });

    const info = await page.evaluate(() => ({
      abas: Array.from(document.querySelectorAll('[role="tab"]')).map((t) => (t.textContent ?? '').trim()),
      indicadores: Array.from(document.querySelectorAll('p'))
        .map((p) => (p.textContent ?? '').trim())
        .filter((t) => /TOTAL APROVADO|PENDENTE DE APROVAÇÃO|CAMPANHAS ATIVAS|CONCILIAÇÃO|Visão geral/.test(t)),
      colunas: Array.from(document.querySelectorAll('thead th')).map((t) => (t.textContent ?? '').trim()),
      linhas: Array.from(document.querySelectorAll('tbody tr')).map((t) =>
        (t.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
      ),
      rodape: Array.from(document.querySelectorAll('p'))
        .map((p) => (p.textContent ?? '').trim())
        .filter((t) => /Mostrando/.test(t)),
      // Altura da faixa de filtros e da navegação (medidas de referência).
      alturas: {
        navegacao: Math.round(document.querySelector('[role="tablist"]')?.getBoundingClientRect().height ?? 0),
        filtros: Math.round(
          document.querySelector('input[aria-label="Buscar campanhas"]')?.closest('div.flex-wrap')
            ?.getBoundingClientRect().height ?? 0,
        ),
        indicadores: Math.round(
          document.querySelector('[role="tablist"]')?.parentElement?.nextElementSibling
            ?.getBoundingClientRect().height ?? 0,
        ),
        tabela: Math.round(document.querySelector('section table')?.closest('section')?.getBoundingClientRect().top ?? 0),
        linha: Math.round(document.querySelector('section tbody tr')?.getBoundingClientRect().height ?? 0),
        thead: Math.round(document.querySelector('section thead tr')?.getBoundingClientRect().height ?? 0),
      },
      paineis: Array.from(document.querySelectorAll('h3')).map((h) => (h.textContent ?? '').trim()),
      larguraTabela: document.querySelector('section table')?.getBoundingClientRect().width ?? 0,
      // O cabeçalho "Ações" precisa caber dentro da área rolável da tabela.
      acoesVisivel: (() => {
        const scroller = document.querySelector('section .overflow-x-auto');
        const th = Array.from(document.querySelectorAll('thead th')).pop();
        if (!scroller || !th) return null;
        const scrollerRect = scroller.getBoundingClientRect();
        const thRect = th.getBoundingClientRect();
        return {
          sobra: Math.round(scrollerRect.right - thRect.right),
          colunas: Array.from(document.querySelectorAll('thead th')).map((el) => Math.round(el.getBoundingClientRect().width)),
        };
      })(),
      larguraPagina: document.documentElement.clientWidth,
      rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));

    resultados.push({ nome, largura, erros: erros.slice(0, 5), ...info });
    await context.close();
  }

  await capturar({ nome: 'desktop', largura: 1440, altura: 1100 });

  // Mesma viewport da imagem de referência do usuário (recorte da tela, sem fullPage).
  await capturar({ nome: 'view-ref', largura: 1456, altura: 816, telaCheia: false });

  await capturar({
    nome: 'busca',
    largura: 1440,
    altura: 1100,
    interacoes: async (page) => {
      await page.getByLabel('Buscar campanhas').fill('Bônus');
      await page.waitForTimeout(600);
    },
  });

  await capturar({
    nome: 'filtro-rascunho',
    largura: 1440,
    altura: 1100,
    interacoes: async (page) => {
      await page.getByRole('button', { name: /Rascunhos/ }).click();
      await page.waitForTimeout(600);
    },
  });

  await capturar({
    nome: 'detalhe',
    largura: 1440,
    altura: 1100,
    interacoes: async (page) => {
      await page.getByRole('button', { name: /Ver campanha|Ver resultados|Revisar campanha/ }).first().click();
      await page.getByRole('dialog').waitFor({ timeout: 10000 });
      await page.waitForTimeout(500);
    },
  });

  await capturar({
    nome: 'pagamentos',
    largura: 1440,
    altura: 1100,
    interacoes: async (page) => {
      await page.getByRole('tab', { name: /Pagamentos/ }).click();
      await page.waitForTimeout(1200);
    },
  });

  await capturar({
    nome: 'simulador',
    largura: 1440,
    altura: 1100,
    interacoes: async (page) => {
      await page.getByRole('tab', { name: /Simulador ROI/ }).click();
      await page.waitForTimeout(1500);
    },
  });

  await capturar({
    nome: 'auditoria',
    largura: 1440,
    altura: 1100,
    interacoes: async (page) => {
      await page.getByRole('tab', { name: /Auditoria/ }).click();
      await page.waitForTimeout(800);
    },
  });

  await capturar({ nome: 'estreito', largura: 1024, altura: 1000 });

  console.log(JSON.stringify(resultados, null, 2));
} finally {
  if (browser) await browser.close();
  // Só encerra o servidor se ESTE script o tiver iniciado.
  if (servidor) {
    try {
      execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* já encerrado */
    }
  }
}
