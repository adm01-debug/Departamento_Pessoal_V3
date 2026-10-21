/**
 * TEMPORÁRIO — AUDITORIA TIPOGRÁFICA GLOBAL (estilos computados).
 *
 * Percorre as rotas reais do sistema e registra, no DOM renderizado:
 *  · a família de fonte usada por categoria (h1/h2/h3/corpo/label/botão/tabela/badge);
 *  · TODAS as famílias distintas em uso (com contagem e exemplo);
 *  · os valores monetários (texto com "R$") e a família aplicada;
 *  · os elementos que ainda usam família monoespaçada.
 *
 * Uso: node scripts/_tmp-auditar-tipografia.mjs
 */
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORTA = 8080;
const BASE = `http://localhost:${PORTA}`;
const OUT = 'tmp-tipografia';
mkdirSync(OUT, { recursive: true });

const ROTAS = [
  '/dashboard',
  '/dashboard-executivo',
  '/colaboradores',
  '/avaliacao',
  '/premiacoes',
  '/desligamentos',
  '/admissoes',
  '/afastamentos',
  '/ferias',
  '/ponto',
  '/beneficios',
  '/folha',
  '/rubricas',
  '/provisoes',
  '/contabilidade',
  '/cargos',
  '/departamentos',
  '/auditoria',
  '/seguranca',
  '/banco-horas',
  '/relatorios',
  '/workflows',
  '/design-system',
  '/medidas-disciplinares',
  '/treinamentos',
  '/integracoes',
  '/holerites',
  '/portal',
];

const portaAtiva = async () => {
  try {
    const r = await fetch(`${BASE}/dashboard`, { redirect: 'manual' });
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

const coletar = () => {
  const dados = (el) => {
    const cs = getComputedStyle(el);
    return {
      familia: cs.fontFamily.replace(/["']/g, ''),
      tamanho: cs.fontSize,
      peso: cs.fontWeight,
      altura: cs.lineHeight,
      espacamento: cs.letterSpacing,
      numerico: cs.fontVariantNumeric,
    };
  };
  const categorias = {};
  for (const [nome, sel] of Object.entries({
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    corpo: 'p',
    label: 'label',
    botao: 'button',
    th: 'thead th',
    td: 'tbody td',
    badge: '[class*="badge"], [data-slot="badge"]',
  })) {
    const el = document.querySelector(sel);
    categorias[nome] = el ? dados(el) : null;
  }

  const familias = {};
  const monospace = [];
  const monetarios = [];
  for (const el of document.querySelectorAll('body *')) {
    const texto = (el.childElementCount === 0 ? el.textContent || '' : '').trim();
    const cs = getComputedStyle(el);
    const fam = cs.fontFamily.replace(/["']/g, '');
    if (texto && el.offsetParent !== null) {
      familias[fam] = (familias[fam] ?? 0) + 1;
      if (/mono/i.test(fam)) {
        monospace.push({ tag: el.tagName, classe: String(el.className).slice(0, 70), texto: texto.slice(0, 40) });
      }
    }
    if (texto && /R\$\s?\d/.test(texto)) {
      monetarios.push({ familia: fam, tamanho: cs.fontSize, numerico: cs.fontVariantNumeric, texto: texto.slice(0, 28) });
    }
  }
  return { categorias, familias, monospace, monetarios };
};

const relatorio = {};
let browser;
try {
  if (!(await pronto())) throw new Error('servidor Vite não ficou pronto');
  browser = await chromium.launch({ args: ['--disable-frame-rate-limit', '--disable-gpu-vsync'] });
  const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1456, height: 1000 } });
  await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
  );
  await context.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  const page = await context.newPage();

  for (const rota of ROTAS) {
    try {
      await page.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2600);
      relatorio[rota] = {
        urlFinal: page.url().replace(BASE, ''),
        titulo: await page.title(),
        ...(await page.evaluate(coletar)),
      };
    } catch (erro) {
      relatorio[rota] = { erro: String(erro?.message ?? erro).slice(0, 180) };
    }
  }

  // Aba Pagamentos + janela "Detalhes do pagamento" (valores financeiros).
  try {
    await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    await page.getByRole('tab', { name: /Pagamentos/ }).click();
    await page.getByRole('textbox', { name: 'Buscar pagamentos' }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(2400);
    relatorio['/premiacoes#pagamentos'] = await page.evaluate(coletar);
    await page.locator('button[aria-label^="Mais ações para"]').first().click();
    await page.getByRole('menuitem', { name: /Ver detalhes/ }).click();
    await page.getByRole('dialog').last().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1600);
    relatorio['/premiacoes#detalhes-pagamento'] = await page.evaluate(coletar);
  } catch (erro) {
    relatorio['/premiacoes#detalhes-pagamento'] = { erro: String(erro?.message ?? erro).slice(0, 180) };
  }

  await context.close();
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

writeFileSync(`${OUT}/baseline.json`, JSON.stringify(relatorio, null, 2));
const global = {};
for (const [rota, r] of Object.entries(relatorio)) {
  if (!r.familias) continue;
  console.log(`\n${rota}  (${r.urlFinal ?? ''})`);
  console.log('  categorias:', JSON.stringify(r.categorias));
  console.log('  famílias:', JSON.stringify(r.familias));
  if (r.monetarios.length) {
    const amostra = r.monetarios.slice(0, 4).map((m) => `${m.texto} → ${m.familia} / ${m.tamanho} / ${m.numerico}`);
    console.log('  monetários:', amostra.join(' | '));
  }
  for (const [fam, qtd] of Object.entries(r.familias)) global[fam] = (global[fam] ?? 0) + qtd;
}
console.log('\n=== FAMÍLIAS EM TODO O SISTEMA ===');
console.log(JSON.stringify(global, null, 2));
console.log(`\nJSON: ${OUT}/baseline.json`);
