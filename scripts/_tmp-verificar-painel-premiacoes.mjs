/**
 * TEMPORÁRIO — conferência da coluna lateral do Hub de Premiações depois de
 * animar os registros de "Atividade recente" e o link "Ver todas".
 *
 * Mede as caixas (título × link × registros) para provar que o LAYOUT não mudou
 * (mesma linha do cabeçalho, botão colado à direita, itens com a mesma altura),
 * tira um print da coluna e confere que os links continuam funcionando.
 *
 * Uso: node scripts/_tmp-verificar-painel-premiacoes.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORTA = 8080;
const URL = `http://localhost:${PORTA}/premiacoes`;
const SAIDA = 'tmp-entrada-premiacoes';

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

let browser;
try {
  if (!(await servidorPronto())) throw new Error('servidor Vite não ficou pronto');
  browser = await chromium.launch();

  for (const largura of [1456, 1024]) {
    const contexto = await browser.newContext({
      storageState: 'e2e/.auth/user.json',
      viewport: { width: largura, height: 900 },
    });
    const page = await contexto.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));
    await page.addInitScript(() => {
      localStorage.setItem('ui-theme', 'dark');
      localStorage.setItem('dp-tour-completed', 'true');
    });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2500);

    const medida = await page.evaluate(() => {
      const cx = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      };
      const painel = (titulo) => [...document.querySelectorAll('h3')].find((h) => (h.textContent || '').includes(titulo));
      const h3Ativ = painel('Atividade recente');
      const secaoAtiv = h3Ativ?.closest('section');
      const h3Acoes = painel('Próximas ações');
      const secaoAcoes = h3Acoes?.closest('section');
      const botao = (txt) => [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === txt);
      return {
        acoes: { secao: cx(secaoAcoes), titulo: cx(h3Acoes), itens: [...(secaoAcoes?.querySelectorAll('li') ?? [])].map(cx) },
        atividade: {
          secao: cx(secaoAtiv),
          titulo: cx(h3Ativ),
          verTodas: cx(botao('Ver todas')),
          itens: [...(secaoAtiv?.querySelectorAll('li') ?? [])].map(cx),
        },
        acoesVerTodas: cx(botao('Ver todas as ações')),
        kpi: cx(
          [...document.querySelectorAll('p')]
            .find((p) => (p.textContent || '').trim() === 'Total Aprovado')
            ?.closest('.grid')?.firstElementChild,
        ),
        tabela: cx(document.querySelector('table')),
      };
    });

    // Print da coluna lateral (recorte da região direita da página).
    await page.screenshot({
      path: `${SAIDA}/painel-lateral-${largura}.png`,
      clip: { x: largura - 320, y: 300, width: 310, height: 600 },
    });

    // O link "Ver todas" continua levando à aba Auditoria.
    await page.getByRole('button', { name: 'Ver todas', exact: true }).click();
    await page.waitForTimeout(500);
    const abaAuditoriaSelecionada = await page
      .getByRole('tab', { name: /Auditoria/ })
      .getAttribute('aria-selected');

    // "Ver todas as ações" continua abrindo a janela da lista completa.
    await page.getByRole('tab', { name: /Campanhas/ }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /Ver todas as ações/ }).click();
    await page.getByRole('dialog').waitFor({ timeout: 8000 });
    const tituloJanela = await page.getByRole('dialog').getByText('Próximas ações').first().textContent();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    const janelaFechou = (await page.getByRole('dialog').count()) === 0;

    const linha = (r) => `${r.x},${r.y} ${r.w}×${r.h}`;
    const mesmaLinha =
      medida.atividade.titulo && medida.atividade.verTodas
        ? Math.abs(medida.atividade.titulo.y - medida.atividade.verTodas.y)
        : null;
    const alturasItens = medida.atividade.itens.map((i) => i.h);
    const passoItens = medida.atividade.itens.slice(1).map((i, k) => i.y - medida.atividade.itens[k].y);

    console.log(`\n=== ${largura}px ===`);
    console.log(`painel Próximas ações   ${linha(medida.acoes.secao)}  itens=${medida.acoes.itens.length} alturas=[${medida.acoes.itens.map((i) => i.h)}]`);
    console.log(`painel Atividade rec.  ${linha(medida.atividade.secao)}  itens=${medida.atividade.itens.length} alturas=[${alturasItens}] passo=[${passoItens}]`);
    console.log(`título "${linha(medida.atividade.titulo)}" × link "Ver todas" ${linha(medida.atividade.verTodas)} → mesma linha (Δy=${mesmaLinha}px)`);
    console.log(`link "Ver todas as ações" ${linha(medida.acoesVerTodas)}`);
    console.log(`KPI 1 ${linha(medida.kpi)} | tabela ${linha(medida.tabela)}`);
    console.log(
      `aba Auditoria após "Ver todas": ${abaAuditoriaSelecionada} | janela "${String(tituloJanela).trim()}" fechou com Esc: ${janelaFechou} | erros: ${erros.length}`,
    );
    if (erros.length) console.log(erros.slice(0, 3));

    await contexto.close();
  }
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
