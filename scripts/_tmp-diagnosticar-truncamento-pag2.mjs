/**
 * TEMPORÁRIO — quem exatamente está truncando na tabela, por coluna.
 * Uso: node scripts/_tmp-diagnosticar-truncamento.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1512, height: 1200 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(5000);
await page.getByRole('button', { name: 'Próxima página' }).click();
await page.waitForTimeout(1200);

const linhas = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const cols = ['selecao', 'colaborador', 'campanha', 'calc', 'aprov', 'pago', 'status', 'acoes'];
  const out = [];
  Array.from(document.querySelectorAll('tbody tr')).forEach((tr, i) => {
    Array.from(tr.children).forEach((td, c) => {
      if (td.scrollWidth > td.clientWidth + 1) {
        out.push({ linha: i + 1, coluna: cols[c], tipo: 'CELULA', texto: texto(td).slice(0, 30), scroll: td.scrollWidth, client: td.clientWidth });
      }
      Array.from(td.querySelectorAll('*')).forEach((el) => {
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
          out.push({ linha: i + 1, coluna: cols[c], tipo: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0], texto: texto(el).slice(0, 30), scroll: el.scrollWidth, client: el.clientWidth });
        }
      });
    });
  });
  return out;
});
console.log('truncando agora:', linhas.length);
const resumo = {};
linhas.forEach((l) => {
  const k = `${l.coluna} :: ${l.tipo}`;
  resumo[k] = resumo[k] ?? [];
  resumo[k].push(`${l.texto} (${l.scroll}>${l.client})`);
});
Object.entries(resumo).forEach(([k, v]) => {
  console.log(`\n${k}  x${v.length}`);
  v.slice(0, 4).forEach((x) => console.log('   -', x));
});
await contexto.close();
await browser.close();

