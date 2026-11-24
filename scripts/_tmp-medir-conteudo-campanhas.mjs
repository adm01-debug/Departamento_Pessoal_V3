/** TEMPORÁRIO — largura real necessária de cada coluna (conteúdo) vs disponível. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const SAIDA = 'tmp-campanhas-grid';
mkdirSync(SAIDA, { recursive: true });
const browser = await chromium.launch();
const contexto = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  storageState: 'e2e/.auth/user.json',
});
await contexto.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await contexto.newPage();
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.locator('tbody tr').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(2200);

const dados = await page.evaluate(() => {
  const tabela = document.querySelector('table');
  const ths = [...document.querySelectorAll('thead th')].map((th) => (th.textContent ?? '').trim());
  const linhas = [...document.querySelectorAll('tbody tr')].slice(0, 5);
  const porColuna = ths.map((rotulo, i) => {
    const medidas = linhas.map((tr) => {
      const td = tr.children[i];
      if (!td) return null;
      const filhos = [...td.querySelectorAll('*')]
        .filter((el) => el.children.length === 0 && (el.textContent ?? '').trim())
        .map((el) => ({ texto: (el.textContent ?? '').trim().slice(0, 28), w: Math.ceil(el.getBoundingClientRect().width) }));
      const maior = filhos.sort((a, b) => b.w - a.w)[0] ?? null;
      const grupo = td.firstElementChild;
      return {
        tdW: Math.round(td.getBoundingClientRect().width),
        scrollW: td.scrollWidth,
        grupoW: grupo ? Math.round(grupo.getBoundingClientRect().width) : null,
        maiorTexto: maior,
      };
    });
    return { i, rotulo, medidas };
  });
  return {
    tabela: Math.round(tabela.getBoundingClientRect().width),
    ths,
    porColuna,
  };
});

writeFileSync(`${SAIDA}/conteudo.json`, JSON.stringify(dados, null, 2));
console.log(JSON.stringify(dados, null, 2));
await browser.close();
