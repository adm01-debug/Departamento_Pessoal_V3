/**
 * TEMPORÁRIO — PROVA de qual código está sendo renderizado no Hub de Premiações.
 *
 * Roda contra o dev server (Vite, porta 8080) e reporta:
 *  · o módulo real servido para a rota (`/src/pages/PremiacoesPage.tsx`);
 *  · a marca temporária `data-teste-visual` + o `outline` fúcsia (alteração de teste);
 *  · strings da tela ANTIGA (imagem 1) e da tela NOVA;
 *  · alturas medidas de navegação/indicadores/filtros/tabela/linhas.
 * Uso: node scripts/_tmp-prova-visual-premiacoes.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';

const PORTA = 8080;
const URL = `http://localhost:${PORTA}/premiacoes`;

/** Sobe o Vite apenas se a porta ainda não estiver servindo. */
let servidor = null;
async function portaAtiva() {
  try {
    const r = await fetch(URL, { redirect: 'manual' });
    return r.status < 500;
  } catch {
    return false;
  }
}

if (!(await portaAtiva())) {
  servidor = spawn('cmd.exe', ['/c', `npx vite --port ${PORTA} --strictPort`], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  servidor.stdout.on('data', () => {});
  servidor.stderr.on('data', () => {});
}

async function pronto() {
  for (let i = 0; i < 90; i++) {
    if (await portaAtiva()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const saida = { servidorIniciadoPorMim: Boolean(servidor), distExiste: existsSync('dist') };
let browser;

try {
  if (!(await pronto())) throw new Error('vite não subiu em 90s');

  browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 816 },
  });
  const page = await context.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 250)));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text().slice(0, 160)}`);
  });
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: 'tmp-prova-visual.png', fullPage: false });

  const dados = await page.evaluate(() => {
    const texto = document.body.innerText ?? '';
    const marcador = document.querySelector('[data-teste-visual="hub-visual-probe"]');
    const estilos = marcador ? getComputedStyle(marcador) : null;
    const modulos = performance
      .getEntriesByType('resource')
      .map((r) => r.name)
      .filter((n) => /pages\/PremiacoesPage|components\/premiacoes\//.test(n));
    const rect = (el) => (el ? Math.round(el.getBoundingClientRect().height) : 0);
    const topo = (el) => (el ? Math.round(el.getBoundingClientRect().top) : 0);
    const grid = document.querySelector('[role="tablist"]')?.parentElement?.nextElementSibling;
    return {
      urlDaPagina: location.href,
      titulo: document.title,
      modulosServidos: modulos.slice(0, 6),
      marcadorPresente: Boolean(marcador),
      outlineCalculado: estilos ? `${estilos.outlineWidth} ${estilos.outlineColor} ${estilos.outlineStyle}` : null,
      stringsAntigas: {
        'Impactando 85% do time': texto.includes('Impactando 85% do time'),
        'Aguardando revisao manual': texto.includes('Aguardando revisão manual'),
        'PENDENTE (CALCULADO)': texto.includes('PENDENTE (CALCULADO)'),
        'Progresso do Orçamento': texto.includes('Progresso do Orçamento'),
        'Gerenciar Regras': texto.includes('Gerenciar Regras'),
        'vs mês anterior (hardcoded)': texto.includes('+12% vs mês anterior'),
      },
      stringsNovas: {
        'Próximas ações (caixa alta no h3)': /PRÓXIMAS AÇÕES/i.test(texto),
        'Atividade recente': /ATIVIDADE RECENTE/i.test(texto),
        'Visão geral': texto.includes('Visão geral'),
        'Mostrando X de Y': /Mostrando \d+ de \d+ campanhas?/.test(texto),
      },
      medidas: {
        navegacao: rect(document.querySelector('[role="tablist"]')),
        indicadores: rect(grid),
        filtros: rect(document.querySelector('input[aria-label="Buscar campanhas"]')?.closest('div.flex-wrap')),
        topoTabela: topo(document.querySelector('section table')?.closest('section')),
        thead: rect(document.querySelector('section thead tr')),
        linha: rect(document.querySelector('section tbody tr')),
        painelAtividadeTopo: topo(
          Array.from(document.querySelectorAll('h3')).find((h) => h.textContent?.includes('Atividade recente'))
            ?.closest('section'),
        ),
      },
      cartoesIndicador: document.querySelectorAll('div.grid > div.rounded-xl.border').length,
      errosDeConsole: [],
    };
  });

  saida.prova = dados;
  saida.errosDeConsole = erros.filter((e) => !/403|Failed to load resource/.test(e)).slice(0, 5);
  writeFileSync('tmp-prova-visual.json', JSON.stringify(saida, null, 2));
  console.log(JSON.stringify(saida, null, 2));
} finally {
  if (browser) await browser.close();
  // O servidor só é encerrado se EU o iniciei (não encerrar processo do usuário).
  if (servidor) {
    try {
      execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      /* já encerrado */
    }
  }
}
