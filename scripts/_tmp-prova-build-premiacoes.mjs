/**
 * TEMPORÁRIO — PROVA no BUILD (não no dev): abre o app compilado servido por
 * `vite preview` na porta 8080, mede e tira print do Hub de Premiações.
 * Uso: node scripts/_tmp-prova-build-premiacoes.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';

const papeis = ['NOVO-BUILD'];
const saida = {};

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 816 },
  });
  const page = await context.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
    // Remove o service worker/caches antigos deste teste (o SW do build pode
    // servir o precache anterior na primeira carga).
    navigator.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r) => r.unregister()));
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try {
    await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 20000 });
  } catch {
    /* segue para registrar o que apareceu */
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tmp-prova-build.png', fullPage: false });

  saida[papeis[0]] = await page.evaluate(() => {
    const texto = document.body.innerText ?? '';
    const rect = (el) => (el ? Math.round(el.getBoundingClientRect().height) : 0);
    const topo = (el) => (el ? Math.round(el.getBoundingClientRect().top) : 0);
    return {
      url: location.href,
      titulo: document.title,
      ehLogin: /Entrar|Fazer login|Esqueci minha senha/i.test(texto) && !texto.includes('Campanhas'),
      temHub: texto.includes('Hub de Premiações'),
      antigas: {
        'PENDENTE (CALCULADO)': texto.includes('PENDENTE (CALCULADO)'),
        'Progresso do Orçamento': texto.includes('Progresso do Orçamento'),
        'Gerenciar Regras': texto.includes('Gerenciar Regras'),
      },
      novas: {
        'PRÓXIMAS AÇÕES': /PRÓXIMAS AÇÕES/i.test(texto),
        'ATIVIDADE RECENTE': /ATIVIDADE RECENTE/i.test(texto),
        Visão: texto.includes('Visão geral'),
        Mostrando: /Mostrando \d+ de \d+ campanhas?/.test(texto),
      },
      medidas: {
        navegacao: rect(document.querySelector('[role="tablist"]')),
        indicadores: rect(document.querySelector('[role="tablist"]')?.parentElement?.nextElementSibling),
        topoTabela: topo(document.querySelector('section table')?.closest('section')),
        linhas: document.querySelectorAll('section tbody tr').length,
      },
    };
  });
  saida.erros = erros.slice(0, 4);
  writeFileSync('tmp-prova-build.json', JSON.stringify(saida, null, 2));
  console.log(JSON.stringify(saida, null, 2));
} finally {
  await browser.close();
}
