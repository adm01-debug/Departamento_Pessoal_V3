/**
 * PROVA DETERMINÍSTICA DA AUTO-CURA (dev server ativo em 8080).
 *
 * Envenena o Cache Storage da origem (é o que faz o navegador servir bundle
 * antigo), recarrega e verifica se o `main.tsx` (DEV):
 *   · apagou os caches,
 *   · recarregou a página UMA única vez,
 *   · e deixou na tela a versão CORRIGIDA servida pelo dev server.
 *
 * Uso: node scripts/_tmp-prova-autocura-sw.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';
const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
const printFinal = `tmp-autocura-final-${carimbo}.png`;

const browser = await chromium.launch();
const saida = { url: URL, printFinal };

try {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 816 },
  });
  const page = await context.newPage();
  const navegacoes = [];
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) navegacoes.push(`${navegacoes.length + 1}) ${f.url()}`);
  });
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));

  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });

  // 1) carga inicial no dev server
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);

  // 2) envenena o cache da origem (estado que produz "tela antiga")
  saida.estadoEnvenenado = await page.evaluate(async () => {
    sessionStorage.removeItem('dp-sw-cleanup-reload');
    const cache = await caches.open('precache-antigo');
    await cache.put(
      '/premiacoes',
      new Response('<!doctype html><html><body><h1>TELA ANTIGA (bundle em cache)</h1></body></html>', {
        headers: { 'content-type': 'text/html' },
      }),
    );
    return { caches: await caches.keys(), registrosDeSw: (await navigator.serviceWorker.getRegistrations()).length };
  });

  // 3) "próxima visita": a auto-cura deve limpar e recarregar UMA vez
  navegacoes.length = 0;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);

  saida.depoisDaRecarga = await page.evaluate(async () => {
    const texto = document.body.innerText ?? '';
    const rect = (el) => (el ? Math.round(el.getBoundingClientRect().height) : 0);
    const tablist = document.querySelector('[role="tablist"]');
    return {
      cachesRestantes: await caches.keys(),
      registrosDeSw: (await navigator.serviceWorker.getRegistrations()).length,
      flagDeAutocura: sessionStorage.getItem('dp-sw-cleanup-reload'),
      telaCorrigida: /PRÓXIMAS AÇÕES/i.test(texto) && !/Progresso do Orçamento/.test(texto),
      medidas: {
        navegacao: rect(tablist),
        indicadores: rect(tablist?.parentElement?.nextElementSibling),
        topoTabela: Math.round(document.querySelector('section')?.getBoundingClientRect().top ?? -1),
      },
      linhas: document.querySelectorAll('section tbody tr').length,
      rodape: document.querySelector('section footer')?.textContent?.trim() ?? null,
    };
  });
  saida.navegacoesObservadas = navegacoes;
  saida.errosJs = erros;

  await page.screenshot({ path: printFinal, fullPage: false });

  writeFileSync('tmp-autocura.json', JSON.stringify(saida, null, 2));
  console.log(JSON.stringify(saida, null, 2));
} finally {
  await browser.close();
}
