/**
 * TEMPORÁRIO — quem transborda a área da tabela (scrollWidth do container) e
 * como o texto se distribui em linhas, na viewport informada.
 * Uso: node scripts/_tmp-diagnosticar-overflow.mjs [largura]
 */
import { chromium } from '@playwright/test';

const largura = Number(process.argv[2] ?? 1280);
const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: largura, height: 1200 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(5000);

const dados = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const table = document.querySelector('table');
  const rolagem = table.parentElement;
  const limite = rolagem.getBoundingClientRect().right;
  const estouram = [];
  rolagem.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > limite + 1 && r.width > 8) {
      estouram.push({
        tag: el.tagName.toLowerCase(),
        classe: (el.className || '').toString().slice(0, 46),
        texto: texto(el).slice(0, 26),
        right: Math.round(r.right),
        limite: Math.round(limite),
        excesso: Math.round(r.right - limite),
      });
    }
  });
  const linhas = (el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
  const amostras = {};
  Array.from(table.querySelectorAll('tbody tr')).forEach((tr, i) => {
    amostras[`linha${i + 1}`] = {
      altura: Math.round(tr.getBoundingClientRect().height),
      nome: linhas(tr.children[1].querySelector('span:last-child')),
      campanha: linhas(tr.children[2].querySelectorAll('span > span')[0] ?? tr.children[2]),
      descricao: (() => { const el = tr.children[2].querySelectorAll('span > span')[1]; return el ? linhas(el) : 0; })(),
      comentario: (() => { const spans = tr.children[6].querySelectorAll('div > span'); const ult = spans[spans.length - 1]; return ult ? linhas(ult) : 0; })(),
    };
  });
  return { larguraTabela: Math.round(table.getBoundingClientRect().width), limiteDaArea: Math.round(limite), excessoTotal: rolagem.scrollWidth - rolagem.clientWidth, estouram: estouram.slice(0, 12), amostras };
});
console.log(JSON.stringify(dados, null, 2));
await contexto.close();
await browser.close();
