/**
 * TEMPORÁRIO — confere filtros e paginação nas duas abas do Hub:
 * a cascata da PÁGINA não reinicia (KPIs continuam opacity 1), as linhas
 * ficam visíveis depois de entrar e nenhuma interação é bloqueada.
 *
 * Uso: node scripts/_tmp-verificar-filtros-paginacao.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';

const PORTA = 8080;
const URL = `http://localhost:${PORTA}/premiacoes`;

const portaAtiva = async () => {
  try {
    const r = await fetch(URL, { redirect: 'manual' });
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

const estado = () => ({
  linhas: document.querySelectorAll('tbody tr').length,
  opacidades: [...document.querySelectorAll('tbody tr')].map((tr) => Number.parseFloat(getComputedStyle(tr).opacity)),
  kpi: (() => {
    const p = [...document.querySelectorAll('p')].find((x) => /Total Aprovado/.test(x.textContent || ''));
    return p ? Number.parseFloat(getComputedStyle(p.closest('.min-w-0.flex-1').parentElement).opacity) : null;
  })(),
});

let browser;
try {
  if (!(await pronto())) throw new Error('servidor Vite não ficou pronto');
  browser = await chromium.launch();
  const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1456, height: 816 } });
  const page = await contexto.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.removeItem('dp-force-motion');
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2200);

  const inicioCampanhas = await page.evaluate(estado);
  await page.getByRole('button', { name: /Rascunhos/ }).click();
  await page.waitForTimeout(1800);
  const filtradoCampanhas = await page.evaluate(estado);
  await page.getByRole('button', { name: /Todos/ }).click();
  await page.waitForTimeout(1800);
  const pagina2 = page.getByRole('button', { name: /^2$/ }).first();
  const temPagina2 = await pagina2.count();
  if (temPagina2) {
    await pagina2.click();
    await page.waitForTimeout(1900);
  }
  const paginado = await page.evaluate(estado);

  await page.getByRole('tab', { name: /Pagamentos/ }).click();
  await page.getByRole('textbox', { name: 'Buscar pagamentos' }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(2200);
  const inicioPagamentos = await page.evaluate(estado);
  await page.getByRole('textbox', { name: 'Buscar pagamentos' }).fill('zzzz');
  await page.waitForTimeout(1200);
  const vazioPagamentos = await page.evaluate(estado);
  await page.getByRole('textbox', { name: 'Buscar pagamentos' }).fill('');
  await page.waitForTimeout(1900);
  const restaurado = await page.evaluate(estado);

  console.log(
    JSON.stringify(
      { inicioCampanhas, filtradoCampanhas, paginado, temPagina2, inicioPagamentos, vazioPagamentos, restaurado },
      null,
      2,
    ),
  );
  await contexto.close();
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
